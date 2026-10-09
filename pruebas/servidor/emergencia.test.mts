import crypto from 'crypto';
const { crearServidor } = await import('./simulador.mts');
const { generarServidorAppsScript } = await import('/home/claude/convivenciaiesbiclaude/src/services/appsScriptServidor.ts');
const A='mgonruz857@g.educaand.es';
// Situación real: contraseña olvidada guardada en formato antiguo en el JSON de pruebas
const srv = crearServidor(generarServidorAppsScript(), { profesores:[{id_profesor:'prof-01',email:A,rol:'ROLE_CONVIVENCIA_ADMIN',estado:'ACTIVO'}], alumnos:[], sanciones:[],
  credenciales_profesores:{ [A]: crypto.createHash('sha256').update('olvidada99').digest('hex') } });
console.log('antes:', srv.post({accion:'estadoCuenta',email:A}).tieneClave ? 'tiene contraseña' : 'sin contraseña');
srv.ctx.restablecerClaveAdministrador();
const e = srv.post({accion:'estadoCuenta',email:A}); console.log('tras ejecutar la función:', e.tieneClave ? 'tiene contraseña' : 'sin contraseña (primer acceso)');
const l = srv.post({accion:'login',email:A,clave:'nueva2026'}); console.log('nueva contraseña:', l.ok ? 'OK' : 'FALLO '+l.error);
console.log('la vieja ya no vale:', !srv.post({accion:'login',email:A,clave:'olvidada99'}).ok ? 'OK' : 'FALLO');
