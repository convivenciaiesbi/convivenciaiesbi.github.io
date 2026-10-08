/**
 * Comunicación con el servidor de datos (Google Apps Script v2).
 *
 * Todas las peticiones van por POST con el cuerpo en texto plano (así el navegador no hace
 * una consulta previa CORS) y la respuesta SÍ se lee: si el servidor no confirma, la operación
 * se considera fallida.
 */

import { URL_API_DRIVE } from '../config/entorno';

export const EVENTO_SESION_CADUCADA = 'sigc-sesion-caducada';

export interface RespuestaApi {
  ok: boolean;
  codigo?: string;
  error?: string;
  [clave: string]: any;
}

export async function llamarApi(accion: string, datos: Record<string, any> = {}, timeoutMs = 20000): Promise<RespuestaApi> {
  const controller = new AbortController();
  const temporizador = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const respuesta = await fetch(URL_API_DRIVE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion, ...datos }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const texto = await respuesta.text();
    let json: RespuestaApi;
    try {
      json = JSON.parse(texto);
    } catch {
      return { ok: false, codigo: 'RESPUESTA_INVALIDA', error: 'El servidor de datos ha devuelto una respuesta no válida.' };
    }
    if (!json.ok && json.codigo === 'NO_AUTH' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_CADUCADA, { detail: json.error }));
    }
    return json;
  } catch (e: any) {
    const abortada = e && e.name === 'AbortError';
    return {
      ok: false,
      codigo: 'SIN_CONEXION',
      error: abortada
        ? 'El servidor de datos ha tardado demasiado en responder.'
        : 'No se ha podido conectar con el servidor de datos. Compruebe la conexión a Internet.',
    };
  } finally {
    clearTimeout(temporizador);
  }
}
