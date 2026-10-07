/**
 * Configuración del entorno de datos.
 *
 * Esta copia de la app trabaja contra una base de datos de PRUEBAS
 * (carpeta SIGC_PRUEBAS en el Drive de mgonruz857@g.educaand.es),
 * con alumnado ficticio. Así no se tocan los datos reales del centro.
 *
 * Para poner la app en producción, basta con cambiar ENTORNO a 'PRODUCCION'.
 */

export type Entorno = 'PRUEBAS' | 'PRODUCCION';

export const ENTORNO: Entorno = 'PRUEBAS';

const URLS_API_DRIVE: Record<Entorno, string> = {
  PRUEBAS:
    'https://script.google.com/macros/s/AKfycbxWamqKMoaoRgrflhIj6ocgiHN4uRcCXg6NdiMJEo7WXI0a6dSiuuDbbOy9AubyiuS7/exec',
  PRODUCCION:
    'https://script.google.com/macros/s/AKfycbyrmV69dBgcg9WD0mx4tQLWeZtbqSR7odMS87HS5VyOPQL90RNNZMkpp5HHGZ30HimLNQ/exec',
};

export const URL_API_DRIVE: string = URLS_API_DRIVE[ENTORNO];

export const ES_ENTORNO_PRUEBAS: boolean = ENTORNO === 'PRUEBAS';
