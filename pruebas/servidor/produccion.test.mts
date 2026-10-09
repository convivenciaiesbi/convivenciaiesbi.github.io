// Pruebas previas al paso a producción: migración de datos v1, seguridad y concurrencia (servidor)
import crypto from 'crypto';
const { crearServidor } = await import('./simulador.mts');
const { generarServidorAppsScript } = await import('/home/claude/convivenciaiesbiclaude/src/services/appsScriptServidor.ts');

let fallos = 0;
const ok = (t: string, c: boolean, x = '') => { if (!c) fallos++; console.log(`${c ? 'OK   ' : 'FALLO'} ${t}${x ? ' → ' + x : ''}`); };
// Resumen de contraseña como lo hacía la versión 1 de la app (cada carácter como un byte)
const v1 = (t: string) => crypto.createHash('sha256').update(Buffer.from(Array.from(t).map(c => c.charCodeAt(0) & 255))).digest('hex');

const ADMIN = 'mgonruz857@g.educaand.es', JEFA = 'jefatura@g.educaand.es';
const ANA1 = 'ana.garcia1@g.educaand.es', ANA2 = 'ana.garcia2@g.educaand.es';
const SOLO_PERFIL = 'solo.perfil@g.educaand.es', AMBOS = 'ambos@g.educaand.es', RESET = 'reset@g.educaand.es';
const MARCADO = 'marcado@g.educaand.es', BAJA = 'baja@g.educaand.es', TILDE = 'tilde@g.educaand.es', NUEVO = 'nuevo@g.educaand.es';

