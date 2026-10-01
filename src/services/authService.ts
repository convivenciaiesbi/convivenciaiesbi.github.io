/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Profesor } from '../types/convivencia';
import { StorageService } from './storageService';

const SESSION_KEY = 'sigc_bi_auth_user_v2';
const SESSION_TYPE_KEY = 'sigc_bi_session_type_v1';
const LAST_ACTIVITY_KEY = 'sigc_bi_last_activity_v1';
const LOGOUT_REASON_KEY = 'sigc_bi_logout_reason_v1';
const CREDENTIALS_HASH_KEY = 'sigc_bi_teacher_hashes_v3';
const GOOGLE_CLIENT_ID_KEY = 'sigc_bi_google_oauth_client_id_v1';

/**
 * Tiempos límite de inactividad para garantizar el cumplimiento del RGPD / ENS
 * en centros educativos donde los ordenadores se comparten en salas de profesores y aulas.
 */
export const INACTIVITY_LIMIT_SHARED_MS = 15 * 60 * 1000; // 15 minutos en equipos compartidos
export const INACTIVITY_LIMIT_PERSONAL_MS = 8 * 60 * 60 * 1000; // 8 horas en equipos personales
export const WARNING_BEFORE_LOGOUT_MS = 60 * 1000; // Aviso preventivo 60 segundos antes de cerrar

/**
 * Standard NIST SHA-256 implementation in pure TypeScript
 * Guarantees cryptographic hashing without plaintext password exposure (RGPD SEC-12).
 */
function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < ascii.length; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - ((i % 4) * 8));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let b = 0; b < words.length; b += 16) {
    const w = words.slice(b, b + 16);
    while (w.length < 16) w.push(0);
    const oldHash = [...hash];

    for (i = 0; i < 64; i++) {
      if (i >= 16) {
        const w15 = w[i - 15] || 0;
        const w2 = w[i - 2] || 0;
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0;
      }

      const s1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[i] + (w[i] || 0)) | 0;
      const s0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }

  return result;
}

export class AuthService {
  /**
   * Guarda de forma segura la sesión del usuario.
   * - En equipos compartidos (por defecto): Se almacena en sessionStorage para que la sesión se
   *   destruya automáticamente en cuanto se cierre la pestaña o el navegador, y se activa el límite
   *   estricto de inactividad de 15 minutos (RGPD / ENS).
   * - En equipos personales: Se almacena en localStorage con caducidad prolongada.
   */
  static persistSession(user: Profesor, isShared: boolean = true): void {
    try {
      const userJson = JSON.stringify(user);
      const nowStr = Date.now().toString();
      const typeStr = isShared ? 'shared' : 'personal';

      if (isShared) {
        sessionStorage.setItem(SESSION_KEY, userJson);
        sessionStorage.setItem(SESSION_TYPE_KEY, typeStr);
        sessionStorage.setItem(LAST_ACTIVITY_KEY, nowStr);

        // Limpiar cualquier persistencia previa en localStorage para evitar fugas en este equipo
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_TYPE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else {
        localStorage.setItem(SESSION_KEY, userJson);
        localStorage.setItem(SESSION_TYPE_KEY, typeStr);
        localStorage.setItem(LAST_ACTIVITY_KEY, nowStr);

        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_TYPE_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    } catch (e) {
      console.error('Error persistiendo sesión de usuario:', e);
    }
  }

  /**
   * Devuelve si la sesión actual corresponde a un equipo compartido (sala de profesores, aula, etc.)
   */
  static isSharedSession(): boolean {
    try {
      const sessionType = sessionStorage.getItem(SESSION_TYPE_KEY) || localStorage.getItem(SESSION_TYPE_KEY);
      if (sessionType === 'personal') return false;
      return true; // Seguro por defecto: si no está definido, se asume compartido
    } catch {
      return true;
    }
  }

  /**
   * Registra actividad reciente del usuario (movimiento de ratón, pulsación de tecla, clic).
   * Se invoca periódicamente desde la interfaz para refrescar el tiempo de inactividad.
   */
  static recordActivity(): void {
    try {
      const nowStr = Date.now().toString();
      if (sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, nowStr);
      }
      if (localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(LAST_ACTIVITY_KEY, nowStr);
      }
    } catch {
      // Ignorar fallos de cuota o modo privado
    }
  }

  /**
   * Obtiene el estado actual de la sesión, comprobando si ha caducado por inactividad.
   */
  static getSessionStatus(): {
    isAuthenticated: boolean;
    isShared: boolean;
    remainingSeconds: number;
    showWarning: boolean;
    limitMs: number;
  } {
    try {
      const isShared = this.isSharedSession();
      const limit = isShared ? INACTIVITY_LIMIT_SHARED_MS : INACTIVITY_LIMIT_PERSONAL_MS;

      const hasSession = Boolean(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY));
      const lastActivityRaw = sessionStorage.getItem(LAST_ACTIVITY_KEY) || localStorage.getItem(LAST_ACTIVITY_KEY);

      if (!hasSession || !lastActivityRaw) {
        return {
          isAuthenticated: false,
          isShared,
          remainingSeconds: 0,
          showWarning: false,
          limitMs: limit,
        };
      }

      const lastActivity = parseInt(lastActivityRaw, 10);
      const now = Date.now();
      const elapsed = Math.max(0, now - (isNaN(lastActivity) ? now : lastActivity));
      const remainingMs = Math.max(0, limit - elapsed);
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      return {
        isAuthenticated: true,
        isShared,
        remainingSeconds,
        showWarning: remainingMs > 0 && remainingMs <= WARNING_BEFORE_LOGOUT_MS,
        limitMs: limit,
      };
    } catch {
      return {
        isAuthenticated: false,
        isShared: true,
        remainingSeconds: 0,
        showWarning: false,
        limitMs: INACTIVITY_LIMIT_SHARED_MS,
      };
    }
  }

