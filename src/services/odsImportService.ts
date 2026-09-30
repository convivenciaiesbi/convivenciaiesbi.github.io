import * as XLSX from 'xlsx';
import { Alumno, GrupoEducativo, Profesor, RoleUsuario } from '../types/convivencia';

export interface ParseResultAlumno {
  totalProcessed: number;
  nuevos: number;
  actualizados: number;
  errores: string[];
}

export interface AlumnoImportRow {
  nombre: string;
  apellidos: string;
  grupo: GrupoEducativo;
  nie?: string;
  telefono_tutor?: string;
  nombre_tutor?: string;
}

export interface ProfesorImportRow {
  nombre: string;
  apellidos: string;
  email: string;
  rol: Profesor['rol'];
  departamento?: string;
  tutor_de_grupo?: GrupoEducativo;
}

/**
 * Normaliza cualquier rol docente a los roles oficiales de la app:
 * - ROLE_CONVIVENCIA_ADMIN (Jefatura, Convivencia, Dirección, Administrador con plenos privilegios)
 * - ROLE_DOCENTE (Profesorado ordinario sin privilegios administrativos)
 */
export function normalizarRolProfesor(rawRol?: string): RoleUsuario {
  if (!rawRol) return 'ROLE_DOCENTE';
  const clean = rawRol.toUpperCase().trim();
  if (
    clean.includes('ADMIN') || 
    clean.includes('CONVIVENCIA') || 
    clean.includes('JEFATURA') || 
    clean.includes('DIRECC') || 
    clean === 'ROLE_CONVIVENCIA_ADMIN'
  ) {
    return 'ROLE_CONVIVENCIA_ADMIN';
  }
  return 'ROLE_DOCENTE';
}

/**
 * Helper para parsear una línea CSV respetando comillas y delimitadores (coma, punto y coma, tabulador)
 */
export function parseCsvLine(line: string, explicitDelimiter?: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let delimiter = explicitDelimiter;
  if (!delimiter) {
    if (trimmed.includes(';') && !trimmed.startsWith('"')) {
      delimiter = ';';
    } else if (trimmed.includes('\t')) {
      delimiter = '\t';
    } else {
      delimiter = ',';
    }
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Normaliza cualquier formato de nombre de curso/grupo introducido en el ODS/CSV
 * a los códigos oficiales del IES Blas Infante.
 * Soporta:
 * - Ciclos: 1º FRIO, 1 FRIO, 2º FRIO, 1º INF, 1 INF, 2º INF, 1º CALOR, 2 CALOR
 * - ESO: 1º ESO A, 1 ESO A, 1ESOA, 1ESO_A, hasta 4º ESO D
 * - Bachillerato: 1º BACH A, 1 BACH A, 1BACHA, 1BACH_A, hasta 2º BACH D
 */
export function normalizarGrupoEducativo(raw: string): GrupoEducativo {
  if (!raw) return '1ESO_A';
  
  const clean = raw
    .toUpperCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª°]/g, '')
    .replace(/\s+/g, '_');

  // Ciclos Formativos
  if (clean.includes('FRIO') || clean.includes('FRIG') || clean.includes('CLIMA')) {
    return clean.includes('2') ? '2_FRIO' : '1_FRIO';
  }
  if ((clean.includes('INF') || clean.includes('INFORM')) && !clean.includes('ESO') && !clean.includes('BACH')) {
    return clean.includes('2') ? '2_INF' : '1_INF';
  }
  if (clean.includes('CALOR') || clean.includes('CALEF') || clean.includes('PROD_CALOR')) {
    return clean.includes('2') ? '2_CALOR' : '1_CALOR';
  }
  if (clean.includes('FPB') || clean.includes('BASICA') || clean.includes('PROFESIONAL_BASICA')) {
    return clean.includes('2') ? '2FPB' : '1FPB';
  }

  // E.S.O.
  const esoMatch = clean.match(/^([1-4])_?E?S?O?_?([A-D])$/);
  if (esoMatch) {
    return `${esoMatch[1]}ESO_${esoMatch[2]}` as GrupoEducativo;
  }

  // Bachillerato
  const bachMatch = clean.match(/^([1-2])_?B?A?C?H?_?([A-D])$/);
  if (bachMatch) {
    return `${bachMatch[1]}BACH_${bachMatch[2]}` as GrupoEducativo;
  }

  // Casos comunes directos
  if (clean.includes('1_BACH') || clean.includes('1BACH')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `1BACH_${l}` as GrupoEducativo;
    return '1BACH_A';
  }
  if (clean.includes('2_BACH') || clean.includes('2BACH')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `2BACH_${l}` as GrupoEducativo;
    return '2BACH_A';
  }

  if (clean.includes('1_ESO') || clean.includes('1ESO')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `1ESO_${l}` as GrupoEducativo;
    return '1ESO_A';
  }
  if (clean.includes('2_ESO') || clean.includes('2ESO')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `2ESO_${l}` as GrupoEducativo;
    return '2ESO_A';
  }
  if (clean.includes('3_ESO') || clean.includes('3ESO')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `3ESO_${l}` as GrupoEducativo;
    return '3ESO_A';
  }
  if (clean.includes('4_ESO') || clean.includes('4ESO')) {
    const l = clean.slice(-1);
    if (['A', 'B', 'C', 'D'].includes(l)) return `4ESO_${l}` as GrupoEducativo;
    return '4ESO_A';
  }

  return '1ESO_A';
}