// Base de datos con la forma real de la versión 1
const dbV1: any = {
  version: '3.0.0-PROD', timestamp: '2026-10-01T10:00:00.000Z', origen: 'SIGC',
  centro: { nombre: 'IES Blas Infante', codigo: '14007180' },
  configuracion_extra: { curso: '2026-2027' },
  profesores: [
    { id_profesor: 'prof-01', email: ADMIN, nombre: 'Miguel Ángel', apellidos: 'G', rol: 'ROLE_CONVIVENCIA_ADMIN', estado: 'ACTIVO', password_hash: v1('admin123'), dni: '111' },
    { id_profesor: 'prof-j', email: JEFA, nombre: 'Jefa', apellidos: 'Estudios', rol: 'ROLE_CONVIVENCIA_ADMIN', estado: 'ACTIVO' },
    { id_profesor: 'prof-a1', email: ANA1, nombre: 'Ana', apellidos: 'García', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', password_hash: v1('ana111'), dni: '222', tutor_de_grupo: '1ESO_A' },
    { id_profesor: 'prof-a2', email: ANA2, nombre: 'Ana', apellidos: 'García', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', password_hash: v1('ana222') },
    { id_profesor: 'prof-sp', email: SOLO_PERFIL, nombre: 'S', apellidos: 'P', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', password_hash: v1('perfil1') },
    { id_profesor: 'prof-am', email: AMBOS, nombre: 'A', apellidos: 'M', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', password_hash: v1('nueva22') },
    { id_profesor: 'prof-rs', email: RESET, nombre: 'R', apellidos: 'S', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', password_hash: v1('vieja33') },
    { id_profesor: 'prof-mc', email: MARCADO, nombre: 'M', apellidos: 'C', rol: 'ROLE_DOCENTE', estado: 'ACTIVO', requiere_cambio_clave: true },
    { id_profesor: 'prof-bj', email: BAJA, nombre: 'B', apellidos: 'J', rol: 'ROLE_DOCENTE', estado: 'INACTIVO', motivo_baja: 'Baja médica', password_hash: v1('baja44') },
    { id_profesor: 'prof-tl', email: TILDE, nombre: 'T', apellidos: 'L', rol: 'ROLE_DOCENTE', estado: 'ACTIVO' },
    { id_profesor: 'prof-nv', email: NUEVO, nombre: 'N', apellidos: 'V', rol: 'ROLE_DOCENTE', estado: 'ACTIVO' },
  ],
  credenciales_profesores: {
    [ADMIN]: v1('admin123'), [AMBOS]: v1('vieja22'), [MARCADO]: v1('marca55'), [RESET]: v1('vieja33'), [TILDE]: v1('Línea2026'),
  },
  reset_credenciales_emails: [RESET],
  alumnos: [
    { id_alumno: 'al-1', nie: '1111111A', nombre: 'Lucía', apellidos: 'Uno', grupo: '1ESO_A', puntos_actuales: 4, estado: 'ACTIVO', telefono_tutor: '600111111', nombre_tutor: 'Madre 1' },
    { id_alumno: 'al-2', nie: '2222222B', nombre: 'Pablo', apellidos: 'Dos', grupo: '2ESO_B', puntos_actuales: 7, estado: 'ACTIVO', telefono_tutor: '600222222', nombre_tutor: 'Padre 2', motivo_baja: 'x' },
  ],
  sanciones: [
    { id_sancion: 's-a1', numero_expediente: 'E1', id_alumno: 'al-2', id_profesor: 'prof-a1', nombre_profesor: 'Ana García', descripcion_hechos: 'hechos de Ana 1', puntos_restados: 3, fecha: '2026-09-15', timestamp: '2026-09-15T09:00:00Z', derivado_pac: false },
    { id_sancion: 's-a2', numero_expediente: 'E2', id_alumno: 'al-2', id_profesor: 'prof-a2', nombre_profesor: 'Ana García', descripcion_hechos: 'hechos de Ana 2', puntos_restados: 2, fecha: '2026-09-16', timestamp: '2026-09-16T09:00:00Z', derivado_pac: true, estado_pac: 'PENDIENTE', observaciones_tramitacion: 'privado' },
  ],
  compensaciones: [], audit_logs: [], deleted_sanciones: [], deleted_alumnos: [], deleted_profesores: [],
};
const textoOriginal = JSON.stringify(dbV1);

const srv = crearServidor(generarServidorAppsScript(), JSON.parse(textoOriginal));
const login = (email: string, clave: string) => srv.post({ accion: 'login', email, clave });

console.log('== 1. Paso de la versión 1 a la 2 (primer uso)');
const e0 = srv.post({ accion: 'estadoCuenta', email: ANA1 });
const copias = Object.keys(srv.archivos).filter(k => k.startsWith('COPIA_SEGURIDAD_ANTES_V2_'));
ok('al primer uso se crea UNA copia de seguridad', copias.length === 1, copias.join(','));
ok('la copia es idéntica byte a byte al archivo original', srv.archivos[copias[0]] === textoOriginal);
srv.post({ accion: 'estadoCuenta', email: ANA2 }); login(ADMIN, 'mal');
ok('no se repite la copia en peticiones posteriores', Object.keys(srv.archivos).filter(k => k.startsWith('COPIA_')).length === 1);
const dbM = JSON.parse(srv.archivos['DB']);
ok('se anotan los saldos de la versión 1', dbM.saldos_antes_v2?.saldos?.['al-1'] === 4 && dbM.saldos_antes_v2?.saldos?.['al-2'] === 7);
ok('ya no quedan resúmenes de contraseña dentro de los docentes', !dbM.profesores.some((p: any) => p.password_hash || p.requiere_cambio_clave));
ok('se conservan datos desconocidos de la v1 (configuracion_extra, centro)', dbM.configuracion_extra?.curso === '2026-2027' && dbM.centro?.codigo === '14007180');
ok('estado de cuenta de un docente con contraseña v1 solo en su ficha', e0.tieneClave === true);

console.log('== 2. Contraseñas de la versión 1');
ok('contraseña guardada solo en la ficha del docente', login(SOLO_PERFIL, 'perfil1').ok);
ok('contraseña guardada en los dos sitios (la de la ficha)', login(AMBOS, 'nueva22').ok);
srv.props.delete('CLAVE_' + AMBOS); // volver a probar la otra
const srv2 = crearServidor(generarServidorAppsScript(), JSON.parse(textoOriginal));
ok('...y también la de credenciales (versiones distintas)', srv2.post({ accion: 'login', email: AMBOS, clave: 'vieja22' }).ok);
ok('contraseña con tilde de la v1', login(TILDE, 'Línea2026').ok);
ok('administrador con su contraseña de siempre', login(ADMIN, 'admin123').ok);
ok('restablecida en la v1: la contraseña vieja ya no vale', srv2.post({ accion: 'estadoCuenta', email: RESET }).tieneClave === false);
ok('marcada "requiere cambio" en la v1: queda como primer acceso', srv2.post({ accion: 'estadoCuenta', email: MARCADO }).tieneClave === false);
ok('docente de baja no puede entrar', !login(BAJA, 'baja44').ok);
const eb = srv.post({ accion: 'estadoCuenta', email: BAJA });
ok('sin sesión no se revela el motivo de la baja', eb.activo === false && !JSON.stringify(eb).includes('médica'));
const dbTrasLogin = JSON.parse(srv.archivos['DB']);
ok('la contraseña v1 se borra del archivo tras convertirla', !Object.keys(dbTrasLogin.credenciales_profesores || {}).includes(TILDE));

console.log('== 3. Lo que recibe cada perfil');
const tAdmin = login(ADMIN, 'admin123').token;
const tA1 = login(ANA1, 'ana111').token, tA2 = login(ANA2, 'ana222').token;
const lAdmin = srv.post({ accion: 'leer', token: tAdmin }).data;
ok('Jefatura no recibe ninguna contraseña', !/credenciales|password_hash|alternativas/.test(JSON.stringify(lAdmin)));
ok('Jefatura recibe el informe de saldos', !!lAdmin.saldos_antes_v2);
const lA1 = srv.post({ accion: 'leer', token: tA1 }).data;
const lA2 = srv.post({ accion: 'leer', token: tA2 }).data;
const txt1 = JSON.stringify(lA1);
ok('docente: ni contraseñas, ni informe, ni configuración interna', !/credenciales|password_hash|saldos_antes|migracion|configuracion_extra/.test(txt1));
ok('docente: no recibe el DNI de nadie', !/"dni"/.test(txt1));
ok('docente: no recibe motivos de baja de otros', !txt1.includes('médica'));
ok('tutora de 1ESO_A: teléfono de su alumna', lA1.alumnos.find((a: any) => a.id_alumno === 'al-1').telefono_tutor === '600111111');
ok('...pero no el de otro grupo', lA1.alumnos.find((a: any) => a.id_alumno === 'al-2').telefono_tutor === '' && !txt1.includes('600222222'));
ok('homónimas: Ana 1 ve los hechos de su parte', lA1.sanciones.find((s: any) => s.id_sancion === 's-a1').descripcion_hechos === 'hechos de Ana 1');
ok('homónimas: Ana 1 NO ve los hechos del parte de Ana 2', !txt1.includes('hechos de Ana 2'));
ok('homónimas: Ana 2 NO ve los hechos del parte de Ana 1', !JSON.stringify(lA2).includes('hechos de Ana 1'));
ok('parte PAC ajeno de otro día: sin hechos ni observaciones', !txt1.includes('privado'));
{
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const x = JSON.parse(srv.archivos['DB']);
  x.sanciones.push({ id_sancion: 's-pac-hoy', id_alumno: 'al-2', id_profesor: 'prof-a2', nombre_profesor: 'Ana García', descripcion_hechos: 'pac de hoy', puntos_restados: 1, fecha: hoy, derivado_pac: true, estado_pac: 'EN_TRANSITO', observaciones_tramitacion: 'nota interna' });
  srv.tocarExterno(x);
  srv.cache.delete('DB2_VERIF'); // pasan los 15 s de confianza en la caché
  const v = JSON.stringify(srv.post({ accion: 'leer', token: tA1 }).data);
  ok('parte PAC de HOY: la guardia ve los hechos', v.includes('pac de hoy'));
  ok('...pero no las observaciones internas', !v.includes('nota interna'));
}
const sinSesion = srv.post({ accion: 'leer' }), tokenFalso = srv.post({ accion: 'leer', token: 'abc' });
ok('sin sesión no se devuelve nada', !sinSesion.ok && !sinSesion.data && sinSesion.codigo === 'NO_AUTH');
ok('con un token inventado tampoco', !tokenFalso.ok && !tokenFalso.data);
ok('docente no puede restablecer contraseñas', !srv.post({ accion: 'restablecerClave', token: tA1, email: ANA2 }).ok);
ok('docente no puede ver el estado de las cuentas', !srv.post({ accion: 'estadoClaves', token: tA1 }).ok);

console.log('== 4. Lo que puede guardar un docente');
const base = () => JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tA2 }).data));
let d = base();
d.sanciones.push({ id_sancion: 's-falso', id_alumno: 'al-1', id_profesor: 'prof-a1', nombre_profesor: 'Ana García', puntos_restados: 5, fecha: '2026-10-09', descripcion_hechos: 'suplantación' });
d.sanciones.push({ id_sancion: 's-nuevo2', id_alumno: 'al-1', id_profesor: 'prof-a2', nombre_profesor: 'Director General', puntos_restados: 1, fecha: '2026-10-09', descripcion_hechos: 'mío' });
d.sanciones.find((s: any) => s.id_sancion === 's-a1').puntos_restados = 10;
d.deleted_sanciones.push('s-a1');
d.profesores.find((p: any) => p.email === ANA2).rol = 'ROLE_CONVIVENCIA_ADMIN';
d.profesores.find((p: any) => p.email === ANA1).nombre = 'Hackeada';
d.alumnos.push({ id_alumno: 'al-falso', nombre: 'X', apellidos: 'Y', grupo: '1ESO_A', puntos_actuales: 10, estado: 'ACTIVO' });
d.cambios = { sanciones: ['s-falso', 's-nuevo2', 's-a1'], profesores: [ANA2, ANA1], alumnos: ['al-falso'] };
ok('el guardado se acepta (lo prohibido se ignora)', srv.post({ accion: 'guardar', token: tA2, data: d }).ok);
let db = JSON.parse(srv.archivos['DB']);
ok('no puede crear partes a nombre de otra docente', !db.sanciones.some((s: any) => s.id_sancion === 's-falso'));
const n2 = db.sanciones.find((s: any) => s.id_sancion === 's-nuevo2');
ok('su parte nuevo se guarda con su nombre real (no el que escriba)', n2 && n2.nombre_profesor === 'Ana García');
ok('no puede modificar el parte de su homónima', db.sanciones.find((s: any) => s.id_sancion === 's-a1').puntos_restados === 3);
ok('no puede borrar el parte de su homónima', db.sanciones.some((s: any) => s.id_sancion === 's-a1'));
ok('no puede hacerse administradora', db.profesores.find((p: any) => p.email === ANA2).rol === 'ROLE_DOCENTE');
ok('no puede cambiar el perfil de otra docente', db.profesores.find((p: any) => p.email === ANA1).nombre === 'Ana');
ok('no puede añadir alumnado', !db.alumnos.some((a: any) => a.id_alumno === 'al-falso'));
ok('los teléfonos de las familias siguen en Drive', db.alumnos.find((a: any) => a.id_alumno === 'al-2').telefono_tutor === '600222222');
ok('el DNI y demás datos del alumnado siguen intactos', db.alumnos.find((a: any) => a.id_alumno === 'al-2').motivo_baja === 'x');

console.log('== 5. Concurrencia');
// Jefatura descarga, una docente marca la llegada al Aula PAC, Jefatura guarda con datos de hace unos segundos
const vistaJefa = JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tAdmin }).data));
const dPac = base();
dPac.sanciones.find((s: any) => s.id_sancion === 's-a2').estado_pac = 'TAREAS_COMPLETADAS';
dPac.cambios = { sanciones: ['s-a2'] };
srv.post({ accion: 'guardar', token: tA1, data: dPac });
vistaJefa.alumnos.find((a: any) => a.id_alumno === 'al-1').telefono_tutor = '699999999';
vistaJefa.cambios = { alumnos: ['al-1'], sanciones: [], profesores: [], compensaciones: [] };
ok('Jefatura guarda con sus datos de hace unos segundos', srv.post({ accion: 'guardar', token: tAdmin, data: vistaJefa }).ok);
db = JSON.parse(srv.archivos['DB']);
ok('...sin deshacer la llegada al Aula PAC que guardó la docente', db.sanciones.find((s: any) => s.id_sancion === 's-a2').estado_pac === 'TAREAS_COMPLETADAS');
ok('...y con su propio cambio guardado', db.alumnos.find((a: any) => a.id_alumno === 'al-1').telefono_tutor === '699999999');

