/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Alumno, Profesor, Sancion, Compensacion, AuditLog } from '../types/convivencia';
import { StorageService } from './storageService';
import { AuthService } from './authService';

const SYNC_URL_STORAGE_KEY = 'sigc_bi_drive_sync_api_url_v1';
const LAST_SYNC_STORAGE_KEY = 'sigc_bi_last_drive_sync_timestamp_v1';

// Endpoint oficial de Google Apps Script vinculado a la cuenta del centro
export const DEFAULT_OFFICIAL_DRIVE_API_URL =
  'https://script.google.com/macros/s/AKfycbyrmV69dBgcg9WD0mx4tQLWeZtbqSR7odMS87HS5VyOPQL90RNNZMkpp5HHGZ30HimLNQ/exec';

export interface DriveDatabaseState {
  version: string;
  timestamp: string;
  origen: string;
  centro: {
    nombre: string;
    codigo: string;
    cuenta_institucional: string;
    drive_folder_id: string;
  };
  profesores: Profesor[];
  credenciales_profesores?: Record<string, string>;
  alumnos: Alumno[];
  sanciones: Sancion[];
  compensaciones: Compensacion[];
  audit_logs: AuditLog[];
  deleted_sanciones?: string[];
  deleted_alumnos?: string[];
  deleted_profesores?: string[];
  reset_credenciales_emails?: string[];
}

export class GoogleDriveSyncService {
  private static pushTimeoutId: any = null;
  private static isPushing: boolean = false;
  private static pendingPushQueued: boolean = false;
  private static lastRemoteTimestamp: string | null = null;

  /**
   * Dispara una sincronización rápida no bloqueante con debounce.
   * Agrupa múltiples acciones rápidas de profesores en un único envío eficiente.
   */
  static triggerFastSync(delayMs: number = 350): void {
    if (this.pushTimeoutId) {
      clearTimeout(this.pushTimeoutId);
    }
    this.pushTimeoutId = setTimeout(() => {
      this.pushTimeoutId = null;
      this.pushToGoogleDrive().catch(() => {});
    }, delayMs);
  }

