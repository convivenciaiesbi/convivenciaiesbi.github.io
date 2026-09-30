/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  UserCheck, 
  Building2, 
  GraduationCap, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save, 
  Loader2,
  Mail,
  School
} from 'lucide-react';
import { Profesor, LISTA_GRUPOS_OFICIALES } from '../types/convivencia';
import { StorageService } from '../services/storageService';

interface MiPerfilModalProps {
  currentUser: Profesor;
  onClose: () => void;
  onProfileUpdated: (updatedUser: Profesor) => void;
}

const DEPARTAMENTOS_HABITUALES = [
  'Matemáticas',
  'Lengua Castellana y Literatura',
  'Inglés / Lenguas Extranjeras',
  'Geografía e Historia',
  'Biología y Geología',
  'Física y Química',
  'Educación Física',
  'Música',
  'Educación Plástica, Visual y Audiovisual / Dibujo',
  'Tecnología y Digitalización',
  'Filosofía',
  'Francés',
  'Orientación Educativa',
  'Formación y Orientación Laboral (FOL)',
  'Religión',
  'Informática',
  'Economía',
  'Latín y Griego',
  'Administración y Gestión',
  'Instalación y Mantenimiento / FP',
  'Electricidad y Electrónica / FP',
  'Servicios Socioculturales y a la Comunidad',
  'Equipo Directivo / Jefatura de Estudios'
];

export const MiPerfilModal: React.FC<MiPerfilModalProps> = ({
  currentUser,
  onClose,
  onProfileUpdated,
}) => {
  const [nombre, setNombre] = useState(currentUser.nombre || '');
  const [apellidos, setApellidos] = useState(currentUser.apellidos || '');
  const [departamento, setDepartamento] = useState(currentUser.departamento || 'Claustro Docente');
  const [tutorDeGrupo, setTutorDeGrupo] = useState(currentUser.tutor_de_grupo || '');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!nombre.trim()) {
      setFeedback({ type: 'error', message: 'El nombre es obligatorio.' });
      return;
    }

    if (!apellidos.trim()) {
      setFeedback({ type: 'error', message: 'Los apellidos son obligatorios.' });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = StorageService.actualizarPerfilPropioDocente(currentUser.email, {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        departamento: departamento.trim() || 'Claustro Docente',
        tutor_de_grupo: tutorDeGrupo.trim() || undefined,
      });

      setIsLoading(false);

      if (res.success && res.profesor) {
        setFeedback({
          type: 'success',
          message: '¡Tus datos de perfil docente han sido actualizados correctamente!'
        });
        onProfileUpdated(res.profesor);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al guardar los datos del perfil.'
        });
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-sky-800 to-sky-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-base text-white border border-white/20 shadow-inner">
              {nombre.charAt(0) || 'D'}{apellidos.charAt(0) || 'P'}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Mi Perfil Docente</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-sky-100 border border-white/20">
                  IES Blas Infante
                </span>
              </h2>
              <p className="text-xs text-sky-200 mt-0.5">
                Gestión de datos de identificación y tutoría
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Institutional Information Notice */}
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-sky-900">Autogestión de Datos del Claustro: </span>
              <span>Puedes actualizar tu nombre, apellidos, departamento docente y grupo de tutoría asignado. Tu correo corporativo y rol de acceso son custodiados por Jefatura de Estudios.</span>
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-100 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Read-Only Institutional Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Cuenta Corporativa
              </span>
              <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold truncate bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
                <span title="Solo editable por Jefatura" className="ml-auto">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Rol en el Sistema
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                <School className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">
                  {currentUser.rol === 'ROLE_CONVIVENCIA_ADMIN'
                    ? 'Convivencia (Administrador)'
                    : 'Docente (Sin privilegios)'}
                </span>
                <span title="Solo editable por Jefatura" className="ml-auto">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </span>
              </div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre <span className="text-rose-600">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre de pila"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Apellidos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Apellidos <span className="text-rose-600">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Tus dos apellidos"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Departamento Docente
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  list="deptos-list"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="ej. Matemáticas, Lengua Castellana, Inglés..."
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 font-medium"
                />
                <datalist id="deptos-list">
                  {DEPARTAMENTOS_HABITUALES.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Puedes seleccionar uno de los departamentos sugeridos o escribir el tuyo.
              </p>
            </div>

            {/* Asignación de Tutoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tutoría de Grupo Asignada
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <select
                  value={tutorDeGrupo}
                  onChange={(e) => setTutorDeGrupo(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 font-medium"
                >
                  <option value="">Ninguna tutoría asignada (Profesor/a no tutor)</option>
                  {LISTA_GRUPOS_OFICIALES.map((g) => (
                    <option key={g.codigo} value={g.codigo}>
                      {g.etiqueta} - {g.descripcion}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Si eres tutor/a lectivo de un grupo, selecciónalo aquí para acceder a los informes de seguimiento tutorial.
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-xl transition-colors shadow-xs hover:shadow cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Mis Datos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
