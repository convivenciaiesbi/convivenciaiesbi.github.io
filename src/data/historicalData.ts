/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sancion, Compensacion } from '../types/convivencia';

/**
 * Returns the Spanish Academic Year string (e.g., '2026/2027')
 * based on the official calendar: September 1st to August 31st.
 */
export function getAcademicYearFromDate(dateStr?: string): string {
  if (!dateStr) return '2026/2027';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '2026/2027';
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1 = Jan, 9 = Sep, 12 = Dec
  if (m >= 9) {
    return `${y}/${y + 1}`;
  } else {
    return `${y - 1}/${y}`;
  }
}

export const AVAILABLE_ACADEMIC_YEARS = [
  { id: '2026/2027', label: 'Curso 2026/2027 (Actual)', isCurrent: true },
];

/**
 * Historical datasets: solo contendrán los datos reales de los cursos que el centro
 * archive al finalizar cada año escolar. Se han eliminado todos los datos ficticios
 * de cursos 2024/2025 y 2025/2026.
 */
export const HISTORICAL_SANCIONES: Sancion[] = [];
export const HISTORICAL_COMPENSACIONES: Compensacion[] = [];
