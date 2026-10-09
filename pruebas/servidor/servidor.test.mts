const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
import crypto from 'crypto';
const { crearServidor } = await import('./simulador.mts');
const { generarServidorAppsScript } = await import('/home/claude/convivenciaiesbiclaude/src/services/appsScriptServidor.ts');
const ADMIN='mgonruz857@g.educaand.es', DOC='docente.prueba@g.educaand.es', OTRO='otro.prueba@g.educaand.es';
const db0 = { profesores:[
  {id_profesor:'prof-01',email:ADMIN,nombre:'Miguel',apellidos:'G',rol:'ROLE_CONVIVENCIA_ADMIN',estado:'ACTIVO'},
  {id_profesor:'prof-02',email:DOC,nombre:'Ana',apellidos:'D',rol:'ROLE_DOCENTE',estado:'ACTIVO'},
  {id_profesor:'prof-03',email:OTRO,nombre:'Luis',apellidos:'O',rol:'ROLE_DOCENTE',estado:'ACTIVO'},
  {id_profesor:'prof-04',email:'baja.prueba@g.educaand.es',nombre:'B',apellidos:'B',rol:'ROLE_DOCENTE',estado:'INACTIVO'},
  {id_profesor:'prof-05',email:'antiguo.prueba@g.educaand.es',nombre:'V',apellidos:'V',rol:'ROLE_DOCENTE',estado:'ACTIVO'}],
 alumnos:[{id_alumno:'al-1',nombre:'A',apellidos:'PRUEBA',grupo:'1ESO_A',telefono_tutor:'600111222',nombre_tutor:'Madre'}],
 sanciones:[{id_sancion:'s-otro',id_profesor:'prof-03',id_alumno:'al-1',puntos_restados:2,fecha:'2026-10-01',descripcion_hechos:'Hechos privados',derivado_pac:false},
            {id_sancion:'s-pac',id_profesor:'prof-03',id_alumno:'al-1',puntos_restados:3,fecha:HOY,descripcion_hechos:'Va al PAC',derivado_pac:true,estado_pac:'PENDIENTE',observaciones_tramitacion:'familia'}],
 compensaciones:[{id_compensacion:'c-1',id_alumno:'al-1',puntos_recuperados:1,fecha_completada:'2026-10-03',descripcion_tarea:'privada'}],
 audit_logs:[], credenciales_profesores:{ 'antiguo.prueba@g.educaand.es': crypto.createHash('sha256').update('vieja2025').digest('hex'),
   'tilde.prueba@g.educaand.es': crypto.createHash('sha256').update(Buffer.from([...'Córdoba26'].map(c=>c.charCodeAt(0)&255))).digest('hex') } };
db0.profesores.push({id_profesor:'prof-06',email:'tilde.prueba@g.educaand.es',nombre:'T',apellidos:'T',rol:'ROLE_DOCENTE',estado:'ACTIVO'} as any);
const srv = crearServidor(generarServidorAppsScript(), db0);
let fallos=0; const ok=(t:string,c:boolean,extra='')=>{ if(!c) fallos++; console.log(`${c?'OK   ':'FALLO'} ${t}${extra?' → '+extra:''}`); };

console.log('== Sin sesión no hay datos');
let r = srv.post({accion:'leer'}); ok('leer sin token se rechaza', !r.ok && r.codigo==='NO_AUTH');
r = srv.post({accion:'guardar', data:{sanciones:[]}}); ok('guardar sin token se rechaza', !r.ok && r.codigo==='NO_AUTH');
r = srv.post({accion:'leer', token:'inventado'}); ok('token inventado se rechaza', !r.ok && r.codigo==='NO_AUTH');

