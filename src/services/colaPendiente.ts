/**
 * Cola de cambios pendientes de subir a Google Drive.
 *
 * Los datos del centro viven solo en memoria, pero lo que el docente acaba de registrar
 * y aún no ha confirmado el servidor (un parte, una medida, una edición…) se guarda también
 * en el navegador. Así no se pierde si se cierra la pestaña o falla la red: al volver a entrar
 * con la misma cuenta se reenvía. En cuanto el servidor confirma, se borra.
 */

import { Alumno, Compensacion, ExpedienteSancion, Profesor, Sancion } from '../types/convivencia';
import { StorageService } from './storageService';

const CLAVE_COLA = 'sigc_bi_cola_pendiente_v1';

export interface ColaPendiente {
  email: string;
  fecha: string;
  sanciones: Sancion[];
  deleted_sanciones: string[];
  alumnos: Alumno[];
  deleted_alumnos: string[];
  profesores: Profesor[];
  compensaciones: Compensacion[];
  expedientes?: ExpedienteSancion[];
  deleted_expedientes?: string[];
}

/** Construye la cola con lo que aún no ha confirmado el servidor. */
export function construirCola(email: string): ColaPendiente {
  const idsSanciones = new Set(StorageService.getPendingSyncSancionIds());
  const idsAlumnos = new Set(StorageService.getPendingSyncAlumnoIds());
  const emailsProfes = new Set(StorageService.getPendingSyncProfesorEmails());
  const idsComps = new Set(StorageService.getPendingSyncCompensacionIds());
  const idsExp = new Set(StorageService.getPendingSyncExpedienteIds());
  return {
    email,
    fecha: new Date().toISOString(),
    sanciones: StorageService.getSanciones().filter(s => idsSanciones.has(s.id_sancion)),
    deleted_sanciones: StorageService.getDeletedSancionIds(),
    alumnos: StorageService.getAlumnos().filter(a => idsAlumnos.has(a.id_alumno)),
    deleted_alumnos: StorageService.getDeletedAlumnoIds(),
    profesores: StorageService.getProfesores().filter(p => emailsProfes.has(p.email.toLowerCase().trim())),
    compensaciones: StorageService.getCompensaciones().filter(c => idsComps.has(c.id_compensacion)),
    expedientes: StorageService.getExpedientes().filter(e => idsExp.has(e.id_expediente)),
    deleted_expedientes: StorageService.getDeletedExpedienteIds().filter(id => idsExp.has(id)),
  };
}

export function colaVacia(c: ColaPendiente): boolean {
  return !c.sanciones.length && !c.alumnos.length && !c.profesores.length && !c.compensaciones.length &&
    !(c.expedientes || []).length && !(c.deleted_expedientes || []).length;
}

/** Guarda (o borra, si no queda nada pendiente) la cola del usuario en este navegador. */
export function guardarCola(email: string | undefined | null): void {
  if (!email) return;
  try {
    const cola = construirCola(email);
    if (colaVacia(cola)) {
      const anterior = leerCola();
      if (anterior && anterior.email === email) localStorage.removeItem(CLAVE_COLA);
    } else {
      localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
    }
  } catch {
    // Sin almacenamiento disponible: se sigue trabajando solo en memoria
  }
}

export function leerCola(): ColaPendiente | null {
  try {
    const raw = localStorage.getItem(CLAVE_COLA);
    return raw ? (JSON.parse(raw) as ColaPendiente) : null;
  } catch {
    return null;
  }
}

/**
 * Vuelve a poner en memoria los cambios que quedaron sin subir (solo si son del mismo usuario)
 * y los marca como pendientes para que se envíen. Devuelve cuántos elementos se han recuperado.
 */
