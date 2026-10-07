import React from 'react';
import { ES_ENTORNO_PRUEBAS } from '../config/entorno';

/**
 * Franja visible en el entorno de pruebas para que nadie confunda
 * esta versión con la app real del centro.
 */
export const EntornoBanner: React.FC = () => {
  if (!ES_ENTORNO_PRUEBAS) return null;
  return (
    <div className="w-full bg-amber-400 text-amber-950 text-center text-sm font-semibold py-1.5 px-4">
      ENTORNO DE PRUEBAS · Datos ficticios · No introducir datos reales del alumnado
    </div>
  );
};
