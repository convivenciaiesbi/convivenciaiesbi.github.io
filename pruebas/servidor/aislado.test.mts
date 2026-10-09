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

console.log('== Docente sin cambios: no envía nada');

await A.login(DOC,'lengua2026',false); await G.pullFromGoogleDrive({forceRefresh:true});
peticiones=[]; for (let i=0;i<3;i++) await G.pullFromGoogleDrive({forceRefresh:true}); await sleep(400);
ok('tres comprobaciones sin cambios no provocan ningún guardado', !peticiones.some(p=>p.accion==='guardar'), peticiones.map(p=>p.accion).join(','));
console.log(fallos?`\n${fallos} FALLOS`:'\nTodo correcto');