// Dos administradores editan partes distintos a la vez
const tJ = login(JEFA, 'jefa2026').token;
const vA = JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tAdmin }).data));
const vJ = JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tJ }).data));
vA.sanciones.find((s: any) => s.id_sancion === 's-a1').estado_tramitacion = 'COMUNICADO';
vA.cambios = { sanciones: ['s-a1'] };
vJ.sanciones.find((s: any) => s.id_sancion === 's-a2').estado_tramitacion = 'RESUELTO';
vJ.sanciones.push({ id_sancion: 's-jefa', id_alumno: 'al-1', id_profesor: 'prof-j', nombre_profesor: 'Jefa Estudios', puntos_restados: 1, fecha: '2026-10-09' });
vJ.cambios = { sanciones: ['s-a2', 's-jefa'] };
srv.post({ accion: 'guardar', token: tAdmin, data: vA });
srv.post({ accion: 'guardar', token: tJ, data: vJ });
db = JSON.parse(srv.archivos['DB']);
ok('dos administradores a la vez: se conservan los dos cambios',
  db.sanciones.find((s: any) => s.id_sancion === 's-a1').estado_tramitacion === 'COMUNICADO' &&
  db.sanciones.find((s: any) => s.id_sancion === 's-a2').estado_tramitacion === 'RESUELTO' && db.sanciones.some((s: any) => s.id_sancion === 's-jefa'));