console.log('== Primer acceso y contraseñas');
r = srv.post({accion:'estadoCuenta', email:DOC}); ok('estado de cuenta nueva: sin contraseña', r.registrado && r.activo && r.tieneClave===false);
r = srv.post({accion:'login', email:DOC, clave:'abc'}); ok('primer acceso con clave débil se rechaza', !r.ok && r.codigo==='CLAVE_DEBIL');
r = srv.post({accion:'login', email:DOC, clave:'clave2026'}); ok('primer acceso fija la contraseña', r.ok && r.primerAcceso===true);
const tokDoc = r.token;
r = srv.post({accion:'login', email:DOC, clave:'otra2026'}); ok('después nadie puede "reclamar" la cuenta con otra clave', !r.ok && r.codigo==='CLAVE_INCORRECTA', r.error);
r = srv.post({accion:'login', email:DOC, clave:'clave2026'}); ok('la clave correcta sigue funcionando', r.ok && !r.primerAcceso);
r = srv.post({accion:'login', email:'nadie@g.educaand.es', clave:'x1x1x1'}); ok('correo fuera del claustro se rechaza', !r.ok && r.codigo==='NO_REGISTRADO');
r = srv.post({accion:'login', email:'baja.prueba@g.educaand.es', clave:'clave2026'}); ok('docente de baja se rechaza', !r.ok && r.codigo==='BAJA');
r = srv.post({accion:'login', email:'antiguo.prueba@g.educaand.es', clave:'vieja2025'}); ok('contraseña antigua (versión 1) sigue valiendo', r.ok);
ok('...y se convierte: ya no queda en el archivo de datos', !JSON.parse(srv.archivos['DB']).credenciales_profesores?.['antiguo.prueba@g.educaand.es']);
r = srv.post({accion:'login', email:'antiguo.prueba@g.educaand.es', clave:'vieja2025'}); ok('...y sigue funcionando después', r.ok);
r = srv.post({accion:'login', email:'tilde.prueba@g.educaand.es', clave:'Córdoba26'}); ok('contraseña antigua con tilde también vale', r.ok);
ok('ninguna contraseña aparece en el archivo de Drive', !/clave2026|vieja2025/.test(srv.archivos['DB']) && !srv.archivos['DB'].includes('password_hash'));

console.log('== Bloqueo por intentos');
srv.post({accion:'login', email:OTRO, clave:'buena2026'});
for (let i=0;i<5;i++) r = srv.post({accion:'login', email:OTRO, clave:'mala'+i+'x'});
ok('tras 5 fallos la cuenta se bloquea', !r.ok);
r = srv.post({accion:'login', email:OTRO, clave:'buena2026'}); ok('bloqueada incluso con la clave buena', !r.ok && r.codigo==='BLOQUEADO');

console.log('== Lo que ve un docente');
r = srv.post({accion:'leer', token:tokDoc}); const d=r.data;
ok('lee datos con su sesión', r.ok && !r.admin);
ok('no recibe contraseñas', !JSON.stringify(d).includes('credenciales') && !JSON.stringify(d).includes('password_hash'));
ok('no recibe teléfonos de familias', d.alumnos[0].telefono_tutor==='' );
ok('no recibe los hechos de partes ajenos', d.sanciones.find((s:any)=>s.id_sancion==='s-otro').descripcion_hechos==='');
ok('sí recibe los puntos (para el saldo)', d.sanciones.find((s:any)=>s.id_sancion==='s-otro').puntos_restados===2);
ok('ve el parte derivado al PAC sin observaciones de familia', d.sanciones.find((s:any)=>s.id_sancion==='s-pac').descripcion_hechos==='Va al PAC' && !d.sanciones.find((s:any)=>s.id_sancion==='s-pac').observaciones_tramitacion);
ok('no recibe la auditoría', d.audit_logs.length===0);

