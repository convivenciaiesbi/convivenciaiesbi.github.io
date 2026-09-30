# 📘 MANUAL DE DESPLIEGUE Y PUESTA EN PRODUCCIÓN
## Sistema Integral de Gestión de la Convivencia Escolar (S.I.G.C.)
### I.E.S. Blas Infante (Córdoba) — Código de Centro: 14007180

---

## 📑 ÍNDICE DE CONTENIDOS
1. [Resumen de Arquitectura y Tecnologías](#1-resumen-de-arquitectura-y-tecnologías)
2. [Requisitos Previos](#2-requisitos-previos)
3. [Fase 1: Repositorio en GitHub](#3-fase-1-repositorio-en-github)
4. [Fase 2: Despliegue en Netlify (Hosting Web)](#4-fase-2-despliegue-en-netlify-hosting-web)
5. [Fase 3: Infraestructura en Google Drive y Google Apps Script](#5-fase-3-infraestructura-en-google-drive-y-google-apps-script)
   - 5.1. Creación de la Carpeta Raíz
   - 5.2. Generación automática del árbol de directorios
   - 5.3. Despliegue de la API Web App de Persistencia
   - 5.4. Vinculación de la URL en la aplicación
6. [Fase 4: Ingesta Oficial de Datos (Alumnado y Claustro)](#6-fase-4-ingesta-oficial-de-datos-alumnado-y-claustro)
7. [Fase 5: Verificación y Pruebas Operativas](#7-fase-5-verificación-y-pruebas-operativas)
8. [Procedimientos de Mantenimiento Anual y Backups](#8-procedimientos-de-mantenimiento-anual-y-backups)
9. [Resolución de Incidencias Comunes](#9-resolución-de-incidencias-comunes)

---

## 1. Resumen de Arquitectura y Tecnologías

El S.I.G.C. del IES Blas Infante está diseñado bajo una arquitectura desacoplada, sin costes de servidores y con estricto cumplimiento RGPD para centros educativos:

* **Frontend:** Single Page Application (SPA) construida con React 19, TypeScript y Tailwind CSS, empaquetada mediante Vite.
* **Alojamiento:** Netlify con Continuous Deployment (CI/CD) conectado a la rama `main` de GitHub.
* **Persistencia y Custodia:** Google Workspace for Education de la Junta de Andalucía (`14007180.aplicaciones@g.educaand.es`), utilizando Google Drive y un endpoint Web App en Google Apps Script.
* **Seguridad y Control de Acceso:** Rol-Based Access Control (RBAC) diferenciando entre Claustro Docente (`ROLE_DOCENTE`) y Equipo de Convivencia / Jefatura (`ROLE_CONVIVENCIA_ADMIN`).

```
                    ┌─────────────────────────┐
                    │   GitHub (Repositorio)   │
                    └────────────┬────────────┘
                                 │ Git Push (Automático)
                                 ▼
                    ┌─────────────────────────┐
                    │   Netlify (Hosting SPA) │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
 ┌──────────────────┐                       ┌─────────────────────┐
 │ Navegador Cliente│                       │  Google Apps Script │
 │  (Móvil / PC)    │◄────── REST API ─────►│  (API Web App /exec)│
 └──────────────────┘                       └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Google Drive Centro │
                                            │ (JSON DB + PDFs)    │
                                            └─────────────────────┘
```

---

## 2. Requisitos Previos

Antes de comenzar, asegúrate de contar con:
1. Una cuenta en **GitHub** (ej. `mgonruz857-creator`).
2. Una cuenta en **Netlify** (gratuita, vinculable a GitHub).
3. Una cuenta corporativa de Google Workspace del centro: `14007180.aplicaciones@g.educaand.es` (o la cuenta institucional designada).
4. El archivo comprimido `.zip` del proyecto descargado desde Google AI Studio.

---

## 3. Fase 1: Repositorio en GitHub

### Paso 1.1: Crear el repositorio en GitHub
1. Accede a [GitHub](https://github.com) e inicia sesión.
2. Pulsa en el botón verde **New** (Nuevo Repositorio).
3. Configuración:
   - **Repository name:** `gestion-convivencia-ies-blas-infante`
   - **Visibility:** `Private` (Privado, recomendado por protección del código del centro).
   - **Initialize with README:** Dejar **desmarcado**.
4. Pulsa en **Create repository**.

### Paso 1.2: Generar un Personal Access Token (PAT)
*(Necesario debido a que GitHub no permite autenticación con contraseña tradicional)*:
1. Ve a tu foto de perfil (arriba a la derecha) > **Settings**.
2. Baja al menú izquierdo y selecciona **`<> Developer settings`**.
3. Haz clic en **Personal access tokens** > **Tokens (classic)**.
4. Pulsa en **Generate new token** > **Generate new token (classic)**.
5. Asigna una descripción (ej. `Netlify-IES-Blas-Infante`), marca la casilla **`repo`** (acceso total a repositorios) y pulsa **Generate token**.
6. **Copia el token generado** (`ghp_...`). Guárdalo en un lugar seguro.

### Paso 1.3: Subir el código fuente
Abre la terminal en la carpeta descomprimida del proyecto y ejecuta:

```bash
git init
git config --global user.name "Miguel González"
git config --global user.email "mgonruz857@g.educaand.es"
git add .
git commit -m "Initial commit - SIGC IES Blas Infante v2.0"
git branch -M main
git remote add origin https://github.com/mgonruz857-creator/gestion-convivencia-ies-blas-infante.git
git push -u origin main
```
*Cuando la terminal solicite contraseña, pega el Token `ghp_...` generado.*

---

## 4. Fase 2: Despliegue Web (GitHub Pages o Netlify)

> 💡 **RECOMENDACIÓN PARA ANDARED (Junta de Andalucía):**  
> El firewall corporativo de ANDARED de los centros educativos suele bloquear dominios externos gratuitos como `*.netlify.app`.  
> Por este motivo, **GitHub Pages (`*.github.io`) es la opción recomendada**, ya que los servidores de GitHub están autorizados y en lista blanca oficial en la red educativa de la Junta.

### Opción A: Despliegue con GitHub Pages en `https://convivenciaiesbi.github.io` (100% Compatible con ANDARED)

El proyecto ya incluye la configuración automática mediante **GitHub Actions** en `.github/workflows/deploy.yml`.

1. Entra en tu repositorio en [GitHub](https://github.com/convivenciaiesbi/convivenciaiesbi.github.io).
2. Haz clic en la pestaña superior **Settings** (Configuración).
3. En la barra lateral izquierda, baja y haz clic en **Pages**.
4. En la sección **Build and deployment**:
   - En el desplegable **Source**, selecciona: **`GitHub Actions`**.
5. ¡Listo! Cada vez que hagas `git push origin main`:
   - Se activará una tarea en la pestaña **Actions**.
   - En ~1 minuto tu web estará publicada en:  
     🌐 **`https://convivenciaiesbi.github.io`**
   - Esta URL directa (sin barras ni carpetas) abre sin bloqueos desde cualquier ordenador, pizarra digital o móvil conectado a la red WiFi del centro.

---

### Opción B: Despliegue en Netlify (Para redes fuera de ANDARED)

### Paso 2.1: Crear el sitio desde GitHub
1. Inicia sesión en [Netlify](https://app.netlify.com).
2. Haz clic en **Add new site** > **Import an existing project**.
3. Selecciona **GitHub** y autoriza a Netlify para ver tus repositorios.
4. Elige el repositorio: `gestion-convivencia-ies-blas-infante`.

### Paso 2.2: Configuración del Build
Netlify detectará automáticamente el archivo `netlify.toml` incluido en el proyecto:
* **Branch to deploy:** `main`
* **Base directory:** *(dejar vacío)*
* **Build command:** `npm run build`
* **Publish directory:** `dist`

### Paso 2.3: Desplegar el sitio
1. Haz clic en **Deploy gestion-convivencia-ies-blas-infante**.
2. Espera aproximadamente 60 segundos. Cuando aparezca el cartel verde **Site is live**, la web estará online con una URL del tipo: `https://nombre-aleatorio.netlify.app`.
3. *(Opcional)* En **Site configuration > Change site name**, puedes renombrarlo a algo identificativo como: `convivencia-blasinfante.netlify.app`.

---

## 5. Fase 3: Infraestructura en Google Drive y Google Apps Script

Esta fase garantiza que todos los teléfonos, ordenadores de aula y ordenadores de jefatura sincronicen los datos en tiempo real mediante la cuenta del centro: `14007180.aplicaciones@g.educaand.es`.

### Paso 5.1: Crear la Carpeta Raíz en Google Drive
1. Inicia sesión en Google Drive con la cuenta del centro: `14007180.aplicaciones@g.educaand.es`.
2. En la raíz de **Mi Unidad** (o en una Unidad Compartida), crea una carpeta llamada:
   `CONVIVENCIA_IES_BLAS_INFANTE`
3. Abre esa carpeta y copia el **ID de la carpeta** desde la barra de direcciones del navegador:
   *Ejemplo de URL:* `https://drive.google.com/drive/folders/1S5zjeSgcfVkL-eoQLsJ9I_ltHAnRrbaS`
   *El ID es:* `1S5zjeSgcfVkL-eoQLsJ9I_ltHAnRrbaS`.

### Paso 5.2: Generar la estructura de carpetas (Script de Creación)
1. Con la cuenta del centro, accede a [Google Apps Script](https://script.google.com).
2. Haz clic en **Nuevo proyecto** y titúlalo: `01_Crear_Estructura_Carpetas`.
3. En la aplicación web del centro, abre el icono de la **Nube / Google Drive** en la barra superior.
4. Pulsa en **Ver Script de Estructura de Carpetas** y pulsa **Copiar Código**.
5. Pega el código en el editor de Apps Script y pulsa **Ejecutar** (función `crearEstructuraConvivenciaBlasInfante`).
6. Acepta los permisos de Google Drive cuando lo solicite.
7. **Resultado:** En segundos se creará dentro de tu carpeta Drive la jerarquía oficial completa:
   - `2026-2027/`
     - `01_Partes_PDF/` (con las 30 subcarpetas: `1_FRIO`, `2_FRIO`, `1_INF`, `2_INF`, `1_CALOR`, `2_CALOR`, `1ESO_A` a `4ESO_D`, `1BACH_A` a `2BACH_D`)
     - `02_Aula_PAC/`
     - `03_Backups_Datos/`
     - `04_Plantillas_Oficiales/`
     - `05_Listados_Seneca/`

### Paso 5.3: Desplegar la API Web App de Persistencia
Este script actúa como el motor de base de datos que atiende las peticiones de guardado y lectura de la aplicación web:

1. En [Google Apps Script](https://script.google.com), crea otro **Nuevo proyecto** y titúlalo: `API_SIGC_BlasInfante`.
2. En la aplicación web del centro, en el modal de Drive, pulsa en **Copiar Código del Conector API**.
3. Pega este código reemplazando todo lo que haya en `Código.gs`.
4. Arriba a la derecha, haz clic en el botón azul **Implementar** > **Nueva implementación**.
5. Configura los siguientes campos:
   - **Seleccionar tipo (icono de engranaje):** `Aplicación web`
   - **Descripción:** `API Producción SIGC v2`
   - **Ejecutar como:** `Yo (14007180.aplicaciones@g.educaand.es)` *(CRÍTICO)*
   - **Quién tiene acceso:** `Cualquier usuario` *(o "Cualquiera con cuenta de Google Workspace")*
6. Haz clic en **Implementar**.
7. Si te pide autorizar permisos, pulsa en *Revisar permisos* > selecciona la cuenta institucional > *Avanzado* > *Ir a API_SIGC_BlasInfante (no seguro)* > *Permitir*.
8. **Copia la "URL de la aplicación web" generada**. Tendrá un formato similar a:
   `https://script.google.com/macros/s/AKfycbyrmV69dBgcg9WD0mx.../exec`

### Paso 5.4: Conectar la URL en la aplicación
1. Abre tu aplicación desplegada en Netlify.
2. Inicia sesión como Administrador de Convivencia (`mgonruz857@g.educaand.es`).
3. Haz clic en el icono de la **Nube / Google Drive** en el menú superior.
4. En el apartado **Conector API de Google Apps Script**, pega la URL `/exec` que acabas de copiar.
5. Pulsa en **Guardar URL y Probar Conexión**.
6. Haz clic en **"Forzar Sincronización Inmediata con Google Drive"**.
7. Verás el mensaje verde de confirmación: `✅ ¡Base de datos guardada en Drive! Archivo '00_SIGC_BD_CENTRO_BLAS_INFANTE.json' actualizado`.

---

## 6. Fase 4: Ingesta Oficial de Datos (Alumnado y Claustro)

Con la aplicación en producción y la base de datos conectada, el siguiente paso es cargar los datos del centro desde la pestaña **Drive ETL & Ingesta**.

### 6.1. Ingesta de Alumnado (Formato ODS / Excel 2 Columnas)
Exporta desde Séneca la relación de alumnos matriculados y asegúrate de que el archivo `.ods` o `.xlsx` tiene 2 columnas principales:

| Columna A | Columna B |
| :--- | :--- |
| **GARCÍA LÓPEZ, MANUEL** | **1º ESO A** |
| **RODRÍGUEZ PÉREZ, ANA** | **1º FRÍO** |
| **BENÍTEZ CANO, CARLOS** | **2º INF** |
| **SÁNCHEZ MORALES, LUCÍA** | **1º BACH B** |

1. En la aplicación, ve a **Drive ETL & Ingesta** > pestaña **Alumnado**.
2. Arrastra tu archivo `.ods` o pulsa en **Seleccionar Archivo ODS / Excel**.
3. El sistema previsualizará los alumnos y normalizará automáticamente los grupos (incluyendo tildes diacríticas de ciclos formativos).
4. Pulsa en **Ejecutar Ingesta y Guardar**.
5. Los alumnos recibirán sus 10 puntos iniciales de carnet y se enviarán automáticamente a Google Drive.

### 6.2. Ingesta de Claustro de Profesores (CSV o Texto)
Prepara la lista de profesores en formato CSV o texto pegado:
`"Apellidos, Nombre",Correo Corporativo,Rol`

*Ejemplo:*
```csv
"González Ruz, Miguel Ángel",mgonruz857@g.educaand.es,Convivencia
"Navarro Jiménez, Antonio",antonio.navarro@g.educaand.es,Docente
"Romero Gómez, Laura",laura.romero@g.educaand.es,Docente
```

1. Ve a **Drive ETL & Ingesta** > pestaña **Importación CSV Claustro**.
2. Pega el listado y pulsa **Ejecutar Ingesta**.
3. A cada docente se le creará su cuenta corporativa para poder iniciar sesión con su `@g.educaand.es`.

---

## 7. Fase 5: Verificación y Pruebas Operativas

Realiza la siguiente lista de verificación (Checklist de Aceptación):

- [ ] **Acceso Docente:** Inicia sesión con un correo docente secundario. Verifica que solo tiene acceso a:
  - *+ Nuevo Parte*
  - *Mis Partes Puestos*
  - *Aula PAC*
  - *Mi Perfil*
- [ ] **Creación de Parte Rápido (< 30s):** Pon un parte de prueba a un alumno. Comprueba que:
  - Los puntos se descuentan en el acto.
  - El expediente se numera según el año (`2026/101-BI`).
  - Se genera el movimiento en el histórico disciplinario.
- [ ] **Impresión Oficial:** Pulsa en el icono de impresora del parte. Verifica que el membrete oficial de la Junta de Andalucía, referencias a los artículos del Decreto 327/2010 y firmas son correctos.
- [ ] **Acceso Jefatura / Convivencia:** Inicia sesión como `mgonruz857@g.educaand.es`. Verifica acceso a:
  - *Feed Diario de Partes y Trámites* (llamadas a familias, resolución).
  - *Carnet por Puntos* (búsqueda, histórico de movimientos, medidas restaurativas).
  - *Aula PAC* (seguimiento en tiempo real y recepción).
  - *Analítica e Informes* (estadísticas interactivas).
  - *Drive ETL & Ingesta*.
- [ ] **Persistencia en la Nube:** Abre la carpeta de Google Drive corporativa del centro. Verifica que el archivo `00_SIGC_BD_CENTRO_BLAS_INFANTE.json` contiene la fecha y hora de la prueba realizada.

---

## 8. Procedimientos de Mantenimiento Anual y Backups

### 8.1. Copias de Seguridad Periódicas (Snapshots)
Recomendado quincenalmente o antes de periodos de evaluación:
1. Accede a **Drive ETL & Ingesta**.
2. Pulsa en el botón superior **Crear Snapshot Backup**.
3. El sistema generará una instantánea completa fechada y la guardará tanto en el almacenamiento local como en la carpeta `03_Backups_Datos` de Google Drive.

### 8.2. Apertura de Nuevo Curso Escolar (ej. 2027/2028)
Al inicio de cada curso académico:
1. Accede a **Drive ETL & Ingesta** > pestaña **Cursos Escolares e Histórico**.
2. Pulsa en **Apertura de Nuevo Curso Escolar**.
3. Introduce el nombre del nuevo curso (ej. `2027/2028`).
4. Marca la casilla **Vaciar alumnos para importar nuevo ODS** (o mantenerlos si promocionan).
5. Pulsa en **Confirmar Apertura de Curso**.
6. **Efecto legal:** El curso saliente queda **sellado y archivado de forma inmutable**, permitiendo consultas estadísticas interanuales, mientras el nuevo curso arranca con el contador de partes limpio.

---

## 9. Resolución de Incidencias Comunes

### Problema 1: Netlify da error 404 al recargar una página secundaria
* **Causa:** Las SPAs de React requieren redirigir todas las rutas a `index.html`.
* **Solución:** Ya está resuelto mediante el archivo `netlify.toml` con la regla `[[redirects]] from = "/*" to = "/index.html" status = 200`.

### Problema 2: Un docente olvidó su contraseña de acceso
* **Solución:**
  1. El Administrador de Convivencia entra en **Drive ETL & Ingesta** > **Gestión del Claustro**.
  2. Localiza al profesor y pulsa en el icono de **Llave / Clave**.
  3. Puede:
     - Asignar una contraseña manual temporal, o
     - Pulsar en **Restablecer Contraseña** (se le pedirá que defina una nueva al iniciar sesión).

### Problema 3: "Al importar un ODS, el censo no se guarda o vuelve al valor anterior"
* **Causa:** El reloj del ordenador o la sincronización automática estaba descargando una copia previa de Drive.
* **Solución:** Ya está corregido en la versión actual mediante el sistema de **Timestamping de escritura local**. Para forzar el envío, tras importar pulsa en el icono de la nube > *Forzar Sincronización Inmediata con Google Drive*.

---

*Manual elaborado conforme al Decreto 327/2010 (Reglamento Orgánico de los I.E.S. de Andalucía) y al Plan de Convivencia del I.E.S. Blas Infante.*