// Jefatura cambia la tutoría de una docente mientras ella guarda un parte con datos antiguos
const vDoc = base();
const vAd = JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tAdmin }).data));
vAd.profesores.find((p: any) => p.email === ANA2).tutor_de_grupo = '2ESO_B';
vAd.cambios = { profesores: [ANA2] };
srv.post({ accion: 'guardar', token: tAdmin, data: vAd });
vDoc.sanciones.push({ id_sancion: 's-nuevo3', id_alumno: 'al-2', id_profesor: 'prof-a2', puntos_restados: 1, fecha: '2026-10-09' });
vDoc.cambios = { sanciones: ['s-nuevo3'], profesores: [] };
srv.post({ accion: 'guardar', token: tA2, data: vDoc });
db = JSON.parse(srv.archivos['DB']);
ok('la docente no deshace la tutoría que le acaba de asignar Jefatura', db.profesores.find((p: any) => p.email === ANA2).tutor_de_grupo === '2ESO_B');
ok('...y su parte nuevo se guarda', db.sanciones.some((s: any) => s.id_sancion === 's-nuevo3'));

// Un parte puesto desde la app antigua (otra pestaña abierta) mientras el servidor nuevo tiene datos en caché
const externo = JSON.parse(srv.archivos['DB']);
externo.sanciones.push({ id_sancion: 's-v1', id_alumno: 'al-1', id_profesor: 'prof-a1', nombre_profesor: 'Ana García', puntos_restados: 2, fecha: '2026-10-09', descripcion_hechos: 'desde la app antigua' });
srv.tocarExterno(externo);
const vAd2 = JSON.parse(JSON.stringify(lAdmin)); // Jefatura con datos antiguos
vAd2.cambios = { sanciones: [] };
srv.post({ accion: 'guardar', token: tAdmin, data: vAd2 });
db = JSON.parse(srv.archivos['DB']);
ok('un cambio hecho por fuera del servidor no se pierde (caché comprobada)', db.sanciones.some((s: any) => s.id_sancion === 's-v1'));
ok('...ni nada de lo anterior', ['s-a1', 's-a2', 's-jefa', 's-nuevo2', 's-nuevo3'].every(id => db.sanciones.some((s: any) => s.id_sancion === id)));
ok('...y los saldos de la v1 siguen anotados', !!db.saldos_antes_v2 && !!db.migracion_v2);
const lect = srv.post({ accion: 'leer', token: tAdmin, desde: 'x' }).data;
ok('la lectura posterior incluye el parte externo', lect.sanciones.some((s: any) => s.id_sancion === 's-v1'));

