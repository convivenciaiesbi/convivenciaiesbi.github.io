/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  User, 
  PlusCircle,
  Filter,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Sancion, Alumno, Profesor, EstadoTramitacion } from '../types/convivencia';

interface MisPartesDocenteViewProps {
  sanciones: Sancion[];
  alumnos: Alumno[];
  currentUser: Profesor;
  onPrintSingleParte: (sancion: Sancion) => void;
  onNavigateToImponer: () => void;
  onManualSync?: () => Promise<void>;
  onDeleteParte?: (idSancion: string, motivo: string) => { success: boolean; alumnoActualizado?: Alumno; sancionEliminada?: Sancion; error?: string };
}

export const MisPartesDocenteView: React.FC<MisPartesDocenteViewProps> = ({
  sanciones,
  alumnos,
  currentUser,
  onPrintSingleParte,
  onNavigateToImponer,
  onManualSync,
  onDeleteParte,
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [isSyncing, setIsSyncing] = useState(false);

  // Deletion state
  const [parteToDelete, setParteToDelete] = useState<{ sancion: Sancion; alumno: Alumno } | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState<string>('Corrección de error / Parte emitido por error involuntario');
  const [isDeleting, setIsDeleting] = useState(false);

  // Map of students
  const alumnoMap = useMemo(() => {
    return new Map(alumnos.map(a => [a.id_alumno, a]));
  }, [alumnos]);

  // Sanciones impuestas por este profesor concreto
  // Identifica por id_profesor o por coincidencia de email/nombre
  const misPartes = useMemo(() => {
    return sanciones.filter(s => {
      if (s.id_profesor === currentUser.id_profesor) return true;
      if (s.nombre_profesor && s.nombre_profesor.toLowerCase().includes(currentUser.nombre.toLowerCase())) return true;
      return false;
    });
  }, [sanciones, currentUser]);

  // Filtrado reactivo
  const filteredPartes = useMemo(() => {
    return misPartes.filter(s => {
      const alumno = alumnoMap.get(s.id_alumno);
      if (!alumno) return false;

      // Filtro estado
      if (filterEstado !== 'TODOS' && s.estado_tramitacion !== filterEstado) {
        return false;
      }

      // Filtro mes (YYYY-MM)
      if (filterMes !== 'TODOS') {
        const parteMes = s.fecha.substring(0, 7);
        if (parteMes !== filterMes) return false;
      }

      // Filtro texto libre
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const alumnoNombre = `${alumno.nombre} ${alumno.apellidos}`.toLowerCase();
        const expediente = s.numero_expediente.toLowerCase();
        const rof = s.codigo_infraccion.toLowerCase();
        const hechos = s.descripcion_hechos.toLowerCase();
        const grupo = (alumno.grupo || '').toLowerCase();

        if (
          !alumnoNombre.includes(term) &&
          !expediente.includes(term) &&
          !rof.includes(term) &&
          !hechos.includes(term) &&
          !grupo.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [misPartes, filterEstado, filterMes, searchTerm, alumnoMap]);

  // Estadísticas del docente
  const stats = useMemo(() => {
    const total = misPartes.length;
    const resueltos = misPartes.filter(s => s.estado_tramitacion === 'RESUELTO').length;
    const conPAC = misPartes.filter(s => s.derivado_pac).length;
    const pendientes = misPartes.filter(s => s.estado_tramitacion === 'PENDIENTE_NOTIFICACION').length;
    return { total, resueltos, conPAC, pendientes };
  }, [misPartes]);

  // Lista de meses disponibles para filtrar
  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set<string>();
    misPartes.forEach(s => {
      if (s.fecha) setMeses.add(s.fecha.substring(0, 7));
    });
    return Array.from(setMeses).sort().reverse();
  }, [misPartes]);

  const getTramitacionBadge = (estado: EstadoTramitacion) => {
    switch (estado) {
      case 'PENDIENTE_NOTIFICACION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            Pendiente Tramitación Jefatura
          </span>
        );
      case 'NOTIFICADO_TELEFONO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Phone className="w-3 h-3 text-amber-600" />
            Familia Notificada
          </span>
        );
      case 'PARTE_IMPRESO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <Printer className="w-3 h-3 text-blue-600" />
            Parte Impreso / Firma
          </span>
        );
      case 'RESUELTO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Tramitado y Resuelto
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y resumen del docente */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-widest">
                IES BLAS INFANTE · HISTORIAL INDIVIDUAL
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.nombre} {currentUser.apellidos}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-700" />
              <span>Mis Partes de Incidencias Puestos</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Consulta el estado de tramitación, acuerdos adoptados por Jefatura e imprime justificantes de todos los partes que has registrado.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onManualSync && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await onManualSync();
                  } finally {
                    setTimeout(() => setIsSyncing(false), 500);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Sincronizar y actualizar estado de mis partes con Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
                <span>Actualizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToImponer}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Parte</span>
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Registrados
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {stats.total}
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              En Tramitación
            </div>
            <div className="text-xl font-bold text-rose-800 mt-0.5">
              {stats.pendientes}
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Con Derivación PAC
            </div>
            <div className="text-xl font-bold text-amber-900 mt-0.5">
              {stats.conPAC}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Resueltos / Firmados
            </div>
            <div className="text-xl font-bold text-emerald-800 mt-0.5">
              {stats.resueltos}
            </div>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por alumno, grupo, número de expediente o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-sky-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Mes */}
          <select
            value={filterMes}
            onChange={(e) => setFilterMes(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-sky-600"
          >
            <option value="TODOS">Todos los meses</option>
            {mesesDisponibles.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          {/* Filtro Estado */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-sky-600"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE_NOTIFICACION">Pendientes de trámite</option>
            <option value="NOTIFICADO_TELEFONO">Familia notificada</option>
            <option value="PARTE_IMPRESO">Parte impreso</option>
            <option value="RESUELTO">Resuelto</option>
          </select>
        </div>
      </div>

      {/* Listado de Partes */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredPartes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">
              No se han encontrado partes con estos criterios
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {misPartes.length === 0
                ? 'Aún no has registrado ningún parte de incidencias. Pulsa en "+ Nuevo Parte" para registrar una infracción.'
                : 'Prueba a cambiar los filtros o el texto del buscador.'}
            </p>
            {misPartes.length === 0 && (
              <button
                type="button"
                onClick={onNavigateToImponer}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar mi primer parte</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPartes.map(sancion => {
              const alumno = alumnoMap.get(sancion.id_alumno);
              if (!alumno) return null;

              return (
                <div key={sancion.id_sancion} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Columna Izquierda: Expediente, Alumno y Descripción */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {sancion.numero_expediente}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sancion.fecha}</span>
                          <span>·</span>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sancion.tramo_horario || 'Hora lectiva'}</span>
                        </span>

                        {sancion.registro_diferido && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded font-mono">
                            Diferido
                          </span>
                        )}

                        {sancion.derivado_pac && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                            Aula PAC
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {alumno.apellidos}, {alumno.nombre}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                            {alumno.grupo}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {sancion.codigo_infraccion}
                          </span>
                          {sancion.medida_inmediata_texto && (
                            <span className="text-[11px] text-sky-800 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md font-medium">
                              Medida: {sancion.medida_inmediata_texto}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{sancion.descripcion_hechos}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span>Materia: <strong className="text-slate-700">{sancion.materia}</strong></span>
                        <span>·</span>
                        <span>Ubicación: <strong className="text-slate-700">{sancion.ubicacion}</strong></span>
                        {sancion.observaciones_tramitacion && (
                          <>
                            <span>·</span>
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                              Observación Jefatura: {sancion.observaciones_tramitacion}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha: Estado de Tramitación y Botón de Impresión */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div>
                        {getTramitacionBadge(sancion.estado_tramitacion)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPrintSingleParte(sancion)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:text-white bg-sky-50 hover:bg-sky-600 border border-sky-200 hover:border-sky-600 rounded-xl transition-all cursor-pointer shadow-2xs"
                          title="Ver o imprimir el documento oficial de este parte"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir / PDF</span>
                        </button>

                        {onDeleteParte && (
                          <button
                            type="button"
                            onClick={() => {
                              setParteToDelete({ sancion, alumno });
                              setDeleteMotivo('Corrección de error / Parte emitido por error involuntario');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                            title="Eliminar este parte de incidencia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR ELIMINACIÓN DE PARTE */}
      {parteToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Eliminar Parte de Incidencia
                  </h3>
                  <p className="text-xs text-slate-500">
                    Se anulará el parte y se restituirán los puntos al alumno/a
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setParteToDelete(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Expediente:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {parteToDelete.sancion.numero_expediente}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Alumno/a afectado:</span>
                <span className="font-bold text-slate-900">
                  {parteToDelete.alumno.apellidos}, {parteToDelete.alumno.nombre} ({parteToDelete.alumno.grupo})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Conducta:</span>
                <span className="font-mono text-slate-800 font-semibold">{parteToDelete.sancion.codigo_infraccion}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Puntos a restituir:</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +{parteToDelete.sancion.puntos_restados || 0} puntos
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo / Justificación de la anulación <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={deleteMotivo}
                onChange={(e) => setDeleteMotivo(e.target.value)}
                placeholder="Indique el motivo..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setParteToDelete(null)}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer rounded-xl hover:bg-slate-100 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteMotivo.trim()}
                onClick={() => {
                  if (!onDeleteParte || !parteToDelete) return;
                  setIsDeleting(true);
                  try {
                    const res = onDeleteParte(parteToDelete.sancion.id_sancion, deleteMotivo);
                    if (res && res.success) {
                      setParteToDelete(null);
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