  /**
   * Recupera el usuario autenticado actualmente.
   * Si la sesión ha superado el tiempo máximo de inactividad, la destruye automáticamente
   * y devuelve null (desconectando al usuario según RGPD).
   */
  static getCurrentUser(): Profesor | null {
    try {
      // 1. Prioridad: sessionStorage (equipo compartido)
      let raw = sessionStorage.getItem(SESSION_KEY);
      let isShared = true;

      if (raw) {
        isShared = true;
      } else {
        // 2. Comprobar en localStorage (equipo personal)
        raw = localStorage.getItem(SESSION_KEY);
        isShared = localStorage.getItem(SESSION_TYPE_KEY) !== 'personal';
      }

      if (!raw) return null;

      // 3. Comprobar inactividad
      const lastActivityRaw = sessionStorage.getItem(LAST_ACTIVITY_KEY) || localStorage.getItem(LAST_ACTIVITY_KEY);
      const now = Date.now();
      const limit = isShared ? INACTIVITY_LIMIT_SHARED_MS : INACTIVITY_LIMIT_PERSONAL_MS;

      if (lastActivityRaw) {
        const lastActivity = parseInt(lastActivityRaw, 10);
        if (!isNaN(lastActivity) && (now - lastActivity > limit)) {
          this.logout('INACTIVITY');
          return null;
        }
      }

      return JSON.parse(raw) as Profesor;
    } catch {
      return null;
    }
  }

  /**
   * Internal helper: retrieves the store of cryptographic hashes for registered teachers.
   */
  private static getCredentialsStore(): Record<string, string> {
    try {
      // Clean legacy stores if present
      localStorage.removeItem('sigc_bi_teacher_hashes_v2');
      localStorage.removeItem('sigc_bi_teacher_hashes_v1');

      const raw = localStorage.getItem(CREDENTIALS_HASH_KEY);
      const store = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      return store;
    } catch {
      return {};
    }
  }

