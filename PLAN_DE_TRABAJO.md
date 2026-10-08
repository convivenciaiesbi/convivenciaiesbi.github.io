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

- [ ] Quitar el DNI y datos personales del código público (`src/data/seedData.ts`).
- [ ] Programa de Apps Script: no devolver las contraseñas (hashes) a quien lea los datos
      y no permitir guardar datos mediante GET.
- [ ] Acceso real: que el programa de Apps Script compruebe quién hace cada petición
      (ahora cualquiera con el enlace puede leer, cambiar o borrar todo).
- [ ] Inicio de sesión comprobado fuera del navegador (ahora se puede saltar, y la primera
      persona que escribe un correo elige la contraseña de ese profesor).
- [ ] Permisos por rol aplicados también en el servidor (el profesorado sin privilegios
      no debe poder descargar todos los datos).

## ⚙️ Fase 2 – Funcionamiento

- [ ] Confirmar de verdad que Drive ha guardado (ahora dice "guardado" aunque falle).
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
- [ ] Publicar el programa de Apps Script nuevo en la cuenta del centro.
- [ ] Cambiar `ENTORNO` a `'PRODUCCION'` y publicar.

## ✨ Fase 3 – Nuevas funcionalidades

- [ ] (Pendiente de que Miguel Ángel las detalle)
