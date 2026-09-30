/**
 * Servicio para generar y exportar la estructura de carpetas oficial
 * en Google Drive corporativo para 14007180.aplicaciones@g.educaand.es
 * Con todos los grupos del IES Blas Infante:
 * - Ciclos: 1º y 2º FRÍO, 1º y 2º INF, 1º y 2º CALOR
 * - ESO: 1º a 4º ESO (Líneas A, B, C, D)
 * - Bachillerato: 1º y 2º BACH (Líneas A, B, C, D)
 */

export interface FolderNode {
  name: string;
  description: string;
  subfolders?: FolderNode[];
}

export const ESTRUCTURA_DRIVE_OFICIAL: FolderNode = {
  name: 'CONVIVENCIA_IES_BLAS_INFANTE',
  description: 'Carpeta raíz oficial de custodia de convivencia escolar (Google Workspace for Education)',
  subfolders: [
    {
      name: '2026-2027',
      description: 'Curso académico activo',
      subfolders: [
        {
          name: '01_Partes_PDF',
          description: 'Custodia digital de actas y partes disciplinarios oficiales en PDF por grupos',
          subfolders: [
            // Ciclos Formativos
            { name: '1_FRIO', description: 'Partes 1º Ciclo Instalaciones Frigoríficas y Climatización' },
            { name: '2_FRIO', description: 'Partes 2º Ciclo Instalaciones Frigoríficas y Climatización' },
            { name: '1_INF', description: 'Partes 1º Ciclo Informática' },
            { name: '2_INF', description: 'Partes 2º Ciclo Informática' },
            { name: '1_CALOR', description: 'Partes 1º Ciclo Instalaciones de Producción de Calor' },
            { name: '2_CALOR', description: 'Partes 2º Ciclo Instalaciones de Producción de Calor' },

            // 1º ESO
            { name: '1ESO_A', description: 'Partes 1º ESO Grupo A' },
            { name: '1ESO_B', description: 'Partes 1º ESO Grupo B' },
            { name: '1ESO_C', description: 'Partes 1º ESO Grupo C' },
            { name: '1ESO_D', description: 'Partes 1º ESO Grupo D' },

            // 2º ESO
            { name: '2ESO_A', description: 'Partes 2º ESO Grupo A' },
            { name: '2ESO_B', description: 'Partes 2º ESO Grupo B' },
            { name: '2ESO_C', description: 'Partes 2º ESO Grupo C' },
            { name: '2ESO_D', description: 'Partes 2º ESO Grupo D' },

            // 3º ESO
            { name: '3ESO_A', description: 'Partes 3º ESO Grupo A' },
            { name: '3ESO_B', description: 'Partes 3º ESO Grupo B' },
            { name: '3ESO_C', description: 'Partes 3º ESO Grupo C' },
            { name: '3ESO_D', description: 'Partes 3º ESO Grupo D' },

            // 4º ESO
            { name: '4ESO_A', description: 'Partes 4º ESO Grupo A' },
            { name: '4ESO_B', description: 'Partes 4º ESO Grupo B' },
            { name: '4ESO_C', description: 'Partes 4º ESO Grupo C' },
            { name: '4ESO_D', description: 'Partes 4º ESO Grupo D' },

            // 1º Bachillerato
            { name: '1BACH_A', description: 'Partes 1º Bachillerato Grupo A' },
            { name: '1BACH_B', description: 'Partes 1º Bachillerato Grupo B' },
            { name: '1BACH_C', description: 'Partes 1º Bachillerato Grupo C' },
            { name: '1BACH_D', description: 'Partes 1º Bachillerato Grupo D' },

            // 2º Bachillerato
            { name: '2BACH_A', description: 'Partes 2º Bachillerato Grupo A' },
            { name: '2BACH_B', description: 'Partes 2º Bachillerato Grupo B' },
            { name: '2BACH_C', description: 'Partes 2º Bachillerato Grupo C' },
            { name: '2BACH_D', description: 'Partes 2º Bachillerato Grupo D' },
          ],
        },
        {
          name: '02_Aula_PAC',
          description: 'Hojas de control, derivaciones e intervenciones del Aula de Convivencia (PAC)',
        },
        {
          name: '03_Backups_Datos',
          description: 'Copias de seguridad íntegras y snapshots periódicos en formato JSON cifrado',
        },
        {
          name: '04_Plantillas_Oficiales',
          description: 'Modelos oficiales de citaciones, partes y actas según Decreto 327/2010',
        },
        {
          name: '05_Listados_Seneca',
          description: 'Archivos CSV/XLSX exportados desde Séneca para sincronización ETL de matrículas',
        },
      ],
    },
  ],
};