/**
 * Divide una cadena de "Apellidos, Nombre" o "Apellidos Nombre" en sus partes constituyentes.
 * Admite comas divisorias (formato estándar Séneca: "GARCÍA LÓPEZ, MANUEL")
 * o sin coma buscando el nombre al final.
 */
export function separarApellidosYNombre(cadena: string): { apellidos: string; nombre: string } {
  const text = (cadena || '').trim();
  if (!text) return { apellidos: '', nombre: '' };

  if (text.includes(',')) {
    const parts = text.split(',');
    const apellidos = parts[0].trim();
    const nombre = parts.slice(1).join(',').trim();
    return { apellidos, nombre };
  }

  // Si no hay coma, intentamos asumir que las últimas 1 o 2 palabras son el nombre
  // Ejemplo: "García López Manuel" -> Apellidos: García López, Nombre: Manuel
  const words = text.split(/\s+/);
  if (words.length === 1) {
    return { apellidos: words[0], nombre: '' };
  }
  if (words.length === 2) {
    return { apellidos: words[0], nombre: words[1] };
  }
  if (words.length === 3) {
    // Apellido1 Apellido2 Nombre
    return { apellidos: `${words[0]} ${words[1]}`, nombre: words[2] };
  }
  // 4 o más palabras: primeros 2 apellidos, resto nombre
  return {
    apellidos: `${words[0]} ${words[1]}`,
    nombre: words.slice(2).join(' ')
  };
}

/**
 * Lee un archivo binario ODS (OpenDocument Spreadsheet) o XLSX o ArrayBuffer
 * y extrae las filas de alumnos soportando las 2 columnas: "Apellidos y Nombre" y "Curso"
 * o formatos extendidos.
 */
export function parsearArchivoODSoExcel(arrayBuffer: ArrayBuffer): {
  filas: AlumnoImportRow[];
  errores: string[];
} {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no contiene ninguna hoja de cálculo.');
  }

  const worksheet = workbook.Sheets[sheetName];
  // Leer como matriz de celdas
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!rawData || rawData.length === 0) {
    throw new Error('La hoja de cálculo está vacía.');
  }

  const filas: AlumnoImportRow[] = [];
  const errores: string[] = [];

  // Detectar cabecera o empezar desde fila 0 si los datos arrancan de inmediato
  let startRow = 0;
  let colApellidosNombre = -1;
  let colCurso = -1;
  let colApellidos = -1;
  let colNombre = -1;
  let colNie = -1;

  // Analizar la primera o segunda fila buscando cabeceras
  for (let r = 0; r < Math.min(5, rawData.length); r++) {
    const row = rawData[r].map(c => String(c).trim().toLowerCase());
    const hasHeaderWords = row.some(cell => 
      cell.includes('apellido') || 
      cell.includes('nombre') || 
      cell.includes('alumno') || 
      cell.includes('curso') || 
      cell.includes('grupo') ||
      cell.includes('nie')
    );

    if (hasHeaderWords) {
      startRow = r + 1;
      row.forEach((cell, idx) => {
        if ((cell.includes('apellido') && cell.includes('nombre')) || cell.includes('alumno') || cell === 'apellidos y nombre' || cell === 'apellidos, nombre') {
          colApellidosNombre = idx;
        } else if (cell.includes('apellido')) {
          colApellidos = idx;
        } else if (cell.includes('nombre')) {
          colNombre = idx;
        } else if (cell.includes('curso') || cell.includes('grupo') || cell.includes('unidad')) {
          colCurso = idx;
        } else if (cell.includes('nie') || cell.includes('id') || cell.includes('pasaporte')) {
          colNie = idx;
        }
      });
      break;
    }
  }

  // Si no se detectó cabecera explícita, asumimos el formato estándar solicitado:
  // Columna 0: "Apellidos y Nombre"
  // Columna 1: "Curso / Grupo"
  if (colApellidosNombre === -1 && colApellidos === -1 && colNombre === -1) {
    colApellidosNombre = 0;
    colCurso = 1;
    // Si la primera fila parece contener un título ("Apellidos...", "Curso..."), saltarla
    const firstCell = String(rawData[0][0] || '').toLowerCase();
    if (firstCell.includes('apellido') || firstCell.includes('alumno') || firstCell.includes('nombre')) {
      startRow = 1;
    } else {
      startRow = 0;
    }
  }

  for (let r = startRow; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;

    let nombre = '';
    let apellidos = '';
    let cursoRaw = '';
    let nie = '';

    if (colApellidosNombre !== -1) {
      const combined = String(row[colApellidosNombre] || '').trim();
      if (!combined) continue;
      const parsed = separarApellidosYNombre(combined);
      apellidos = parsed.apellidos;
      nombre = parsed.nombre;
    } else if (colApellidos !== -1 && colNombre !== -1) {
      apellidos = String(row[colApellidos] || '').trim();
      nombre = String(row[colNombre] || '').trim();
    }

    if (colCurso !== -1) {
      cursoRaw = String(row[colCurso] || '').trim();
    }
    if (colNie !== -1) {
      nie = String(row[colNie] || '').trim();
    }

    if (!apellidos && !nombre) {
      continue; // Fila vacía
    }

    if (!apellidos) {
      errores.push(`Fila ${r + 1}: No se pudo determinar el apellido del alumno.`);
      continue;
    }

    const grupo = normalizarGrupoEducativo(cursoRaw);

    filas.push({
      nombre: nombre || 'Sin nombre',
      apellidos,
      grupo,
      nie: nie || undefined,
    });
  }

  return { filas, errores };
}

