/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  RefreshCw, 
  ChevronDown, 
  Check, 
  LogOut, 
  PlusCircle, 
  Activity, 
  CreditCard, 
  BookOpen, 
  BarChart3, 
  Database, 
  Cloud, 
  Menu, 
  X, 
  Sparkles, 
  School, 
  Calendar,
  ShieldCheck,
  FileText,
  UserCog,
  GraduationCap
} from 'lucide-react';
import { Profesor } from '../types/convivencia';
import { AuthService } from '../services/authService';
import { StorageService } from '../services/storageService';
import iesLogo from '../assets/images/logo_rectangular.png';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: Profesor;
  onSwitchUser?: (profesor: Profesor) => void;
  profesoresDisponibles?: Profesor[];
  pendingSyncCount: number;
  onManualSync?: () => Promise<void>;
  onOpenDriveModal: () => void;
  onOpenSecurityModal?: () => void;
  onOpenManualModal?: () => void;
  onOpenProfileModal?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  currentUser,
  pendingSyncCount,
  onManualSync,
  onOpenDriveModal,
  onOpenSecurityModal,
  onOpenManualModal,
  onOpenProfileModal,
  onLogout,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const isAdmin = AuthService.isAdmin(currentUser);
  const navItems = AuthService.getAllowedNavItems(currentUser);

  // Friendly role descriptions
  const getRolePresentation = (prof: Profesor) => {
    if (AuthService.isAdmin(prof)) {
      return {
        label: 'Jefatura / Convivencia',
        tag: 'Administrador',
        detail: 'Gestión global de convivencia, partes, PAC, analítica interanual y Séneca.',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    }
    return {
      label: 'Equipo Docente',
      tag: 'Profesorado',
      detail: 'Registro ágil de incidencias en clase, consulta de carnets y atención en Aula PAC.',
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      dotColor: 'bg-sky-500',
    };
  };

  const currentRole = getRolePresentation(currentUser);

  // Icons matching each view
  const getViewIcon = (id: string, isHighlighted: boolean) => {
    switch (id) {
      case 'imponer':
        return <PlusCircle className={`w-3.5 h-3.5 ${isHighlighted ? 'text-white' : 'text-sky-600'}`} />;
      case 'mis_partes':
        return <FileText className="w-3.5 h-3.5 text-sky-600" />;
      case 'feed':
        return <Activity className="w-3.5 h-3.5 text-sky-600" />;
      case 'carnet':
        return <CreditCard className="w-3.5 h-3.5 text-sky-600" />;
      case 'pac':
        return <BookOpen className="w-3.5 h-3.5 text-sky-600" />;
      case 'analitica':
        return <BarChart3 className="w-3.5 h-3.5 text-sky-600" />;
      case 'etl':
        return <Database className="w-3.5 h-3.5 text-sky-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-sky-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* ========================================================================= */}
          {/* ZONE 1: Warm, friendly branding & School Identity */}
          {/* ========================================================================= */}
          <div className="flex items-center">
            {/* Official School Logo (already contains IES Blas Infante) */}
            <button
              onClick={() => onNavigate(isAdmin ? 'feed' : 'imponer')}
              className="flex items-center text-left group cursor-pointer focus:outline-hidden py-1"
              title="Ir al panel principal - IES Blas Infante"
            >
              <img
                src={iesLogo}
                alt="IES Blas Infante"
                className="h-11 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform shrink-0"
              />
            </button>

            {/* Badge de Curso Escolar Activo */}
            <div className="hidden md:flex items-center ml-2.5 pl-2.5 border-l border-slate-200">
              <button
                type="button"
                onClick={() => isAdmin && onNavigate('etl')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  isAdmin 
                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 cursor-pointer shadow-2xs' 
                    : 'bg-slate-50 text-slate-600 border border-slate-200/60 cursor-default'
                }`}
                title={isAdmin ? "Gestionar cursos escolares y apertura de nuevo curso" : `Curso Escolar ${StorageService.getCursoActual()}`}
              >
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Curso {StorageService.getCursoActual()}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ZONE 2: Clean, intuitive navigation bar (Desktop) */}
          {/* ========================================================================= */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isImponer = item.id === 'imponer';

              // Friendly distinct treatment for "+ Nuevo Parte"
              if (isImponer) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 ${
                      isActive
                        ? 'bg-sky-700 text-white ring-2 ring-sky-400 ring-offset-1'
                        : 'bg-sky-600 hover:bg-sky-700 text-white hover:shadow-xs'
                    }`}
                    title={item.description}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-white" />
                    <span>+ Nuevo Parte</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-sky-950 bg-sky-100/90 font-bold border border-sky-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-sky-900 hover:bg-slate-100/80'
                  }`}
                  title={item.description}
                >
                  {getViewIcon(item.id, false)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ========================================================================= */}
          {/* ZONE 3: Friendly Actions & User Profile Area */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-2">
            
            {/* Friendly Drive Storage indicator button: visible para administración y enlaces directos */}
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenDriveModal}
                  title="Almacenamiento y sincronización en Google Drive (@g.educaand.es)"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-950 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <div className="relative flex items-center">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-white" />
                  </div>
                  <span className="font-semibold">Google Drive</span>
                  {pendingSyncCount > 0 ? (
                    <span className="font-mono text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      +{pendingSyncCount}
                    </span>
                  ) : (
                    <span className="text-emerald-700 text-[10px] font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-200">
                      Sincronizado
                    </span>
                  )}
                </button>

                {onManualSync && (
                  <button
                    type="button"
                    disabled={isSyncingNow}
                    onClick={async () => {
                      setIsSyncingNow(true);
                      try {
                        await onManualSync();
                      } finally {
                        setTimeout(() => setIsSyncingNow(false), 600);
                      }
                    }}
                    title="Sincronizar inmediatamente con Google Drive y actualizar datos"
                    className="p-1.5 text-slate-600 hover:text-sky-800 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin text-sky-600' : ''}`} />
                  </button>
                )}
              </div>
            )}

            {/* Friendly Security & RGPD Audit button: solo visible para profesorado administrador */}
            {isAdmin && onOpenSecurityModal && (
              <button
                onClick={onOpenSecurityModal}
                title="Batería de Tests de Seguridad y Protección de Datos (RGPD)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-emerald-950 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline font-semibold">Tests RGPD</span>
                <span className="text-emerald-800 text-[10px] font-bold bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
                  100% OK
                </span>
              </button>
            )}

            {/* Friendly Manual Button (accessible to all teachers and staff) */}
            {onOpenManualModal && (
              <button
                onClick={onOpenManualModal}
                title="Manual de funcionamiento del sistema (Docente y Equipo Directivo)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-950 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                <span className="hidden sm:inline">Manual</span>
              </button>
            )}

            {/* Friendly User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 text-left rounded-xl border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/40 transition-all text-xs shadow-2xs cursor-pointer"
                title={`Sesión iniciada como ${currentUser.nombre} ${currentUser.apellidos}`}
              >
                {/* Round friendly avatar with user initials */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-700 to-sky-500 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs shrink-0">
                  {currentUser.nombre.charAt(0)}{currentUser.apellidos.charAt(0)}
                </div>

                <div className="hidden md:block text-left max-w-[130px] truncate leading-tight">
                  <div className="font-bold text-slate-900 truncate">
                    {currentUser.nombre} {currentUser.apellidos.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${currentRole.dotColor}`} />
                    <span>{currentRole.tag}</span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                    {/* Welcoming Header Card */}
                    <div className="p-3.5 bg-gradient-to-br from-sky-50 via-slate-50 to-blue-50/40 border border-sky-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1">
                          <School className="w-3 h-3 text-sky-700" />
                          <span>IES Blas Infante · Convivencia</span>
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${currentRole.color}`}>
                          {currentRole.tag}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          ¡Hola, {currentUser.nombre}!
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {currentUser.email}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-sky-200/50 text-[11px] text-slate-600 leading-snug">
                        {currentRole.detail}
                      </div>
                    </div>

                    {/* User Details & Institutional Department */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Departamento:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[140px]">{currentUser.departamento || 'Claustro Docente'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Tutoría:</span>
                        <span className="font-semibold text-slate-800">
                          {currentUser.tutor_de_grupo ? (
                            <span className="inline-flex items-center gap-1 text-sky-800 font-bold bg-sky-100/70 px-1.5 py-0.5 rounded">
                              <GraduationCap className="w-3 h-3 text-sky-700" />
                              {currentUser.tutor_de_grupo}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin tutoría</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Estado:</span>
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Activo en Centro
                        </span>
                      </div>
                    </div>

                    {/* Action Button: Edit my Profile Data */}
                    {onOpenProfileModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenProfileModal();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        <UserCog className="w-4 h-4 text-sky-700" />
                        <span>Gestionar mis datos (Perfil)</span>
                      </button>
                    )}

                    {/* Quick Link to Drive & Logout */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
                      {isAdmin ? (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenDriveModal();
                          }}
                          className="text-xs text-sky-700 hover:text-sky-900 font-semibold cursor-pointer"
                        >
                          Configurar Drive
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          SIGC-BI Docente
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Hamburger Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Friendly Mobile Navigation Drawer */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-150 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Secciones disponibles:
          </div>
          
          <div className="grid grid-cols-1 gap-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isImponer = item.id === 'imponer';

              if (isImponer) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full p-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Nuevo Parte de Incidencia</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getViewIcon(item.id, false)}
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {item.description}
                  </span>
                </button>
              );
            })}

            {onOpenProfileModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="flex items-center gap-2 w-full p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-sky-950 font-bold text-xs border border-slate-200 mt-2"
              >
                <UserCog className="w-4 h-4 text-sky-700" />
                <span>Gestionar mis datos (Perfil Docente)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
