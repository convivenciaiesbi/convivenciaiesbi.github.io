/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  FileCheck, 
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Sancion, Alumno, Profesor, EstadoPAC } from '../types/convivencia';

interface AulaPACMonitorProps {
  sanciones: Sancion[];
  alumnos: Alumno[];
  currentUser: Profesor;
  onUpdatePACStatus: (
    idSancion: string,
    nuevoEstadoPAC: EstadoPAC,
    profesorReceptor: string
  ) => void;
}

export const AulaPACMonitor: React.FC<AulaPACMonitorProps> = ({
  sanciones,
  alumnos,
  currentUser,
  onUpdatePACStatus,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [filterOnlyActive, setFilterOnlyActive] = useState<boolean>(true);

  // Map of Alumnos
  const alumnoMap = useMemo(() => {
    return new Map(alumnos.map(a => [a.id_alumno, a]));
  }, [alumnos]);

  // Sanciones that have PAC derivation
  const pacSanciones = useMemo(() => {
    return sanciones.filter(s => {
      if (!s.derivado_pac) return false;
      if (s.fecha !== today) return false;
      if (filterOnlyActive && (s.estado_pac === 'TAREAS_COMPLETADAS' || s.estado_pac === 'REFLEXION_ENTREGADA')) {
        return false;
      }
      return true;
    });
  }, [sanciones, today, filterOnlyActive]);

  const allTodayPAC = useMemo(() => {
    return sanciones.filter(s => s.derivado_pac && s.fecha === today);
  }, [sanciones, today]);

  const enTransitoCount = allTodayPAC.filter(s => s.estado_pac === 'EN_TRANSITO').length;
  const enAulaCount = allTodayPAC.filter(s => s.estado_pac === 'RECIBIDO').length;
  const completadosCount = allTodayPAC.filter(s => s.estado_pac === 'TAREAS_COMPLETADAS' || s.estado_pac === 'REFLEXION_ENTREGADA').length;

  return (
    <div className="space-y-6">
      {/* Header and Control Bar */}
      <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sky-50">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Monitor Digital de Custodia · Aula PAC
              </h1>
              <span className="text-[11px] font-mono bg-sky-100 text-sky-900 border border-sky-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recepción inmediata de alumnos derivados de aula, verificación de tareas académicas y atención del profesorado de guardia.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-950 bg-sky-50/80 border border-sky-200/80 px-3 py-1.5 rounded-xl font-mono">
              Profesor/a en atención: <strong className="text-sky-950">{currentUser.nombre} {currentUser.apellidos}</strong>
            </span>
          </div>
        </div>

        {/* 3 Metric Cards for PAC status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                En Tránsito (Vía Delegado)
              </div>
              <div className="text-2xl font-bold font-mono text-amber-900 mt-1 tabular-nums">
                {enTransitoCount}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">
                Esperando recepción en puerta
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
          </div>

          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">
                En el Aula PAC (Atendidos)
              </div>
              <div className="text-2xl font-bold font-mono text-sky-950 mt-1 tabular-nums">
                {enAulaCount}
              </div>
              <div className="text-[10px] text-sky-700 mt-0.5">
                Custodia activa y realización de tareas
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Tareas Concluidas Hoy
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {completadosCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Retorno normal a aula en siguiente hora
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter switch */}
      <div className="flex items-center justify-between px-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filterOnlyActive}
            onChange={(e) => setFilterOnlyActive(e.target.checked)}
            className="accent-sky-600 rounded"
          />
          <span>Mostrar solo alumnos pendientes de atención en el Aula PAC</span>
        </label>
        <span className="text-xs text-slate-500 font-mono">
          Hoy: {allTodayPAC.length} derivaciones en total
        </span>
      </div>

      {/* PAC Cards Grid */}
      {pacSanciones.length === 0 ? (
        <div className="bg-white border border-sky-100 rounded-2xl p-12 text-center shadow-xs">
          <ShieldCheck className="w-12 h-12 text-sky-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">
            Aula PAC en calma: sin alumnos pendientes
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filterOnlyActive
              ? 'Todos los alumnos derivados han completado sus tareas o no hay incidencias activas en este momento.'
              : 'No se han registrado derivaciones a Aula PAC en la jornada de hoy.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pacSanciones.map((sancion) => {
            const alumno = alumnoMap.get(sancion.id_alumno);
            if (!alumno) return null;

            const isTransito = sancion.estado_pac === 'EN_TRANSITO';
            const isRecibido = sancion.estado_pac === 'RECIBIDO';
            const isCompletado = sancion.estado_pac === 'TAREAS_COMPLETADAS' || sancion.estado_pac === 'REFLEXION_ENTREGADA';

            return (
              <div
                key={sancion.id_sancion}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-4 ${
                  isTransito
                    ? 'border-amber-300 ring-2 ring-amber-300/30'
                    : isRecibido
                    ? 'border-sky-300 ring-2 ring-sky-200/50'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {alumno.apellidos}, {alumno.nombre}
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-900 bg-sky-100/80 px-2 py-0.5 rounded-md">
                        {alumno.grupo}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Expediente: {sancion.numero_expediente} · {sancion.tramo_horario.split('(')[0].trim()} {sancion.hora_incidente ? `(${sancion.hora_incidente}h)` : ''}
                    </div>
                  </div>

                  <div>
                    {isTransito && (
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full animate-pulse">
                        <Clock className="w-3 h-3" />
                        EN TRÁNSITO
                      </span>
                    )}
                    {isRecibido && (
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] text-sky-900 bg-sky-100 border border-sky-300 px-2.5 py-0.5 rounded-full">
                        <BookOpen className="w-3 h-3" />
                        EN AULA ({sancion.hora_llegada_pac || '10:00'})
                      </span>
                    )}
                    {isCompletado && (
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        FINALIZADO
                      </span>
                    )}
                  </div>
                </div>

                {/* Sender Prof and Infraction summary */}
                <div className="bg-sky-50/40 p-3 rounded-xl border border-sky-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Docente que deriva:</span>
                    <span className="font-semibold text-slate-800">
                      {sancion.nombre_profesor} ({sancion.materia})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Motivo sanción:</span>
                    <span className="font-mono font-bold text-rose-600">
                      -{sancion.puntos_restados} pts ({sancion.codigo_infraccion})
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-slate-600 border-t border-sky-100">
                    <strong className="text-slate-700">Hechos:</strong> "{sancion.descripcion_hechos}"
                  </div>
                </div>

                {/* Homework / Reflection Tasks assigned */}
                <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-sky-950 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-sky-700" />
                    <span>Tareas y deberes para el Aula PAC:</span>
                  </div>
                  <p className="text-sky-900 text-[11px] leading-relaxed">
                    {sancion.tareas_enviadas_pac || 'Ficha de reflexión conductual y ejercicios lectivos de la materia asignada.'}
                  </p>
                </div>

                {/* State Machine Transition Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-mono">
                    {sancion.profesor_pac_receptor ? (
                      <span>Atendido por: {sancion.profesor_pac_receptor}</span>
                    ) : (
                      <span>Pendiente de recepción en puerta</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isTransito && (
                      <button
                        onClick={() => onUpdatePACStatus(
                          sancion.id_sancion,
                          'RECIBIDO',
                          `${currentUser.nombre} ${currentUser.apellidos}`
                        )}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Confirmar Llegada a Puerta</span>
                      </button>
                    )}

                    {isRecibido && (
                      <>
                        <button
                          onClick={() => onUpdatePACStatus(
                            sancion.id_sancion,
                            'REFLEXION_ENTREGADA',
                            `${currentUser.nombre} ${currentUser.apellidos}`
                          )}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-sky-200 hover:bg-sky-50 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Ficha Reflexión OK</span>
                        </button>
                        <button
                          onClick={() => onUpdatePACStatus(
                            sancion.id_sancion,
                            'TAREAS_COMPLETADAS',
                            `${currentUser.nombre} ${currentUser.apellidos}`
                          )}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalizar y Dar Salida</span>
                        </button>
                      </>
                    )}

                    {isCompletado && (
                      <span className="text-xs font-mono text-sky-800 font-semibold">
                        Expediente PAC tramitado y cerrado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