/**
 * Parsea texto o CSV con la estructura oficial:
 * "Apellidos (coma) Nombre", "Correo Corporativo" y "Rol"
 */
export function parsearTextoOcsvProfesores(csvText: string): {
  filas: ProfesorImportRow[];
  errores: string[];
} {
  const lines = (csvText || '').split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return { filas: [], errores: ['El contenido está vacío.'] };
  }

  const filas: ProfesorImportRow[] = [];
  const errores: string[] = [];

  let startIdx = 0;
  const firstLineLower = lines[0].toLowerCase();
  if (
    firstLineLower.includes('apellido') ||
    firstLineLower.includes('nombre') ||
    firstLineLower.includes('email') ||
    firstLineLower.includes('correo') ||
    firstLineLower.includes('rol')
  ) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const parts = parseCsvLine(rawLine);
    let apellidosYNombre = '';
    let email = '';
    let rawRol = '';

    if (parts.length === 3) {
      // Formato estándar solicitado: [ "Apellidos, Nombre", "email@...", "Rol" ]
      apellidosYNombre = parts[0];
      email = parts[1];
      rawRol = parts[2];
    } else if (parts.length === 4 && parts[2].includes('@')) {
      // Formato sin comillas separado por comas: [ "Apellidos", "Nombre", "email@...", "Rol" ]
      apellidosYNombre = `${parts[0]}, ${parts[1]}`;
      email = parts[2];
      rawRol = parts[3];
    } else if (parts.length >= 5 && (parts[0].includes('@') || parts[1].includes('@'))) {
      // Compatibilidad con CSV antiguo [ EMAIL, NOMBRE, APELLIDOS, DPTO, ROL, TUTOR ]
      if (parts[0].includes('@')) {
        email = parts[0];
        apellidosYNombre = `${parts[2]}, ${parts[1]}`;
        rawRol = parts[4] || parts[3] || 'Docente';
      } else {
        email = parts[1];
        apellidosYNombre = parts[0];
        rawRol = parts[3] || parts[2] || 'Docente';
      }
    } else if (parts.length >= 2) {
      // 2 columnas: [ "Apellidos, Nombre", "email@..." ]
      apellidosYNombre = parts[0];
      email = parts[1];
      rawRol = parts[2] || 'Docente';
    } else {
      errores.push(`Línea ${i + 1}: Formato no reconocido. Se espera: Apellidos, Nombre | Correo Corporativo | Rol`);
      continue;
    }

    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      errores.push(`Línea ${i + 1}: Correo corporativo inválido ("${email}").`);
      continue;
    }

    const parsedNames = separarApellidosYNombre(apellidosYNombre);
    if (!parsedNames.apellidos) {
      errores.push(`Línea ${i + 1}: No se pudo determinar el apellido del docente en "${apellidosYNombre}".`);
      continue;
    }

    const rol = normalizarRolProfesor(rawRol);

    filas.push({
      nombre: parsedNames.nombre || 'Docente',
      apellidos: parsedNames.apellidos,
      email: emailClean,
      rol,
      departamento: rol === 'ROLE_CONVIVENCIA_ADMIN' ? 'Equipo de Convivencia / Jefatura' : 'Claustro Docente',
    });
  }

  return { filas, errores };
}