export function restaurarCola(email: string): number {
  const cola = leerCola();
  if (!cola || cola.email !== email) return 0;
  let n = 0;

  if (cola.sanciones.length) {
    const borradas = new Set(cola.deleted_sanciones);
    const mapa = new Map(StorageService.getSanciones().map(s => [s.id_sancion, s]));
    cola.sanciones.forEach(s => {
      if (borradas.has(s.id_sancion)) return;
      mapa.set(s.id_sancion, s);
      StorageService.addPendingSyncSancionId(s.id_sancion);
      n++;
    });
    StorageService.saveSanciones(Array.from(mapa.values()));
  }
  if (cola.deleted_sanciones.length) {
    const borradas = new Set([...StorageService.getDeletedSancionIds(), ...cola.deleted_sanciones]);
    StorageService.saveDeletedSancionIds(Array.from(borradas));
    StorageService.saveSanciones(StorageService.getSanciones().filter(s => !borradas.has(s.id_sancion)));
  }
  if (cola.alumnos.length) {
    const mapa = new Map(StorageService.getAlumnos().map(a => [a.id_alumno, a]));
    cola.alumnos.forEach(a => { mapa.set(a.id_alumno, a); StorageService.addPendingSyncAlumnoId(a.id_alumno); n++; });
    StorageService.saveAlumnos(Array.from(mapa.values()));
  }
  if (cola.deleted_alumnos.length) {
    const borrados = new Set([...StorageService.getDeletedAlumnoIds(), ...cola.deleted_alumnos]);
    StorageService.saveDeletedAlumnoIds(Array.from(borrados));
  }
  if (cola.profesores.length) {
    const mapa = new Map(StorageService.getProfesores().map(p => [p.email.toLowerCase().trim(), p]));
    cola.profesores.forEach(p => {
      const k = p.email.toLowerCase().trim();
      mapa.set(k, p);
      StorageService.addPendingSyncProfesorEmail(k);
      n++;
    });
    StorageService.saveProfesores(Array.from(mapa.values()));
  }
  if (cola.compensaciones.length) {
    const mapa = new Map(StorageService.getCompensaciones().map(c => [c.id_compensacion, c]));
    cola.compensaciones.forEach(c => { mapa.set(c.id_compensacion, c); StorageService.addPendingSyncCompensacionId(c.id_compensacion); n++; });
    StorageService.saveCompensaciones(Array.from(mapa.values()));
  }
  if ((cola.expedientes || []).length || (cola.deleted_expedientes || []).length) {
    const borrados = new Set([...StorageService.getDeletedExpedienteIds(), ...(cola.deleted_expedientes || [])]);
    StorageService.saveDeletedExpedienteIds(Array.from(borrados));
    const mapa = new Map(StorageService.getExpedientes().map(e => [e.id_expediente, e]));
    (cola.expedientes || []).forEach(e => { mapa.set(e.id_expediente, e); StorageService.addPendingSyncExpedienteId(e.id_expediente); n++; });
    (cola.deleted_expedientes || []).forEach(id => { mapa.delete(id); StorageService.addPendingSyncExpedienteId(id); n++; });
    StorageService.saveExpedientes(Array.from(mapa.values()));
  }
  if (n > 0) StorageService.recalcularPuntosAlumnos();
  return n;
}

export function hayCambiosSinSubir(): boolean {
  return (
    StorageService.getPendingSyncSancionIds().length > 0 ||
    StorageService.getPendingSyncAlumnoIds().length > 0 ||
    StorageService.getPendingSyncProfesorEmails().length > 0 ||
    StorageService.getPendingSyncCompensacionIds().length > 0 ||
    StorageService.getPendingSyncExpedienteIds().length > 0
  );
}

export function contarCambiosSinSubir(): number {
  return (
    StorageService.getPendingSyncSancionIds().length +
    StorageService.getPendingSyncAlumnoIds().length +
    StorageService.getPendingSyncProfesorEmails().length +
    StorageService.getPendingSyncCompensacionIds().length +
    StorageService.getPendingSyncExpedienteIds().length
  );
}
