# Plan de trabajo – SIGC-BI (copia de desarrollo)

Esta copia (`ConvivenciaIesbiClaude`) es donde se corrige y amplía la app.
La app en uso (`convivenciaiesbi.github.io`) no se toca hasta el paso final.

## ✅ Hecho

- Copia separada del Drive real: base de datos de pruebas (`SIGC_PRUEBAS`), franja de aviso
  y configuración única en `src/config/entorno.ts` (`PRUEBAS` / `PRODUCCION`).
- El alumnado importado ya no desaparece al sincronizar.
- Cálculo del Carnet de Puntos en orden cronológico; recuperación semanal automática
  (+1 cada 7 días naturales sin partes que resten puntos; los de 0 puntos no cuentan);
  medidas restaurativas guardadas en Drive; números de expediente únicos.

## 🔒 Fase 1 – Seguridad

- [x] Quitar el DNI del código público (`src/data/seedData.ts`). Sigue en el historial de versiones antiguas.
- [x] Servidor v2 (`src/services/appsScriptServidor.ts`): toda petición exige sesión; contraseñas
      comprobadas y guardadas (con sal) solo en el servidor; bloqueo tras 5 fallos; sin guardado por GET.
- [x] Primer acceso: el docente escribe su contraseña dos veces (decisión de Miguel Ángel). Una vez
      fijada nadie puede "reclamar" la cuenta. Jefatura ve quién ha activado su cuenta y puede restablecerla.
- [x] Permisos en el servidor: el profesorado sin privilegios no recibe teléfonos, hechos de partes
      ajenos ni auditoría, y solo puede guardar sus partes y el estado del Aula PAC.
- [x] Las contraseñas de la versión 1 siguen valiendo y se convierten al formato nuevo en el primer acceso.
- [x] Cambio de contraseña propio desde "Mi perfil".
- [x] Si el administrador olvida su contraseña: ejecutar `restablecerClaveAdministrador` en el editor
      de Apps Script (solo el propietario del proyecto puede).
- [ ] Probar en el entorno de pruebas real (servidor v2 publicado en la cuenta de Miguel Ángel).

## ⚙️ Fase 2 – Funcionamiento

- [x] Confirmar de verdad que Drive ha guardado; si falla, los cambios quedan pendientes y se reintenta.
- [ ] No perder un parte si se cierra la pestaña o falla la red antes de subirlo.
- [ ] Sincronización eficiente: descargar solo lo que cambia (ahora descarga toda la
      base de datos cada 3 segundos por pestaña, con riesgo de superar los límites de Google).

## 🚀 Paso a producción (cuando las fases 1 y 2 estén terminadas)

> ⚠️ **RECORDATORIO OBLIGATORIO antes de sustituir la app en uso:**
> Con la recuperación semanal automática, el alumnado que lleva semanas sin partes
> **recuperará puntos de golpe** al activar esta versión. Avisar a Jefatura y preparar
> antes un listado comparando el saldo actual y el nuevo de cada alumno.

- [ ] Copia de seguridad del JSON real.
- [ ] Listado de cambios de saldo para Jefatura (ver recordatorio).
- [ ] Publicar el servidor v2 en la cuenta del centro (sustituye al actual; mantener la misma URL
      con "Gestionar implementaciones > Editar > Nueva versión").
- [ ] Cambiar `ENTORNO` a `'PRODUCCION'` y publicar.

## ✨ Fase 3 – Nuevas funcionalidades

- [ ] (Pendiente de que Miguel Ángel las detalle)
