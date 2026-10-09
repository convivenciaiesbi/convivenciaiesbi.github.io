const mk=()=>{const st=new Map<string,string>();return {getItem:(k:string)=>st.get(k)??null,setItem:(k:string,v:string)=>{st.set(k,String(v))},removeItem:(k:string)=>{st.delete(k)},clear:()=>st.clear(),key:()=>null,length:0,_st:st}};
const g:any=globalThis; g.localStorage=mk(); g.sessionStorage=mk(); g.window=globalThis; g.CustomEvent=class{constructor(public type:string){}}; g.dispatchEvent=()=>true;
const { crearServidor } = await import('./simulador.mts');
const { generarServidorAppsScript } = await import('/home/claude/convivenciaiesbiclaude/src/services/appsScriptServidor.ts');
const ADMIN='mgonruz857@g.educaand.es', DOC='docente.prueba@g.educaand.es';
const srv = crearServidor(generarServidorAppsScript(), { profesores:[
  {id_profesor:'prof-01',email:ADMIN,nombre:'M',apellidos:'G',rol:'ROLE_CONVIVENCIA_ADMIN',estado:'ACTIVO'},
  {id_profesor:'prof-02',email:DOC,nombre:'Ana',apellidos:'D',rol:'ROLE_DOCENTE',estado:'ACTIVO'}],
  alumnos:[{id_alumno:'al-1',nombre:'Lucía',apellidos:'PRUEBA',grupo:'1ESO_A',puntos_actuales:10,estado:'ACTIVO'}], sanciones:[], compensaciones:[], audit_logs:[] });
let caido=false, peticiones:any[]=[];
g.fetch = async (_u:string,o:any)=>{ if(caido) throw new Error('red'); const req=JSON.parse(o.body); const res=srv.post(req); peticiones.push({accion:req.accion, bytes: JSON.stringify(res).length, sinCambios: !!res.sinCambios}); return {ok:true,status:200,text:async()=>JSON.stringify(res)}; };
const { AuthService: A } = await import('/home/claude/convivenciaiesbiclaude/src/services/authService.ts') as any;
const { StorageService: S } = await import('/home/claude/convivenciaiesbiclaude/src/services/storageService.ts') as any;
const { GoogleDriveSyncService: G } = await import('/home/claude/convivenciaiesbiclaude/src/services/googleDriveSyncService.ts') as any;
const C = await import('/home/claude/convivenciaiesbiclaude/src/services/colaPendiente.ts');
let fallos=0; const ok=(t:string,c:boolean,x='')=>{ if(!c) fallos++; console.log(`${c?'OK   ':'FALLO'} ${t}${x?' → '+x:''}`); };
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

console.log('== Parte sin conexión y pestaña cerrada');
await A.login(DOC,'lengua2026',false); await G.pullFromGoogleDrive({forceRefresh:true});
const yo=A.getCurrentUser();
caido=true;
S.imponerSancion({id_alumno:'al-1',puntos_restados:2,codigo_infraccion:'LEV-X',tipo_conducta:'LEVE',fecha:'2026-10-08',hora_incidente:'10:00',nombre_profesor:'Ana',id_profesor:yo.id_profesor,descripcion_hechos:'sin red',timestamp:new Date().toISOString(),derivado_pac:false,estado_pac:'NO_APLICA'},DOC);
G.triggerFastSync(0); await sleep(50);
ok('sin red: el parte queda guardado en el navegador', !!C.leerCola() && C.leerCola()!.sanciones.length===1);
ok('la cabecera muestra 1 cambio sin guardar', C.contarCambiosSinSubir()===1);
// se cierra la pestaña: la memoria se pierde; vuelve la red y el docente entra otra vez
S.clearMemoryCacheForFreshLogin(); caido=false;
await A.login(DOC,'lengua2026',false); await G.pullFromGoogleDrive({forceRefresh:true});
ok('al volver a entrar, el parte reaparece', S.getSanciones().some((s:any)=>s.descripcion_hechos==='sin red'));
await sleep(400);
ok('...y se envía solo a Drive', JSON.parse(srv.archivos['DB']).sanciones.some((s:any)=>s.descripcion_hechos==='sin red'));
ok('...y se borra del navegador al confirmarse', C.leerCola()===null && C.contarCambiosSinSubir()===0);

console.log('== Otro usuario en el mismo ordenador');
S.imponerSancion({id_alumno:'al-1',puntos_restados:1,codigo_infraccion:'LEV-Y',tipo_conducta:'LEVE',fecha:'2026-10-08',hora_incidente:'12:00',nombre_profesor:'Ana',id_profesor:yo.id_profesor,descripcion_hechos:'de Ana',timestamp:new Date().toISOString(),derivado_pac:false,estado_pac:'NO_APLICA'},DOC);
C.guardarCola(DOC); A.logout(); S.clearMemoryCacheForFreshLogin();
await A.login(ADMIN,'admin2026',true); await G.pullFromGoogleDrive({forceRefresh:true});
ok('el administrador no envía como suyo el parte pendiente de Ana', !S.getPendingSyncSancionIds().length);
ok('la cola de Ana se conserva para cuando ella vuelva', C.leerCola()?.email===DOC);

console.log('== Descarga incremental');
peticiones=[]; await G.pullFromGoogleDrive({forceRefresh:true}); await G.pullFromGoogleDrive({forceRefresh:true});
ok('sin cambios en Drive, el servidor responde "sin cambios"', peticiones.every(p=>p.sinCambios), peticiones.map(p=>p.bytes+' bytes').join(', '));
srv.post({accion:'guardar', token:A.getToken(), data:{...JSON.parse(srv.archivos['DB']), alumnos:[...JSON.parse(srv.archivos['DB']).alumnos, {id_alumno:'al-2',nombre:'Mateo',apellidos:'FICTICIO',grupo:'1ESO_B'}]}});
peticiones=[]; await G.pullFromGoogleDrive({forceRefresh:true});
ok('cuando alguien guarda, se descarga la versión nueva', !peticiones[0].sinCambios && S.getAlumnos().length===2);

console.log(fallos?`\n${fallos} FALLOS`:'\nTodo correcto');