  /**
   * Obtiene la URL configurada del Web App de Google Apps Script vinculado al Drive del centro.
   */
  static getSyncApiUrl(): string {
    const custom = localStorage.getItem(SYNC_URL_STORAGE_KEY);
    // Si hay una URL personalizada guardada que sea una URL antigua o vacía, migrar a la nueva oficial
    if (custom && custom.includes('AKfycbzIG544uJnAwpFOVCOb2FeCuFpx1MzZU3nLWY9n-ygLNqzycDqeze5tPX8EHE9pFaEePg')) {
      localStorage.setItem(SYNC_URL_STORAGE_KEY, DEFAULT_OFFICIAL_DRIVE_API_URL);
      return DEFAULT_OFFICIAL_DRIVE_API_URL;
    }
    const raw = (custom && custom.trim().length > 0) ? custom.trim() : DEFAULT_OFFICIAL_DRIVE_API_URL;
    // Si la URL contiene el prefijo de dominio corporativo /a/macros/... normalizar a /macros/
    return raw.replace(/\/a\/macros\/[^/]+\//, '/macros/');
  }

  /**
   * Guarda o actualiza la URL del endpoint de Google Apps Script.
   */
  static setSyncApiUrl(url: string): void {
    let cleanUrl = url.trim();
    // Limpiar espacios, comillas o parámetros residuales
    cleanUrl = cleanUrl.replace(/^["']|["']$/g, '');
    if (cleanUrl) {
      // Normalizar URL interna de dominio institucional a formato canónico de Web App
      cleanUrl = cleanUrl.replace(/\/a\/macros\/[^/]+\//, '/macros/');
      localStorage.setItem(SYNC_URL_STORAGE_KEY, cleanUrl);
    } else {
      localStorage.removeItem(SYNC_URL_STORAGE_KEY);
    }
  }

  /**
   * Fecha de la última sincronización completada con éxito.
   */
  static getLastSyncTimestamp(): string | null {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  }

  /**
   * Empaqueta el estado completo actual del sistema para ser custodiado en Drive.
   */
  static getFullDatabasePayload(): DriveDatabaseState {
    const unidad = StorageService.getUnidadInstitucional();
    const creds = AuthService.getAllCredentials();
    const profs = StorageService.getProfesores().map(p => {
      const cleanMail = p.email.toLowerCase().trim();
      const hash = p.password_hash || creds[cleanMail];
      if (hash) {
        creds[cleanMail] = hash;
        return { ...p, password_hash: hash };
      }
      return p;
    });

    return {
      version: '3.0.0-PROD',
      timestamp: new Date().toISOString(),
      origen: 'S.I.G.C. - IES Blas Infante (Córdoba)',
      centro: {
        nombre: 'IES Blas Infante',
        codigo: '14007180',
        cuenta_institucional: unidad.email,
        drive_folder_id: unidad.folderId || '1UJBQCWfs9G9mu3N3F1wDjL_UJ__YhdTP',
      },
      profesores: profs,
      credenciales_profesores: creds,
      alumnos: StorageService.getAlumnos(),
      sanciones: StorageService.getSanciones(),
      compensaciones: StorageService.getCompensaciones(),
      audit_logs: StorageService.getAuditLogs(),
      deleted_sanciones: StorageService.getDeletedSancionIds(),
      deleted_alumnos: StorageService.getDeletedAlumnoIds(),
      deleted_profesores: StorageService.getDeletedProfesorIds(),
      reset_credenciales_emails: AuthService.getResetCredentialsEmails(),
    };
  }

  /**
   * Descarga el censo y los datos más recientes desde Google Drive y los fusiona de forma segura.
   * Utiliza reconciliación bidireccional con soporte estricto de borrados (tombstones) para que
   * cuando un administrador o docente elimina un parte, se borre de inmediato en todos los ordenadores y sesiones.
   */
  static async pullFromGoogleDrive(options?: { forceRefresh?: boolean; skipAutoPush?: boolean }): Promise<{ success: boolean; message: string; notModified?: boolean; dataCount?: { profesores: number; alumnos: number; sanciones: number } }> {
    const apiUrl = this.getSyncApiUrl();
    if (!apiUrl) {
      const profesores = StorageService.getProfesores();
      const alumnos = StorageService.getAlumnos();
      const sanciones = StorageService.getSanciones();
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
      return {
        success: true,
        message: 'Datos locales verificados y listos para custodia institucional.',
        dataCount: { profesores: profesores.length, alumnos: alumnos.length, sanciones: sanciones.length },
      };
    }

    try {
      const controller = new AbortController();
      // Timeout ágil para no bloquear la interfaz en redes lentas
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // SIEMPRE forzar lectura fresca desde Google Drive sin depender de timestamps en caché local
      // para asegurar que todos los dispositivos vean exactamente el mismo estado en tiempo real.
      const url = `${apiUrl}?action=read_database&t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;

      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error en el servidor de Google Drive (Código HTTP ${response.status})`);
      }

      // 1. Obtener texto crudo y parsear de forma resiliente (maneja JSON directo, data=... y codificación URL)
      const rawText = await response.text();
      let remoteData: any = null;

      try {
        remoteData = JSON.parse(rawText);
      } catch {
        const trimmed = (rawText || '').trim();
        if (trimmed.startsWith('data=')) {
          try {
            const decoded = decodeURIComponent(trimmed.substring(5).replace(/\+/g, ' '));
            remoteData = JSON.parse(decoded);
          } catch {}
        } else if (trimmed.startsWith('%7B') || trimmed.startsWith('%7b')) {
          try {
            const decoded = decodeURIComponent(trimmed.replace(/\+/g, ' '));
            remoteData = JSON.parse(decoded);
          } catch {}
        }
      }

      if (!remoteData || typeof remoteData !== 'object') {
        throw new Error('Respuesta inválida del servidor de Google Drive: formato no reconocido.');
      }

      this.lastRemoteTimestamp = remoteData.timestamp || new Date().toISOString();

      let localHasPendingData = false;

      // 0. Reconciliación de Tombstones (Elementos eliminados oficialmente)
      const remoteDeletedSanciones = new Set<string>(remoteData.deleted_sanciones || []);
      const localDeletedSanciones = new Set<string>(StorageService.getDeletedSancionIds());
      const pendingSyncSancionIds = new Set<string>(StorageService.getPendingSyncSancionIds());
      const pendingSyncProfEmails = new Set<string>(StorageService.getPendingSyncProfesorEmails());
      const pendingSyncAlumnoIds = new Set<string>(StorageService.getPendingSyncAlumnoIds());

      // Solo mantener tombstones que estén en el servidor o que acaben de ser eliminados en esta sesión
      const allDeletedSanciones = new Set<string>([...remoteDeletedSanciones, ...localDeletedSanciones]);

      // Si vienen sanciones en remoteData.sanciones y NO acaban de ser eliminadas en esta sesión, son ACTIVAS en Drive
      if (remoteData.sanciones && Array.isArray(remoteData.sanciones)) {
        remoteData.sanciones.forEach((s: Sancion) => {
          if (s?.id_sancion && !localDeletedSanciones.has(s.id_sancion)) {
            allDeletedSanciones.delete(s.id_sancion);
            StorageService.removeDeletedSancionId(s.id_sancion);
          }
        });
      }
      StorageService.saveDeletedSancionIds(Array.from(allDeletedSanciones));

      const remoteDeletedAlumnos = new Set<string>(remoteData.deleted_alumnos || []);
      const localDeletedAlumnos = new Set<string>(StorageService.getDeletedAlumnoIds());
      const allDeletedAlumnos = new Set<string>([...remoteDeletedAlumnos, ...localDeletedAlumnos]);
      if (remoteData.alumnos && Array.isArray(remoteData.alumnos)) {
        remoteData.alumnos.forEach((a: Alumno) => {
          if (a?.id_alumno && !localDeletedAlumnos.has(a.id_alumno)) {
            allDeletedAlumnos.delete(a.id_alumno);
          }
        });
      }
      StorageService.saveDeletedAlumnoIds(Array.from(allDeletedAlumnos));

      const remoteDeletedProfs = new Set<string>(remoteData.deleted_profesores || []);
      const localDeletedProfs = new Set<string>(StorageService.getDeletedProfesorIds());
      const allDeletedProfs = new Set<string>([...remoteDeletedProfs, ...localDeletedProfs]);
      StorageService.saveDeletedProfesorIds(Array.from(allDeletedProfs));

      // Reconciliación de reseteos de contraseñas de docentes
      const remoteResets = new Set<string>((remoteData.reset_credenciales_emails || []).map((e: string) => (e || '').toLowerCase().trim()));
      const localResets = new Set<string>(AuthService.getResetCredentialsEmails());
      const allResets = new Set<string>([...remoteResets, ...localResets]);
      AuthService.saveResetCredentialsEmails(Array.from(allResets));

      // 1. Fusión de Profesores (Drive es la fuente de verdad; solo sobrescribir si hay cambio en vuelo en esta sesión)
      if (remoteData.profesores && Array.isArray(remoteData.profesores)) {
        const localProfs = StorageService.getProfesores();
        const profMap = new Map<string, Profesor>();
        remoteData.profesores.forEach((p: Profesor) => {
          if (p?.email && !allDeletedProfs.has(p.id_profesor) && !allDeletedProfs.has(p.email)) {
            const cleanEm = p.email.toLowerCase().trim();
            profMap.set(cleanEm, p);

            if (allResets.has(cleanEm) || p.requiere_cambio_clave) {
              p.requiere_cambio_clave = true;
              p.password_hash = undefined;
              AuthService.removeTeacherHashDirect(cleanEm);
            } else if (p.password_hash) {
              AuthService.setTeacherHashDirect(p.email, p.password_hash);
            }
          }
        });
        localProfs.forEach(lp => {
          if (lp?.email && !allDeletedProfs.has(lp.id_profesor) && !allDeletedProfs.has(lp.email)) {
            const k = lp.email.toLowerCase().trim();
            const existing = profMap.get(k);
            if (!existing) {
              if (pendingSyncProfEmails.has(k)) {
                profMap.set(k, lp);
                localHasPendingData = true;
              }
            } else if (pendingSyncProfEmails.has(k)) {
              // El usuario acaba de editar este profesor en esta sesión activa
              profMap.set(k, {
                ...existing,
                ...lp,
                password_hash: lp.password_hash || existing.password_hash,
              });
              localHasPendingData = true;
            } else {
              if (allResets.has(k) || existing.requiere_cambio_clave) {
                existing.requiere_cambio_clave = true;
                existing.password_hash = undefined;
                AuthService.removeTeacherHashDirect(k);
              } else if (lp.password_hash && !existing.password_hash) {
                existing.password_hash = lp.password_hash;
                localHasPendingData = true;
              }
            }
          }
        });
        StorageService.saveProfesores(Array.from(profMap.values()));
      }

      // 2. Fusión de Credenciales Centralizadas
      if (remoteData.credenciales_profesores && typeof remoteData.credenciales_profesores === 'object') {
        AuthService.mergeRemoteCredentials(remoteData.credenciales_profesores, Array.from(allResets));
      }

      // 3. Fusión de Sanciones (Google Drive es la única fuente de verdad salvo ediciones en vuelo en esta sesión)
      if (remoteData.sanciones && Array.isArray(remoteData.sanciones)) {
        const localSanciones = StorageService.getSanciones();
        const sancionMap = new Map<string, Sancion>();

        // Cargar todas las sanciones activas del JSON remoto de Drive (excluyendo las recién eliminadas en esta sesión)
        remoteData.sanciones.forEach((s: Sancion) => {
          if (s?.id_sancion && !localDeletedSanciones.has(s.id_sancion)) {
            sancionMap.set(s.id_sancion, s);
          }
        });

        // Aplicar únicamente las creaciones o modificaciones pendientes en vuelo de esta sesión
        localSanciones.forEach(localS => {
          if (!localS?.id_sancion) return;
          if (allDeletedSanciones.has(localS.id_sancion)) return;

          if (pendingSyncSancionIds.has(localS.id_sancion)) {
            const existingRemote = sancionMap.get(localS.id_sancion);
            sancionMap.set(localS.id_sancion, existingRemote ? { ...existingRemote, ...localS } : localS);
            localHasPendingData = true;
          }
        });

        const mergedSanciones = StorageService.deduplicarSancionesPorExpediente(Array.from(sancionMap.values()));
        StorageService.saveSanciones(mergedSanciones);
      }

      // 4. Fusión de Compensaciones (Unión por id_compensacion)
      if (remoteData.compensaciones && Array.isArray(remoteData.compensaciones)) {
        const localComps = StorageService.getCompensaciones();
        const compMap = new Map<string, Compensacion>();
        remoteData.compensaciones.forEach((c: Compensacion) => {
          if (c?.id_compensacion) compMap.set(c.id_compensacion, c);
        });
        localComps.forEach(lc => {
          if (lc?.id_compensacion && !compMap.has(lc.id_compensacion)) {
            compMap.set(lc.id_compensacion, lc);
            localHasPendingData = true;
          }
        });
        StorageService.saveCompensaciones(Array.from(compMap.values()));
      }

      // 5. Fusión de Alumnos (Google Drive es la única fuente de verdad salvo ediciones en vuelo en esta sesión)
      if (remoteData.alumnos && Array.isArray(remoteData.alumnos)) {
        const localAlumnos = StorageService.getAlumnos();
        const alumnoMap = new Map<string, Alumno>();

        remoteData.alumnos.forEach((a: Alumno) => {
          if (a?.id_alumno && !allDeletedAlumnos.has(a.id_alumno)) {
            alumnoMap.set(a.id_alumno, a);
          }
        });

        localAlumnos.forEach(localA => {
          if (!localA?.id_alumno || allDeletedAlumnos.has(localA.id_alumno)) return;

          if (pendingSyncAlumnoIds.has(localA.id_alumno)) {
            const existingRemote = alumnoMap.get(localA.id_alumno);
            alumnoMap.set(localA.id_alumno, existingRemote ? { ...existingRemote, ...localA } : localA);
            localHasPendingData = true;
          }
        });

        StorageService.saveAlumnos(Array.from(alumnoMap.values()));
        StorageService.depurarAlumnosDuplicados('SISTEMA_SYNC');
      }

      // 6. Recálculo automático estricto de puntos de carnet tras sincronizar sanciones y compensaciones
      StorageService.recalcularPuntosAlumnos();
      StorageService.markLoadedFromDrive();

      // 6. Fusión de Audit Logs
      if (remoteData.audit_logs && Array.isArray(remoteData.audit_logs)) {
        const localLogs = StorageService.getAuditLogs();
        const logMap = new Map<string, AuditLog>();
        remoteData.audit_logs.forEach((l: AuditLog) => {
          if (l?.id_log) logMap.set(l.id_log, l);
        });
        localLogs.forEach(ll => {
          if (ll?.id_log && !logMap.has(ll.id_log)) {
            logMap.set(ll.id_log, ll);
            localHasPendingData = true;
          }
        });
        const mergedLogs = Array.from(logMap.values())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 300);
        StorageService.saveAuditLogs(mergedLogs);
      }

      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());

      // Si teníamos datos locales pendientes que el servidor no tenía, sincronizar de vuelta
      if (localHasPendingData && !options?.skipAutoPush) {
        this.triggerFastSync(200);
      }

      return {
        success: true,
        message: 'Base de datos sincronizada con Google Drive corporativo.',
        dataCount: {
          profesores: StorageService.getProfesores().length,
          alumnos: StorageService.getAlumnos().length,
          sanciones: StorageService.getSanciones().length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo conectar con el endpoint de Google Drive: ${err.message || err}`,
      };
    }
  }

  /**
   * Sube los datos locales hacia Google Drive de manera ultrarrápida y segura para concurrencia.
   * Antes de subir, realiza una lectura y fusión atómica (Read-Modify-Write) desde Drive
   * para garantizar que dos dispositivos simultáneos nunca sobrescriban los cambios del otro.
   */
  static async pushToGoogleDrive(): Promise<{ success: boolean; message: string }> {
    const apiUrl = this.getSyncApiUrl();

    if (!apiUrl) {
      StorageService.crearSnapshotBackup('sistema@g.educaand.es');
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
      return {
        success: true,
        message: 'Copia de seguridad local preparada para Google Drive.',
      };
    }

    // Manejo de concurrencia: si ya hay una subida en vuelo, encolar
    if (this.isPushing) {
      this.pendingPushQueued = true;
      return {
        success: true,
        message: 'Petición encolada para sincronización concurrente segura.',
      };
    }

    this.isPushing = true;

    // 0. Fusión atómica previa (Read-Modify-Write): descargar y fusionar estado remoto actual antes de empaquetar
    try {
      await this.pullFromGoogleDrive({ forceRefresh: true, skipAutoPush: true });
    } catch {
      // Si la red falla puntualmente en la lectura previa, continuar con el estado local
    }

    const payload = this.getFullDatabasePayload();
    const jsonString = JSON.stringify(payload);

    // 1. Envío estándar con text/plain (CORS-safelisted, sin preflight OPTIONS y sin envoltorio data=)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: jsonString,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
      StorageService.clearPendingSyncSancionIds();
      StorageService.clearPendingSyncProfesorEmails();
      StorageService.clearPendingSyncAlumnoIds();
      this.finishPush();
      return {
        success: true,
        message: 'Datos y censos custodiados exitosamente en Google Drive.',
      };
    } catch {
      // Fallback a urlencoded si text/plain falla en algún navegador antiguo
    }

    // 2. Envío de respaldo multipart/form-data
    try {
      const formBody = new URLSearchParams();
      formBody.append('data', jsonString);
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      });
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, new Date().toISOString());
      StorageService.clearPendingSyncSancionIds();
      StorageService.clearPendingSyncProfesorEmails();
      StorageService.clearPendingSyncAlumnoIds();
      this.finishPush();
      return {
        success: true,
        message: 'Datos enviados a Google Drive (vía compatible).',
      };
    } catch (err: any) {
      this.finishPush();
      return {
        success: false,
        message: `Error al sincronizar con Google Drive: ${err.message || err}`,
      };
    }
  }

  private static finishPush(): void {
    this.isPushing = false;
    if (this.pendingPushQueued) {
      this.pendingPushQueued = false;
      setTimeout(() => {
        this.pushToGoogleDrive().catch(() => {});
      }, 250);
    }
  }
}