/**
 * Genera un script en Google Apps Script (.gs) listo para pegar y ejecutar en 
 * script.google.com desde la cuenta del centro.
 * Busca tu carpeta existente CONVIVENCIA_IES_BLAS_INFANTE (o por su ID de carpeta) y crea todas las subcarpetas dentro de ella.
 */
export function generarGoogleAppsScriptCreacion(
  cuentaDestino: string = '14007180.aplicaciones@g.educaand.es',
  idCarpetaDrive?: string
): string {
  const folderIdString = (idCarpetaDrive && idCarpetaDrive.trim().length > 0) ? idCarpetaDrive.trim() : '';

  return `/**
 * =========================================================================
 * SCRIPT OFICIAL DE CREACIÓN DE ESTRUCTURA GOOGLE DRIVE
 * Centro: IES Blas Infante (Córdoba) - Código: 14007180
 * Carpeta Padre: CONVIVENCIA_IES_BLAS_INFANTE ${folderIdString ? `(ID: ${folderIdString})` : ''}
 * Cuenta Propietaria: ${cuentaDestino}
 * Entorno: Google Workspace for Education (Junta de Andalucía)
 * =========================================================================
 * 
 * INSTRUCCIONES RÁPIDAS:
 * 1. Inicia sesión en Google con la cuenta del centro: ${cuentaDestino}
 * 2. Abre https://script.google.com y crea un "Nuevo proyecto".
 * 3. Pega este contenido íntegro y pulsa "Ejecutar".
 * 4. ¡Listo! Creará dentro de tu carpeta "CONVIVENCIA_IES_BLAS_INFANTE" todas las
 *    subcarpetas por grupos (Ciclos, ESO, Bachillerato), PAC, Backups y Plantillas.
 */

var ID_CARPETA_PADRE = '${folderIdString}';
var NOMBRE_CARPETA_PADRE = 'CONVIVENCIA_IES_BLAS_INFANTE';

function crearEstructuraConvivenciaBlasInfante() {
  Logger.log('Iniciando aprovisionamiento de carpetas dentro de ' + NOMBRE_CARPETA_PADRE + '...');
  
  // 1. Obtener la Carpeta Padre creada por el centro
  var rootFolder = null;
  
  if (ID_CARPETA_PADRE && ID_CARPETA_PADRE.length > 5) {
    try {
      rootFolder = DriveApp.getFolderById(ID_CARPETA_PADRE);
      Logger.log('Carpeta padre localizada por ID: ' + rootFolder.getName() + ' (' + rootFolder.getUrl() + ')');
    } catch (e) {
      Logger.log('No se pudo acceder por ID, buscando por nombre ' + NOMBRE_CARPETA_PADRE);
    }
  }

  if (!rootFolder) {
    var rootFolders = DriveApp.getFoldersByName(NOMBRE_CARPETA_PADRE);
    if (rootFolders.hasNext()) {
      rootFolder = rootFolders.next();
      Logger.log('Carpeta padre existente localizada: ' + rootFolder.getUrl());
    } else {
      rootFolder = DriveApp.createFolder(NOMBRE_CARPETA_PADRE);
      Logger.log('Carpeta padre creada: ' + rootFolder.getUrl());
    }
  }
  
  // 2. Carpeta Año Académico (2026-2027)
  var yearName = '2026-2027';
  var yearFolder = getOrCreateSubFolder(rootFolder, yearName);
  
  // 3. Subdirectorios Principales
  var folderPartes = getOrCreateSubFolder(yearFolder, '01_Partes_PDF');
  var folderPAC = getOrCreateSubFolder(yearFolder, '02_Aula_PAC');
  var folderBackups = getOrCreateSubFolder(yearFolder, '03_Backups_Datos');
  var folderPlantillas = getOrCreateSubFolder(yearFolder, '04_Plantillas_Oficiales');
  var folderSeneca = getOrCreateSubFolder(yearFolder, '05_Listados_Seneca');
  
  // 4. Carpetas por Grupo de Alumnado (Todos los grupos oficiales del IES Blas Infante)
  var grupos = [
    // Ciclos Formativos
    '1_FRIO', '2_FRIO',
    '1_INF', '2_INF',
    '1_CALOR', '2_CALOR',

    // ESO
    '1ESO_A', '1ESO_B', '1ESO_C', '1ESO_D',
    '2ESO_A', '2ESO_B', '2ESO_C', '2ESO_D',
    '3ESO_A', '3ESO_B', '3ESO_C', '3ESO_D',
    '4ESO_A', '4ESO_B', '4ESO_C', '4ESO_D',

    // Bachillerato
    '1BACH_A', '1BACH_B', '1BACH_C', '1BACH_D',
    '2BACH_A', '2BACH_C', '2BACH_D'
  ];
  
  for (var i = 0; i < grupos.length; i++) {
    getOrCreateSubFolder(folderPartes, grupos[i]);
  }
  
  // 5. Crear archivo de bienvenida/descripción institucional
  var readmeName = 'LEEME_INFORMACION_SISTEMA.txt';
  var files = yearFolder.getFilesByName(readmeName);
  if (!files.hasNext()) {
    yearFolder.createFile(
      readmeName,
      'SISTEMA INTEGRAL DE GESTIÓN DE LA CONVIVENCIA ESCOLAR (SIGC)\\n' +
      'Centro: IES Blas Infante (Córdoba) - Código: 14007180\\n' +
      'Carpeta Raíz: CONVIVENCIA_IES_BLAS_INFANTE\\n' +
      'Cuenta Corporativa Oficial: ${cuentaDestino}\\n\\n' +
      'Esta estructura de directorios ha sido aprovisionada automáticamente para:\\n' +
      '1. Custodia de partes de convivencia por grupos en PDF (01_Partes_PDF):\\n' +
      '   - Ciclos: 1º y 2º FRÍO, 1º y 2º INF, 1º y 2º CALOR\\n' +
      '   - ESO: 1º a 4º ESO (Líneas A, B, C, D)\\n' +
      '   - Bachillerato: 1º y 2º BACH\\n' +
      '2. Registros de intervenciones y derivaciones al Aula PAC (02_Aula_PAC).\\n' +
      '3. Copias de seguridad periódicas y snapshots de la app (03_Backups_Datos).\\n' +
      '4. Plantillas y modelos conforme al Decreto 327/2010 (04_Plantillas_Oficiales).\\n' +
      '5. Archivos de sincronización de matrículas Séneca (05_Listados_Seneca).\\n\\n' +
      'Cumplimiento estricto RGPD y custodia en Google Workspace for Education Junta de Andalucía.'
    );
  }
  
  Logger.log('¡Estructura de ' + grupos.length + ' grupos completada con éxito dentro de ' + rootFolder.getName() + '!');
  Logger.log('URL de acceso directo: ' + rootFolder.getUrl());
}

function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    var created = parentFolder.createFolder(folderName);
    Logger.log('Creada: ' + folderName);
    return created;
  }
}
`;
}

