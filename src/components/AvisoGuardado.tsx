import React, { useEffect, useRef, useState } from 'react';
import { CloudOff, CheckCircle2 } from 'lucide-react';
import { EVENTO_ESTADO_GUARDADO } from '../services/googleDriveSyncService';
import { contarCambiosSinSubir } from '../services/colaPendiente';

/**
 * Aviso visible del estado de envío a Google Drive:
 *  - Ámbar (permanente) si hay cambios guardados solo en este dispositivo.
 *  - Verde (unos segundos) cuando esos cambios llegan por fin a Drive.
 */
export const AvisoGuardado: React.FC = () => {
  const [pendientes, setPendientes] = useState(0);
  const [sinConexion, setSinConexion] = useState(false);
  const [enviadoOk, setEnviadoOk] = useState(false);
  const habiaPendientes = useRef(false);

  useEffect(() => {
    const actualizar = () => {
      const n = contarCambiosSinSubir();
      setPendientes(n);
      if (n > 0 && typeof navigator !== 'undefined' && navigator.onLine === false) setSinConexion(true);
    };
    const alGuardar = (e: Event) => {
      const ok = (e as CustomEvent).detail?.ok;
      const n = contarCambiosSinSubir();
      setPendientes(n);
      if (ok) {
        setSinConexion(false);
        if (habiaPendientes.current) {
          setEnviadoOk(true);
          setTimeout(() => setEnviadoOk(false), 5000);
        }
        habiaPendientes.current = n > 0;
      } else if (n > 0) {
        setSinConexion(true);
        habiaPendientes.current = true;
      }
    };
    const id = setInterval(actualizar, 1500);
    window.addEventListener(EVENTO_ESTADO_GUARDADO, alGuardar);
    window.addEventListener('offline', actualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener(EVENTO_ESTADO_GUARDADO, alGuardar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  if (pendientes > 0 && sinConexion) {
    return (
      <div role="alert" className="w-full bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2.5 text-sm flex items-start gap-2.5">
        <CloudOff className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>
            {pendientes === 1 ? 'Hay 1 cambio guardado solo en este dispositivo.' : `Hay ${pendientes} cambios guardados solo en este dispositivo.`}
          </strong>{' '}
          No se ha podido conectar con Google Drive. Se enviará a Convivencia automáticamente en cuanto haya conexión.
          No cierre la sesión ni borre los datos del navegador hasta que desaparezca este aviso.
        </div>
      </div>
    );
  }

  if (enviadoOk) {
    return (
      <div role="status" className="w-full bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-sm flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Conexión recuperada: los cambios pendientes ya están en Google Drive.</span>
      </div>
    );
  }

  return null;
};
