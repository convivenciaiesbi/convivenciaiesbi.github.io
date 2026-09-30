# 🏛️ MEMORIA TÉCNICA Y DOCUMENTO DE ARQUITECTURA
## S.I.G.C. — Sistema Integral de Gestión de la Convivencia Escolar
### I.E.S. Blas Infante (Córdoba) · Código de Centro: 14007180

---

## 📌 TABLA DE CONTENIDOS
1. [Introducción y Objetivos del Proyecto](#1-introducción-y-objetivos-del-proyecto)
2. [Marco Legal y Normativo](#2-marco-legal-y-normativo)
3. [Visión Global de la Arquitectura](#3-visión-global-de-la-arquitectura)
4. [Stack Tecnológico y Justificación](#4-stack-tecnológico-y-justificación)
5. [Modelo de Dominio y Tipos de Datos (TypeScript)](#5-modelo-de-dominio-y-tipos-de-datos-typescript)
6. [Flujo de Datos y Mecanismo de Sincronización en la Nube](#6-flujo-de-datos-y-mecanismo-de-sincronización-en-la-nube)
7. [Arquitectura de Componentes de Frontend](#7-arquitectura-de-componentes-de-frontend)
8. [Pipeline ETL de Ingesta desde Séneca](#8-pipeline-etl-de-ingesta-desde-séneca)
9. [Seguridad, Criptografía y Cumplimiento RGPD](#9-seguridad-criptografía-y-cumplimiento-rgpd)
10. [Mantenimiento, Escalabilidad y Coste Operativo](#10-mantenimiento-escalabilidad-y-coste-operativo)

---

## 1. Introducción y Objetivos del Proyecto

El **Sistema Integral de Gestión de la Convivencia Escolar (S.I.G.C.)** es una plataforma web de nivel de producción desarrollada específicamente para dar respuesta a las necesidades de gestión disciplinaria, formativa y restaurativa del **I.E.S. Blas Infante de Córdoba**.

### Objetivos Clave:
1. **Agilidad Extrema en Aula y Guardias:** Registro de incidencias y partes en menos de 30 segundos desde cualquier dispositivo (smartphone, tablet o PC de aula).
2. **Sistema Pedagógico de Carnet por Puntos:** Saldo inicial de 10 puntos con pérdida proporcional a la gravedad de la conducta, recuperación automática semanal (+1 punto cada 7 días sin incidencias) y restitución mediante medidas educativas/restaurativas.
3. **Coordinación Inmediata con el Aula PAC:** Trazabilidad en tiempo real del alumnado derivado al Aula de Convivencia (salida, recepción por profesor de guardia, asignación de tareas lectivas y retorno).
4. **Custodia Institucional sin Servidores de Pago:** Persistencia transparente en el Google Workspace for Education oficial del centro (`14007180.aplicaciones@g.educaand.es`), eliminando costes recurrentes y garantizando soberanía de los datos.

---

## 2. Marco Legal y Normativo

La arquitectura y las reglas de negocio del sistema implementan de forma estricta el ordenamiento educativo andaluz y la legislación vigente de protección de datos:

* **Decreto 327/2010, de 13 de julio:** Reglamento Orgánico de los Institutos de Educación Secundaria de la Comunidad Autónoma de Andalucía:
  * *Artículo 34:* Tipificación taxativa de **Conductas Contrarias a las Normas de Convivencia** (Leves: perturbar clase, falta de colaboración, incorrección, daños leves, salidas no autorizadas).
  * *Artículo 37:* Tipificación taxativa de **Conductas Gravemente Perjudiciales para la Convivencia** (Graves: agresión física, injurias, acoso, uso indebido de teléfonos móviles, amenazas, daños graves).
  * *Artículo 35 y 38:* Medidas correctoras y procedimiento de incoación disciplinaria.
* **Orden de 20 de junio de 2011:** Medidas para la promoción de la convivencia en los centros docentes sostenidos con fondos públicos.
* **Reglamento General de Protección de Datos (RGPD UE 2016/679) y LOPDGDD 3/2018:**
  * Categoría de datos: Datos de menores de edad sometidos a especial protección.
  * Trazabilidad completa con logs inmutables y sellado criptográfico SHA-256.
  * Control de acceso basado en roles (RBAC) con separación estricta entre Claustro Docente y Jefatura.

---

## 3. Visión Global de la Arquitectura

El sistema implementa el patrón **Local-First Jamstack SPA** complementado con una **Capa Serverless de Custodia en Google Drive**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           CAPA DE CLIENTE                              │
 │                     (React 19 SPA en Navegador)                        │
 ├────────────────────────────────────────────────────────────────────────┤
 │  [Header] ──► [FastParteModal] ──► [DailyFeed] ──► [CarnetListView]    │
 │  [AulaPAC] ──► [AnalyticsView] ──► [EtlImportView] ──► [MiPerfil]      │
 ├────────────────────────────────────────────────────────────────────────┤
 │                           CAPA DE SERVICIOS                            │
 │  • StorageService (Caché local de alta velocidad, motor de puntos)     │
 │  • AuthService (Validación @g.educaand.es, RBAC, gestión de claves)    │
 │  • OdsImportService (Parser binario LibreOffice ODS/XLSX Séneca)       │
 │  • PdfGenerator (Motor jsPDF / html2canvas membrete Junta Andalucía)   │
 │  • GoogleDriveSyncService (Motor de sincronización con timestamping)   │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ Peticiones HTTPS (GET / POST)
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      CAPA BACKEND SERVERLESS                           │
 │                (Google Apps Script Web App Endpoint)                   │
 ├────────────────────────────────────────────────────────────────────────┤
 │  • doPost(e): Serializa censo, partes y auditoría                      │
 │  • doGet(e): Suministra estado consolidado a los clientes              │
 │  • Control de permisos y token corporativo @g.educaand.es              │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     │ DriveApp API
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     CUSTODIA INSTITUCIONAL GOOGLE DRIVE                │
 │                  (14007180.aplicaciones@g.educaand.es)                 │
 ├────────────────────────────────────────────────────────────────────────┤
 │  CONVIVENCIA_IES_BLAS_INFANTE/                                         │
 │  ├── 00_SIGC_BD_CENTRO_BLAS_INFANTE.json (Base de Datos Consolidada)   │
 │  └── 2026-2027/                                                        │
 │      ├── 01_Partes_PDF/ (30 grupos: Ciclos, ESO, Bachillerato)         │
 │      ├── 02_Aula_PAC/                                                  │
 │      ├── 03_Backups_Datos/ (Instantáneas JSON fechadas)                │
 │      ├── 04_Plantillas_Oficiales/                                      │
 │      └── 05_Listados_Seneca/                                           │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Stack Tecnológico y Justificación

### 4.1. Frontend Core
* **React 19 (`react` / `react-dom`):** Aprovecha la arquitectura de renderizado concurrente más avanzada, optimizando la reactividad de la matriz de alumnos y partes sin demoras.
* **TypeScript 5.x (`typescript`):** Tipado estático completo en todo el ciclo de vida de la aplicación. Previene errores en tiempo de compilación y garantiza congruencia entre modelos normativos y de datos.
* **Vite 8 (`vite`):** Motor de empaquetado de última generación con ESM nativo. Tiempos de construcción menores a 2 segundos y bundles minificados ultra-ligeros.

### 4.2. Estilos y Microinteracciones
* **Tailwind CSS v4 (`@tailwindcss/vite` / `tailwindcss`):** Estilado atómico compilado sin sobrecarga de CSS en tiempo de ejecución. Paleta de colores pastel formal (tonos azul pizarra, cielo y blanco) acorde a la identidad institucional de centros públicos andaluces.
* **Lucide React (`lucide-react`):** Colección de más de 40 iconos vectoriales SVG accesibles y coherentes.
* **Motion (`motion`):** Animaciones suaves y transiciones de estado para modales, paneles de alerta y confirmaciones.

### 4.3. Procesamiento y Generación Documental
* **SheetJS / XLSX (`xlsx`):** Motor binario que permite leer de forma directa en el navegador archivos `.ods` de OpenDocument (estándar de LibreOffice en Guadalinex/Séneca) y `.xlsx` de Excel sin enviar los ficheros a servidores externos, garantizando privacidad total.
* **jsPDF + html2canvas (`jspdf`, `html2canvas`):** Generación vectorial en cliente de las actas oficiales de apercibimiento disciplinario con escudos oficiales, formatos A4 listos para firmar y códigos de expediente únicos.

### 4.4. Alojamiento y Entrega Continua (CI/CD)
* **Netlify:** Servidor perimetral global (Edge CDN) con despliegue continuo automático cada vez que se realiza un `git push` a la rama `main` de GitHub. Dispone de compresión Brotli, HTTP/2 y certificados SSL/TLS automáticos.

---

## 5. Modelo de Dominio y Tipos de Datos (TypeScript)

El corazón de la aplicación está definido en `/src/types/convivencia.ts`:

### 5.1. Alumnado (`Alumno`)
```typescript
export type EstadoAlumno = 'ACTIVO' | 'ALERTA_PUNTOS' | 'SALDO_CERO' | 'EXPULSADO_CENTRO' | 'BAJA';

export interface Alumno {
  id_alumno: string;
  nie: string; // NIE Séneca o identificador provisional SN-...
  nombre: string;
  apellidos: string;
  grupo: GrupoEducativo;
  puntos_actuales: number; // Escala decreciente de 10 a 0
  estado: EstadoAlumno;
  telefono_tutor: string;
  nombre_tutor: string;
  historial_sanciones_count?: number;
  motivo_baja?: string;
  fecha_baja?: string;
}
```

### 5.2. Grupos Educativos Oficiales (`GrupoEducativo`)
El sistema soporta con precisión quirúrgica los 30 grupos del IES Blas Infante:
* **Ciclos Formativos:**
  * Instalaciones Frigoríficas y Climatización: `1_FRIO`, `2_FRIO`
  * Informática: `1_INF`, `2_INF`
  * Instalaciones de Producción de Calor: `1_CALOR`, `2_CALOR`
* **Educación Secundaria Obligatoria:** `1ESO_A` a `4ESO_D` (16 grupos).
* **Bachillerato:** `1BACH_A` a `2BACH_D` (8 grupos).

### 5.3. Infracciones y Conductas (`ConductaV0Def`)
Tipificación directa con puntuación fija del Plan de Convivencia:
* **Registros Académicos (0 pts):** `ACA-COPIAR`, `ACA-MATERIAL`.
* **Conductas Leves (Art. 34 Decreto 327/2010):**
  * `LEV-PERTURBACION` (-2 pts): Perturbación del desarrollo de la clase.
  * `LEV-COLABORACION` (-2 pts): Falta de colaboración sistemática.
  * `LEV-ESTUDIAR` (-2 pts): Impedir el estudio de compañeros.
  * `LEV-INCORRECCION` (-3 pts): Falta de respeto o incorrección verbal hacia la comunidad.
  * `LEV-DANOS` (-3 pts): Daños leves a instalaciones o material.
  * `LEV-PASILLO` (-2 pts): Permanecer en pasillos durante cambios o recreo.
* **Conductas Graves (Art. 37 Decreto 327/2010):**
  * `GRA-MOVIL-USO` (-5 pts): Uso no autorizado de teléfono móvil.
  * `GRA-MOVIL-ENTREGA` (-10 pts): Negativa a entregar el teléfono móvil.
  * `GRA-AGRESION` (-10 pts): Agresión física a cualquier miembro del centro.
  * `GRA-INJURIAS` (-8 pts): Injurias y ofensas graves.
  * `GRA-ACOSO` (-10 pts): Actos de acoso escolar presencial o telemático.
  * `GRA-SALUD` (-5 o -10 pts): Fumar, vapear o introducir sustancias nocivas.
  * `GRA-VEJACIONES` (-10 pts): Trato degradante o discriminatorio.
  * `GRA-AMENAZAS` (-8 pts): Coacciones o amenazas.
  * `GRA-SUPLANTACION` (-8 pts): Suplantación de personalidad y falsedad.
  * `GRA-DANOS` (-8 pts): Daños graves intencionados.

### 5.4. Trazabilidad Disciplinaria (`MovimientoPuntos`)
Cada alteración de la puntuación queda registrada en un libro mayor inmutable:
* Tipos: `PARTE` (pérdida), `RECUPERACION_SEMANAL` (+1 semanal), `MEDIDA_RESTAURATIVA` (restitución por tareas), `ANULACION_PARTE` (corrección de error).
* Almacena: fecha, profesor responsable, saldo anterior y saldo resultante.

---

## 6. Flujo de Datos y Mecanismo de Sincronización en la Nube

Uno de los mayores retos de una aplicación utilizada concurrentemente por decenas de docentes en guardias y aulas es evitar colisiones y pérdida de datos.

### Motor de Resolución de Conflictos por Marca de Tiempo (Timestamping):
1. **Escritura Local:** Al realizar cualquier modificación (ingesta ODS, alta de alumno, imposición de parte), `StorageService` registra en el cliente la fecha/hora en milisegundos (`sigc_bi_last_local_write_timestamp_v1`).
2. **Ciclo de Polling Periódico (15 segundos):** La aplicación consulta en segundo plano a la API de Google Drive (`GoogleDriveSyncService.pullFromGoogleDrive()`).
3. **Comprobación Antirretorno:** Si la respuesta remota de Google Drive tiene un timestamp anterior a la última escritura del cliente local, **la aplicación bloquea la sobrescritura**, preserva los datos locales e impulsa de inmediato el nuevo estado hacia Google Drive (`pushToGoogleDrive()`).
4. **Fusión Inteligente (Merge):** Los alumnos se consolidan por `id_alumno` y clave única normalizada (`nombre + apellidos + grupo`), asegurando que ningún alumno nuevo desaparezca tras una sincronización remota.

---

## 7. Arquitectura de Componentes de Frontend

La interfaz está construida siguiendo el principio de alta cohesión y bajo acoplamiento:

* **`Header.tsx`:** Barra superior con información del centro, selector de usuario, estado de la sincronización en tiempo real y botones para modales de auditoría y manuales.
* **`FastParteModal.tsx`:** Flujo optimizado de 3 pasos para docentes:
  1. Selección guiada de alumno mediante buscador instantáneo.
  2. Selección de conducta y medida inmediata (Amonestación, Derivación al PAC, etc.).
  3. Previsualización y confirmación con guardado automático y opción de impresión.
* **`DailyFeedView.tsx`:** Cuadro de mandos para Jefatura de Estudios con partes del día, estado de tramitación (Pendiente, Notificado por Teléfono, Resuelto) e impresión por lotes.
* **`CarnetListView.tsx`:** Ficha completa de alumnos con semáforo disciplinario (Verde: 7-10 pts, Ámbar: 4-6 pts, Rojo: 1-3 pts, Negro: 0 pts) y gestión de medidas restaurativas.
* **`AulaPACMonitor.tsx`:** Registro de entradas y salidas en el Aula de Convivencia con seguimiento de tareas lectivas completadas y firmas de recepción.
* **`AnalyticsView.tsx`:** Métricas avanzadas: partes por tramo horario, grupos con mayor incidencia, conductas más frecuentes y distribución temporal.
* **`EtlImportView.tsx`:** Módulo de administración con soporte para ingesta ODS/XLSX, gestión de bajas docentes y apertura de nuevos cursos escolares.
* **`OfficialPartePrintModal.tsx`:** Renderizador de actas conforme al Decreto 327/2010.

---

## 8. Pipeline ETL de Ingesta desde Séneca

El servicio `odsImportService.ts` implementa una canalización robusta de extracción, transformación y carga:

1. **Lectura Binaria en Memoria:** El archivo `.ods` o `.xlsx` se lee mediante `ArrayBuffer` sin requerir servidor externo.
2. **Detección Automática de Esquemas:** Reconoce tanto el formato de dos columnas (`Apellidos y Nombre` y `Unidad`) como formatos detallados con cabeceras de Séneca.
3. **Parser Inteligente de Nombres:** Divide cadenas de texto con o sin comas (`GARCÍA LÓPEZ, MANUEL` ➔ Apellidos: García López, Nombre: Manuel) respetando dobles apellidos.
4. **Normalizador Unicode Diacrítico de Grupos:**
   * Aplica `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` para eliminar tildes diacríticas antes del matching.
   * Mapea correctamente variantes como `1º FRÍO`, `1º FRIO`, `1_FRIO`, `1º INFORMÁTICA`, `1º CFGM CALOR`, `1º ESO A` a sus códigos canónicos correspondientes.
5. **Estrategia UPSERT:** Si un alumno ya existe por NIE o clave de identidad, actualiza su grupo sin reiniciar sus puntos ni alterar su histórico sancionador. Si es nuevo, se le asignan 10 puntos de saldo inicial.

---

## 9. Seguridad, Criptografía y Cumplimiento RGPD

La aplicación ha sido auditada mediante un banco de pruebas de seguridad automatizado (`scripts/run-security-tests.ts`):

1. **Autenticación Basada en Dominio Institucional:** Acceso restringido exclusivamente a cuentas verificadas del dominio corporativo de la Junta de Andalucía (`@g.educaand.es`).
2. **Control de Acceso Basado en Roles (RBAC):**
   * Docente ordinario (`ROLE_DOCENTE`): No puede ver estadísticas globales, no puede acceder a partes de otros profesores, no puede modificar la base de datos ni acceder al panel de ingesta.
   * Equipo de Convivencia (`ROLE_CONVIVENCIA_ADMIN`): Plenos privilegios para tramitación, resolución, copias de seguridad y archivo.
3. **Integridad y No Repudio:** Cada registro de auditoría genera un hash criptográfico SHA-256 (`hash_integridad`) vinculado al correo del usuario ejecutor, impidiendo la manipulación de actas pasadas.
4. **Soberanía y Ubicación de Datos:** Los datos residen en la Unión Europea dentro de los acuerdos de custodia de Google Workspace for Education suscritos por la Junta de Andalucía.

---

## 10. Mantenimiento, Escalabilidad y Coste Operativo

| Concepto | Solución Implementada | Coste Económico |
| :--- | :--- | :--- |
| **Alojamiento Web** | Netlify Starter Plan (CDN Global, SSL Let's Encrypt) | **0 € / mes** |
| **Base de Datos** | Google Apps Script + Google Drive Corporativo | **0 € / mes** |
| **Repositorio y CI/CD** | GitHub Private Repositories + GitHub Actions | **0 € / mes** |
| **Copias de Seguridad** | Snapshots JSON en `/2026-2027/03_Backups_Datos/` | **0 € / mes** |
| **Mantenimiento Anual** | Sellado y archivado de curso escolar en 1 clic | **0 € / mes** |

### Resumen de Sostenibilidad:
El S.I.G.C. no requiere servidores dedicados, bases de datos SQL de pago ni dependencias propietarias que puedan generar sobrecostes al presupuesto del instituto. Es una solución autónoma, transferible y alineada con la cultura digital del centro educativo.

---

*Documento técnico de arquitectura aprobado para el I.E.S. Blas Infante (Córdoba).*
