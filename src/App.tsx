/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  FastParteModal 
} from './components/FastParteModal';
import { 
  DailyFeedView 
} from './components/DailyFeedView';
import { 
  CarnetListView 
} from './components/CarnetListView';
import { 
  MisPartesDocenteView 
} from './components/MisPartesDocenteView';
import { 
  AulaPACMonitor 
} from './components/AulaPACMonitor';
import { 
  AnalyticsView 
} from './components/AnalyticsView';
import { 
  EtlImportView 
} from './components/EtlImportView';
import { 
  OfficialPartePrintModal 
} from './components/OfficialPartePrintModal';
import { 
  DriveAuditModal 
} from './components/DriveAuditModal';
import { 
  SecurityAuditModal 
} from './components/SecurityAuditModal';
import { 
  UserManualModal 
} from './components/UserManualModal';
import { 
  MiPerfilModal 
} from './components/MiPerfilModal';
import { 
  LoginView 
} from './components/LoginView';
import { 
  StorageService 
} from './services/storageService';
import { 
  AuthService 
} from './services/authService';
import { 
  GoogleDriveSyncService 
} from './services/googleDriveSyncService';
import { 
  Alumno, 
  Profesor, 
  Sancion, 
  Compensacion, 
  AuditLog, 
  EstadoTramitacion, 
  EstadoPAC 
} from './types/convivencia';
import { 
  PROFESORES_INICIALES 
} from './data/seedData';
import { 
  AlertOctagon, 
  ChevronRight, 
  X, 
  ShieldCheck,
  Info
} from 'lucide-react';

