// Día del cambio: la app nueva (código real) contra una base de datos con la forma de la v1
import crypto from 'crypto';
const mk = () => { const st = new Map<string, string>(); return { getItem: (k: string) => st.get(k) ?? null, setItem: (k: string, v: string) => { st.set(k, String(v)) }, removeItem: (k: string) => { st.delete(k) }, clear: () => st.clear(), key: () => null, length: 0, _st: st } };
const g: any = globalThis; g.localStorage = mk(); g.sessionStorage = mk(); g.window = globalThis; g.CustomEvent = class { constructor(public type: string, public o?: any) {} }; g.dispatchEvent = () => true;
const { crearServidor } = await import('./simulador.mts');
const { generarServidorAppsScript } = await import('/home/claude/convivenciaiesbiclaude/src/services/appsScriptServidor.ts');
const v1 = (t: string) => crypto.createHash('sha256').update(Buffer.from(Array.from(t).map(c => c.charCodeAt(0) & 255))).digest('hex');
const ADMIN = 'mgonruz857@g.educaand.es', DOC = 'docente.real@g.educaand.es';

// 41 partes como en la app real; alumnado sin partes recientes con saldo "viejo"
const alumnos = Array.from({ length: 20 }, (_, i) => ({ id_alumno: 'al-' + i, nie: String(1000000 + i) + 'A', nombre: 'Al' + i, apellidos: 'Prueba', grupo: '1ESO_A', puntos_actuales: 10, estado: 'ACTIVO', telefono_tutor: '6000000' + i, nombre_tutor: 'Fam' }));
const sanciones = Array.from({ length: 41 }, (_, i) => ({ id_sancion: 'sv1-' + i, numero_expediente: '2026/' + i, id_alumno: 'al-' + (i % 20), id_profesor: i % 2 ? 'prof-d' : 'prof-01', nombre_profesor: i % 2 ? 'Docente Real' : 'Miguel Ángel González Ruz', codigo_infraccion: 'LEV', tipo_conducta: 'LEVE', puntos_restados: 2, fecha: `2026-09-${String(1 + (i % 20)).padStart(2, '0')}`, hora_incidente: '10:00', timestamp: '2026-09-01T10:00:00Z', descripcion_hechos: 'h' + i, derivado_pac: false, estado_pac: 'NO_APLICA', estado_tramitacion: 'PENDIENTE' }));
// saldos que mostraba la v1 (sin recuperación semanal): 10 - 2 * nº partes
alumnos.forEach(a => { a.puntos_actuales = Math.max(0, 10 - 2 * sanciones.filter(s => s.id_alumno === a.id_alumno).length); });
const dbV1 = { version: '3.0.0-PROD', timestamp: '2026-10-01T10:00:00Z', centro: { codigo: '14007180' },
  profesores: [
    { id_profesor: 'prof-01', email: ADMIN, nombre: 'Miguel Ángel', apellidos: 'González Ruz', rol: 'ROLE_CONVIVENCIA_ADMIN', estado: 'ACTIVO', password_hash: v1('Convivencia2026') },
    { id_profesor: 'prof-d', email: DOC, nombre: 'Docente', apellidos: 'Real', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', departamento: 'Lengua', password_hash: v1('docente1') },
  ],
  credenciales_profesores: { [ADMIN]: v1('Convivencia2026'), [DOC]: v1('docente1') },
  alumnos, sanciones, compensaciones: [], audit_logs: [], deleted_sanciones: ['sv1-0', 'ya-no-existe'], deleted_alumnos: [], deleted_profesores: [] };

const srv = crearServidor(generarServidorAppsScript(), dbV1);
g.fetch = async (_u: string, o: any) => ({ ok: true, status: 200, text: async () => JSON.stringify(srv.post(JSON.parse(o.body))) });
const { AuthService: A } = await import('/home/claude/convivenciaiesbiclaude/src/services/authService.ts') as any;
const { StorageService: S } = await import('/home/claude/convivenciaiesbiclaude/src/services/storageService.ts') as any;
const { GoogleDriveSyncService: G } = await import('/home/claude/convivenciaiesbiclaude/src/services/googleDriveSyncService.ts') as any;
let fallos = 0; const ok = (t: string, c: boolean, x = '') => { if (!c) fallos++; console.log(`${c ? 'OK   ' : 'FALLO'} ${t}${x ? ' → ' + x : ''}`); };
const navegador = () => { S.clearMemoryCacheForFreshLogin(); g.sessionStorage.clear(); g.localStorage.clear(); };

console.log('== Jefatura entra en la app nueva');
navegador();
let r = await A.login(ADMIN, 'Convivencia2026', true);
ok('entra con su contraseña de siempre (sin primer acceso)', r.success && !r.primerAcceso, r.message);
await G.pullFromGoogleDrive({ forceRefresh: true });
ok('ve los 40 partes activos (uno estaba marcado como borrado en la v1)', S.getSanciones().length === 40, String(S.getSanciones().length));
ok('el informe lista el parte marcado como borrado para que Jefatura decida', S.getPartesMarcadosBorradosV2().map((x: any) => x.id_sancion).join() === 'sv1-0');
const snap = S.getSaldosAntesV2();
ok('tiene el informe de saldos de la versión anterior', !!snap && Object.keys(snap.saldos).length === 20);
const suben = S.getAlumnos().filter((a: any) => a.puntos_actuales > snap.saldos[a.id_alumno]).length;
ok('la recuperación semanal sube el saldo del alumnado sin partes recientes', suben > 0, `${suben} de 20 suben`);
ok('ningún saldo baja respecto a la versión anterior', S.getAlumnos().every((a: any) => a.puntos_actuales >= snap.saldos[a.id_alumno]));
const huerf = S.getSanciones().filter((s: any) => !S.getProfesores().some((p: any) => p.id_profesor === s.id_profesor));
ok('ningún parte sin docente reconocido', huerf.length === 0, String(huerf.length));

// Jefatura pone un parte: se guarda sin perder nada
const alumno = S.getAlumnos()[0];
S.imponerSancion({ id_alumno: alumno.id_alumno, puntos_restados: 1, codigo_infraccion: 'LEV', tipo_conducta: 'LEVE', fecha: '2026-10-09', hora_incidente: '12:00', nombre_profesor: 'Miguel Ángel González Ruz', id_profesor: 'prof-01', descripcion_hechos: 'nuevo', timestamp: new Date().toISOString(), derivado_pac: false, estado_pac: 'NO_APLICA' }, ADMIN);
let p = await G.pushToGoogleDrive();
ok('el primer guardado funciona', p.success, p.message);
let db = JSON.parse(srv.archivos['DB']);
ok('Drive tiene 41 partes activos', db.sanciones.length === 41, String(db.sanciones.length));
ok('nada se ha recuperado sin que Jefatura lo pida', !db.sanciones.some((s: any) => s.id_sancion === 'sv1-0'));
ok('Jefatura recupera el parte', S.recuperarParteMarcadoBorrado('sv1-0', ADMIN) && S.getSanciones().length === 42);
p = await G.pushToGoogleDrive();
db = JSON.parse(srv.archivos['DB']);
ok('...y Drive lo vuelve a tener activo', p.success && db.sanciones.some((s: any) => s.id_sancion === 'sv1-0') && !db.deleted_sanciones.includes('sv1-0'), String(db.sanciones.length));
await G.pullFromGoogleDrive({ forceRefresh: true });
ok('...y sigue activo tras volver a descargar', S.getSanciones().some((s: any) => s.id_sancion === 'sv1-0'));
ok('Drive conserva el informe y los datos del centro', !!db.saldos_antes_v2 && db.centro?.codigo === '14007180');
ok('Drive conserva las contraseñas v1 del profesorado que aún no ha entrado', !!db.credenciales_profesores?.[DOC]);
ok('copia de seguridad de la v1 en la carpeta', Object.keys(srv.archivos).some(k => k.startsWith('COPIA_SEGURIDAD_ANTES_V2_')));

console.log('== Docente entra en la app nueva');
navegador();
r = await A.login(DOC, 'docente1', false);
ok('entra con su contraseña de siempre', r.success && !r.primerAcceso, r.message);
await G.pullFromGoogleDrive({ forceRefresh: true });
const mios = S.getSanciones().filter((s: any) => s.id_profesor === r.user.id_profesor);
ok('ve sus 20 partes completos', mios.length === 20 && mios.every((s: any) => s.descripcion_hechos), String(mios.length));
ok('los partes de Jefatura le llegan sin los hechos', S.getSanciones().filter((s: any) => s.id_profesor === 'prof-01').every((s: any) => !s.descripcion_hechos));
ok('no le llegan teléfonos (no es tutor)', S.getAlumnos().every((a: any) => !a.telefono_tutor));
S.imponerSancion({ id_alumno: alumno.id_alumno, puntos_restados: 1, codigo_infraccion: 'LEV', tipo_conducta: 'LEVE', fecha: '2026-10-09', hora_incidente: '12:30', nombre_profesor: 'Docente Real', id_profesor: r.user.id_profesor, descripcion_hechos: 'del docente', timestamp: new Date().toISOString(), derivado_pac: false, estado_pac: 'NO_APLICA' }, DOC);
p = await G.pushToGoogleDrive();
db = JSON.parse(srv.archivos['DB']);
ok('su parte se guarda y Drive tiene 43', p.success && db.sanciones.length === 43, String(db.sanciones.length));
ok('su guardado no estropea teléfonos ni hechos ajenos', db.alumnos.every((a: any) => a.telefono_tutor) && db.sanciones.every((s: any) => s.descripcion_hechos));
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
