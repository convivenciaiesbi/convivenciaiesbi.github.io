/**
 * Programa del servidor (Google Apps Script) de SIGC-BI, versión 2.
 *
 * Se genera con los datos del entorno (src/config/entorno.ts) y se pega en
 * script.google.com. Novedades frente a la versión 1:
 *  - Toda petición de datos exige una sesión iniciada (token).
 *  - Las contraseñas se comprueban aquí, se guardan con sal y nunca se devuelven.
 *  - Bloqueo de 15 minutos tras 5 intentos fallidos.
 *  - El profesorado sin privilegios solo recibe lo imprescindible y solo puede
 *    crear/modificar sus propios partes y el estado del Aula PAC.
 *  - Ya no se puede guardar mediante GET.
 *  - Las contraseñas antiguas (SHA-256 sin sal de la versión 1) se aceptan una vez
 *    y se convierten automáticamente al nuevo formato.
 *
 * Importante: el código del servidor no usa comillas invertidas ni "${" para poder
 * vivir dentro de esta plantilla.
 */

import { CARPETA_DRIVE_ID, ARCHIVO_DB_DRIVE, ES_ENTORNO_PRUEBAS } from '../config/entorno';

export const ADMIN_INICIAL = 'mgonruz857@g.educaand.es';

const PLANTILLA = String.raw`/**
 * =========================================================================
 * SIGC-BI · Servidor de datos v2 (Google Apps Script)
 * Entorno: __ENTORNO__
 * Carpeta de Drive: __CARPETA_ID__
 * Archivo de datos: __ARCHIVO_DB__
 * =========================================================================
 * Publicación: Implementar > Nueva implementación > Aplicación web
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier persona
 *     (la seguridad la pone este programa: sin sesión iniciada no devuelve datos)
 */

var CARPETA_ID = '__CARPETA_ID__';
var ARCHIVO_DB = '__ARCHIVO_DB__';
var ADMIN_INICIAL = '__ADMIN_INICIAL__';

var DURACION_SESION_SEG = 21600;   // 6 horas (máximo de CacheService), se renueva con el uso
var MAX_INTENTOS = 5;
var BLOQUEO_SEG = 900;             // 15 minutos
var ITERACIONES_HASH_V1 = 400;   // solo para comprobar claves guardadas con la primera versión del servidor
var TROZO_CACHE = 90000;

// ------------------------------------------------------------------ Emergencia (solo desde el editor)

/**
 * Si el administrador olvida su contraseña: abrir este proyecto en script.google.com,
 * elegir esta función en el desplegable de arriba y pulsar "Ejecutar".
 * En su próximo acceso a la app escribirá dos veces una contraseña nueva.
 * Solo puede ejecutarla quien tenga acceso a este proyecto de Apps Script.
 */
function restablecerClaveAdministrador() {
  var email = norm(ADMIN_INICIAL);
  propiedades().deleteProperty('CLAVE_' + email);
  CacheService.getScriptCache().remove('FALLOS_' + email);
  var db = leerDb();
  if (claveAntigua(db, email)) {
    for (var k in db.credenciales_profesores) { if (norm(k) === email) delete db.credenciales_profesores[k]; }
    escribirDb(db);
  }
  Logger.log('Contraseña de ' + email + ' restablecida. Fije una nueva en el próximo acceso a la app.');
}

// ------------------------------------------------------------------ Entrada

function doGet(e) {
  return salida({ ok: true, servicio: 'SIGC-BI', version: 2 });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return salida({ ok: false, error: 'Petición no válida.' });
  }
  try {
    switch (req.accion) {
      case 'estadoCuenta': return salida(estadoCuenta(req));
      case 'login': return salida(login(req));
      case 'logout': cerrarSesion(req.token); return salida({ ok: true });
      case 'leer': return salida(leer(req));
      case 'guardar': return salida(guardar(req));
      case 'cambiarClave': return salida(cambiarClave(req));
      case 'restablecerClave': return salida(restablecerClave(req));
      case 'estadoClaves': return salida(estadoClaves(req));
      default: return salida({ ok: false, error: 'Acción desconocida.' });
    }
  } catch (err) {
    if (err && err.codigo) return salida({ ok: false, codigo: err.codigo, error: err.message });
    return salida({ ok: false, error: 'Error del servidor: ' + err });
  }
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fallo(codigo, mensaje) {
  var e = new Error(mensaje);
  e.codigo = codigo;
  throw e;
}

function norm(email) {
  return String(email || '').toLowerCase().trim();
}

// ------------------------------------------------------------------ Base de datos

function vacia() {
  return { profesores: [], alumnos: [], sanciones: [], compensaciones: [], audit_logs: [], expedientes_sancion: [],
           deleted_sanciones: [], deleted_alumnos: [], deleted_profesores: [], deleted_expedientes: [],
           timestamp: new Date().toISOString() };
}

function asegurarListas(db) {
  ['profesores', 'alumnos', 'sanciones', 'compensaciones', 'audit_logs', 'expedientes_sancion',
   'deleted_sanciones', 'deleted_alumnos', 'deleted_profesores', 'deleted_expedientes'].forEach(function (k) {
    if (!Array.isArray(db[k])) db[k] = [];
  });
  return db;
}

function cacheLeer() {
  var cache = CacheService.getScriptCache();
  var n = parseInt(cache.get('DB2_N') || '0', 10);
  if (!n) return null;
  var claves = [];
  for (var i = 0; i < n; i++) claves.push('DB2_' + i);
  var trozos = cache.getAll(claves);
  var texto = '';
  for (var j = 0; j < n; j++) {
    if (trozos['DB2_' + j] === undefined) return null;
    texto += trozos['DB2_' + j];
  }
  return texto;
}

function cacheGuardar(texto) {
  var cache = CacheService.getScriptCache();
  try {
    var valores = {};
    var n = Math.ceil(texto.length / TROZO_CACHE);
    for (var i = 0; i < n; i++) valores['DB2_' + i] = texto.substring(i * TROZO_CACHE, (i + 1) * TROZO_CACHE);
    valores['DB2_N'] = String(n);
    cache.putAll(valores, 1800);
  } catch (e) {
    cache.remove('DB2_N');
  }
}

function leerDb() {
  var texto = cacheLeer();
  if (texto) return JSON.parse(texto);

  var archivos = DriveApp.getFolderById(CARPETA_ID).getFilesByName(ARCHIVO_DB);
  var db = null;
  while (archivos.hasNext()) {
    var contenido = archivos.next().getBlob().getDataAsString();
    try {
      var d = JSON.parse(contenido);
      if (d && typeof d === 'object') {
        if (!db) { db = asegurarListas(d); continue; }
        // Varios archivos con el mismo nombre: unir su contenido
        asegurarListas(d);
        ['sanciones', 'alumnos', 'compensaciones'].forEach(function (k) {
          var idk = k === 'sanciones' ? 'id_sancion' : (k === 'alumnos' ? 'id_alumno' : 'id_compensacion');
          var vistos = {};
          db[k].forEach(function (x) { if (x) vistos[x[idk]] = true; });
          d[k].forEach(function (x) { if (x && x[idk] && !vistos[x[idk]]) db[k].push(x); });
        });
      }
    } catch (err) {}
  }
  if (!db) db = vacia();
  var borradas = {};
  db.deleted_sanciones.forEach(function (id) { borradas[id] = true; });
  db.sanciones = db.sanciones.filter(function (s) { return s && s.id_sancion && !borradas[s.id_sancion]; });
  cacheGuardar(JSON.stringify(db));
  return db;
}

function escribirDb(db) {
  db.timestamp = new Date().toISOString();
  (db.profesores || []).forEach(function (p) { delete p.password_hash; delete p.requiere_cambio_clave; });
  delete db.reset_credenciales_emails;
  var texto = JSON.stringify(db);
  var carpeta = DriveApp.getFolderById(CARPETA_ID);
  var archivos = carpeta.getFilesByName(ARCHIVO_DB);
  if (archivos.hasNext()) archivos.next().setContent(texto);
  else carpeta.createFile(ARCHIVO_DB, texto, MimeType.PLAIN_TEXT);
  cacheGuardar(texto);
}

// ------------------------------------------------------------------ Profesorado y claves

function buscarProfesor(db, email) {
  var e = norm(email);
  var lista = db.profesores || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i] && norm(lista[i].email) === e) return lista[i];
  }
  if (e === norm(ADMIN_INICIAL)) {
    return { id_profesor: 'prof-01', email: e, nombre: 'Administrador', apellidos: '', departamento: 'Convivencia',
             rol: 'ROLE_CONVIVENCIA_ADMIN', estado: 'ACTIVO' };
  }
  return null;
}

function esAdmin(p) {
  return !!p && (p.rol === 'ROLE_CONVIVENCIA_ADMIN' || norm(p.email) === norm(ADMIN_INICIAL));
}

function perfilPublico(p) {
  return { id_profesor: p.id_profesor, email: p.email, nombre: p.nombre, apellidos: p.apellidos,
           departamento: p.departamento, rol: p.rol, tutor_de_grupo: p.tutor_de_grupo,
           tutoria_asignada_por: p.tutoria_asignada_por, estado: p.estado, motivo_baja: p.motivo_baja };
}

function propiedades() { return PropertiesService.getScriptProperties(); }

/**
 * Clave secreta del servidor (se crea sola la primera vez). Se guarda en las propiedades
 * del script, que solo puede ver el propietario del proyecto, igual que las contraseñas.
 */
function secretoServidor() {
  var p = propiedades();
  var s = p.getProperty('SECRETO_SERVIDOR');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty('SECRETO_SERVIDOR', s);
  }
  return s;
}

/** Cifrado de contraseñas: HMAC-SHA256 con sal propia y secreto del servidor (rápido en Apps Script). */
function hashClave(clave, sal) {
  return Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(sal + '|' + clave, secretoServidor() + sal, Utilities.Charset.UTF_8));
}

/** Formato de la primera versión del servidor v2 (lento): solo para comprobar y convertir. */
function hashClaveLento(clave, sal) {
  var v = sal + '|' + clave;
  for (var i = 0; i < ITERACIONES_HASH_V1; i++) {
    v = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v + sal, Utilities.Charset.UTF_8));
  }
  return v;
}

function sha256Hex(texto) {
  // Igual que la versión 1 de la app: cada carácter se toma como un byte (charCode & 255)
  var entrada = [];
  for (var i = 0; i < texto.length; i++) { var c = texto.charCodeAt(i) & 255; entrada.push(c > 127 ? c - 256 : c); }
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, entrada);
  return bytes.map(function (b) { var h = (b & 255).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

/** Comprueba una contraseña contra lo guardado; si estaba en el formato lento, la convierte. */
function claveCorrecta(email, clave, guardada) {
  if (guardada.v === 3) return hashClave(clave, guardada.sal) === guardada.hash;
  if (hashClaveLento(clave, guardada.sal) !== guardada.hash) return false;
  fijarClave(email, clave);
  return true;
}

function claveGuardada(email) {
  var r = propiedades().getProperty('CLAVE_' + norm(email));
  return r ? JSON.parse(r) : null;
}

function claveAntigua(db, email) {
  var c = db.credenciales_profesores || {};
  for (var k in c) { if (norm(k) === norm(email)) return c[k]; }
  return null;
}

function fijarClave(email, clave) {
  var sal = Utilities.getUuid();
  propiedades().setProperty('CLAVE_' + norm(email),
    JSON.stringify({ v: 3, sal: sal, hash: hashClave(clave, sal), fecha: new Date().toISOString() }));
}

function tieneClave(db, email) {
  return !!claveGuardada(email) || !!claveAntigua(db, email);
}

function validarComplejidad(clave) {
  var c = String(clave || '');
  if (c.length < 6) fallo('CLAVE_DEBIL', 'La contraseña debe tener al menos 6 caracteres.');
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(c) || !/[0-9]/.test(c)) {
    fallo('CLAVE_DEBIL', 'La contraseña debe combinar letras y números (por ejemplo: infante26).');
  }
}

// ------------------------------------------------------------------ Sesiones

function crearSesion(email) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('SES_' + token, norm(email), DURACION_SESION_SEG);
  return token;
}

function cerrarSesion(token) {
  if (token) CacheService.getScriptCache().remove('SES_' + token);
}

function sesion(token, db) {
  if (!token) fallo('NO_AUTH', 'Debe iniciar sesión.');
  var cache = CacheService.getScriptCache();
  var email = cache.get('SES_' + token);
  if (!email) fallo('NO_AUTH', 'La sesión ha caducado. Vuelva a iniciar sesión.');
  var p = buscarProfesor(db, email);
  if (!p || p.estado === 'INACTIVO') { cerrarSesion(token); fallo('NO_AUTH', 'Su cuenta ya no tiene acceso.'); }
  cache.put('SES_' + token, email, DURACION_SESION_SEG);
  return { email: norm(email), prof: p, admin: esAdmin(p) };
}

// ------------------------------------------------------------------ Acciones

function estadoCuenta(req) {
  var db = leerDb();
  var p = buscarProfesor(db, req.email);
  if (!p) return { ok: true, registrado: false };
  if (p.estado === 'INACTIVO') return { ok: true, registrado: true, activo: false, motivoBaja: p.motivo_baja || '' };
  return { ok: true, registrado: true, activo: true, tieneClave: tieneClave(db, req.email) };
}

function login(req) {
  var email = norm(req.email);
  var cache = CacheService.getScriptCache();
  var clave = String(req.clave || '');
  var intentos = parseInt(cache.get('FALLOS_' + email) || '0', 10);
  if (intentos >= MAX_INTENTOS) {
    fallo('BLOQUEADO', 'Demasiados intentos fallidos. Espere 15 minutos o pida a Jefatura que restablezca su contraseña.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var db = leerDb();
    var p = buscarProfesor(db, email);
    if (!p) fallo('NO_REGISTRADO', 'La cuenta "' + email + '" no figura en el claustro. Debe darla de alta Jefatura de Estudios.');
    if (p.estado === 'INACTIVO') fallo('BAJA', 'La cuenta "' + email + '" está de baja en el centro.');

    var guardada = claveGuardada(email);
    var antigua = claveAntigua(db, email);
    var primerAcceso = false;

    if (guardada) {
      if (!claveCorrecta(email, clave, guardada)) return claveIncorrecta(email, intentos);
    } else if (antigua) {
      // Contraseña de la versión anterior: comprobar y convertir al formato nuevo
      if (sha256Hex(clave.trim()) !== antigua) return claveIncorrecta(email, intentos);
      fijarClave(email, clave);
      for (var k in db.credenciales_profesores) { if (norm(k) === email) delete db.credenciales_profesores[k]; }
      escribirDb(db);
    } else {
      // Primer acceso: el docente fija su contraseña
      validarComplejidad(clave);
      fijarClave(email, clave);
      primerAcceso = true;
    }

    cache.remove('FALLOS_' + email);
    return { ok: true, token: crearSesion(email), usuario: perfilPublico(p), admin: esAdmin(p), primerAcceso: primerAcceso };
  } finally {
    lock.releaseLock();
  }
}

function claveIncorrecta(email, intentosPrevios) {
  var n = intentosPrevios + 1;
  CacheService.getScriptCache().put('FALLOS_' + email, String(n), BLOQUEO_SEG);
  var quedan = MAX_INTENTOS - n;
  fallo('CLAVE_INCORRECTA', quedan > 0
    ? 'Contraseña incorrecta. Le quedan ' + quedan + ' intento(s).'
    : 'Contraseña incorrecta. Cuenta bloqueada 15 minutos.');
}

function cambiarClave(req) {
  var db = leerDb();
  var s = sesion(req.token, db);
  var guardada = claveGuardada(s.email);
  if (!guardada || !claveCorrecta(s.email, String(req.actual || ''), guardada)) {
    fallo('CLAVE_INCORRECTA', 'La contraseña actual no es correcta.');
  }
  validarComplejidad(req.nueva);
  fijarClave(s.email, String(req.nueva));
  return { ok: true };
}

function restablecerClave(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return restablecerClaveBloqueado(req);
  } finally {
    lock.releaseLock();
  }
}

function restablecerClaveBloqueado(req) {
  var db = leerDb();
  var s = sesion(req.token, db);
  if (!s.admin) fallo('PROHIBIDO', 'Solo Jefatura o Convivencia pueden restablecer contraseñas.');
  var email = norm(req.email);
  propiedades().deleteProperty('CLAVE_' + email);
  CacheService.getScriptCache().remove('FALLOS_' + email);
  if (claveAntigua(db, email)) {
    for (var k in db.credenciales_profesores) { if (norm(k) === email) delete db.credenciales_profesores[k]; }
    escribirDb(db);
  }
  registrarAuditoria(db, s.email, 'Docente/' + email, 'Contraseña restablecida: el docente fijará una nueva en su próximo acceso.');
  return { ok: true };
}

function estadoClaves(req) {
  var db = leerDb();
  var s = sesion(req.token, db);
  if (!s.admin) fallo('PROHIBIDO', 'Sin permiso.');
  var estado = {};
  (db.profesores || []).forEach(function (p) { if (p && p.email) estado[norm(p.email)] = tieneClave(db, p.email); });
  return { ok: true, estado: estado };
}

function registrarAuditoria(db, email, entidad, detalles) {
  db.audit_logs.unshift({ id_log: 'log-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1e6),
    timestamp: new Date().toISOString(), usuario_email: email, accion: 'ACTUALIZACION_SISTEMA',
    entidad: entidad, detalles: detalles, hash_integridad: '' });
  db.audit_logs = db.audit_logs.slice(0, 300);
  escribirDb(db);
}

// ------------------------------------------------------------------ Lectura

function sinCredenciales(db) {
  var copia = JSON.parse(JSON.stringify(db));
  delete copia.credenciales_profesores;
  delete copia.reset_credenciales_emails;
  copia.profesores = (copia.profesores || []).map(function (p) { delete p.password_hash; return p; });
  return copia;
}

var CAMPOS_PARTE_AJENO = ['id_sancion', 'numero_expediente', 'timestamp', 'fecha', 'hora_incidente', 'tramo_horario',
  'id_alumno', 'id_profesor', 'nombre_profesor', 'codigo_infraccion', 'tipo_conducta', 'puntos_restados',
  'derivado_pac', 'estado_pac', 'estado_tramitacion', 'ubicacion', 'materia'];

function soloCampos(obj, campos) {
  var r = {};
  campos.forEach(function (c) { if (obj[c] !== undefined) r[c] = obj[c]; });
  return r;
}

function esAutor(s, prof) {
  return !!s && !!prof && (s.id_profesor === prof.id_profesor);
}

function vistaDocente(db, prof) {
  var d = sinCredenciales(db);
  // Tutoría: el tutor ve completo todo lo de su grupo (partes, medidas y teléfonos de las familias)
  var grupoTutoria = prof.tutor_de_grupo || '';
  var deMiTutoria = {};
  if (grupoTutoria) {
    d.alumnos.forEach(function (a) { if (a && a.grupo === grupoTutoria) deMiTutoria[a.id_alumno] = true; });
  }
  d.profesores = d.profesores.map(perfilPublico);
  d.alumnos = d.alumnos.map(function (a) {
    var c = JSON.parse(JSON.stringify(a));
    if (!deMiTutoria[a.id_alumno]) { c.telefono_tutor = ''; c.nombre_tutor = ''; }
    return c;
  });
  d.sanciones = d.sanciones.map(function (s) {
    if (esAutor(s, prof) || deMiTutoria[s.id_alumno]) return s;
    if (s.derivado_pac) {
      var c = JSON.parse(JSON.stringify(s));
      delete c.observaciones_tramitacion; delete c.fecha_comunicacion_familia;
      return c;
    }
    var m = soloCampos(s, CAMPOS_PARTE_AJENO);
    m.descripcion_hechos = '';
    return m;
  });
  d.compensaciones = d.compensaciones.map(function (c) {
    if (deMiTutoria[c.id_alumno]) return c;
    return soloCampos(c, ['id_compensacion', 'timestamp', 'id_alumno', 'puntos_recuperados', 'fecha_completada']);
  });
  // Expedientes de sanción: solo los del alumnado de su tutoría
  d.expedientes_sancion = (d.expedientes_sancion || []).filter(function (e) { return deMiTutoria[e.id_alumno]; });
  d.audit_logs = [];
  return d;
}

function leer(req) {
  var db = leerDb();
  var s = sesion(req.token, db);
  // Lectura incremental: si el cliente ya tiene esta versión, no se reenvía nada
  if (req.desde && db.timestamp && req.desde === db.timestamp) {
    return { ok: true, sinCambios: true, timestamp: db.timestamp };
  }
  return { ok: true, admin: s.admin, usuario: perfilPublico(s.prof), data: s.admin ? sinCredenciales(db) : vistaDocente(db, s.prof) };
}

// ------------------------------------------------------------------ Guardado

function unirTombstones(a, b) {
  var m = {};
  (a || []).forEach(function (x) { if (x) m[x] = true; });
  (b || []).forEach(function (x) { if (x) m[x] = true; });
  return Object.keys(m);
}

function guardar(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var db = leerDb();
    var s = sesion(req.token, db);
    var entrada = asegurarListas(req.data || {});
    var avisos = [];
    var resultado = s.admin ? fusionAdmin(db, entrada) : fusionDocente(db, entrada, s, avisos);
    escribirDb(resultado);
    return { ok: true, timestamp: resultado.timestamp, avisos: avisos };
  } finally {
    lock.releaseLock();
  }
}

/** Jefatura/Convivencia: lo que envía es la referencia, sin perder lo que otros hayan guardado. */
function fusionAdmin(actual, entrada) {
  var r = entrada;
  r.credenciales_profesores = actual.credenciales_profesores || {};
  r.deleted_sanciones = unirTombstones(actual.deleted_sanciones, entrada.deleted_sanciones);
  r.deleted_alumnos = unirTombstones(actual.deleted_alumnos, entrada.deleted_alumnos);
  r.deleted_profesores = unirTombstones(actual.deleted_profesores, entrada.deleted_profesores);

  var activasEntrada = {};
  r.sanciones.forEach(function (x) { if (x && x.id_sancion) activasEntrada[x.id_sancion] = true; });
  // Un parte que llega activo no se considera borrado (restaurado)
  r.deleted_sanciones = r.deleted_sanciones.filter(function (id) { return !activasEntrada[id]; });
  var borradas = {};
  r.deleted_sanciones.forEach(function (id) { borradas[id] = true; });
  r.sanciones = r.sanciones.filter(function (x) { return x && x.id_sancion && !borradas[x.id_sancion]; });
  actual.sanciones.forEach(function (x) {
    if (x && x.id_sancion && !activasEntrada[x.id_sancion] && !borradas[x.id_sancion]) r.sanciones.push(x);
  });

  var comps = {};
  r.compensaciones.forEach(function (c) { if (c && c.id_compensacion) comps[c.id_compensacion] = true; });
  actual.compensaciones.forEach(function (c) { if (c && c.id_compensacion && !comps[c.id_compensacion]) r.compensaciones.push(c); });

  var profBorr = {};
  r.deleted_profesores.forEach(function (x) { profBorr[norm(x)] = true; profBorr[x] = true; });
  var profIds = {}, profEmails = {};
  r.profesores.forEach(function (p) { if (p) { profIds[p.id_profesor] = true; profEmails[norm(p.email)] = true; } });
  actual.profesores.forEach(function (p) {
    if (p && !profBorr[p.id_profesor] && !profBorr[norm(p.email)] && !profIds[p.id_profesor] && !profEmails[norm(p.email)]) r.profesores.push(p);
  });

  var almBorr = {};
  r.deleted_alumnos.forEach(function (x) { almBorr[x] = true; });
  var almIds = {};
  r.alumnos.forEach(function (a) { if (a && a.id_alumno) almIds[a.id_alumno] = true; });
  actual.alumnos.forEach(function (a) { if (a && a.id_alumno && !almBorr[a.id_alumno] && !almIds[a.id_alumno]) r.alumnos.push(a); });
  r.alumnos = r.alumnos.filter(function (a) { return a && !almBorr[a.id_alumno]; });

  // Expedientes de sanción: gana la versión modificada más recientemente; se respetan los borrados
  r.deleted_expedientes = unirTombstones(actual.deleted_expedientes, entrada.deleted_expedientes);
  var expBorr = {};
  r.deleted_expedientes.forEach(function (id) { expBorr[id] = true; });
  var expMapa = {};
  actual.expedientes_sancion.forEach(function (e) { if (e && e.id_expediente) expMapa[e.id_expediente] = e; });
  r.expedientes_sancion.forEach(function (e) {
    if (!e || !e.id_expediente) return;
    var previo = expMapa[e.id_expediente];
    if (!previo || String(e.timestamp || '') >= String(previo.timestamp || '')) expMapa[e.id_expediente] = e;
  });
  r.expedientes_sancion = Object.keys(expMapa)
    .filter(function (id) { return !expBorr[id]; })
    .map(function (id) { return expMapa[id]; });

  var logs = {};
  r.audit_logs.forEach(function (l) { if (l && l.id_log) logs[l.id_log] = true; });
  actual.audit_logs.forEach(function (l) { if (l && l.id_log && !logs[l.id_log]) r.audit_logs.push(l); });
  r.audit_logs.sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
  r.audit_logs = r.audit_logs.slice(0, 300);
  return r;
}

var CAMPOS_PAC = ['estado_pac', 'profesor_pac_receptor', 'hora_llegada_pac'];

/**
 * El docente puede cambiar en su perfil su nombre, apellidos, departamento y tutoría.
 * La tutoría solo si el grupo no tiene ya otro tutor activo; queda anotado que la asignó él.
 */
function actualizarPerfilPropio(r, entrada, s, avisos) {
  var propio = null;
  (entrada.profesores || []).forEach(function (p) { if (p && norm(p.email) === s.email) propio = p; });
  if (!propio) return;
  var mio = null;
  r.profesores.forEach(function (p) { if (p && norm(p.email) === s.email) mio = p; });
  if (!mio) return;

  ['nombre', 'apellidos', 'departamento'].forEach(function (c) {
    if (typeof propio[c] === 'string' && propio[c].trim()) mio[c] = propio[c].trim();
  });

  var nueva = propio.tutor_de_grupo || '';
  var anterior = mio.tutor_de_grupo || '';
  if (nueva === anterior) return;
  if (nueva) {
    var ocupado = null;
    r.profesores.forEach(function (p) {
      if (p && norm(p.email) !== s.email && p.estado !== 'INACTIVO' && p.tutor_de_grupo === nueva) ocupado = p;
    });
    if (ocupado) {
      avisos.push('El grupo ya tiene tutor/a (' + (ocupado.nombre || '') + ' ' + (ocupado.apellidos || '') + '). Pídaselo a Jefatura.');
      return;
    }
    mio.tutor_de_grupo = nueva;
    mio.tutoria_asignada_por = 'DOCENTE';
  } else {
    delete mio.tutor_de_grupo;
    delete mio.tutoria_asignada_por;
  }
  r.audit_logs.unshift({ id_log: 'log-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1e6),
    timestamp: new Date().toISOString(), usuario_email: s.email, accion: 'ACTUALIZACION_SISTEMA',
    entidad: 'Docente/Tutoria', detalles: 'Tutoría cambiada por el propio docente: ' + (anterior || 'ninguna') + ' -> ' + (nueva || 'ninguna'),
    hash_integridad: '' });
}

/** Profesorado sin privilegios: solo sus partes, el estado del Aula PAC y su propio registro de auditoría. */
function fusionDocente(actual, entrada, s, avisos) {
  var r = actual;
  actualizarPerfilPropio(r, entrada, s, avisos || []);
  var porId = {};
  r.sanciones.forEach(function (x, i) { if (x && x.id_sancion) porId[x.id_sancion] = i; });
  var yaBorradas = {};
  r.deleted_sanciones.forEach(function (id) { yaBorradas[id] = true; });

  entrada.sanciones.forEach(function (x) {
    if (!x || !x.id_sancion || yaBorradas[x.id_sancion]) return;
    var i = porId[x.id_sancion];
    if (i === undefined) {
      // Parte nuevo: solo si lo firma el propio docente
      if (esAutor(x, s.prof)) { r.sanciones.push(x); porId[x.id_sancion] = r.sanciones.length - 1; }
      return;
    }
    var existente = r.sanciones[i];
    if (esAutor(existente, s.prof) && esAutor(x, s.prof)) {
      r.sanciones[i] = x; // su propio parte: puede modificarlo
    } else if (existente.derivado_pac) {
      CAMPOS_PAC.forEach(function (c) { if (x[c] !== undefined) existente[c] = x[c]; });
    }
  });

  // Borrados: solo de sus propios partes
  (entrada.deleted_sanciones || []).forEach(function (id) {
    var i = porId[id];
    if (i !== undefined && esAutor(r.sanciones[i], s.prof) && !yaBorradas[id]) {
      r.deleted_sanciones.push(id);
      yaBorradas[id] = true;
    }
  });
  r.sanciones = r.sanciones.filter(function (x) { return x && !yaBorradas[x.id_sancion]; });

  var logs = {};
  r.audit_logs.forEach(function (l) { if (l && l.id_log) logs[l.id_log] = true; });
  entrada.audit_logs.forEach(function (l) {
    if (l && l.id_log && !logs[l.id_log] && norm(l.usuario_email) === s.email) r.audit_logs.unshift(l);
  });
  r.audit_logs = r.audit_logs.slice(0, 300);
  return r;
}
`;

/** Código del servidor listo para pegar en script.google.com, configurado para el entorno actual. */
export function generarServidorAppsScript(): string {
  return PLANTILLA
    .split('__CARPETA_ID__').join(CARPETA_DRIVE_ID)
    .split('__ARCHIVO_DB__').join(ARCHIVO_DB_DRIVE)
    .split('__ADMIN_INICIAL__').join(ADMIN_INICIAL)
    .split('__ENTORNO__').join(ES_ENTORNO_PRUEBAS ? 'PRUEBAS (datos ficticios)' : 'PRODUCCIÓN');
}