// 30 docentes poniendo un parte cada uno con datos descargados a la vez
const tokens: string[] = [];
const extra = JSON.parse(srv.archivos['DB']);
for (let i = 0; i < 30; i++) extra.profesores.push({ id_profesor: 'prof-m' + i, email: `m${i}@g.educaand.es`, nombre: 'M' + i, apellidos: 'X', rol: 'ROLE_DOCENTE', estado: 'ACTIVO' });
srv.tocarExterno(extra);
for (let i = 0; i < 30; i++) tokens.push(login(`m${i}@g.educaand.es`, 'clave' + i + 'x').token);
const vistas = tokens.map(t => JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: t }).data)));
vistas.forEach((v, i) => { v.sanciones.push({ id_sancion: 'masivo-' + i, id_alumno: 'al-1', id_profesor: 'prof-m' + i, puntos_restados: 1, fecha: '2026-10-09' }); v.cambios = { sanciones: ['masivo-' + i] }; });
vistas.forEach((v, i) => srv.post({ accion: 'guardar', token: tokens[i], data: v }));
db = JSON.parse(srv.archivos['DB']);
ok('30 docentes a la vez: se guardan los 30 partes', db.sanciones.filter((s: any) => String(s.id_sancion).startsWith('masivo-')).length === 30);

console.log('== 6. Bloqueo y sesiones');
for (let i = 0; i < 5; i++) login(SOLO_PERFIL, 'malamala1');
const bloq = login(SOLO_PERFIL, 'perfil1');
ok('tras 5 fallos la cuenta se bloquea aunque se acierte', !bloq.ok && bloq.codigo === 'BLOQUEADO');
const vb = JSON.parse(JSON.stringify(srv.post({ accion: 'leer', token: tAdmin }).data));
vb.profesores.find((p: any) => p.email === ANA1).estado = 'INACTIVO';
vb.cambios = { profesores: [ANA1] };
srv.post({ accion: 'guardar', token: tAdmin, data: vb });
const tras = srv.post({ accion: 'leer', token: tA1 });
ok('al dar de baja a una docente, su sesión abierta deja de funcionar', !tras.ok && tras.codigo === 'NO_AUTH');

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
