/**
 * Parte de sanción (Decreto 327/2010, art. 37) para enviar a la familia, firmado por Dirección.
 * Reproduce el modelo que usaba el IES Blas Infante.
 */

import { jsPDF } from 'jspdf';
import { Alumno, ExpedienteSancion, LISTA_GRUPOS_OFICIALES } from '../types/convivencia';
import { getBase64Image } from './pdfGenerator';
import { CENTRO } from '../config/centro';
import {
  textoConductaArt37,
  MODALIDADES_SANCION,
  PARRAFO_EXPULSION,
  AVISO_CUSTODIA,
  AVISO_RECLAMACION,
} from '../data/sancionesArt37';
import iesLogoUrl from '../assets/images/logo_rectangular_iesbi.png';
import juntaLogoUrl from '../assets/images/junta_andalucia_logo.jpg';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-10-08' -> '8 de octubre de 2026' */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso || '';
  return `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]} de ${m[1]}`;
}

export function etiquetaGrupo(codigo: string): string {
  return LISTA_GRUPOS_OFICIALES.find((g) => g.codigo === codigo)?.etiqueta || codigo;
}

/** Texto de la sanción impuesta, tal como aparece en el parte. */
export function textoSancion(exp: ExpedienteSancion, alumno: Alumno): string {
  const nombre = `${alumno.nombre} ${alumno.apellidos}`.trim();
  const modalidad = MODALIDADES_SANCION.find((m) => m.valor === exp.modalidad)?.textoParte || '';
  const acude = (exp.dias_acude || '').trim();
  return (
    `El/La alumno/a ${nombre} desde el ${fechaLarga(exp.fecha_desde)} hasta el ${fechaLarga(exp.fecha_hasta)}` +
    (acude ? `, acudiendo al centro el ${acude}` : '') +
    `, ${modalidad}.`
  );
}

/** Escribe una línea repartiendo el espacio sobrante entre las palabras (texto justificado). */
function lineaJustificada(doc: jsPDF, linea: string, x: number, y: number, ancho: number): void {
  const palabras = linea.trim().split(/\s+/);
  if (palabras.length < 2) {
    doc.text(linea, x, y);
    return;
  }
  const anchoPalabras = palabras.reduce((acc, p) => acc + doc.getTextWidth(p), 0);
  const hueco = (ancho - anchoPalabras) / (palabras.length - 1);
  // Si el hueco resultase exagerado (línea muy corta), no se justifica
  if (hueco > doc.getTextWidth(' ') * 4) {
    doc.text(linea, x, y);
    return;
  }
  let cx = x;
  palabras.forEach((p) => {
    doc.text(p, cx, y);
    cx += doc.getTextWidth(p) + hueco;
  });
}

export async function generarParteSancionPdf(
  exp: ExpedienteSancion,
  alumno: Alumno,
  opciones?: { descargar?: boolean }
): Promise<{ doc: jsPDF; nombreArchivo: string; blob: Blob }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const mX = 22;
  const anchoTexto = anchoPagina - mX * 2;
  let y = 16;

  // --- Membrete: Junta + logo del IES a la izquierda; Consejería y centro a la derecha
  const [junta, ies] = await Promise.all([getBase64Image(juntaLogoUrl), getBase64Image(iesLogoUrl)]);
  try {
    if (junta) doc.addImage(junta, 'JPEG', mX, y, 24, 18);
  } catch {
    /* sin logo */
  }
  try {
    if (ies) doc.addImage(ies, 'PNG', mX + 27, y + 1, 19.3, 16);
  } catch {
    /* sin logo */
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  // "Consejería de Desarrollo Educativo y" / "Formación Profesional" / centro
  const corte = CENTRO.consejeria.lastIndexOf(' y ');
  const lineasCabecera =
    corte > 0
      ? [CENTRO.consejeria.substring(0, corte + 2), CENTRO.consejeria.substring(corte + 3), CENTRO.nombre]
      : [...doc.splitTextToSize(CENTRO.consejeria, 75), CENTRO.nombre];
  lineasCabecera.forEach((l: string, i: number) => doc.text(l, anchoPagina - mX, y + 5 + i * 4.3, { align: 'right' }));
  y += 30;

  // --- Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PARTE DE SANCIÓN', anchoPagina / 2, y, { align: 'center' });
  y += 12;

  const parrafo = (texto: string, opts?: { negrita?: boolean; tamano?: number; interlineado?: number }) => {
    const tam = opts?.tamano ?? 11;
    const inter = opts?.interlineado ?? 5.6;
    doc.setFont('helvetica', opts?.negrita ? 'bold' : 'normal');
    doc.setFontSize(tam);
    const lineas: string[] = doc.splitTextToSize(texto, anchoTexto);
    lineas.forEach((l, i) => {
      const ultima = i === lineas.length - 1;
      if (ultima) doc.text(l, mX, y);
      else lineaJustificada(doc, l, mX, y, anchoTexto);
      y += inter;
    });
  };

  const nombre = `${alumno.nombre} ${alumno.apellidos}`.trim();
  doc.setTextColor(15, 23, 42);
  parrafo(
    `Le comunico que su hijo/a ${nombre}, del grupo ${etiquetaGrupo(alumno.grupo)} de este centro, ha tenido conductas ` +
      'contrarias a las normas de convivencia del centro, y tipificadas en el Decreto 327/2010, en su artículo 37, consistentes en:'
  );
  y += 3;
  parrafo(textoConductaArt37(exp.conducta_art37), { negrita: true });
  y += 4;
  parrafo('Por todo ello, la Dirección del centro ha decidido imponerle como sanción:');
  y += 3;
  parrafo(textoSancion(exp, alumno));
  y += 2;
  parrafo(PARRAFO_EXPULSION);
  y += 8;

  // --- Lugar, fecha y firma de Dirección (con espacio para firmar)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${CENTRO.localidad}, a ${fechaLarga(exp.fecha_documento)}`, anchoPagina - mX, y, { align: 'right' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(CENTRO.direccion.cargo, anchoPagina - mX - 45, y, { align: 'center' });
  y += 24;
  doc.setFont('helvetica', 'normal');
  doc.text(CENTRO.direccion.nombre, anchoPagina - mX - 45, y, { align: 'center' });
  y += 12;

  // --- Avisos a la familia (recuadro)
  doc.setFontSize(9);
  const lineasAviso: string[] = [
    ...doc.splitTextToSize(AVISO_CUSTODIA, anchoTexto - 8),
    '',
    ...doc.splitTextToSize(AVISO_RECLAMACION, anchoTexto - 8),
  ];
  const altoAviso = lineasAviso.length * 4.4 + 6;
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(mX, y, anchoTexto, altoAviso, 1.5, 1.5, 'S');
  doc.setTextColor(30, 41, 59);
  let yA = y + 6;
  lineasAviso.forEach((l, i) => {
    const siguienteVacia = i + 1 >= lineasAviso.length || lineasAviso[i + 1] === '';
    if (l) {
      if (siguienteVacia) doc.text(l, mX + 4, yA);
      else lineaJustificada(doc, l, mX + 4, yA, anchoTexto - 8);
    }
    yA += 4.4;
  });

  const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  const nombreArchivo = `Parte_Sancion_${limpio(alumno.apellidos)}_${limpio(alumno.nombre)}_${exp.fecha_documento}.pdf`;
  const blob = doc.output('blob');
  if (opciones?.descargar !== false) {
    doc.save(nombreArchivo);
  }
  return { doc, nombreArchivo, blob };
}