/**
 * Lee un archivo ODS / Excel de Claustro de Profesores con estructura:
 * Columna 1: Apellidos (coma) Nombre
 * Columna 2: Correo Corporativo
 * Columna 3: Rol
 */
export function parsearProfesoresODSoExcel(arrayBuffer: ArrayBuffer): {
  filas: ProfesorImportRow[];
  errores: string[];
} {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no contiene ninguna hoja de cálculo.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('La hoja de cálculo de profesores está vacía.');
  }

  const filas: ProfesorImportRow[] = [];
  const errores: string[] = [];

  let startRow = 0;
  let colApellidosNombre = -1;
  let colApellidos = -1;
  let colNombre = -1;
  let colEmail = -1;
  let colRol = -1;

  for (let r = 0; r < Math.min(5, rawData.length); r++) {
    const row = rawData[r].map(c => String(c).trim().toLowerCase());
    const hasHeader = row.some(cell =>
      cell.includes('apellido') ||
      cell.includes('profesor') ||
      cell.includes('docente') ||
      cell.includes('email') ||
      cell.includes('correo') ||
      cell.includes('rol')
    );

    if (hasHeader) {
      startRow = r + 1;
      row.forEach((cell, idx) => {
        if ((cell.includes('apellido') && cell.includes('nombre')) || cell.includes('profesor') || cell.includes('docente')) {
          colApellidosNombre = idx;
        } else if (cell.includes('apellido')) {
          colApellidos = idx;
        } else if (cell.includes('nombre')) {
          colNombre = idx;
        } else if (cell.includes('email') || cell.includes('correo')) {
          colEmail = idx;
        } else if (cell.includes('rol') || cell.includes('perfil') || cell.includes('cargo')) {
          colRol = idx;
        }
      });
      break;
    }
  }

  // Si no se encontraron cabeceras explícitas, asumir:
  // Col 0: Apellidos, Nombre
  // Col 1: Correo Corporativo
  // Col 2: Rol
  if (colApellidosNombre === -1 && colApellidos === -1 && colEmail === -1) {
    colApellidosNombre = 0;
    colEmail = 1;
    colRol = 2;
    const firstCell = String(rawData[0][0] || '').toLowerCase();
    if (firstCell.includes('apellido') || firstCell.includes('profesor') || firstCell.includes('docente')) {
      startRow = 1;
    }
  }

  for (let r = startRow; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;

    let apellidos = '';
    let nombre = '';
    let email = '';
    let rawRol = '';

    if (colApellidosNombre !== -1) {
      const combined = String(row[colApellidosNombre] || '').trim();
      if (!combined) continue;
      const parsed = separarApellidosYNombre(combined);
      apellidos = parsed.apellidos;
      nombre = parsed.nombre;
    } else if (colApellidos !== -1) {
      apellidos = String(row[colApellidos] || '').trim();
      nombre = colNombre !== -1 ? String(row[colNombre] || '').trim() : '';
    }

    if (colEmail !== -1) {
      email = String(row[colEmail] || '').trim().toLowerCase();
    } else if (row.length > 1) {
      email = String(row[1] || '').trim().toLowerCase();
    }

    if (colRol !== -1) {
      rawRol = String(row[colRol] || '').trim();
    } else if (row.length > 2) {
      rawRol = String(row[2] || '').trim();
    }

    if (!apellidos && !nombre && !email) {
      continue;
    }

    if (!email || !email.includes('@')) {
      errores.push(`Fila ${r + 1}: Correo corporativo inválido ("${email || 'vacío'}").`);
      continue;
    }

    if (!apellidos) {
      errores.push(`Fila ${r + 1}: Falta indicar apellidos del docente.`);
      continue;
    }

    const rol = normalizarRolProfesor(rawRol);

    filas.push({
      nombre: nombre || 'Docente',
      apellidos,
      email,
      rol,
      departamento: rol === 'ROLE_CONVIVENCIA_ADMIN' ? 'Equipo de Convivencia / Jefatura' : 'Claustro Docente',
    });
  }

  return { filas, errores };
}