/**
 * Genera el script de Backend en Google Apps Script para implementar una API REST
 * conectada directamente con Google Drive (14007180.aplicaciones@g.educaand.es).
 * Permite sincronización bidireccional inmediata en todos los dispositivos sin servidores intermedios.
 */
export function generarGoogleAppsScriptDatabaseBackend(
  cuentaDestino: string = '14007180.aplicaciones@g.educaand.es',
  idCarpetaDrive?: string
): string {
  const folderIdString = (idCarpetaDrive && idCarpetaDrive.trim().length > 0) ? idCarpetaDrive.trim() : '';

  return `/**
 * =========================================================================
 * API REST DE CUSTODIA Y SINCRONIZACIÓN EN GOOGLE DRIVE
 * Centro: IES Blas Infante (Córdoba - 14007180)
 * Cuenta Propietaria: ${cuentaDestino}
 * Carpeta Destino: CONVIVENCIA_IES_BLAS_INFANTE ${folderIdString ? `(ID: ${folderIdString})` : ''}
 * =========================================================================
 * 
 * INSTRUCCIONES DE DESPLIEGUE EN 1 MINUTO:
 * 1. Abre https://script.google.com con la cuenta ${cuentaDestino}
 * 2. Crea un "Nuevo proyecto", dale de nombre "API_SIGC_BlasInfante"
 * 3. Pega este código completo en el archivo "Código.gs"
 * 4. Haz clic en "Implementar" -> "Nueva implementación"
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo (${cuentaDestino})
 *    - Quién tiene acceso: Cualquier usuario con cuenta de Google Workspace (@g.educaand.es) o Cualquier persona
 * 5. Copia la "URL de la aplicación web" (termina en /exec) y pégala en el panel de SIGC-BI.
 */

var ID_CARPETA_DRIVE = '${folderIdString}';
var NOMBRE_ARCHIVO_DB = '00_SIGC_BD_CENTRO_BLAS_INFANTE.json';

/**
 * Función de prueba directa que puedes ejecutar pulsando "Ejecutar" en el editor de Apps Script
 * para comprobar inmediatamente los permisos de Drive y crear el archivo en tu carpeta sin depender de llamadas web.
 */
function testCrearArchivoEnMiCarpeta() {
  var datosPrueba = {
    prueba: 'Verificación de enlace con IES Blas Infante',
    fecha: new Date().toISOString(),
    carpeta_id: ID_CARPETA_DRIVE,
    estado: 'Conectado correctamente'
  };
  guardarBaseDatosEnDrive(datosPrueba);
  Logger.log('¡Archivo ' + NOMBRE_ARCHIVO_DB + ' creado exitosamente en la carpeta ' + ID_CARPETA_DRIVE + '!');
}

function doGet(e) {
  try {
    var cache = CacheService.getScriptCache();
    var lastTimestamp = cache.get('DB_TIMESTAMP');

    // 1. Respuesta ultrarrápida (30-50ms) si el cliente ya tiene la última versión
    if (e && e.parameter && e.parameter.since && lastTimestamp && e.parameter.since === lastTimestamp) {
      return ContentService.createTextOutput(JSON.stringify({
        not_modified: true,
        timestamp: lastTimestamp
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Si viene una acción de guardado por GET
    if (e && e.parameter && e.parameter.action === 'save_payload' && e.parameter.payload) {
      var dataToSave = JSON.parse(decodeURIComponent(e.parameter.payload));
      guardarBaseDatosEnDrive(dataToSave);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        mensaje: 'Base de datos guardada con éxito en Drive',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Intento de lectura desde RAM Cache de Apps Script (ultra rápido)
    var cachedData = cache.get('DB_FULL_JSON_P1');
    if (cachedData && !cache.get('DB_FULL_JSON_P2')) {
      return ContentService.createTextOutput(cachedData)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Lectura directa desde Google Drive
    var data = leerBaseDatosDesdeDrive();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  // Manejo de concurrencia multiusuario con LockService
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(15000); // Esperar hasta 15 segundos para exclusividad

  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Servidor ocupado procesando otra petición concurrentemente. Reintentando...'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var raw = '';
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      raw = e.parameter.data;
    }
    if (!raw) {
      throw new Error('No se recibieron datos en la petición POST');
    }
    var postData = JSON.parse(raw);
    guardarBaseDatosEnDrive(postData);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      mensaje: 'Datos custodiados con éxito en Google Drive',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function leerBaseDatosDesdeDrive() {
  var folder = obtenerCarpetaDestino();
  var files = folder.getFilesByName(NOMBRE_ARCHIVO_DB);
  if (files.hasNext()) {
    var file = files.next();
    var content = file.getBlob().getDataAsString();
    var parsed = JSON.parse(content);
    
    // Almacenar en RAM Cache para que las siguientes lecturas tomen < 40ms
    try {
      var cache = CacheService.getScriptCache();
      cache.put('DB_TIMESTAMP', parsed.timestamp || new Date().toISOString(), 900); // 15 min
      if (content.length < 95000) {
        cache.put('DB_FULL_JSON_P1', content, 900);
      }
    } catch(e) {}

    return parsed;
  }
  return {
    profesores: [],
    credenciales_profesores: {},
    alumnos: [],
    sanciones: [],
    compensaciones: [],
    audit_logs: [],
    timestamp: new Date().toISOString()
  };
}

function guardarBaseDatosEnDrive(incomingData) {
  var folder = obtenerCarpetaDestino();
  var files = folder.getFilesByName(NOMBRE_ARCHIVO_DB);
  var file;

  var finalData = incomingData;
  finalData.timestamp = new Date().toISOString();

  // Fusión inteligente para evitar pisado de partes si dos profesores guardaron a la vez
  if (files.hasNext()) {
    file = files.next();
    try {
      var currentContent = file.getBlob().getDataAsString();
      if (currentContent && currentContent.length > 10) {
        var currentData = JSON.parse(currentContent);
        
        // Unificar listas de IDs eliminados (tombstones)
        var deletedSancionMap = {};
        (finalData.deleted_sanciones || []).forEach(function(id) { deletedSancionMap[id] = true; });
        (currentData.deleted_sanciones || []).forEach(function(id) { deletedSancionMap[id] = true; });
        finalData.deleted_sanciones = Object.keys(deletedSancionMap);

        var deletedAlumnoMap = {};
        (finalData.deleted_alumnos || []).forEach(function(id) { deletedAlumnoMap[id] = true; });
        (currentData.deleted_alumnos || []).forEach(function(id) { deletedAlumnoMap[id] = true; });
        finalData.deleted_alumnos = Object.keys(deletedAlumnoMap);

        var deletedProfMap = {};
        (finalData.deleted_profesores || []).forEach(function(id) { deletedProfMap[id] = true; });
        (currentData.deleted_profesores || []).forEach(function(id) { deletedProfMap[id] = true; });
        finalData.deleted_profesores = Object.keys(deletedProfMap);

        // 1. Filtrar y fusionar sanciones descartando cualquier ID eliminada oficialmente
        finalData.sanciones = (finalData.sanciones || []).filter(function(s) {
          return s && s.id_sancion && !deletedSancionMap[s.id_sancion];
        });

        if (currentData.sanciones && Array.isArray(currentData.sanciones)) {
          var incomingSancionIds = {};
          finalData.sanciones.forEach(function(s) { incomingSancionIds[s.id_sancion] = true; });
          currentData.sanciones.forEach(function(existingS) {
            if (existingS && existingS.id_sancion && !incomingSancionIds[existingS.id_sancion] && !deletedSancionMap[existingS.id_sancion]) {
              finalData.sanciones.push(existingS);
            }
          });
        }

        // 2. Fusionar compensaciones
        if (currentData.compensaciones && Array.isArray(currentData.compensaciones)) {
          var incomingCompIds = {};
          (finalData.compensaciones || []).forEach(function(c) { if (c && c.id_compensacion) incomingCompIds[c.id_compensacion] = true; });
          currentData.compensaciones.forEach(function(existingC) {
            if (existingC && existingC.id_compensacion && !incomingCompIds[existingC.id_compensacion]) {
              finalData.compensaciones.push(existingC);
            }
          });
        }

        // 3. Fusionar credenciales de contraseñas de docentes (para que nunca se pierdan entre equipos)
        if (currentData.credenciales_profesores && typeof currentData.credenciales_profesores === 'object') {
          if (!finalData.credenciales_profesores) finalData.credenciales_profesores = {};
          for (var emailKey in currentData.credenciales_profesores) {
            if (!finalData.credenciales_profesores[emailKey]) {
              finalData.credenciales_profesores[emailKey] = currentData.credenciales_profesores[emailKey];
            }
          }
        }
      }
    } catch(err) {
      Logger.log('Advertencia en fusión remota: ' + err);
    }
  }

  // Serialización sin espacios ni indentaciones innecesarias para máxima velocidad I/O
  var jsonString = JSON.stringify(finalData);
  
  if (file) {
    file.setContent(jsonString);
  } else {
    folder.createFile(NOMBRE_ARCHIVO_DB, jsonString, MimeType.PLAIN_TEXT);
  }

  // Refrescar caché en RAM inmediatamente
  try {
    var cache = CacheService.getScriptCache();
    cache.put('DB_TIMESTAMP', finalData.timestamp, 900);
    if (jsonString.length < 95000) {
      cache.put('DB_FULL_JSON_P1', jsonString, 900);
    } else {
      cache.remove('DB_FULL_JSON_P1');
    }
  } catch(e) {}
}

function obtenerCarpetaDestino() {
  if (ID_CARPETA_DRIVE && ID_CARPETA_DRIVE.length > 5) {
    try {
      return DriveApp.getFolderById(ID_CARPETA_DRIVE);
    } catch (e) {
      Logger.log('No se pudo acceder por ID, buscando por nombre...');
    }
  }

  var folders = DriveApp.getFoldersByName('CONVIVENCIA_IES_BLAS_INFANTE');
  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.getRootFolder();
}
`;
}