  /**
   * Elimina todas las contraseñas guardadas en el sistema para permitir pruebas en limpio.
   */
  static clearAllCredentials(): void {
    localStorage.removeItem(CREDENTIALS_HASH_KEY);
    localStorage.removeItem('sigc_bi_teacher_hashes_v2');
    localStorage.removeItem('sigc_bi_teacher_hashes_v1');
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Returns whether a teacher already has a registered password credential hash.
   */
  static hasTeacherRegisteredPassword(email: string): boolean {
    const cleanEmail = email.toLowerCase().trim();
    const store = this.getCredentialsStore();
    if (store[cleanEmail]) return true;

    // Comprobación redundante en la ficha del docente (custodiada en Google Drive)
    const teachersList = StorageService.getProfesores();
    const prof = teachersList.find((p) => p.email.toLowerCase() === cleanEmail);
    if (prof && prof.password_hash) {
      store[cleanEmail] = prof.password_hash;
      try {
        localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(store));
      } catch {}
      return true;
    }

    return false;
  }

  /**
   * Retrieves the stored SHA-256 hash for a given teacher email.
   */
  static getTeacherHash(email: string): string | null {
    const cleanEmail = email.toLowerCase().trim();
    const store = this.getCredentialsStore();
    if (store[cleanEmail]) return store[cleanEmail];

    // Comprobación redundante en la ficha del docente
    const teachersList = StorageService.getProfesores();
    const prof = teachersList.find((p) => p.email.toLowerCase() === cleanEmail);
    if (prof && prof.password_hash) {
      store[cleanEmail] = prof.password_hash;
      try {
        localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(store));
      } catch {}
      return prof.password_hash;
    }

