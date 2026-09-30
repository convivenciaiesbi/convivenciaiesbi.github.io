/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Alumno, Profesor, Sancion, Compensacion, AuditLog, MovimientoPuntos } from '../types/convivencia';

const today = new Date().toISOString().split('T')[0];

export const PROFESORES_INICIALES: Profesor[] = [
  {
    id_profesor: 'prof-01',
    email: 'mgonruz857@g.educaand.es',
    nombre: 'Miguel Ángel',
    apellidos: 'González Ruz',
    dni: '30998812W',
    departamento: 'Matemáticas / Convivencia',
    rol: 'ROLE_CONVIVENCIA_ADMIN',
    tutor_de_grupo: '1ESO_A',
    estado: 'ACTIVO',
  },
];

// Censo de alumnos vacío, listo para ingesta oficial
export const ALUMNOS_INICIALES: Alumno[] = [];

// Registro de partes disciplinarios vacío
export const SANCIONES_INICIALES: Sancion[] = [];

// Histórico de movimientos de puntos vacío
export const MOVIMIENTOS_INICIALES: MovimientoPuntos[] = [];

// Compensaciones vacías
export const COMPENSACIONES_INICIALES: Compensacion[] = [];

export const AUDIT_LOGS_INICIALES: AuditLog[] = [
  {
    id_log: 'log-001',
    timestamp: `${today}T08:00:00.000Z`,
    usuario_email: 'mgonruz857@g.educaand.es',
    accion: 'ACTUALIZACION_SISTEMA',
    entidad: 'Sistema/Inicializacion',
    detalles: 'Base de datos de alumnado y partes disciplinarios iniciada en limpio para ingesta oficial del IES Blas Infante.',
    hash_integridad: 'sha256-a9b4f6201e74init',
  },
];
