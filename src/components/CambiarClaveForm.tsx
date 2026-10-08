import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { AuthService } from '../services/authService';

/** Formulario para que el docente cambie su propia contraseña (la comprueba el servidor). */
export const CambiarClaveForm: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    if (nueva !== repetida) {
      setMensaje({ tipo: 'error', texto: 'Las dos contraseñas nuevas no coinciden.' });
      return;
    }
    setEnviando(true);
    const r = await AuthService.cambiarClave(actual, nueva);
    setEnviando(false);
    if (r.success) {
      setMensaje({ tipo: 'ok', texto: 'Contraseña cambiada. Úsela la próxima vez que entre.' });
      setActual('');
      setNueva('');
      setRepetida('');
    } else {
      setMensaje({ tipo: 'error', texto: r.error || 'No se ha podido cambiar la contraseña.' });
    }
  };

  const campo = 'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-600';

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
      >
        <KeyRound className="w-4 h-4 text-sky-700" />
        <span>Cambiar mi contraseña</span>
      </button>
      {abierto && (
        <form onSubmit={enviar} className="mt-3 space-y-2.5">
          <input type="password" required autoComplete="current-password" placeholder="Contraseña actual"
            value={actual} onChange={(e) => setActual(e.target.value)} className={campo} />
          <input type="password" required autoComplete="new-password" placeholder="Nueva contraseña (letras y números, mín. 6)"
            value={nueva} onChange={(e) => setNueva(e.target.value)} className={campo} />
          <input type="password" required autoComplete="new-password" placeholder="Repita la nueva contraseña"
            value={repetida} onChange={(e) => setRepetida(e.target.value)} className={campo} />
          {mensaje && (
            <p className={`text-[11px] font-medium ${mensaje.tipo === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{mensaje.texto}</p>
          )}
          <button type="submit" disabled={enviando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl cursor-pointer">
            {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Guardar nueva contraseña</span>
          </button>
        </form>
      )}
    </div>
  );
};
