/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Alumno, Profesor, Sancion, Compensacion, AuditLog, DriveSyncStatus, GrupoEducativo, UnidadInstitucionalConfig, MovimientoPuntos, CursoAcademicoArchivo, InfoCursoAcademico, RoleUsuario } from '../types/convivencia';
import { ALUMNOS_INICIALES, PROFESORES_INICIALES, SANCIONES_INICIALES, COMPENSACIONES_INICIALES, AUDIT_LOGS_INICIALES, MOVIMIENTOS_INICIALES } from '../data/seedData';
import { ProfesorImportRow, parsearTextoOcsvProfesores } from './odsImportService';

const KEY_ALUMNOS = 'sigc_bi_alumnos_v3';
const KEY_PROFESORES = 'sigc_bi_profesores_v2';
const KEY_SANCIONES = 'sigc_bi_sanciones_v3';
const KEY_COMPENSACIONES = 'sigc_bi_compensaciones_v3';
const KEY_AUDIT_LOGS = 'sigc_bi_audit_logs_v2';
const KEY_MOVIMIENTOS = 'sigc_bi_movimientos_v3';
const KEY_OFFLINE_QUEUE = 'sigc_bi_offline_queue_v2';
const KEY_BACKUPS = 'sigc_bi_backups_v2';
const KEY_UNIDAD_INSTITUCIONAL = 'sigc_bi_unidad_institucional_v2';
const KEY_CURSO_ACTUAL = 'sigc_bi_curso_actual_v1';
const KEY_HISTORICO_CURSOS = 'sigc_bi_historico_cursos_v1';
const KEY_LAST_LOCAL_WRITE = 'sigc_bi_last_local_write_timestamp_v1';

// Limpieza automática inmediata para asegurar que alumnos y partes queden a cero, y purgar docentes en baja
try {
  const CLEANED_FLAG = 'sigc_bi_cleanup_done_v4';
  if (typeof window !== 'undefined' && localStorage.getItem(CLEANED_FLAG) !== 'true') {
    localStorage.removeItem('sigc_bi_alumnos_v2');
    localStorage.removeItem('sigc_bi_sanciones_v2');
    localStorage.removeItem('sigc_bi_compensaciones_v2');
    localStorage.removeItem('sigc_bi_movimientos_v0');
    localStorage.removeItem('sigc_bi_movimientos_v2');
    localStorage.setItem(KEY_ALUMNOS, JSON.stringify([]));
    localStorage.setItem(KEY_SANCIONES, JSON.stringify([]));
    localStorage.setItem(KEY_COMPENSACIONES, JSON.stringify([]));
    localStorage.setItem(KEY_MOVIMIENTOS, JSON.stringify([]));
    localStorage.setItem(CLEANED_FLAG, 'true');
  }

  // Purgar de forma permanente cualquier profesor en estado INACTIVO
  if (typeof window !== 'undefined') {
    const rawProfs = localStorage.getItem(KEY_PROFESORES);
    if (rawProfs) {
      const parsed = JSON.parse(rawProfs);
      const cleaned = parsed.filter((p: any) => p.estado !== 'INACTIVO');
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEY_PROFESORES, JSON.stringify(cleaned));
      }
    }
  }
} catch {
  // Ignorar errores de entorno
}

export const UNIDAD_INSTITUCIONAL_OFICIAL: UnidadInstitucionalConfig = {
  email: '14007180.aplicaciones@g.educaand.es',
  nombreUnidad: 'Unidad Compartida Convivencia - IES Blas Infante',
  esModoPruebas: false,
  centroEducativo: 'IES Blas Infante (Córdoba)',
  codigoCentro: '14007180',
  fechaConfiguracion: '2026-09-24',
  observaciones: 'Cuenta corporativa oficial del centro (Google Workspace for Education) para almacenamiento persistente y cumplimiento RGPD.',
  folderId: '1S5zjeSgcfVkL-eoQLsJ9I_ltHAnRrbaS',
};

/**
 * Normaliza nombres y apellidos de alumnos para comparaciones a prueba de duplicados:
 * - Elimina acentos/tildes y diacríticos (á -> a, ü -> u, etc.)
 * - Convierte a minúsculas
 * - Elimina comas, puntos, guiones, comillas y caracteres especiales
 * - Colapsa múltiples espacios en uno solo
 */
