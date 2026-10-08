import React, { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { StorageService } from '../services/storageService';

/** Indica si un parte concreto ya ha llegado a Google Drive (y, por tanto, a Convivencia). */
export const EstadoEnvioParte: React.FC<{ idSancion: string }> = ({ idSancion }) => {
  const calcular = () => {
    if (!StorageService.getPendingSyncSancionIds().includes(idSancion)) return 'enviado';
    return typeof navigator !== 'undefined' && navigator.onLine === false ? 'sin_conexion' : 'enviando';
  };
  const [estado, setEstado] = useState(calcular);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setEstado(calcular());
      setSegundos((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [idSancion]);

  if (estado === 'enviado') {
    return (
      <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4" /> Enviado a Google Drive: Convivencia ya puede verlo.
      </p>
    );
  }
  if (estado === 'sin_conexion' || segundos > 12) {
    return (
      <p className="text-xs font-semibold text-amber-800 flex items-start gap-1.5">
        <CloudOff className="w-4 h-4 shrink-0" />
        <span>Guardado solo en este dispositivo: no hay conexión con Google Drive. Se enviará a Convivencia automáticamente en cuanto haya conexión.</span>
      </p>
    );
  }
  return (
    <p className="text-xs font-semibold text-sky-800 flex items-center gap-1.5">
      <Loader2 className="w-4 h-4 animate-spin" /> Enviando a Google Drive…
    </p>
  );
};