export default function App() {
  // Authentication session (null means show LoginView)
  const [currentUser, setCurrentUser] = useState<Profesor | null>(() => {
    return AuthService.getCurrentUser();
  });

  const [currentView, setCurrentView] = useState<string>('imponer');

  // Application Data States
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [compensaciones, setCompensaciones] = useState<Compensacion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals state
  const [printableParte, setPrintableParte] = useState<Sancion | null>(null);
  const [printableBatch, setPrintableBatch] = useState<Sancion[] | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState<boolean>(false);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [expulsionBannerDismissed, setExpulsionBannerDismissed] = useState<boolean>(false);
  const [carnetInitialFilterEstado, setCarnetInitialFilterEstado] = useState<string>('TODOS');
  const [carnetFocusedAlumnoId, setCarnetFocusedAlumnoId] = useState<string | null>(null);

  // Load from StorageService on initial render
  const refreshAllData = () => {
    setAlumnos(StorageService.getAlumnos());
    setProfesores(StorageService.getProfesores());
    setSanciones(StorageService.getSanciones());
    setCompensaciones(StorageService.getCompensaciones());
    setAuditLogs(StorageService.getAuditLogs());
  };

  useEffect(() => {
    refreshAllData();

    // 1. Sincronización inmediata al arrancar
    const syncFromDrive = () => {
      GoogleDriveSyncService.pullFromGoogleDrive()
        .then((res) => {
          if (res.success && res.dataCount) {
            refreshAllData();
          }
        })
        .catch(() => {});
    };

    syncFromDrive();

    // 2. Sincronización automática periódica cada 15 segundos entre todos los dispositivos
    const intervalId = setInterval(syncFromDrive, 15000);

    // 3. Sincronización inmediata cuando la pestaña recupera el foco o el usuario cambia de ventana
    const handleFocus = () => {
      syncFromDrive();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Ensure currentView is permitted whenever user changes
  useEffect(() => {
    if (currentUser) {
      if (!AuthService.isViewAllowed(currentUser, currentView)) {
        setCurrentView('imponer');
      }
    }
  }, [currentUser, currentView]);

  // Quick lookup map of Alumnos
  const alumnoMap = useMemo(() => {
    return new Map<string, Alumno>(alumnos.map(a => [a.id_alumno, a]));
  }, [alumnos]);

  // Students with 0 points (V0 minimum alert to Jefatura/Convivencia)
  const alumnosConCeroPuntos = useMemo(() => {
    return alumnos.filter(a => a.puntos_actuales === 0);
  }, [alumnos]);

  const handleLoginSuccess = (user: Profesor) => {
    setCurrentUser(user);
    if (AuthService.isAdmin(user)) {
      setCurrentView('feed');
    } else {
      setCurrentView('imponer');
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
  };

  // Safe navigation handler enforcing role access
  const handleNavigate = (view: string) => {
    if (!AuthService.isViewAllowed(currentUser, view)) {
      setCurrentView('imponer');
      return;
    }
    setCurrentView(view);
  };

  // Submission handler for Fast Parte Modal (<30s)
  const handleImponerSancion = (
    sancionData: Omit<Sancion, 'id_sancion' | 'numero_expediente' | 'url_pdf_drive'>
  ) => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    const result = StorageService.imponerSancion(sancionData, userEmail);
    refreshAllData();
    // Auto-sincronización transparente ultrarrápida en segundo plano con Google Drive
    GoogleDriveSyncService.triggerFastSync(100);
    return result;
  };

  // Update tramitation status (call made, parte printed, resolved)
  const handleUpdateTramitacion = (
    idSancion: string,
    nuevoEstado: EstadoTramitacion,
    observaciones: string
  ) => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    StorageService.actualizarTramitacion(idSancion, nuevoEstado, observaciones, userEmail);
    refreshAllData();
    GoogleDriveSyncService.triggerFastSync(200);
  };

  // Update Aula PAC status (arrived, tasks completed)
  const handleUpdatePACStatus = (
    idSancion: string,
    nuevoEstadoPAC: EstadoPAC,
    profesorReceptor: string
  ) => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    StorageService.actualizarEstadoPAC(idSancion, nuevoEstadoPAC, profesorReceptor, userEmail);
    refreshAllData();
    GoogleDriveSyncService.triggerFastSync(200);
  };

  // Restitution / Compensation of points
  const handleRegistrarCompensacion = (
    compData: Omit<Compensacion, 'id_compensacion' | 'timestamp'>
  ) => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    StorageService.registrarCompensacion(compData, userEmail);
    refreshAllData();
    GoogleDriveSyncService.triggerFastSync(200);
  };

  // Deletion of parte (exclusive to Convivencia Team / Admin)
  const handleDeleteParte = (idSancion: string, motivo: string) => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    const result = StorageService.eliminarSancion(idSancion, userEmail, motivo);
    refreshAllData();
    GoogleDriveSyncService.triggerFastSync(100);
    return result;
  };

  // Reset all data to initial seed
  const handleResetData = () => {
    const userEmail = currentUser ? currentUser.email : 'mgonruz857@g.educaand.es';
    StorageService.resetToSeed(userEmail);
    refreshAllData();
    GoogleDriveSyncService.triggerFastSync(0);
    setDriveModalOpen(false);
  };

  // 1. Initial Login Screen if no user session
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = AuthService.isAdmin(currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-slate-50 to-blue-50/30 flex flex-col text-slate-800 font-sans selection:bg-sky-200 selection:text-sky-900">
      {/* Top Bar Header with pastel styling & role-based tabs */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          localStorage.setItem('sigc_bi_auth_user_v2', JSON.stringify(user));
        }}
        profesoresDisponibles={profesores.length > 0 ? profesores.filter(p => p.estado !== 'INACTIVO') : PROFESORES_INICIALES}
        pendingSyncCount={0}
        onManualSync={async () => {
          const res = await GoogleDriveSyncService.pullFromGoogleDrive();
          if (res.success) {
            refreshAllData();
          }
        }}
        onOpenDriveModal={() => setDriveModalOpen(true)}
        onOpenSecurityModal={() => setSecurityModalOpen(true)}
        onOpenManualModal={() => setManualModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Role notice banner for teachers / Non-admin users */}
      {!isAdmin && (
        <div className="bg-sky-50 border-b border-sky-200/80 px-4 py-2 text-xs text-sky-950 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1">
            <Info className="w-4 h-4 text-sky-700 shrink-0" />
            <span>
              <strong>Sesión Docente ({currentUser.nombre}):</strong> Puedes registrar partes rápidos (<strong>+ Nuevo Parte</strong>), consultar tu historial (<strong>Mis Partes Puestos</strong>), atender guardias (<strong>Aula PAC</strong>) y actualizar tus datos personales (<strong>Mi Perfil</strong>).
            </span>
          </div>
        </div>
      )}

      {/* Global Alert Banner for 0 Points (V0 - Sección 7 & 9) - Visible únicamente para administradores / Jefatura */}
      {isAdmin && alumnosConCeroPuntos.length > 0 && !expulsionBannerDismissed && (
        <div className="bg-rose-900 text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-rose-950 shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1 flex-wrap">
            <AlertOctagon className="w-4 h-4 text-rose-300 shrink-0" />
            <span>
              <strong>Aviso a Jefatura de Estudios / Convivencia (V0):</strong> Se registran {alumnosConCeroPuntos.length} alumno(s) con saldo 0 puntos para su valoración disciplinaria:{' '}
              {alumnosConCeroPuntos.map((a, idx) => (
                <span key={a.id_alumno}>
                  {idx > 0 && ', '}
                  <button
                    type="button"
                    onClick={() => {
                      setCarnetInitialFilterEstado('CERO_PUNTOS');
                      setCarnetFocusedAlumnoId(a.id_alumno);
                      setCurrentView('carnet');
                    }}
                    className="underline font-bold text-rose-200 hover:text-white cursor-pointer"
                    title={`Ver ficha y movimientos de ${a.nombre} ${a.apellidos}`}
                  >
                    {a.nombre} {a.apellidos} ({a.grupo})
                  </button>
                </span>
              ))}. (Recordatorio: la app no impone expulsiones automáticas).
            </span>
            <button
              type="button"
              onClick={() => {
                setCarnetInitialFilterEstado('CERO_PUNTOS');
                if (alumnosConCeroPuntos.length > 0) {
                  setCarnetFocusedAlumnoId(alumnosConCeroPuntos[0].id_alumno);
                }
                setCurrentView('carnet');
              }}
              className="bg-white text-rose-950 font-bold px-2.5 py-1 rounded-lg text-xs hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer ml-2 shrink-0 inline-flex items-center gap-1 active:scale-98"
            >
              <span>Ver en Carnet</span>
              <span>&rarr;</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExpulsionBannerDismissed(true)}
            className="p-1 hover:bg-rose-800 rounded text-rose-300 ml-2 cursor-pointer"
            title="Ocultar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'imponer' && (
          <FastParteModal
            alumnos={alumnos}
            currentUser={currentUser}
            onSubmitSancion={handleImponerSancion}
            onPrintParte={(sancion) => setPrintableParte(sancion)}
            onDone={() => {
              if (isAdmin) {
                setCurrentView('feed');
              } else {
                setCurrentView('mis_partes');
              }
            }}
          />
        )}

        {/* Views strictly restricted to Admin (mgonruz857@g.educaand.es) */}
        {isAdmin && currentView === 'feed' && (
          <DailyFeedView
            sanciones={sanciones}
            alumnos={alumnos}
            currentUser={currentUser}
            onUpdateTramitacion={handleUpdateTramitacion}
            onPrintSingleParte={(sancion) => setPrintableParte(sancion)}
            onPrintBatchToday={(batch) => setPrintableBatch(batch)}
            onNavigateToImponer={() => setCurrentView('imponer')}
            onNavigateToCarnet={(idAlumno) => {
              if (idAlumno) setCarnetFocusedAlumnoId(idAlumno);
              setCurrentView('carnet');
            }}
            onNavigateToPAC={() => setCurrentView('pac')}
            onDeleteParte={handleDeleteParte}
          />
        )}

        {isAdmin && currentView === 'carnet' && (
          <CarnetListView
            alumnos={alumnos}
            sanciones={sanciones}
            compensaciones={compensaciones}
            currentUser={currentUser}
            initialFilterEstado={carnetInitialFilterEstado}
            focusedAlumnoId={carnetFocusedAlumnoId}
            onClearFocusedAlumno={() => setCarnetFocusedAlumnoId(null)}
            onSelectAlumnoForParte={(idAlumno) => {
              setCurrentView('imponer');
            }}
            onPrintParte={(sancion) => setPrintableParte(sancion)}
            onDataChanged={refreshAllData}
            onDeleteParte={handleDeleteParte}
          />
        )}

        {/* Historial Individual de Partes para el Profesorado Docente */}
        {currentView === 'mis_partes' && (
          <MisPartesDocenteView
            sanciones={sanciones}
            alumnos={alumnos}
            currentUser={currentUser}
            onPrintSingleParte={(sancion) => setPrintableParte(sancion)}
            onNavigateToImponer={() => setCurrentView('imponer')}
            onDeleteParte={handleDeleteParte}
            onManualSync={async () => {
              const res = await GoogleDriveSyncService.pullFromGoogleDrive();
              if (res.success) {
                refreshAllData();
              }
            }}
          />
        )}

        {/* Aula PAC: Accessible by both Admin and Pepe (para atender al alumnado) */}
        {currentView === 'pac' && (
          <AulaPACMonitor
            sanciones={sanciones}
            alumnos={alumnos}
            currentUser={currentUser}
            onUpdatePACStatus={handleUpdatePACStatus}
          />
        )}

        {/* Analytics & Stats: strictly restricted to Admin */}
        {isAdmin && currentView === 'analitica' && (
          <AnalyticsView
            sanciones={sanciones}
            alumnos={alumnos}
            compensaciones={compensaciones}
            onNavigateToCarnet={(idAlumno) => {
              if (idAlumno) setCarnetFocusedAlumnoId(idAlumno);
              setCurrentView('carnet');
            }}
          />
        )}

        {/* Drive ETL & Seneca Ingest: strictly restricted to Admin */}
        {isAdmin && currentView === 'etl' && (
          <EtlImportView
            currentUser={currentUser}
            onImportCompleted={refreshAllData}
            auditLogs={auditLogs}
            profesores={profesores}
            alumnos={alumnos}
          />
        )}
      </main>

      {/* Official Disciplinary Report Printable Modal (Junta de Andalucía / IES Blas Infante) */}
      {(printableParte || printableBatch) && (
        <OfficialPartePrintModal
          sancion={printableParte || undefined}
          sancionesBatch={printableBatch || undefined}
          alumnoMap={alumnoMap}
          onClose={() => {
            setPrintableParte(null);
            setPrintableBatch(null);
          }}
        />
      )}

      {/* Google Drive Persistence & Security Audit Modal (Solo Administradores) */}
      {isAdmin && driveModalOpen && (
        <DriveAuditModal
          onClose={() => setDriveModalOpen(false)}
          auditLogs={auditLogs}
          sanciones={sanciones}
          alumnos={alumnos}
          currentUserEmail={currentUser.email}
          onResetData={handleResetData}
        />
      )}

      {/* Tests de Seguridad y Protección de Datos RGPD (Solo Administradores) */}
      {isAdmin && securityModalOpen && (
        <SecurityAuditModal
          isOpen={securityModalOpen}
          onClose={() => setSecurityModalOpen(false)}
          currentUserEmail={currentUser.email}
        />
      )}

      {/* Manual de Funcionamiento (Disponible para Claustro y Equipo Directivo con RBAC estricto) */}
      <UserManualModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Gestión de Datos Personales del Docente (Mi Perfil) */}
      {profileModalOpen && (
        <MiPerfilModal
          currentUser={currentUser}
          onClose={() => setProfileModalOpen(false)}
          onProfileUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            refreshAllData();
          }}
        />
      )}

      {/* Footer (Pastel blue aesthetic) */}
      <footer className="mt-auto border-t border-sky-100 bg-white/90 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-950">SIGC-BI v2.0</span>
            <span>·</span>
            <span>IES Blas Infante (Córdoba)</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-sky-800">Código Centro: 14007180</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Decreto 327/2010</span>
            <span>·</span>
            <span>Almacenamiento Centro: <strong className="font-mono text-sky-950">14007180.aplicaciones@g.educaand.es</strong></span>
            <span>·</span>
            <span className="text-sky-700 font-medium">Google Workspace for Education</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