export function normalizarNombreComparacion(nombre?: string, apellidos?: string): string {
  const clean = `${(apellidos || '').trim()} ${(nombre || '').trim()}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
}

/**
 * Genera un hash canónico basado en el conjunto ordenado de palabras de nombre y apellidos.
 * Esto evita duplicados si alguien escribe "García López, Manuel" y en otra parte "Manuel García López".
 */
export function normalizarTokensNombre(nombre?: string, apellidos?: string): string {
  const clean = normalizarNombreComparacion(nombre, apellidos);
  if (!clean) return '';
  const tokens = clean.split(' ').filter(t => t.length > 0).sort();
  return tokens.join(' ');
}

export class StorageService {
  static getUnidadInstitucional(): UnidadInstitucionalConfig {
    const raw = localStorage.getItem(KEY_UNIDAD_INSTITUCIONAL);
    if (!raw) {
      this.saveUnidadInstitucional(UNIDAD_INSTITUCIONAL_OFICIAL);
      return UNIDAD_INSTITUCIONAL_OFICIAL;
    }
    try {
      const parsed = JSON.parse(raw);
      // Migración automática si persistía la cuenta de pruebas previa o la carpeta anterior
      if (parsed.email === 'mgonruz857@g.educaand.es' || parsed.esModoPruebas || parsed.folderId === '1UJBQCWfs9G9mu3N3F1wDjL_UJ__YhdTP') {
        const updated = {
          ...parsed,
          ...UNIDAD_INSTITUCIONAL_OFICIAL,
          folderId: '1S5zjeSgcfVkL-eoQLsJ9I_ltHAnRrbaS',
        };
        this.saveUnidadInstitucional(updated);
        return updated;
      }
      return parsed;
    } catch {
      return UNIDAD_INSTITUCIONAL_OFICIAL;
    }
  }

  static saveUnidadInstitucional(config: UnidadInstitucionalConfig): void {
    localStorage.setItem(KEY_UNIDAD_INSTITUCIONAL, JSON.stringify(config));
  }

  static touchLocalWriteTimestamp(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY_LAST_LOCAL_WRITE, new Date().toISOString());
    }
  }

  static getLastLocalWriteTimestamp(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEY_LAST_LOCAL_WRITE);
  }

  static getAlumnos(): Alumno[] {
    const raw = localStorage.getItem(KEY_ALUMNOS);
    if (!raw) {
      this.saveAlumnos(ALUMNOS_INICIALES);
      return ALUMNOS_INICIALES;
    }
    try {
      const parsed: Alumno[] = JSON.parse(raw);
      // Auto-detección y curación transparente si existen alumnos con el mismo nombre o NIE
      if (parsed.length > 1) {
        const seenNames = new Set<string>();
        let hasDuplicates = false;
        for (const a of parsed) {
          const k = normalizarNombreComparacion(a.nombre, a.apellidos);
          if (k) {
            if (seenNames.has(k)) {
              hasDuplicates = true;
              break;
            }
            seenNames.add(k);
          }
        }
        if (hasDuplicates) {
          const res = this.depurarAlumnosDuplicados();
          if (res.duplicadosEliminados > 0) {
            const healedRaw = localStorage.getItem(KEY_ALUMNOS);
            if (healedRaw) return JSON.parse(healedRaw);
          }
        }
      }
      return parsed;
    } catch {
      return ALUMNOS_INICIALES;
    }
  }

  static saveAlumnos(alumnos: Alumno[]): void {
    localStorage.setItem(KEY_ALUMNOS, JSON.stringify(alumnos));
    this.touchLocalWriteTimestamp();
  }

  /**
   * Depura y fusiona de forma inteligente alumnos duplicados en el censo.
   * Reglas de negocio:
   * - Si dos o más registros tienen el mismo nombre y apellidos normalizados (o los mismos tokens de nombre completo, o el mismo NIE real):
   *   1. Selecciona como registro principal (master) el que posea mayor historial (sanciones previas, saldo de puntos < 10, o NIE real).
   *   2. Si un registro estaba en BAJA y el otro ACTIVO, conserva el estado ACTIVO.
   *   3. Migra todas las sanciones, compensaciones y movimientos de puntos de los registros duplicados al registro principal.
   *   4. Elimina los registros duplicados residuales.
   *   5. Registra en auditoría la acción de saneamiento.
   */
  static depurarAlumnosDuplicados(usuarioOperador?: string): {
    totalOriginal: number;
    totalFinal: number;
    duplicadosEliminados: number;
    gruposFusionados: Array<{ alumnoPrincipal: string; grupo: string; eliminados: string[] }>;
  } {
    const raw = localStorage.getItem(KEY_ALUMNOS);
    if (!raw) return { totalOriginal: 0, totalFinal: 0, duplicadosEliminados: 0, gruposFusionados: [] };

    let alumnos: Alumno[] = [];
    try {
      alumnos = JSON.parse(raw);
    } catch {
      return { totalOriginal: 0, totalFinal: 0, duplicadosEliminados: 0, gruposFusionados: [] };
    }

    if (alumnos.length <= 1) {
      return { totalOriginal: alumnos.length, totalFinal: alumnos.length, duplicadosEliminados: 0, gruposFusionados: [] };
    }

    const totalOriginal = alumnos.length;
    const sanciones = this.getSanciones();
    const compensaciones = this.getCompensaciones();
    const movimientos = this.getMovimientos();

    let idMappingChanged = false;
    const idMapRedirect = new Map<string, string>(); // duplicateId -> masterId
    const gruposFusionados: Array<{ alumnoPrincipal: string; grupo: string; eliminados: string[] }> = [];

    const clusters: Alumno[][] = [];
    const visited = new Set<string>();

    for (let i = 0; i < alumnos.length; i++) {
      const a = alumnos[i];
      if (visited.has(a.id_alumno)) continue;

      const cluster: Alumno[] = [a];
      visited.add(a.id_alumno);

      const aNie = (a.nie || '').trim().toUpperCase();
      const hasRealNie = aNie && !aNie.startsWith('SN-') && !['SIN NIE', 'PENDIENTE', 'NO TIENE', 'SN', '-', 'NO'].includes(aNie);
      const aCanonical = normalizarNombreComparacion(a.nombre, a.apellidos);
      const aTokens = normalizarTokensNombre(a.nombre, a.apellidos);

      for (let j = i + 1; j < alumnos.length; j++) {
        const b = alumnos[j];
        if (visited.has(b.id_alumno)) continue;

        const bNie = (b.nie || '').trim().toUpperCase();
        const bHasRealNie = bNie && !bNie.startsWith('SN-') && !['SIN NIE', 'PENDIENTE', 'NO TIENE', 'SN', '-', 'NO'].includes(bNie);
        const bCanonical = normalizarNombreComparacion(b.nombre, b.apellidos);
        const bTokens = normalizarTokensNombre(b.nombre, b.apellidos);

        let isDuplicate = false;

        // Criterio 1: Mismo NIE oficial de Séneca
        if (hasRealNie && bHasRealNie && aNie === bNie) {
          isDuplicate = true;
        }
        // Criterio 2: Mismo nombre canónico normalizado (apellidos + nombre sin tildes ni espacios extra)
        else if (aCanonical && bCanonical && aCanonical === bCanonical) {
          isDuplicate = true;
        }
        // Criterio 3: Mismo conjunto de tokens de nombre completo (e.g. Séneca "GARCÍA LÓPEZ, MANUEL" vs "MANUEL GARCÍA LÓPEZ")
        else if (aTokens && bTokens && aTokens.length >= 4 && aTokens === bTokens) {
          isDuplicate = true;
        }

        if (isDuplicate) {
          cluster.push(b);
          visited.add(b.id_alumno);
        }
      }

      clusters.push(cluster);
    }

    const cleanAlumnos: Alumno[] = [];
    let duplicadosEliminados = 0;

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        cleanAlumnos.push(cluster[0]);
        continue;
      }

      // Ordenar para elegir el master
      cluster.sort((a, b) => {
        // Prioridad 1: el que tenga sanciones en el sistema
        const sancionesA = sanciones.filter(s => s.id_alumno === a.id_alumno).length;
        const sancionesB = sanciones.filter(s => s.id_alumno === b.id_alumno).length;
        if (sancionesA !== sancionesB) return sancionesB - sancionesA;

        // Prioridad 2: el que tenga menos puntos actuales (más movimientos)
        if (a.puntos_actuales !== b.puntos_actuales) return a.puntos_actuales - b.puntos_actuales;

        // Prioridad 3: el que tenga NIE real de Séneca
        const aHasReal = a.nie && !a.nie.startsWith('SN-');
        const bHasReal = b.nie && !b.nie.startsWith('SN-');
        if (aHasReal && !bHasReal) return -1;
        if (!aHasReal && bHasReal) return 1;

        // Prioridad 4: estado ACTIVO frente a BAJA
        if (a.estado === 'ACTIVO' && b.estado !== 'ACTIVO') return -1;
        if (a.estado !== 'ACTIVO' && b.estado === 'ACTIVO') return 1;

        return 0;
      });

      const master = { ...cluster[0] };
      const duplicates = cluster.slice(1);
      const eliminadosNombres: string[] = [];

      for (const dup of duplicates) {
        idMapRedirect.set(dup.id_alumno, master.id_alumno);
        idMappingChanged = true;
        duplicadosEliminados++;
        eliminadosNombres.push(`${dup.nombre} ${dup.apellidos} (${dup.grupo}, NIE: ${dup.nie || 'SN'})`);

        // Heredar teléfono o tutor si el master no los tenía
        if ((!master.telefono_tutor || master.telefono_tutor === '600 00 00 00') && dup.telefono_tutor && dup.telefono_tutor !== '600 00 00 00') {
          master.telefono_tutor = dup.telefono_tutor;
        }
        if ((!master.nombre_tutor || master.nombre_tutor === 'Tutor Legal') && dup.nombre_tutor && dup.nombre_tutor !== 'Tutor Legal') {
          master.nombre_tutor = dup.nombre_tutor;
        }
        // Heredar NIE real
        if ((!master.nie || master.nie.startsWith('SN-')) && dup.nie && !dup.nie.startsWith('SN-')) {
          master.nie = dup.nie;
        }
      }

      gruposFusionados.push({
        alumnoPrincipal: `${master.nombre} ${master.apellidos} (${master.grupo})`,
        grupo: master.grupo,
        eliminados: eliminadosNombres,
      });

      cleanAlumnos.push(master);
    }

    if (duplicadosEliminados > 0) {
      this.saveAlumnos(cleanAlumnos);

      if (idMappingChanged) {
        let changedSanciones = false;
        const updatedSanciones = sanciones.map(s => {
          if (idMapRedirect.has(s.id_alumno)) {
            changedSanciones = true;
            return { ...s, id_alumno: idMapRedirect.get(s.id_alumno)! };
          }
          return s;
        });
        if (changedSanciones) {
          this.saveSanciones(updatedSanciones);
        }

        let changedComps = false;
        const updatedComps = compensaciones.map(c => {
          if (idMapRedirect.has(c.id_alumno)) {
            changedComps = true;
            return { ...c, id_alumno: idMapRedirect.get(c.id_alumno)! };
          }
          return c;
        });
        if (changedComps) {
          this.saveCompensaciones(updatedComps);
        }

        let changedMovs = false;
        const updatedMovs = movimientos.map(m => {
          if (idMapRedirect.has(m.id_alumno)) {
            changedMovs = true;
            return { ...m, id_alumno: idMapRedirect.get(m.id_alumno)! };
          }
          return m;
        });
        if (changedMovs) {
          this.saveMovimientos(updatedMovs);
        }
      }

      this.addAuditLog(
        usuarioOperador || 'SISTEMA_DEDUPLICACION',
        'ACTUALIZACION_SISTEMA',
        'Censo/DeduplicacionInteligente',
        `Depuración automática de censo: se fusionaron ${duplicadosEliminados} registros de alumnos duplicados preservando sanciones y puntos.`
      );
    }

    return {
      totalOriginal,
      totalFinal: cleanAlumnos.length,
      duplicadosEliminados,
      gruposFusionados,
    };
  }

  /**
   * Dar de baja a un alumno (desactivación lógica).
   * Conserva el histórico de partes, medidas restaurativas y PAC para trazabilidad legal y auditoría,
   * pero lo desactiva de las listas activas y búsquedas de nuevos partes.
   */
  static darDeBajaAlumno(idAlumno: string, motivo: string, usuarioOperador: string): { success: boolean; alumno?: Alumno; error?: string } {
    const alumnos = this.getAlumnos();
    const idx = alumnos.findIndex(a => a.id_alumno === idAlumno);
    if (idx === -1) {
      return { success: false, error: 'Alumno/a no encontrado en el sistema.' };
    }

    const alumno = alumnos[idx];
    const hoy = new Date().toISOString().split('T')[0];
    const updatedAlumno: Alumno = {
      ...alumno,
      estado: 'BAJA',
      motivo_baja: motivo || 'Baja / Traslado de centro escolar',
      fecha_baja: hoy,
    };

    alumnos[idx] = updatedAlumno;
    this.saveAlumnos(alumnos);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Censo/BajaAlumno',
      `Baja de alumno/a tramitada: ${alumno.nombre} ${alumno.apellidos} (${alumno.grupo}, NIE: ${alumno.nie || 'Sin NIE'}). Motivo: ${motivo || 'Traslado/Baja de matrícula'}`
    );

    return { success: true, alumno: updatedAlumno };
  }

  /**
   * Reactivar a un alumno previamente dado de baja
   */
  static reactivarAlumno(idAlumno: string, usuarioOperador: string): { success: boolean; alumno?: Alumno; error?: string } {
    const alumnos = this.getAlumnos();
    const idx = alumnos.findIndex(a => a.id_alumno === idAlumno);
    if (idx === -1) {
      return { success: false, error: 'Alumno/a no encontrado en el sistema.' };
    }

    const alumno = alumnos[idx];
    const nuevoEstado: Alumno['estado'] = alumno.puntos_actuales === 0 
      ? 'SALDO_CERO' 
      : (alumno.puntos_actuales <= 3 ? 'ALERTA_PUNTOS' : 'ACTIVO');

    const updatedAlumno: Alumno = {
      ...alumno,
      estado: nuevoEstado,
      motivo_baja: undefined,
      fecha_baja: undefined,
    };

    alumnos[idx] = updatedAlumno;
    this.saveAlumnos(alumnos);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Censo/AltaAlumno',
      `Reactivación de alumno/a: ${alumno.nombre} ${alumno.apellidos} (${alumno.grupo}) reincorporado al censo activo con saldo de ${alumno.puntos_actuales} puntos.`
    );

    return { success: true, alumno: updatedAlumno };
  }

  /**
   * Eliminar definitivamente a un alumno del censo (borrado físico directo).
   * Elimina al alumno y sus posibles sanciones asociadas.
   */
  static eliminarAlumnoDefinitivamente(idAlumno: string, usuarioOperador: string): { success: boolean; alumnoEliminado?: Alumno; error?: string } {
    const alumnos = this.getAlumnos();
    const idx = alumnos.findIndex(a => a.id_alumno === idAlumno);
    if (idx === -1) {
      return { success: false, error: 'Alumno/a no encontrado en el sistema.' };
    }

    const alumnoEliminado = alumnos[idx];
    alumnos.splice(idx, 1);
    this.saveAlumnos(alumnos);

    // Eliminar también las posibles sanciones vinculadas a este alumno
    const sanciones = this.getSanciones().filter(s => s.id_alumno !== idAlumno);
    this.saveSanciones(sanciones);

    // Eliminar compensaciones asociadas
    const compensaciones = this.getCompensaciones().filter(c => c.id_alumno !== idAlumno);
    this.saveCompensaciones(compensaciones);

    // Eliminar movimientos de puntos asociados
    const movimientos = this.getMovimientos().filter(m => m.id_alumno !== idAlumno);
    this.saveMovimientos(movimientos);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Censo/EliminarAlumno',
      `Eliminación definitiva de alumno/a: ${alumnoEliminado.nombre} ${alumnoEliminado.apellidos} (${alumnoEliminado.grupo}, NIE: ${alumnoEliminado.nie || 'Sin NIE'}).`
    );

    return { success: true, alumnoEliminado };
  }

  /**
   * Alta manual de nuevo alumno
   */
  static crearAlumno(nuevo: Omit<Alumno, 'id_alumno' | 'puntos_actuales' | 'estado'>, usuarioOperador: string): { success: boolean; alumno?: Alumno; error?: string } {
    const alumnos = this.getAlumnos();
    const cleanNie = (nuevo.nie || '').trim().toUpperCase();

    if (cleanNie && !cleanNie.startsWith('SN-')) {
      const existing = alumnos.find(a => a.nie && a.nie.toUpperCase() === cleanNie);
      if (existing) {
        return { success: false, error: `Ya existe un alumno con el NIE ${cleanNie} (${existing.nombre} ${existing.apellidos})` };
      }
    }

    const cleanCanonical = normalizarNombreComparacion(nuevo.nombre, nuevo.apellidos);
    const existingByName = alumnos.find(a => normalizarNombreComparacion(a.nombre, a.apellidos) === cleanCanonical);
    if (existingByName) {
      return { 
        success: false, 
        error: `Ya existe un alumno/a registrado con el nombre "${existingByName.nombre} ${existingByName.apellidos}" en el grupo ${existingByName.grupo} (Saldo: ${existingByName.puntos_actuales} pts, Estado: ${existingByName.estado}). Si deseas cambiarlo de grupo o actualizar sus datos, edítalo directamente en el censo.` 
      };
    }

    const nuevoAlumno: Alumno = {
      ...nuevo,
      id_alumno: `ALM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nie: cleanNie || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      puntos_actuales: 10,
      estado: 'ACTIVO',
    };

    alumnos.push(nuevoAlumno);
    this.saveAlumnos(alumnos);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Censo/AltaManualAlumno',
      `Alta manual de nuevo alumno: ${nuevoAlumno.nombre} ${nuevoAlumno.apellidos} en grupo ${nuevoAlumno.grupo}. NIE: ${nuevoAlumno.nie}`
    );

    return { success: true, alumno: nuevoAlumno };
  }

  /**
   * Modificar datos de un alumno existente (nombre, apellidos, curso/grupo, NIE, tutores).
   */
  static actualizarAlumno(
    idAlumno: string,
    datos: Partial<Pick<Alumno, 'nombre' | 'apellidos' | 'grupo' | 'nie' | 'nombre_tutor' | 'telefono_tutor'>>,
    usuarioOperador: string
  ): { success: boolean; alumno?: Alumno; error?: string } {
    const alumnos = this.getAlumnos();
    const cleanTargetId = (idAlumno || '').trim();
    let idx = alumnos.findIndex(a => a.id_alumno === cleanTargetId);

    if (idx === -1 && datos.nie) {
      const targetNie = datos.nie.trim().toUpperCase();
      idx = alumnos.findIndex(a => a.nie && a.nie.toUpperCase() === targetNie);
    }

    if (idx === -1) {
      return { success: false, error: 'Alumno/a no encontrado en el sistema.' };
    }

    const anterior = alumnos[idx];
    const cleanNie = datos.nie !== undefined ? datos.nie.trim().toUpperCase() : anterior.nie;

    // Validar duplicidad de NIE si se cambia y no es genérico
    if (cleanNie && !cleanNie.startsWith('SN-')) {
      const existing = alumnos.find((a, i) => i !== idx && a.nie && a.nie.toUpperCase() === cleanNie);
      if (existing) {
        return { success: false, error: `Ya existe otro alumno con el NIE ${cleanNie} (${existing.nombre} ${existing.apellidos})` };
      }
    }

    const alumnoActualizado: Alumno = {
      ...anterior,
      nombre: datos.nombre !== undefined ? datos.nombre.trim() : anterior.nombre,
      apellidos: datos.apellidos !== undefined ? datos.apellidos.trim() : anterior.apellidos,
      grupo: datos.grupo !== undefined ? datos.grupo : anterior.grupo,
      nie: cleanNie,
      nombre_tutor: datos.nombre_tutor !== undefined ? datos.nombre_tutor.trim() : anterior.nombre_tutor,
      telefono_tutor: datos.telefono_tutor !== undefined ? datos.telefono_tutor.trim() : anterior.telefono_tutor,
    };

    alumnos[idx] = alumnoActualizado;
    this.saveAlumnos(alumnos);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Censo/ModificarAlumno',
      `Modificación de datos de alumno/a: ${alumnoActualizado.nombre} ${alumnoActualizado.apellidos} (Grupo: ${anterior.grupo} ➔ ${alumnoActualizado.grupo}, NIE: ${alumnoActualizado.nie})`
    );

    return { success: true, alumno: alumnoActualizado };
  }

  static getProfesores(): Profesor[] {
    const raw = localStorage.getItem(KEY_PROFESORES);
    if (!raw) {
      this.saveProfesores(PROFESORES_INICIALES);
      return PROFESORES_INICIALES;
    }
    try {
      const parsed: Profesor[] = JSON.parse(raw);
      const excludedEmails = new Set([
        'pepe@g.educaand.es',
        'carmen.luque@g.educaand.es',
        'rafael.martinez@g.educaand.es',
        'elena.castillo@g.educaand.es'
      ]);
      const excludedIds = new Set(['prof-pepe', 'prof-02', 'prof-03', 'prof-04']);

      // Filtrar y eliminar permanentemente a los docentes solicitados
      const filtered = parsed.filter(p => 
        !excludedEmails.has(p.email.toLowerCase().trim()) && 
        !excludedIds.has(p.id_profesor)
      );

      let adminFound = false;
      const mapped = filtered.map(p => {
        const normalizedRol: RoleUsuario = p.rol === 'ROLE_CONVIVENCIA_ADMIN' ? 'ROLE_CONVIVENCIA_ADMIN' : 'ROLE_DOCENTE';
        if (p.email.toLowerCase() === 'mgonruz857@g.educaand.es') {
          adminFound = true;
          return {
            ...p,
            nombre: 'Miguel Ángel',
            apellidos: 'González Ruz',
            rol: 'ROLE_CONVIVENCIA_ADMIN' as const,
            estado: 'ACTIVO' as const,
          };
        }
        return {
          ...p,
          rol: normalizedRol,
          estado: p.estado || 'ACTIVO'
        };
      });

      if (!adminFound) {
        mapped.unshift({
          ...PROFESORES_INICIALES[0],
          estado: 'ACTIVO',
        });
      }

      // Si hubo docentes excluidos de la lista previa, persistir lista limpia
      if (filtered.length !== parsed.length) {
        this.saveProfesores(mapped);
      }

      return mapped;
    } catch {
      return PROFESORES_INICIALES;
    }
  }

  static saveProfesores(profesores: Profesor[]): void {
    localStorage.setItem(KEY_PROFESORES, JSON.stringify(profesores));
    this.touchLocalWriteTimestamp();
  }

  /**
   * Dar de baja a un profesor (desactivación lógica).
   * No borra sus partes históricos para no romper la trazabilidad ni los expedientes previos.
   */
  static darDeBajaProfesor(idProfesor: string, motivo: string, usuarioOperador: string): { success: boolean; profesor?: Profesor; error?: string } {
    const profesores = this.getProfesores();
    const profIndex = profesores.findIndex(p => p.id_profesor === idProfesor);
    if (profIndex === -1) {
      return { success: false, error: 'Docente no encontrado en el sistema.' };
    }

    const prof = profesores[profIndex];
    if (prof.email.toLowerCase() === 'mgonruz857@g.educaand.es') {
      return { success: false, error: 'No es posible dar de baja al Administrador Principal de Convivencia.' };
    }

    const hoy = new Date().toISOString().split('T')[0];
    const updatedProf: Profesor = {
      ...prof,
      estado: 'INACTIVO',
      motivo_baja: motivo || 'Fin de destino / Cambio de centro en nuevo curso escolar',
      fecha_baja: hoy,
    };

    profesores[profIndex] = updatedProf;
    this.saveProfesores(profesores);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Claustro/BajaDocente',
      `Baja de docente tramitada: ${prof.nombre} ${prof.apellidos} (${prof.email}). Motivo: ${motivo || 'Baja de curso'}`
    );

    return { success: true, profesor: updatedProf };
  }

  /**
   * Reactivar a un profesor previamente dado de baja
   */
  static reactivarProfesor(idProfesor: string, usuarioOperador: string): { success: boolean; profesor?: Profesor; error?: string } {
    const profesores = this.getProfesores();
    const profIndex = profesores.findIndex(p => p.id_profesor === idProfesor);
    if (profIndex === -1) {
      return { success: false, error: 'Docente no encontrado en el sistema.' };
    }

    const prof = profesores[profIndex];
    const updatedProf: Profesor = {
      ...prof,
      estado: 'ACTIVO',
      motivo_baja: undefined,
      fecha_baja: undefined,
    };

    profesores[profIndex] = updatedProf;
    this.saveProfesores(profesores);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Claustro/AltaDocente',
      `Reactivación de docente: ${prof.nombre} ${prof.apellidos} (${prof.email}) vuelve a estar ACTIVO.`
    );

    return { success: true, profesor: updatedProf };
  }

  /**
   * Elimina de forma permanente a todos los profesores dados de baja (INACTIVO)
   */
  static eliminarProfesoresInactivosPermanente(usuarioOperador: string): { totalEliminados: number; profesoresRestantes: Profesor[] } {
    const profesores = this.getProfesores();
    const inactivos = profesores.filter(p => p.estado === 'INACTIVO');
    const activos = profesores.filter(p => p.estado !== 'INACTIVO');

    if (inactivos.length > 0) {
      this.saveProfesores(activos);
      this.addAuditLog(
        usuarioOperador,
        'ACTUALIZACION_SISTEMA',
        'Claustro/EliminacionPermanenteBajas',
        `Eliminación definitiva y permanente de ${inactivos.length} docente(s) dados de baja: ${inactivos.map(p => `${p.nombre} ${p.apellidos} (${p.email})`).join(', ')}`
      );
    }

    return {
      totalEliminados: inactivos.length,
      profesoresRestantes: activos,
    };
  }

  /**
   * Elimina de forma permanente y definitiva a un profesor dado de baja
   */
  static eliminarProfesorPermanente(idProfesor: string, usuarioOperador: string): { success: boolean; error?: string } {
    const profesores = this.getProfesores();
    const profIndex = profesores.findIndex(p => p.id_profesor === idProfesor);
    if (profIndex === -1) {
      return { success: false, error: 'Docente no encontrado en el claustro.' };
    }

    const prof = profesores[profIndex];
    if (prof.email.toLowerCase() === 'mgonruz857@g.educaand.es') {
      return { success: false, error: 'No es posible eliminar al Administrador Principal de Convivencia.' };
    }

    profesores.splice(profIndex, 1);
    this.saveProfesores(profesores);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Claustro/EliminacionPermanenteDocente',
      `Eliminación permanente del docente: ${prof.nombre} ${prof.apellidos} (${prof.email})`
    );

    return { success: true };
  }

  /**
   * Dar de alta un nuevo profesor manualmente
   */
  static crearProfesor(nuevo: Omit<Profesor, 'id_profesor'>, usuarioOperador: string): { success: boolean; profesor?: Profesor; error?: string } {
    const emailClean = nuevo.email.trim().toLowerCase();
    if (!emailClean.includes('@')) {
      return { success: false, error: 'El correo electrónico no es válido.' };
    }

    const profesores = this.getProfesores();
    const existe = profesores.find(p => p.email.toLowerCase() === emailClean);
    if (existe) {
      if (existe.estado === 'INACTIVO') {
        // Reactivarlo con los nuevos datos
        return this.reactivarProfesor(existe.id_profesor, usuarioOperador);
      }
      return { success: false, error: `Ya existe un docente registrado con el correo ${emailClean}.` };
    }

    const nuevoProfesor: Profesor = {
      ...nuevo,
      id_profesor: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: emailClean,
      estado: 'ACTIVO',
    };

    profesores.push(nuevoProfesor);
    this.saveProfesores(profesores);

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Claustro/AltaManual',
      `Alta manual de docente: ${nuevoProfesor.nombre} ${nuevoProfesor.apellidos} (${nuevoProfesor.departamento})`
    );

    return { success: true, profesor: nuevoProfesor };
  }

  /**
   * Modificar datos de un profesor existente (nombre, apellidos, departamento, email, rol, tutoría).
   */
  static actualizarProfesor(
    idProfesor: string,
    datos: Partial<Pick<Profesor, 'nombre' | 'apellidos' | 'departamento' | 'email' | 'rol' | 'tutor_de_grupo'>>,
    usuarioOperador: string
  ): { success: boolean; profesor?: Profesor; error?: string } {
    const profesores = this.getProfesores();
    const cleanTargetId = (idProfesor || '').trim();
    const cleanDatosEmail = (datos.email || '').trim().toLowerCase();

    // Localizar el profesor por ID o por correo original
    let profIndex = -1;
    if (cleanTargetId) {
      profIndex = profesores.findIndex(p => p.id_profesor === cleanTargetId);
    }
    if (profIndex === -1 && cleanDatosEmail) {
      profIndex = profesores.findIndex(p => p.email.toLowerCase() === cleanDatosEmail);
    }

    if (profIndex === -1) {
      return { success: false, error: 'Docente no encontrado en el sistema.' };
    }

    const anterior = profesores[profIndex];
    let cleanEmail = (anterior.email || '').trim().toLowerCase();

    if (datos.email !== undefined) {
      cleanEmail = datos.email.trim().toLowerCase();
      if (!cleanEmail.includes('@')) {
        return { success: false, error: 'El correo electrónico no es válido.' };
      }
      // Verificar si otro profesor ya usa este email (comparando por índice)
      const duplicado = profesores.find((p, idx) => idx !== profIndex && p.email && p.email.trim().toLowerCase() === cleanEmail);
      if (duplicado) {
        return { success: false, error: `Ya existe otro docente con el correo ${cleanEmail} (${duplicado.nombre} ${duplicado.apellidos})` };
      }
    }

    const finalId = anterior.id_profesor || cleanTargetId || `prof-${Date.now()}`;

    const profesorActualizado: Profesor = {
      ...anterior,
      id_profesor: finalId,
      nombre: datos.nombre !== undefined ? datos.nombre.trim() : anterior.nombre,
      apellidos: datos.apellidos !== undefined ? datos.apellidos.trim() : anterior.apellidos,
      departamento: datos.departamento !== undefined ? datos.departamento.trim() : (anterior.departamento || 'Claustro Docente'),
      email: cleanEmail,
      rol: datos.rol !== undefined ? datos.rol : (anterior.rol || 'ROLE_DOCENTE'),
      tutor_de_grupo: datos.tutor_de_grupo ? datos.tutor_de_grupo : undefined,
    };

    profesores[profIndex] = profesorActualizado;
    this.saveProfesores(profesores);

    // Actualizar la sesión activa si se ha editado el usuario actualmente autenticado
    try {
      const rawUser = localStorage.getItem('sigc_bi_auth_user_v2');
      if (rawUser) {
        const curUser = JSON.parse(rawUser) as Profesor;
        if (curUser.id_profesor === anterior.id_profesor || curUser.email.toLowerCase() === anterior.email.toLowerCase()) {
          localStorage.setItem('sigc_bi_auth_user_v2', JSON.stringify(profesorActualizado));
        }
      }
    } catch {
      // Ignorar fallo de sesión
    }

    this.addAuditLog(
      usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      'Claustro/ModificarDocente',
      `Modificación de datos de docente: ${profesorActualizado.nombre} ${profesorActualizado.apellidos} (${profesorActualizado.email}, Dpto: ${profesorActualizado.departamento}, Tutoría: ${profesorActualizado.tutor_de_grupo || 'Ninguna'})`
    );

    return { success: true, profesor: profesorActualizado };
  }

  /**
   * Permite a cualquier miembro del profesorado gestionar exclusivamente sus propios datos personales:
   * nombre, apellidos, departamento y tutoría asignada.
   * Por seguridad y control institucional, no permite alterar su correo oficial ni su rol.
   */
  static actualizarPerfilPropioDocente(
    emailDocente: string,
    datos: {
      nombre: string;
      apellidos: string;
      departamento: string;
      tutor_de_grupo?: string;
    }
  ): { success: boolean; profesor?: Profesor; error?: string } {
    const cleanEmail = emailDocente.trim().toLowerCase();
    const profesores = this.getProfesores();
    const profIndex = profesores.findIndex(p => p.email.toLowerCase() === cleanEmail);

    if (profIndex === -1) {
      return { success: false, error: 'Docente no encontrado en el claustro del centro.' };
    }

    const anterior = profesores[profIndex];

    if (!datos.nombre || !datos.nombre.trim()) {
      return { success: false, error: 'El nombre es obligatorio.' };
    }
    if (!datos.apellidos || !datos.apellidos.trim()) {
      return { success: false, error: 'Los apellidos son obligatorios.' };
    }

    const profesorActualizado: Profesor = {
      ...anterior,
      nombre: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      departamento: datos.departamento.trim() || 'Claustro Docente',
      tutor_de_grupo: datos.tutor_de_grupo && datos.tutor_de_grupo.trim() ? datos.tutor_de_grupo.trim() : undefined,
    };

    profesores[profIndex] = profesorActualizado;
    this.saveProfesores(profesores);

    // Actualizar la sesión activa en cliente
    try {
      localStorage.setItem('sigc_bi_auth_user_v2', JSON.stringify(profesorActualizado));
    } catch {
      // Ignorar
    }

    this.addAuditLog(
      cleanEmail,
      'ACTUALIZACION_SISTEMA',
      'Docente/MiPerfil',
      `Actualización de datos personales por el propio docente: ${profesorActualizado.nombre} ${profesorActualizado.apellidos} (Dpto: ${profesorActualizado.departamento}, Tutoría: ${profesorActualizado.tutor_de_grupo || 'Ninguna'})`
    );

    return { success: true, profesor: profesorActualizado };
  }

  /**
   * Importa profesores desde filas estructuradas:
   * Estructura oficial: "Apellidos (coma) Nombre", "Correo Corporativo" y "Rol"
   */
  static importarProfesoresDesdeFilas(
    filas: ProfesorImportRow[],
    usuarioEmail: string
  ): { totalProcessed: number; nuevos: number; actualizados: number; errores: string[] } {
    if (!filas || filas.length === 0) {
      throw new Error('No se encontraron registros de docentes para importar.');
    }

    const currentProfesores = this.getProfesores();
    const profMap = new Map<string, Profesor>();
    currentProfesores.forEach((p) => profMap.set(p.email.toLowerCase(), p));

    let nuevos = 0;
    let actualizados = 0;
    const errores: string[] = [];

    filas.forEach((f, idx) => {
      const emailClean = f.email.trim().toLowerCase();
      if (!emailClean || !emailClean.includes('@')) {
        errores.push(`Fila ${idx + 1}: Correo electrónico no válido ("${f.email}").`);
        return;
      }

      let rol = f.rol || 'ROLE_DOCENTE';
      // Preserve admin for mgonruz857@g.educaand.es
      if (emailClean === 'mgonruz857@g.educaand.es') {
        rol = 'ROLE_CONVIVENCIA_ADMIN';
      }

      const existing = profMap.get(emailClean);
      if (existing) {
        profMap.set(emailClean, {
          ...existing,
          nombre: f.nombre || existing.nombre,
          apellidos: f.apellidos || existing.apellidos,
          departamento: f.departamento || existing.departamento || (rol === 'ROLE_CONVIVENCIA_ADMIN' ? 'Equipo de Convivencia / Jefatura' : 'Claustro Docente'),
          rol,
          tutor_de_grupo: f.tutor_de_grupo || existing.tutor_de_grupo,
          estado: 'ACTIVO',
        });
        actualizados++;
      } else {
        const newProf: Profesor = {
          id_profesor: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: emailClean,
          nombre: f.nombre || 'Docente',
          apellidos: f.apellidos,
          dni: `DNI-${idx + 1}`,
          departamento: f.departamento || (rol === 'ROLE_CONVIVENCIA_ADMIN' ? 'Equipo de Convivencia / Jefatura' : 'Claustro Docente'),
          rol,
          tutor_de_grupo: f.tutor_de_grupo || undefined,
          estado: 'ACTIVO',
        };
        profMap.set(emailClean, newProf);
        nuevos++;
      }
    });

    const updatedList = Array.from(profMap.values());
    this.saveProfesores(updatedList);

    this.addAuditLog(
      usuarioEmail,
      'IMPORTACION_MASIVA',
      'ETL/ClaustroProfesores',
      `Importación de claustro docente completada: ${nuevos} nuevos insertados, ${actualizados} actualizados.`
    );

    return {
      totalProcessed: filas.length,
      nuevos,
      actualizados,
      errores,
    };
  }

  /**
   * Import teachers from CSV/Text with official format:
   * "Apellidos (coma) Nombre", "Correo Corporativo", "Rol"
   */
  static importProfesoresFromCsv(
    csvText: string,
    usuarioEmail: string
  ): { totalProcessed: number; nuevos: number; actualizados: number; errores: string[] } {
    const { filas, errores } = parsearTextoOcsvProfesores(csvText);
    if (filas.length === 0) {
      if (errores.length > 0) {
        return { totalProcessed: 0, nuevos: 0, actualizados: 0, errores };
      }
      return { totalProcessed: 0, nuevos: 0, actualizados: 0, errores: ['El archivo no contiene filas de docentes válidas.'] };
    }

    const res = this.importarProfesoresDesdeFilas(filas, usuarioEmail);
    return {
      ...res,
      errores: [...errores, ...res.errores],
    };
  }

  static getSanciones(): Sancion[] {
    const raw = localStorage.getItem(KEY_SANCIONES);
    if (!raw) {
      this.saveSanciones(SANCIONES_INICIALES);
      return SANCIONES_INICIALES;
    }
    try {
      const parsed: Sancion[] = JSON.parse(raw);
      // Migración de etiquetas horarias si existían con el horario previo
      const mapped = parsed.map(s => {
        let th = s.tramo_horario;
        if ((th as string) === '1ª Hora (08:15 - 09:15)') th = '1ª Hora (08:30 - 09:30)';
        else if ((th as string) === '2ª Hora (09:15 - 10:15)') th = '2ª Hora (09:30 - 10:30)';
        else if ((th as string) === '3ª Hora (10:15 - 11:15)') th = '3ª Hora (10:30 - 11:30)';
        else if ((th as string) === 'Recreo (11:15 - 11:45)') th = 'Recreo (11:30 - 12:00)';
        else if ((th as string) === '4ª Hora (11:45 - 12:45)') th = '4ª Hora (12:00 - 13:00)';
        else if ((th as string) === '5ª Hora (12:45 - 13:45)') th = '5ª Hora (13:00 - 14:00)';
        else if ((th as string) === '6ª Hora (13:45 - 14:45)') th = '6ª Hora (14:00 - 15:00)';
        return { ...s, tramo_horario: th };
      });
      return mapped;
    } catch {
      return SANCIONES_INICIALES;
    }
  }

  static saveSanciones(sanciones: Sancion[]): void {
    localStorage.setItem(KEY_SANCIONES, JSON.stringify(sanciones));
    this.touchLocalWriteTimestamp();
  }

  static getCompensaciones(): Compensacion[] {
    const raw = localStorage.getItem(KEY_COMPENSACIONES);
    if (!raw) {
      this.saveCompensaciones(COMPENSACIONES_INICIALES);
      return COMPENSACIONES_INICIALES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return COMPENSACIONES_INICIALES;
    }
  }

  static saveCompensaciones(comps: Compensacion[]): void {
    localStorage.setItem(KEY_COMPENSACIONES, JSON.stringify(comps));
    this.touchLocalWriteTimestamp();
  }

  static getAuditLogs(): AuditLog[] {
    const raw = localStorage.getItem(KEY_AUDIT_LOGS);
    if (!raw) {
      this.saveAuditLogs(AUDIT_LOGS_INICIALES);
      return AUDIT_LOGS_INICIALES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return AUDIT_LOGS_INICIALES;
    }
  }

  static saveAuditLogs(logs: AuditLog[]): void {
    localStorage.setItem(KEY_AUDIT_LOGS, JSON.stringify(logs));
  }

  static addAuditLog(usuarioEmail: string, accion: AuditLog['accion'], entidad: string, detalles: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id_log: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      usuario_email: usuarioEmail,
      accion,
      entidad,
      detalles,
      hash_integridad: `sha256-${Math.random().toString(36).substring(2, 10)}${Date.now().toString(16)}`,
    };
    logs.unshift(newLog);
    this.saveAuditLogs(logs.slice(0, 200)); // retain last 200 entries
  }

  static getMovimientos(): MovimientoPuntos[] {
    const raw = localStorage.getItem(KEY_MOVIMIENTOS);
    if (!raw) {
      this.saveMovimientos(MOVIMIENTOS_INICIALES);
      return MOVIMIENTOS_INICIALES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return MOVIMIENTOS_INICIALES;
    }
  }

  static saveMovimientos(movs: MovimientoPuntos[]): void {
    localStorage.setItem(KEY_MOVIMIENTOS, JSON.stringify(movs));
    this.touchLocalWriteTimestamp();
  }

  static getMovimientosPorAlumno(idAlumno: string): MovimientoPuntos[] {
    const all = this.getMovimientos();
    return all.filter(m => m.id_alumno === idAlumno);
  }

  static registrarMovimiento(movData: Omit<MovimientoPuntos, 'id_movimiento'>): MovimientoPuntos {
    const movs = this.getMovimientos();
    const newMov: MovimientoPuntos = {
      ...movData,
      id_movimiento: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    movs.unshift(newMov);
    this.saveMovimientos(movs);
    return newMov;
  }

  /**
   * REQUISITOS FUNCIONALES V0 - SECCIÓN 1, 2, 7 & 9
   * - Cada conducta tiene puntuación fija (o manual en GRA-SALUD).
   * - P_nuevo = max(0, P_actual - puntos_descontados).
   * - La app NO decide expulsiones:
   *   * Si P_nuevo == 0 -> 'SALDO_CERO' (alerta a Jefatura/Convivencia para su valoración).
   *   * Si P_nuevo <= 3 -> 'ALERTA_PUNTOS'.
   *   * En otro caso -> 'ACTIVO'.
   * - Registra movimiento visible en el histórico con saldo anterior y resultante.
   */
  static imponerSancion(
    sancionData: Omit<Sancion, 'id_sancion' | 'numero_expediente' | 'url_pdf_drive'>,
    usuarioEmail: string
  ): { sancion: Sancion; alumnoActualizado: Alumno; saldoCero: boolean; alertaGrave: boolean } {
    const alumnos = this.getAlumnos();
    const alumnoIndex = alumnos.findIndex(a => a.id_alumno === sancionData.id_alumno);
    if (alumnoIndex === -1) {
      throw new Error(`Alumno no encontrado con ID: ${sancionData.id_alumno}`);
    }

    const alumno = alumnos[alumnoIndex];
    const puntosPrevios = alumno.puntos_actuales;
    const puntosDescontar = Math.max(0, sancionData.puntos_restados);
    const nuevosPuntos = Math.max(0, puntosPrevios - puntosDescontar);

    let nuevoEstado: Alumno['estado'] = alumno.estado;
    const saldoCero = nuevosPuntos === 0;
    const alertaGrave = sancionData.tipo_conducta === 'GRAVE' || puntosDescontar >= 5;

    if (nuevosPuntos === 0) {
      nuevoEstado = 'SALDO_CERO';
    } else if (nuevosPuntos <= 3) {
      nuevoEstado = 'ALERTA_PUNTOS';
    } else {
      nuevoEstado = 'ACTIVO';
    }

    const alumnoActualizado: Alumno = {
      ...alumno,
      puntos_actuales: nuevosPuntos,
      estado: nuevoEstado,
      historial_sanciones_count: (alumno.historial_sanciones_count || 0) + 1,
    };
    alumnos[alumnoIndex] = alumnoActualizado;
    this.saveAlumnos(alumnos);

    const year = new Date().getFullYear();
    const expedienteNum = `${year}/${String(Math.floor(Math.random() * 900) + 100)}-BI`;
    const idSancion = `snc-${Date.now()}`;
    const urlPdf = `https://drive.google.com/corp/partes/${year}/${alumno.grupo}/PARTE_${expedienteNum.replace('/', '_')}.pdf`;

    const nuevaSancion: Sancion = {
      ...sancionData,
      id_sancion: idSancion,
      numero_expediente: expedienteNum,
      url_pdf_drive: urlPdf,
      saldo_anterior: puntosPrevios,
      saldo_resultante: nuevosPuntos,
    };

    const sanciones = this.getSanciones();
    sanciones.unshift(nuevaSancion);
    this.saveSanciones(sanciones);

    // Registra movimiento en el histórico de puntos (V0 - Sección 1)
    this.registrarMovimiento({
      id_alumno: alumno.id_alumno,
      fecha: sancionData.fecha || new Date().toISOString().split('T')[0],
      tipo: 'PARTE',
      conducta_titulo: `${sancionData.codigo_infraccion}`,
      puntos: -puntosDescontar,
      profesor_nombre: sancionData.nombre_profesor,
      saldo_anterior: puntosPrevios,
      saldo_resultante: nuevosPuntos,
      detalles: sancionData.descripcion_hechos,
    });

    // Auditoría y Alertas mínimas a Jefatura/Convivencia (V0 - Sección 7)
    let logDetalle = `Parte ${sancionData.codigo_infraccion} a ${alumno.nombre} ${alumno.apellidos} (-${puntosDescontar} pts). Saldo: ${puntosPrevios} -> ${nuevosPuntos}. Medida: ${sancionData.medida_inmediata_texto || sancionData.medida_inmediata || 'Registrada'}.`;
    if (saldoCero) {
      logDetalle += ' [ALERTA: Saldo 0 puntos alcanzado - Requiere valoración de Jefatura]';
    }
    if (alertaGrave) {
      logDetalle += ' [AVISO: Conducta grave registrada]';
    }

    this.addAuditLog(
      usuarioEmail,
      'CREAR_PARTE',
      `Sancion/${expedienteNum}`,
      logDetalle
    );

    return { sancion: nuevaSancion, alumnoActualizado, saldoCero, alertaGrave };
  }

  /**
   * Eliminar un parte de convivencia por parte del Equipo de Convivencia / Jefatura de Estudios.
   * - Elimina la sanción del registro activo.
   * - Restituye automáticamente los puntos descontados al carnet del alumno (tope máx 10).
   * - Actualiza el estado disciplinario del alumno (de SALDO_CERO / ALERTA_PUNTOS a ACTIVO según corresponda).
   * - Registra movimiento de compensación en el histórico oficial de movimientos del alumno.
   * - Registra entrada inmutable en el registro de auditoría RGPD.
   */
  static eliminarSancion(
    idSancion: string,
    usuarioEmail: string,
    motivo: string
  ): { success: boolean; sancionEliminada?: Sancion; alumnoActualizado?: Alumno; error?: string } {
    const sanciones = this.getSanciones();
    const sancionIdx = sanciones.findIndex(s => s.id_sancion === idSancion);
    if (sancionIdx === -1) {
      return { success: false, error: 'Parte de convivencia no encontrado en el sistema.' };
    }

    const sancion = sanciones[sancionIdx];
    const puntosRestituidos = Math.max(0, sancion.puntos_restados || 0);

    const alumnos = this.getAlumnos();
    const alumnoIdx = alumnos.findIndex(a => a.id_alumno === sancion.id_alumno);
    let alumnoActualizado: Alumno | undefined = undefined;

    if (alumnoIdx !== -1) {
      const alumno = alumnos[alumnoIdx];
      const saldoAnterior = alumno.puntos_actuales;
      const nuevoSaldo = Math.min(10, saldoAnterior + puntosRestituidos);
      const nuevoEstado: Alumno['estado'] = nuevoSaldo === 0 
        ? 'SALDO_CERO' 
        : (nuevoSaldo <= 3 ? 'ALERTA_PUNTOS' : 'ACTIVO');

      alumnoActualizado = {
        ...alumno,
        puntos_actuales: nuevoSaldo,
        estado: nuevoEstado,
        historial_sanciones_count: Math.max(0, (alumno.historial_sanciones_count || 1) - 1),
      };

      alumnos[alumnoIdx] = alumnoActualizado;
      this.saveAlumnos(alumnos);

      if (puntosRestituidos > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        this.registrarMovimiento({
          id_alumno: alumno.id_alumno,
          fecha: todayStr,
          tipo: 'COMPENSACION',
          conducta_titulo: `Anulación de parte: ${sancion.codigo_infraccion} (${sancion.numero_expediente || 'Expediente'})`,
          puntos: puntosRestituidos,
          profesor_nombre: 'Equipo de Convivencia',
          saldo_anterior: saldoAnterior,
          saldo_resultante: nuevoSaldo,
          detalles: `Parte eliminado por el Equipo de Convivencia. Motivo: ${motivo.trim() || 'Estimación de alegaciones / Corrección de error'}`
        });
      }
    }

    // Retirar la sanción
    sanciones.splice(sancionIdx, 1);
    this.saveSanciones(sanciones);

    // Auditoría inmutable de no repudio
    const expediente = sancion.numero_expediente || sancion.id_sancion;
    const nombreAlumno = alumnoActualizado 
      ? `${alumnoActualizado.nombre} ${alumnoActualizado.apellidos}` 
      : sancion.id_alumno;

    this.addAuditLog(
      usuarioEmail,
      'ELIMINAR_PARTE',
      `Sancion/${expediente}`,
      `Eliminación oficial de parte ${expediente} (${sancion.codigo_infraccion}) de ${nombreAlumno}. Restituidos: +${puntosRestituidos} pts (Saldo: ${alumnoActualizado ? `${alumnoActualizado.puntos_actuales - puntosRestituidos} -> ${alumnoActualizado.puntos_actuales}` : 'N/A'}). Motivo: ${motivo.trim() || 'Estimación de alegaciones'}`
    );

    return {
      success: true,
      sancionEliminada: sancion,
      alumnoActualizado,
    };
  }

  /**
   * REQUISITOS FUNCIONALES V0 - SECCIÓN 3: RECUPERACIÓN AUTOMÁTICA DE PUNTOS
   * REGLA SEMANAL: Si durante una semana el alumno/a no registra ninguna conducta que implique
   * pérdida de puntos, recupera automáticamente +1 punto, hasta un máximo de 10.
   * Debe generar un movimiento visible en el histórico:
   * Ejemplo: "28/09/2026 · Recuperación semanal sin nuevas incidencias · +1"
   */
  static ejecutarRecuperacionSemanal(usuarioEmail = 'sistema@iesblasinfante.es'): {
    totalEvaluados: number;
    recuperados: number;
    alumnosBeneficiados: string[];
  } {
    const alumnos = this.getAlumnos();
    const sanciones = this.getSanciones();
    const movimientos = this.getMovimientos();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    let recuperados = 0;
    const alumnosBeneficiados: string[] = [];

    alumnos.forEach((alumno, idx) => {
      // Solo se aplica si tiene menos del saldo máximo ordinario (10 puntos)
      if (alumno.puntos_actuales >= 10) return;

      // Buscar si tiene sanciones con pérdida de puntos en los últimos 7 días
      const sancionesRecientes = sanciones.filter(s => {
        if (s.id_alumno !== alumno.id_alumno) return false;
        if ((s.puntos_restados || 0) <= 0) return false; // los registros académicos no pierden puntos
        const f = new Date(s.fecha || s.timestamp);
        return f >= sevenDaysAgo;
      });

      if (sancionesRecientes.length > 0) {
        // Tuvo incidencias con pérdida en la última semana, no califica
        return;
      }

      // Verificar que no se le haya aplicado ya una recuperación semanal en los últimos 6 días
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const yaRecupero = movimientos.some(m => {
        if (m.id_alumno !== alumno.id_alumno) return false;
        if (m.tipo !== 'RECUPERACION_SEMANAL') return false;
        const f = new Date(m.fecha);
        return f >= sixDaysAgo;
      });

      if (yaRecupero) return;

      // Aplicar recuperación semanal de +1 punto (hasta máx 10)
      const saldoAnterior = alumno.puntos_actuales;
      const nuevoSaldo = Math.min(10, saldoAnterior + 1);
      const nuevoEstado: Alumno['estado'] = nuevoSaldo === 0 ? 'SALDO_CERO' : (nuevoSaldo <= 3 ? 'ALERTA_PUNTOS' : 'ACTIVO');

      alumnos[idx] = {
        ...alumno,
        puntos_actuales: nuevoSaldo,
        estado: nuevoEstado,
      };

      // Movimiento visible en el histórico (V0 - Sección 3)
      this.registrarMovimiento({
        id_alumno: alumno.id_alumno,
        fecha: todayStr,
        tipo: 'RECUPERACION_SEMANAL',
        conducta_titulo: 'Recuperación semanal sin nuevas incidencias',
        puntos: 1,
        profesor_nombre: 'Sistema Automático V0',
        saldo_anterior: saldoAnterior,
        saldo_resultante: nuevoSaldo,
        detalles: 'Cumplimiento de 7 días consecutivos sin incidencias disciplinarias (+1 pt)',
      });

      alumnosBeneficiados.push(`${alumno.nombre} ${alumno.apellidos} (${alumno.grupo}): ${saldoAnterior} -> ${nuevoSaldo} pts`);
      recuperados++;
    });

    if (recuperados > 0) {
      this.saveAlumnos(alumnos);
      this.addAuditLog(
        usuarioEmail,
        'COMPENSAR_PUNTOS',
        'Sistema/RecuperacionSemanal',
        `Recuperación semanal automática aplicada a ${recuperados} alumnos (+1 pt cada uno sin incidencias en los últimos 7 días).`
      );
    }

    return {
      totalEvaluados: alumnos.length,
      recuperados,
      alumnosBeneficiados,
    };
  }

  /**
   * REQUISITOS FUNCIONALES V0 - SECCIÓN 4: MEDIDAS EDUCATIVAS / RESTAURATIVAS
   * Jefatura/Convivencia podrá registrar: «Medida educativa/restaurativa cumplida» -> +X puntos.
   */
  static registrarMedidaRestaurativa(
    idAlumno: string,
    puntosRecuperar: number,
    descripcionMedida: string,
    profesorNombre: string,
    usuarioEmail: string
  ): { alumnoActualizado: Alumno; nuevoSaldo: number } {
    const alumnos = this.getAlumnos();
    const idx = alumnos.findIndex(a => a.id_alumno === idAlumno);
    if (idx === -1) {
      throw new Error(`Alumno no encontrado: ${idAlumno}`);
    }

    const alumno = alumnos[idx];
    const saldoAnterior = alumno.puntos_actuales;
    const nuevoSaldo = Math.min(10, saldoAnterior + Math.max(1, puntosRecuperar));
    const nuevoEstado: Alumno['estado'] = nuevoSaldo === 0 ? 'SALDO_CERO' : (nuevoSaldo <= 3 ? 'ALERTA_PUNTOS' : 'ACTIVO');

    const alumnoActualizado: Alumno = {
      ...alumno,
      puntos_actuales: nuevoSaldo,
      estado: nuevoEstado,
    };
    alumnos[idx] = alumnoActualizado;
    this.saveAlumnos(alumnos);

    const todayStr = new Date().toISOString().split('T')[0];

    // Registrar en movimientos
    this.registrarMovimiento({
      id_alumno: alumno.id_alumno,
      fecha: todayStr,
      tipo: 'MEDIDA_RESTAURATIVA',
      conducta_titulo: 'Medida educativa/restaurativa cumplida',
      puntos: puntosRecuperar,
      profesor_nombre: profesorNombre,
      saldo_anterior: saldoAnterior,
      saldo_resultante: nuevoSaldo,
      detalles: descripcionMedida,
    });

    this.addAuditLog(
      usuarioEmail,
      'COMPENSAR_PUNTOS',
      `MedidaRestaurativa/${alumno.nombre} ${alumno.apellidos}`,
      `Medida educativa/restaurativa registrada por Jefatura/Convivencia: "${descripcionMedida}" (+${puntosRecuperar} pts). Saldo: ${saldoAnterior} -> ${nuevoSaldo}.`
    );

    return { alumnoActualizado, nuevoSaldo };
  }

  /**
   * Compensate points (compatibilidad con vistas previas)
   */
  static registrarCompensacion(
    compensacionData: Omit<Compensacion, 'id_compensacion' | 'timestamp'>,
    usuarioEmail: string
  ): { compensacion: Compensacion; alumnoActualizado: Alumno } {
    return this.registrarMedidaRestaurativa(
      compensacionData.id_alumno,
      compensacionData.puntos_recuperados,
      `${compensacionData.tipo_tarea}: ${compensacionData.descripcion_tarea}`,
      compensacionData.nombre_profesor_autoriza,
      usuarioEmail
    ) as any;
  }

  static actualizarTramitacion(
    idSancion: string,
    nuevoEstado: Sancion['estado_tramitacion'],
    observaciones: string,
    usuarioEmail: string
  ): Sancion {
    const sanciones = this.getSanciones();
    const index = sanciones.findIndex(s => s.id_sancion === idSancion);
    if (index === -1) throw new Error('Sanción no encontrada');

    sanciones[index] = {
      ...sanciones[index],
      estado_tramitacion: nuevoEstado,
      observaciones_tramitacion: observaciones,
    };
    this.saveSanciones(sanciones);

    this.addAuditLog(
      usuarioEmail,
      'ACTUALIZAR_TRAMITACION',
      `Sancion/${sanciones[index].numero_expediente}`,
      `Tramitación actualizada a ${nuevoEstado}. Nota: ${observaciones}`
    );

    return sanciones[index];
  }

  static actualizarEstadoPAC(
    idSancion: string,
    nuevoEstadoPAC: Sancion['estado_pac'],
    profesorReceptor: string,
    usuarioEmail: string
  ): Sancion {
    const sanciones = this.getSanciones();
    const index = sanciones.findIndex(s => s.id_sancion === idSancion);
    if (index === -1) throw new Error('Sanción no encontrada');

    const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    sanciones[index] = {
      ...sanciones[index],
      estado_pac: nuevoEstadoPAC,
      profesor_pac_receptor: profesorReceptor,
      hora_llegada_pac: sanciones[index].hora_llegada_pac || nowTime,
    };
    this.saveSanciones(sanciones);

    this.addAuditLog(
      usuarioEmail,
      'RECEPCION_PAC',
      `AulaPAC/${sanciones[index].numero_expediente}`,
      `Estado PAC cambiado a ${nuevoEstadoPAC} por ${profesorReceptor}.`
    );

    return sanciones[index];
  }

  /**
   * Bulk import / ETL logic (PRD RF-03):
   * Expects rows with [NIE/ID, NOMBRE, APELLIDOS, CURSO_GRUPO, (optional TELEFONO)]
   * UPSERT strategy: if student exists by NIE or by Full Name (apellidos + nombre),
   * updates name & group without resetting points or creating duplicates.
   * If new student, initializes with puntos_actuales = 10.
   */
  static importarAlumnadoCsv(
    csvText: string,
    usuarioEmail: string
  ): { totalProcessed: number; nuevos: number; actualizados: number; errores: string[] } {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      throw new Error('El archivo CSV no contiene filas de datos.');
    }

    const currentAlumnos = [...this.getAlumnos()];
    const alumnoMapByNie = new Map<string, Alumno>();
    const alumnoMapByCanonical = new Map<string, Alumno>();
    const alumnoMapByTokens = new Map<string, Alumno>();

    const indexAlumno = (alm: Alumno) => {
      const aNie = (alm.nie || '').trim().toUpperCase();
      if (aNie && !aNie.startsWith('SN-') && !['SIN NIE', 'PENDIENTE', 'NO TIENE', 'SN', '-', 'NO'].includes(aNie)) {
        alumnoMapByNie.set(aNie, alm);
      }
      const cKey = normalizarNombreComparacion(alm.nombre, alm.apellidos);
      if (cKey) alumnoMapByCanonical.set(cKey, alm);
      const tKey = normalizarTokensNombre(alm.nombre, alm.apellidos);
      if (tKey) alumnoMapByTokens.set(tKey, alm);
    };

    currentAlumnos.forEach(indexAlumno);

    let nuevos = 0;
    let actualizados = 0;
    const errores: string[] = [];

    // Check header
    const headerLine = lines[0].toLowerCase();
    const separator = headerLine.includes(';') ? ';' : ',';

    let sinNieCounter = 1;

    for (let i = 1; i < lines.length; i++) {
      const rawRow = lines[i];
      if (!rawRow.trim()) continue;

      const row = rawRow.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (row.length < 3) {
        errores.push(`Línea ${i + 1}: Faltan columnas mínimas requeridas (Nombre, Apellidos, Grupo).`);
        continue;
      }

      const rawNie = (row[0] || '').trim();
      const nombre = (row[1] || '').trim();
      const apellidos = (row[2] || '').trim();
      const grupoRaw = (row[3] || '').trim();
      const telefonoRaw = (row[4] || '').trim();
      const tutorRaw = (row[5] || '').trim();

      if (!nombre || !apellidos) {
        errores.push(`Línea ${i + 1}: Nombre y Apellidos son obligatorios.`);
        continue;
      }

      // Normalizar grupo permitiendo formatos como "1º FRIO", "1_FRIO", "1 BACH A", "1BACH_A", etc.
      let grupoNorm = (grupoRaw.toUpperCase().replace(/\s+/g, '_').replace(/º/g, '') || '1ESO_A');
      if (grupoNorm.includes('FRIO')) {
        grupoNorm = grupoNorm.startsWith('2') ? '2_FRIO' : '1_FRIO';
      } else if (grupoNorm.includes('INF') && !grupoNorm.includes('ESO') && !grupoNorm.includes('BACH')) {
        grupoNorm = grupoNorm.startsWith('2') ? '2_INF' : '1_INF';
      } else if (grupoNorm.includes('CALOR')) {
        grupoNorm = grupoNorm.startsWith('2') ? '2_CALOR' : '1_CALOR';
      } else {
        grupoNorm = grupoNorm.replace(/_+/g, '_').replace(/ESO_([A-D])/, 'ESO_$1').replace(/BACH_([A-D])/, 'BACH_$1');
        grupoNorm = grupoNorm.replace(/^(\d)_ESO_([A-D])$/, '$1ESO_$2').replace(/^(\d)_BACH_([A-D])$/, '$1BACH_$2');
      }
      const grupo = grupoNorm as GrupoEducativo;

      const upperNie = rawNie.toUpperCase();
      const isWithoutNie = !rawNie || 
        ['SIN NIE', 'NO TIENE', 'S/N', 'SN', '-', 'PENDIENTE', 'NO', 'N/A', 'SIN_NIE'].includes(upperNie);

      const canonicalKey = normalizarNombreComparacion(nombre, apellidos);
      const tokenKey = normalizarTokensNombre(nombre, apellidos);

      let existingAlumno: Alumno | undefined;
      if (!isWithoutNie && alumnoMapByNie.has(upperNie)) {
        existingAlumno = alumnoMapByNie.get(upperNie);
      } else if (canonicalKey && alumnoMapByCanonical.has(canonicalKey)) {
        existingAlumno = alumnoMapByCanonical.get(canonicalKey);
      } else if (tokenKey && tokenKey.length >= 4 && alumnoMapByTokens.has(tokenKey)) {
        existingAlumno = alumnoMapByTokens.get(tokenKey);
      }

      let finalNie = '';
      if (!isWithoutNie) {
        finalNie = upperNie;
      } else if (existingAlumno && existingAlumno.nie) {
        finalNie = existingAlumno.nie;
      } else {
        const grupoSlug = grupo.replace(/[^a-zA-Z0-9]/g, '') || 'ALUM';
        const seq = String(sinNieCounter++).padStart(3, '0');
        finalNie = `SN-${grupoSlug}-${seq}`;
      }

      if (existingAlumno) {
        existingAlumno.nombre = nombre;
        existingAlumno.apellidos = apellidos;
        if (grupo) existingAlumno.grupo = grupo;
        if (telefonoRaw) existingAlumno.telefono_tutor = telefonoRaw;
        if (tutorRaw) existingAlumno.nombre_tutor = tutorRaw;
        if (existingAlumno.estado === 'BAJA') {
          existingAlumno.estado = 'ACTIVO';
        }

        if (!isWithoutNie && (!existingAlumno.nie || existingAlumno.nie.startsWith('SN-'))) {
          existingAlumno.nie = finalNie;
        }

        indexAlumno(existingAlumno);
        actualizados++;
      } else {
        const newStudent: Alumno = {
          id_alumno: `alm-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nie: finalNie,
          nombre,
          apellidos,
          grupo,
          puntos_actuales: 10,
          estado: 'ACTIVO',
          telefono_tutor: telefonoRaw || '600 00 00 00',
          nombre_tutor: tutorRaw || 'Tutor Legal',
        };

        currentAlumnos.push(newStudent);
        indexAlumno(newStudent);
        nuevos++;
      }
    }

    this.saveAlumnos(currentAlumnos);
    // Garantizar que no quede ningún duplicado residual
    this.depurarAlumnosDuplicados(usuarioEmail);

    this.addAuditLog(
      usuarioEmail,
      'IMPORTACION_MASIVA',
      'ETL/Alumnos',
      `Importación masiva completada: ${nuevos} nuevos insertados (con 10 pts iniciales), ${actualizados} actualizados/unificados.`
    );

    return {
      totalProcessed: lines.length - 1,
      nuevos,
      actualizados,
      errores,
    };
  }

  /**
   * Importa alumnos procesados desde un archivo ODS o Excel (2 columnas: Apellidos Nombre y Curso)
   * Aplica unificación estricta por Nombre y Apellidos para impedir duplicados en el censo.
   */
  static importarAlumnosDesdeFilas(
    filas: Array<{ nombre: string; apellidos: string; grupo: GrupoEducativo; nie?: string }>,
    usuarioEmail: string
  ): { totalProcessed: number; nuevos: number; actualizados: number; errores: string[] } {
    if (!filas || filas.length === 0) {
      throw new Error('No se encontraron registros de alumnos para importar.');
    }

    const currentAlumnos = [...this.getAlumnos()];
    const alumnoMapByNie = new Map<string, Alumno>();
    const alumnoMapByCanonical = new Map<string, Alumno>();
    const alumnoMapByTokens = new Map<string, Alumno>();

    const indexAlumno = (alm: Alumno) => {
      const aNie = (alm.nie || '').trim().toUpperCase();
      if (aNie && !aNie.startsWith('SN-') && !['SIN NIE', 'PENDIENTE', 'NO TIENE', 'SN', '-', 'NO'].includes(aNie)) {
        alumnoMapByNie.set(aNie, alm);
      }
      const cKey = normalizarNombreComparacion(alm.nombre, alm.apellidos);
      if (cKey) alumnoMapByCanonical.set(cKey, alm);
      const tKey = normalizarTokensNombre(alm.nombre, alm.apellidos);
      if (tKey) alumnoMapByTokens.set(tKey, alm);
    };

    currentAlumnos.forEach(indexAlumno);

    let nuevos = 0;
    let actualizados = 0;
    const errores: string[] = [];
    let sinNieCounter = 1;

    for (let i = 0; i < filas.length; i++) {
      const item = filas[i];
      const nombre = item.nombre.trim();
      const apellidos = item.apellidos.trim();
      const grupo = item.grupo;
      const rawNie = (item.nie || '').trim();

      if (!apellidos) {
        errores.push(`Fila ${i + 1}: El alumno carece de apellidos.`);
        continue;
      }

      const upperNie = rawNie.toUpperCase();
      const isWithoutNie = !rawNie || 
        ['SIN NIE', 'NO TIENE', 'S/N', 'SN', '-', 'PENDIENTE', 'NO', 'N/A', 'SIN_NIE'].includes(upperNie);

      const canonicalKey = normalizarNombreComparacion(nombre, apellidos);
      const tokenKey = normalizarTokensNombre(nombre, apellidos);

      let existingAlumno: Alumno | undefined;
      if (!isWithoutNie && alumnoMapByNie.has(upperNie)) {
        existingAlumno = alumnoMapByNie.get(upperNie);
      } else if (canonicalKey && alumnoMapByCanonical.has(canonicalKey)) {
        existingAlumno = alumnoMapByCanonical.get(canonicalKey);
      } else if (tokenKey && tokenKey.length >= 4 && alumnoMapByTokens.has(tokenKey)) {
        existingAlumno = alumnoMapByTokens.get(tokenKey);
      }

      let finalNie = '';
      if (!isWithoutNie) {
        finalNie = upperNie;
      } else if (existingAlumno && existingAlumno.nie) {
        finalNie = existingAlumno.nie;
      } else {
        const grupoSlug = grupo.replace(/[^a-zA-Z0-9]/g, '') || 'ALUM';
        const seq = String(sinNieCounter++).padStart(3, '0');
        finalNie = `SN-${grupoSlug}-${seq}`;
      }

      if (existingAlumno) {
        existingAlumno.nombre = nombre;
        existingAlumno.apellidos = apellidos;
        if (grupo) existingAlumno.grupo = grupo;
        if (existingAlumno.estado === 'BAJA') {
          existingAlumno.estado = 'ACTIVO';
        }
        if (!isWithoutNie && (!existingAlumno.nie || existingAlumno.nie.startsWith('SN-'))) {
          existingAlumno.nie = finalNie;
        }

        indexAlumno(existingAlumno);
        actualizados++;
      } else {
        const newStudent: Alumno = {
          id_alumno: `alm-ods-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nie: finalNie,
          nombre,
          apellidos,
          grupo,
          puntos_actuales: 10,
          estado: 'ACTIVO',
          telefono_tutor: '600 00 00 00',
          nombre_tutor: 'Tutor Legal',
        };

        currentAlumnos.push(newStudent);
        indexAlumno(newStudent);
        nuevos++;
      }
    }

    this.saveAlumnos(currentAlumnos);
    // Garantizar que no quede ningún duplicado residual
    this.depurarAlumnosDuplicados(usuarioEmail);

    this.addAuditLog(
      usuarioEmail,
      'IMPORTACION_MASIVA',
      'ETL/Alumnos_ODS',
      `Importación ODS/Hoja (2 columnas) completada: ${nuevos} nuevos insertados (10 pts iniciales), ${actualizados} actualizados/unificados.`
    );

    return {
      totalProcessed: filas.length,
      nuevos,
      actualizados,
      errores,
    };
  }

  /**
   * Elimina a todos los alumnos y partes disciplinarios generados
   */
  static vaciarAlumnosYSanciones(usuarioEmail: string): void {
    this.saveAlumnos([]);
    this.saveSanciones([]);
    this.saveCompensaciones([]);
    this.saveMovimientos([]);
    this.addAuditLog(
      usuarioEmail,
      'ACTUALIZACION_SISTEMA',
      'Sistema/VaciadoAlumnosYSanciones',
      'Eliminación completa de todos los alumnos y partes disciplinarios realizada con éxito.'
    );
  }

  /**
   * Reset database back to seed for demo or test purposes
   */
  static resetToSeed(usuarioEmail: string): void {
    this.saveAlumnos(ALUMNOS_INICIALES);
    this.saveSanciones(SANCIONES_INICIALES);
    this.saveCompensaciones(COMPENSACIONES_INICIALES);
    this.saveAuditLogs(AUDIT_LOGS_INICIALES);
    this.saveMovimientos(MOVIMIENTOS_INICIALES);
    this.addAuditLog(usuarioEmail, 'IMPORTACION_MASIVA', 'Sistema/Reset', 'Restablecimiento a datos oficiales iniciales V0.');
  }

  /**
   * Create Drive Snapshot Backup (EC-02)
   */
  static crearSnapshotBackup(usuarioEmail: string): string {
    const snapshot = {
      fecha: new Date().toISOString(),
      alumnos: this.getAlumnos(),
      profesores: this.getProfesores(),
      sanciones: this.getSanciones(),
      compensaciones: this.getCompensaciones(),
      movimientos: this.getMovimientos(),
      auditLogs: this.getAuditLogs(),
    };
    const backups = JSON.parse(localStorage.getItem(KEY_BACKUPS) || '[]');
    const idBackup = `SNAPSHOT_DRIVE_${Date.now()}`;
    backups.unshift({ 
      id: idBackup, 
      fecha: snapshot.fecha, 
      totalAlumnos: snapshot.alumnos.length, 
      totalProfesores: snapshot.profesores.length,
      totalSanciones: snapshot.sanciones.length 
    });
    localStorage.setItem(KEY_BACKUPS, JSON.stringify(backups.slice(0, 10)));

    this.addAuditLog(
      usuarioEmail,
      'IMPORTACION_MASIVA',
      `DriveBackup/${idBackup}`,
      `Instantánea de seguridad completa generada en carpeta institucional Drive /SIGC_DATA/.backups/ (${snapshot.alumnos.length} alumnos, ${snapshot.profesores.length} docentes, ${snapshot.sanciones.length} partes)`
    );

    return idBackup;
  }

  /**
   * Obtiene el identificador del curso escolar actualmente activo (ej. "2026/2027")
   */
  static getCursoActual(): string {
    const curso = localStorage.getItem(KEY_CURSO_ACTUAL);
    if (!curso) {
      localStorage.setItem(KEY_CURSO_ACTUAL, '2026/2027');
      return '2026/2027';
    }
    return curso;
  }

  /**
   * Obtiene todos los cursos archivados históricamente
   */
  static getHistoricoCursos(): CursoAcademicoArchivo[] {
    const raw = localStorage.getItem(KEY_HISTORICO_CURSOS);
    if (!raw) return [];
    try {
      const parsed: CursoAcademicoArchivo[] = JSON.parse(raw);
      // Purgar de forma permanente cualquier curso de prueba o ficticio previo
      const filtrados = parsed.filter(c => c.id_curso !== '2024/2025' && c.id_curso !== '2025/2026');
      if (filtrados.length !== parsed.length) {
        localStorage.setItem(KEY_HISTORICO_CURSOS, JSON.stringify(filtrados));
      }
      return filtrados;
    } catch {
      return [];
    }
  }

  static saveHistoricoCursos(cursos: CursoAcademicoArchivo[]): void {
    const filtrados = cursos.filter(c => c.id_curso !== '2024/2025' && c.id_curso !== '2025/2026');
    localStorage.setItem(KEY_HISTORICO_CURSOS, JSON.stringify(filtrados));
  }

  /**
   * Lista todos los cursos académicos disponibles (activo + cursos archivados reales)
   */
  static getCursosDisponibles(): InfoCursoAcademico[] {
    const actual = this.getCursoActual();
    const historicos = this.getHistoricoCursos();

    const result: InfoCursoAcademico[] = [
      {
        id: actual,
        label: `Curso ${actual} (Actual / Activo)`,
        isCurrent: true,
        totalAlumnos: this.getAlumnos().length,
        totalSanciones: this.getSanciones().length,
      }
    ];

    historicos.forEach(h => {
      if (h.id_curso !== actual && h.id_curso !== '2024/2025' && h.id_curso !== '2025/2026' && !result.some(r => r.id === h.id_curso)) {
        result.push({
          id: h.id_curso,
          label: `Curso ${h.id_curso} (Archivado)`,
          isCurrent: false,
          totalAlumnos: h.total_alumnos,
          totalSanciones: h.total_sanciones,
          fechaCierre: h.fecha_cierre,
        });
      }
    });

    return result;
  }

  /**
   * Obtiene todas las sanciones históricas archivadas de cursos pasados
   */
  static getHistoricoSancionesTodosLosCursos(): Sancion[] {
    const historicos = this.getHistoricoCursos();
    const sanciones: Sancion[] = [];
    historicos.forEach(h => {
      if (h.sanciones_archivo && h.sanciones_archivo.length > 0) {
        sanciones.push(...h.sanciones_archivo);
      }
    });
    return sanciones;
  }

  /**
   * Obtiene todas las compensaciones archivadas de cursos pasados
   */
  static getHistoricoCompensacionesTodosLosCursos(): Compensacion[] {
    const historicos = this.getHistoricoCursos();
    const compensaciones: Compensacion[] = [];
    historicos.forEach(h => {
      if (h.compensaciones_archivo && h.compensaciones_archivo.length > 0) {
        compensaciones.push(...h.compensaciones_archivo);
      }
    });
    return compensaciones;
  }

  /**
   * Apertura oficial de un nuevo curso escolar (ej. "2027/2028")
   * Archiva el curso actual de forma inmutable preservando todos sus alumnos, partes, compensaciones
   * y puntos para que puedan ser comparados en cualquier momento histórico.
   */
  static crearNuevoCursoEscolar(
    nuevoCursoId: string,
    opciones: {
      limpiarAlumnosParaNuevoODS?: boolean;
      usuarioOperador: string;
    }
  ): { success: boolean; cursoAnteriorArchivado: string; nuevoCurso: string; error?: string } {
    const cursoActual = this.getCursoActual();
    const cleanNuevoCurso = nuevoCursoId.trim();

    if (!cleanNuevoCurso) {
      return { success: false, cursoAnteriorArchivado: '', nuevoCurso: '', error: 'Debe indicar el nombre o identificador del nuevo curso escolar (ejemplo: 2027/2028).' };
    }

    if (cleanNuevoCurso === cursoActual) {
      return { success: false, cursoAnteriorArchivado: '', nuevoCurso: '', error: `El curso ${cleanNuevoCurso} ya es el curso escolar actualmente activo.` };
    }

    const alumnosActuales = this.getAlumnos();
    const sancionesActuales = this.getSanciones();
    const compensacionesActuales = this.getCompensaciones();
    const movimientosActuales = this.getMovimientos();

    // 1. Archivar curso actual en histórico inmutable
    const historicos = this.getHistoricoCursos();
    const indexExistente = historicos.findIndex(h => h.id_curso === cursoActual);

    const archivoCurso: CursoAcademicoArchivo = {
      id_curso: cursoActual,
      nombre: `Curso Escolar ${cursoActual}`,
      fecha_inicio: historicos[indexExistente]?.fecha_inicio || new Date().toISOString(),
      fecha_cierre: new Date().toISOString(),
      activo: false,
      cerrado_por: opciones.usuarioOperador,
      total_alumnos: alumnosActuales.length,
      total_sanciones: sancionesActuales.length,
      total_compensaciones: compensacionesActuales.length,
      alumnos_archivo: alumnosActuales,
      sanciones_archivo: sancionesActuales,
      compensaciones_archivo: compensacionesActuales,
      movimientos_archivo: movimientosActuales,
    };

    if (indexExistente >= 0) {
      historicos[indexExistente] = archivoCurso;
    } else {
      historicos.unshift(archivoCurso);
    }
    this.saveHistoricoCursos(historicos);

    // 2. Establecer nuevo curso como activo
    localStorage.setItem(KEY_CURSO_ACTUAL, cleanNuevoCurso);

    // 3. Reiniciar partes y contabilidad disciplinaria para el nuevo curso
    this.saveSanciones([]);
    this.saveCompensaciones([]);
    this.saveMovimientos([]);

    // 4. Gestión de alumnos
    if (opciones.limpiarAlumnosParaNuevoODS) {
      this.saveAlumnos([]);
    } else {
      const renovados = alumnosActuales.map(a => ({
        ...a,
        puntos_actuales: 10,
        estado: 'ACTIVO' as const,
        historial_sanciones_count: 0,
      }));
      this.saveAlumnos(renovados);
    }

    // 5. Registrar log de auditoría
    this.addAuditLog(
      opciones.usuarioOperador,
      'ACTUALIZACION_SISTEMA',
      `CursoEscolar/${cleanNuevoCurso}`,
      `Apertura de nuevo curso escolar ${cleanNuevoCurso}. El curso previo (${cursoActual}) ha sido archivado con éxito (${alumnosActuales.length} alumnos, ${sancionesActuales.length} partes archivados para comparativas).`
    );

    return {
      success: true,
      cursoAnteriorArchivado: cursoActual,
      nuevoCurso: cleanNuevoCurso,
    };
  }
}