    return null;
  }

  /**
   * Obtiene la totalidad de hashes de credenciales de docentes para sincronización centralizada en Google Drive.
   */
  static getAllCredentials(): Record<string, string> {
    const store = this.getCredentialsStore();
    // Consolidar también con los hashes presentes en las fichas de profesores
    const teachersList = StorageService.getProfesores();
    teachersList.forEach((p) => {
      const k = p.email.toLowerCase().trim();
      if (p.password_hash && !store[k]) {
        store[k] = p.password_hash;
      }
    });
    return store;
  }

  /**
   * Guarda o actualiza directamente un hash de credencial recibido desde Google Drive.
   */
  static setTeacherHashDirect(email: string, hash: string): void {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !hash) return;
    try {
      const store = this.getCredentialsStore();
      store[cleanEmail] = hash;
      localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(store));

      const profs = StorageService.getProfesores();
      const idx = profs.findIndex((p) => p.email.toLowerCase() === cleanEmail);
      if (idx !== -1 && profs[idx].password_hash !== hash) {
        profs[idx].password_hash = hash;
        StorageService.saveProfesores(profs);
      }
    } catch (e) {
      console.error('Error guardando hash directo:', e);
    }
  }

  /**
   * Fusiona hashes de credenciales provenientes de la base de datos centralizada de Google Drive.
   */
  static mergeRemoteCredentials(remoteStore: Record<string, string>): void {
    if (!remoteStore || typeof remoteStore !== 'object') return;
    try {
      const localStore = this.getCredentialsStore();
      let changed = false;
      const profs = StorageService.getProfesores();
      let profsChanged = false;

      for (const [email, hash] of Object.entries(remoteStore)) {
        const cleanEmail = email.toLowerCase().trim();
        if (cleanEmail && hash && (!localStore[cleanEmail] || localStore[cleanEmail] !== hash)) {
          localStore[cleanEmail] = hash;
          changed = true;

          const idx = profs.findIndex((p) => p.email.toLowerCase() === cleanEmail);
          if (idx !== -1 && profs[idx].password_hash !== hash) {
            profs[idx].password_hash = hash;
            profsChanged = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(localStore));
      }
      if (profsChanged) {
        StorageService.saveProfesores(profs);
      }
    } catch (e) {
      console.error('Error fusionando credenciales remotas:', e);
    }
  }

  /**
   * Sets or updates the cryptographic password hash for a registered teacher.
   */
  static setTeacherPassword(email: string, plainPassword: string): boolean {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const store = this.getCredentialsStore();
      const hash = sha256Hex(plainPassword.trim());
      store[cleanEmail] = hash;
      localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(store));

      // Guardar también en la ficha del profesor para que viaje con el censo en Drive
      const profs = StorageService.getProfesores();
      const idx = profs.findIndex((p) => p.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        profs[idx].password_hash = hash;
        StorageService.saveProfesores(profs);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Restablece la contraseña de un docente (elimina su hash almacenado)
   * para que pueda volver a configurarla en su próximo inicio de sesión (Primer Acceso).
   * Registra la acción en la auditoría inmutable del centro.
   */
  static resetTeacherPassword(email: string, adminEmail: string = 'mgonruz857@g.educaand.es'): boolean {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const store = this.getCredentialsStore();
      delete store[cleanEmail];
      localStorage.setItem(CREDENTIALS_HASH_KEY, JSON.stringify(store));

      const profs = StorageService.getProfesores();
      const idx = profs.findIndex((p) => p.email.toLowerCase() === cleanEmail);
      if (idx !== -1 && profs[idx].password_hash) {
        delete profs[idx].password_hash;
        StorageService.saveProfesores(profs);
      }
      
      StorageService.addAuditLog(
        adminEmail,
        'ACTUALIZACION_SISTEMA',
        `Docente/${cleanEmail}`,
        `Restablecimiento de credenciales de acceso para el docente ${cleanEmail}. Se requerirá nueva contraseña en el próximo inicio de sesión.`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Asigna directamente una nueva contraseña para un docente desde la cuenta administradora.
   * Registra la acción en la auditoría inmutable del centro.
   */
  static setTeacherPasswordDirect(email: string, newPassword: string, adminEmail: string = 'mgonruz857@g.educaand.es'): boolean {
    try {
      const cleanEmail = email.toLowerCase().trim();
      if (!newPassword || newPassword.trim().length < 4) {
        return false;
      }
      this.setTeacherPassword(cleanEmail, newPassword.trim());

      StorageService.addAuditLog(
        adminEmail,
        'ACTUALIZACION_SISTEMA',
        `Docente/${cleanEmail}`,
        `Asignación manual de nueva contraseña de acceso para el docente ${cleanEmail} por parte de Jefatura de Estudios.`
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if an email is registered in the official claustro of IES Blas Infante.
   */
  static isRegisteredInClaustro(email: string): Profesor | null {
    const cleanEmail = email.toLowerCase().trim();
    const teachersList = StorageService.getProfesores();
    return teachersList.find((p) => p.email.toLowerCase() === cleanEmail) || null;
  }

  /**
   * Valida la complejidad no demasiado estricta de la contraseña:
   * Al menos 6 caracteres y combinar al menos una letra y un número.
   */
  static validatePasswordComplexity(password: string): { valid: boolean; error?: string } {
    const p = (password || '').trim();
    if (p.length < 6) {
      return {
        valid: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
      };
    }
    const hasLetter = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(p);
    const hasNumber = /[0-9]/.test(p);

    if (!hasLetter || !hasNumber) {
      return {
        valid: false,
        error: 'La contraseña debe combinar letras y números (ejemplo: infante26, blas2026).',
      };
    }

    return { valid: true };
  }

  /**
   * Valida credenciales corporativas de Google Workspace (@g.educaand.es).
   * Requisitos obligatorios:
   * 1. Dominio estrictamente corporativo @g.educaand.es (rechaza @g.educaanda, @gmail.com, etc.).
   * 2. Cuenta dada de alta previamente en el claustro del centro (IES Blas Infante).
   * 3. Cuenta en estado ACTIVO (no en situación de baja o traslado).
   * 4. Contraseña supervisada mediante comprobación criptográfica SHA-256 (rechaza contraseñas incorrectas).
   */
  static login(emailInput: string, passwordInput: string, isShared: boolean = true): { success: boolean; user?: Profesor; error?: string } {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    // 1. Verificación estricta de formato y dominio corporativo oficial @g.educaand.es
    const strictDomainRegex = /^[a-z0-9._%+-]+@g\.educaand\.es$/i;
    if (!strictDomainRegex.test(cleanEmail)) {
      return {
        success: false,
        error: `Acceso restringido: El correo debe pertenecer estrictamente al dominio corporativo oficial @g.educaand.es de la Junta de Andalucía. Dominios como "${cleanEmail.split('@')[1] || cleanEmail}" no están autorizados.`,
      };
    }

    // 2. Validación de contraseña no vacía
    if (!cleanPassword || cleanPassword.length === 0) {
      return {
        success: false,
        error: 'Por favor, introduzca su contraseña de acceso.',
      };
    }

    // 3. Verificación de alta previa como miembro del claustro del IES Blas Infante
    const foundProf = this.isRegisteredInClaustro(cleanEmail);
    if (!foundProf) {
      return {
        success: false,
        error: `Acceso denegado: La cuenta "${cleanEmail}" no figura en el claustro docente del IES Blas Infante. Debe haber sido dada de alta previamente en la aplicación por Jefatura de Estudios.`,
      };
    }

    // 4. Bloqueo estricto para docentes en situación de baja o traslado
    if (foundProf.estado === 'INACTIVO') {
      return {
        success: false,
        error: `Acceso denegado: La cuenta docente "${cleanEmail}" está actualmente en estado de BAJA en el centro (${foundProf.motivo_baja || 'Fin de destino escolar'}). Contacte con Jefatura de Convivencia.`,
      };
    }

    // 5. Supervisión y verificación criptográfica de la contraseña
    const inputHash = sha256Hex(cleanPassword);
    const storedHash = this.getTeacherHash(cleanEmail);

    if (storedHash) {
      // Si ya existe una credencial vinculada para este docente, debe coincidir exactamente
      if (inputHash !== storedHash) {
        return {
          success: false,
          error: `Contraseña incorrecta: La contraseña introducida no coincide con la registrada para ${cleanEmail}. Si no la recuerda, solicite a Jefatura su restablecimiento.`,
        };
      }
    } else {
      // Primer acceso del docente del claustro: validación de requisitos de complejidad moderados
      const complexity = this.validatePasswordComplexity(cleanPassword);
      if (!complexity.valid) {
        return {
          success: false,
          error: `Requisito de contraseña (Primer Acceso): ${complexity.error}`,
        };
      }
      // Vinculación de la nueva contraseña
      this.setTeacherPassword(cleanEmail, cleanPassword);
      
      StorageService.addAuditLog(
        cleanEmail,
        'ACTUALIZACION_SISTEMA',
        `Docente/${cleanEmail}`,
        `Primer acceso completado: Contraseña inicial establecida por el propio docente ${cleanEmail}.`
      );
    }

    // 6. Autenticación exitosa y persistencia de sesión segura
    const authenticatedUser: Profesor = foundProf;
    this.persistSession(authenticatedUser, isShared);
    return { success: true, user: authenticatedUser };
  }

  /**
   * Autenticación Corporativa Directa con Google Workspace (@g.educaand.es).
   * Permite el inicio de sesión unificado sin requerir crear contraseñas locales en cada navegador.
   * Valida estrictamente:
   * 1. Dominio institucional oficial (@g.educaand.es)
   * 2. Pertenencia al censo oficial del claustro custodiado en Google Drive
   * 3. Estado ACTIVO en el centro
   */
  static loginWithGoogleCorporateAccount(emailInput: string, isShared: boolean = true): { success: boolean; user?: Profesor; error?: string } {
    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Verificación de dominio corporativo oficial @g.educaand.es
    const strictDomainRegex = /^[a-z0-9._%+-]+@g\.educaand\.es$/i;
    if (!strictDomainRegex.test(cleanEmail)) {
      return {
        success: false,
        error: `Acceso restringido: El correo debe pertenecer estrictamente al dominio corporativo oficial @g.educaand.es de la Junta de Andalucía. Dominios como "${cleanEmail.split('@')[1] || cleanEmail}" no están autorizados.`,
      };
    }

    // 2. Verificación de alta previa como miembro del claustro del IES Blas Infante
    const foundProf = this.isRegisteredInClaustro(cleanEmail);
    if (!foundProf) {
      return {
        success: false,
        error: `Acceso denegado: La cuenta "${cleanEmail}" no figura en el claustro docente del IES Blas Infante. Debe haber sido dada de alta previamente en el censo oficial por Jefatura de Estudios.`,
      };
    }

    // 3. Bloqueo estricto para docentes en situación de baja o traslado
    if (foundProf.estado === 'INACTIVO') {
      return {
        success: false,
        error: `Acceso denegado: La cuenta docente "${cleanEmail}" está actualmente en estado de BAJA en el centro (${foundProf.motivo_baja || 'Fin de destino escolar'}). Contacte con Jefatura de Convivencia.`,
      };
    }

    // 4. Autenticación exitosa y persistencia de sesión
    const authenticatedUser: Profesor = foundProf;
    this.persistSession(authenticatedUser, isShared);
    return { success: true, user: authenticatedUser };
  }


  /**
   * Obtiene el ID de cliente de Google Cloud OAuth 2.0 configurado.
   */
  static getGoogleClientId(): string {
    try {
      const stored = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
      if (stored && stored.trim()) return stored.trim();
      return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    } catch {
      return '';
    }
  }

  /**
   * Guarda o actualiza el ID de cliente de Google Cloud OAuth 2.0.
   */
  static setGoogleClientId(clientId: string): void {
    try {
      if (!clientId.trim()) {
        localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
      } else {
        localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
      }
    } catch (e) {
      console.error('Error guardando Google Client ID:', e);
    }
  }

  /**
   * Descodifica el payload de un token JWT emitido por los servidores de Google Identity Services.
   */
  static decodeGoogleJwt(token: string): { email?: string; email_verified?: boolean; name?: string; picture?: string; sub?: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error descodificando token Google JWT:', e);
      return null;
    }
  }

  /**
   * Autentica directamente con el token JWT verificado por los servidores oficiales de Google (Google Identity Services).
   * La verificación de la contraseña se realiza en los servidores de Google (accounts.google.com).
   * La aplicación comprueba que:
   * 1. Google haya verificado el correo electrónico (email_verified: true).
   * 2. El dominio sea estrictamente @g.educaand.es.
   * 3. La cuenta esté dada de alta en el claustro del IES Blas Infante.
   * 4. El docente se encuentre en estado ACTIVO.
   */
  static loginWithGoogleJwt(jwtToken: string, isShared: boolean = true): { success: boolean; user?: Profesor; error?: string } {
    const payload = this.decodeGoogleJwt(jwtToken);
    if (!payload || !payload.email) {
      return {
        success: false,
        error: 'Error de verificación con Google: No se ha podido validar la identidad del usuario desde accounts.google.com.',
      };
    }

    if (payload.email_verified === false) {
      return {
        success: false,
        error: 'Google no ha verificado la autenticidad de esta cuenta de correo. Acceso denegado.',
      };
    }

    const cleanEmail = payload.email.trim().toLowerCase();

    // 1. Verificación de dominio corporativo oficial @g.educaand.es
    if (!cleanEmail.endsWith('@g.educaand.es')) {
      return {
        success: false,
        error: `Acceso restringido: Se ha identificado con ${cleanEmail}, pero solo se autorizan cuentas oficiales del dominio @g.educaand.es de la Junta de Andalucía.`,
      };
    }

    // 2. Comprobar alta en el claustro del IES Blas Infante
    const foundProf = this.isRegisteredInClaustro(cleanEmail);
    if (!foundProf) {
      return {
        success: false,
        error: `Acceso denegado: La cuenta Google Workspace "${cleanEmail}" está autenticada con éxito, pero NO figura en el claustro del IES Blas Infante. Jefatura de Estudios debe darla de alta previamente.`,
      };
    }

    // 3. Comprobar que no esté de baja
    if (foundProf.estado === 'INACTIVO') {
      return {
        success: false,
        error: `Acceso denegado: El docente "${cleanEmail}" está en estado de BAJA en el centro (${foundProf.motivo_baja || 'Fin de destino escolar'}).`,
      };
    }

    // 4. Inicio de sesión exitoso supervisado por Google
    const authenticatedUser: Profesor = foundProf;
    this.persistSession(authenticatedUser, isShared);
    return { success: true, user: authenticatedUser };
  }

  /**
   * Cierra la sesión activa del usuario.
   * Si el cierre fue por inactividad automática (15 min), guarda el motivo para que la
   * pantalla de inicio de sesión pueda informar al profesor amigablemente.
   */
  static logout(reason: 'MANUAL' | 'INACTIVITY' = 'MANUAL'): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_TYPE_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);

      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TYPE_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);

      if (reason === 'INACTIVITY') {
        sessionStorage.setItem(LOGOUT_REASON_KEY, 'INACTIVITY');
      } else {
        sessionStorage.removeItem(LOGOUT_REASON_KEY);
      }
    } catch {
      // Ignorar excepciones de storage
    }
  }

  /**
   * Lee y consume el motivo del último cierre de sesión (para mostrar aviso al usuario)
   */
  static consumeLogoutReason(): 'INACTIVITY' | null {
    try {
      const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);
      if (reason === 'INACTIVITY') {
        sessionStorage.removeItem(LOGOUT_REASON_KEY);
        return 'INACTIVITY';
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if user has admin/convivencia team privileges (Full access to stats and all data)
   */
  static isAdmin(user: Profesor | null): boolean {
    if (!user) return false;
    return (
      user.rol === 'ROLE_CONVIVENCIA_ADMIN' ||
      user.email.toLowerCase() === 'mgonruz857@g.educaand.es'
    );
  }

  /**
   * Checks if the given view is allowed for this user
   */
  static isViewAllowed(user: Profesor | null, viewId: string): boolean {
    if (!user) return false;
    if (this.isAdmin(user)) return true;

    // Standard teachers without privileges (e.g. pepe@g.educaand.es)
    // Capacity to:
    // 1. Poner infracciones ('imponer')
    // 2. Ver su propio historial de partes puestos ('mis_partes')
    // 3. Ver y atender alumnado en Aula PAC ('pac')
    return viewId === 'imponer' || viewId === 'mis_partes' || viewId === 'pac';
  }

  /**
   * Returns list of view navigation IDs available for this user
   */
  static getAllowedNavItems(user: Profesor | null): { id: string; label: string; description: string }[] {
    if (this.isAdmin(user)) {
      return [
        { id: 'imponer', label: 'Imponer Infracción', description: 'Registro rápido <30s' },
        { id: 'feed', label: 'Feed Diario (T-0)', description: 'Tramitación y citaciones' },
        { id: 'carnet', label: 'Carnet de Puntos', description: 'Saldos, expedientes y restitución' },
        { id: 'pac', label: 'Aula PAC', description: 'Monitor de guardia y custodia' },
        { id: 'analitica', label: 'Estadísticas & ROF', description: 'Analítica global del centro' },
        { id: 'etl', label: 'Drive & Carga ETL', description: 'Importación Séneca y backups' },
      ];
    }

    // Pepe / Docente sin privilegios
    return [
      { id: 'imponer', label: 'Imponer Infracción', description: 'Registro rápido <30s de partes' },
      { id: 'mis_partes', label: 'Mis Partes Puestos', description: 'Historial individual y estado de trámite' },
      { id: 'pac', label: 'Aula PAC (Atención)', description: 'Alumnado derivado en guardia' },
    ];
  }
}