console.log('== Lo que puede guardar un docente');
const propio={id_sancion:'s-mio',id_profesor:'prof-02',id_alumno:'al-1',puntos_restados:2,fecha:'2026-10-05',descripcion_hechos:'mío',derivado_pac:false};
const falso={id_sancion:'s-falso',id_profesor:'prof-03',id_alumno:'al-1',puntos_restados:10,fecha:'2026-10-05',descripcion_hechos:'firmado por otro'};
const ajenoMod={...db0.sanciones[0], puntos_restados:0, descripcion_hechos:''};
const pacMod={...db0.sanciones[1], estado_pac:'TAREAS_COMPLETADAS', puntos_restados:0};
r = srv.post({accion:'guardar', token:tokDoc, data:{ sanciones:[propio,falso,ajenoMod,pacMod], alumnos:[], profesores:[], compensaciones:[], audit_logs:[], deleted_sanciones:['s-otro'] }});
const tras = JSON.parse(srv.archivos['DB']);
ok('guarda su propio parte', r.ok && !!tras.sanciones.find((s:any)=>s.id_sancion==='s-mio'));
ok('no puede crear un parte firmado por otro', !tras.sanciones.find((s:any)=>s.id_sancion==='s-falso'));
ok('no puede cambiar los puntos de un parte ajeno', tras.sanciones.find((s:any)=>s.id_sancion==='s-otro')?.puntos_restados===2);
ok('no borra el texto de partes ajenos (aunque le lleguen vacíos)', tras.sanciones.find((s:any)=>s.id_sancion==='s-otro')?.descripcion_hechos==='Hechos privados');
ok('no puede borrar partes ajenos', !!tras.sanciones.find((s:any)=>s.id_sancion==='s-otro'));
ok('sí actualiza el estado del Aula PAC', tras.sanciones.find((s:any)=>s.id_sancion==='s-pac').estado_pac==='TAREAS_COMPLETADAS');
ok('...pero no los puntos de ese parte', tras.sanciones.find((s:any)=>s.id_sancion==='s-pac').puntos_restados===3);
ok('no toca el alumnado ni el profesorado', tras.alumnos.length===1 && tras.profesores.length===6 && tras.alumnos[0].telefono_tutor==='600111222');
r = srv.post({accion:'guardar', token:tokDoc, data:{ sanciones:[], deleted_sanciones:['s-mio'] }});
ok('puede borrar su propio parte', !JSON.parse(srv.archivos['DB']).sanciones.find((s:any)=>s.id_sancion==='s-mio'));
r = srv.post({accion:'restablecerClave', token:tokDoc, email:ADMIN}); ok('un docente no puede restablecer contraseñas', !r.ok && r.codigo==='PROHIBIDO');

console.log('== Administración');
r = srv.post({accion:'login', email:ADMIN, clave:'admin2026'}); const tokAdm=r.token; ok('el administrador entra', r.ok && r.admin);
r = srv.post({accion:'leer', token:tokAdm}); ok('ve todo excepto contraseñas', r.data.alumnos[0].telefono_tutor==='600111222' && !JSON.stringify(r.data).includes('credenciales'));
r = srv.post({accion:'estadoClaves', token:tokAdm}); ok('ve quién ha activado su cuenta', r.estado[DOC]===true && r.estado['baja.prueba@g.educaand.es']===false, JSON.stringify(r.estado));
r = srv.post({accion:'restablecerClave', token:tokAdm, email:DOC}); ok('restablece la contraseña de un docente', r.ok);
r = srv.post({accion:'estadoCuenta', email:DOC}); ok('...que vuelve a "sin contraseña"', r.tieneClave===false);
r = srv.post({accion:'login', email:DOC, clave:'nueva2026'}); ok('...y fija una nueva al entrar', r.ok && r.primerAcceso);
const tokDoc2=r.token;
// el admin da de baja al docente → su sesión deja de valer
const full = srv.post({accion:'leer', token:tokAdm}).data; full.profesores.find((p:any)=>p.email===DOC).estado='INACTIVO';
srv.post({accion:'guardar', token:tokAdm, data:full});
r = srv.post({accion:'leer', token:tokDoc2}); ok('al dar de baja a un docente, su sesión deja de valer', !r.ok && r.codigo==='NO_AUTH');
r = srv.post({accion:'cambiarClave', token:tokAdm, actual:'mal', nueva:'otra2027'}); ok('cambiar clave exige la actual', !r.ok);
r = srv.post({accion:'cambiarClave', token:tokAdm, actual:'admin2026', nueva:'otra2027'}); ok('cambiar clave con la actual correcta', r.ok && srv.post({accion:'login',email:ADMIN,clave:'otra2027'}).ok);
console.log(fallos?`\n${fallos} FALLOS`:'\nTodo correcto');
