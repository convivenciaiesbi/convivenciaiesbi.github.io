/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  Download, 
  Check, 
  Loader2, 
  FileCheck, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Sancion, Alumno } from '../types/convivencia';
import { MATRIZ_ROF_CATALOG, obtenerTipificacionNormativa } from '../data/rofCatalog';
import iesCrest from '../assets/images/ies_blas_infante_crest_1790178434654.jpg';
import juntaLogo from '../assets/images/junta_andalucia_logo.jpg';
import { generateOfficialSancionPdf } from '../utils/pdfGenerator';

interface OfficialPartePrintModalProps {
  sancion?: Sancion;
  sancionesBatch?: Sancion[];
  alumnoMap: Map<string, Alumno>;
  onClose: () => void;
}

export const OfficialPartePrintModal: React.FC<OfficialPartePrintModalProps> = ({
  sancion,
  sancionesBatch,
  alumnoMap,
  onClose,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  const listaSanciones = sancionesBatch && sancionesBatch.length > 0 
    ? sancionesBatch 
    : sancion 
    ? [sancion] 
    : [];

  // Robust Direct Vector PDF File Generation and Instant Download
  const handleDownloadPdf = async () => {
    if (listaSanciones.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);

    try {
      const { filename } = await generateOfficialSancionPdf(listaSanciones, alumnoMap, {
        download: true,
      });

      setPdfSuccessMessage(`¡Archivo "${filename}" descargado con éxito! Listo para imprimir o archivar.`);

      // Auto-clear success message after 6 seconds
      setTimeout(() => {
        setPdfSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setPdfErrorMessage('No se pudo generar el PDF automáticamente. Por favor, reintenta la descarga.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dedicated Print Function with Automatic PDF Download Fallback
  const handleTriggerPrint = async () => {
    setPdfSuccessMessage(null);
    setPdfErrorMessage(null);

    // First, try standard window.print()
    let printSucceeded = false;
    try {
      window.print();
      printSucceeded = true;
    } catch (e) {
      console.warn('Direct print blocked by sandbox policies:', e);
      printSucceeded = false;
    }

    // Because browser sandboxes frequently block the print modal silently or via exception,
    // we also generate and trigger the official PDF download so the user never misses their document!
    try {
      const { filename } = await generateOfficialSancionPdf(listaSanciones, alumnoMap, {
        download: true,
      });
      setPdfSuccessMessage(`Documento PDF descargado ("${filename}"). En visores integrados, puedes abrir e imprimir directamente el archivo descargado.`);
    } catch (pdfErr) {
      console.error('Error in print fallback PDF:', pdfErr);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print-modal-overlay">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-sky-100 animate-in fade-in zoom-in-95 duration-100 print-modal-card">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-sky-100 bg-sky-50/70 gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {listaSanciones.length > 1
                  ? `Boletín Consolidado (${listaSanciones.length} partes disciplinarios)`
                  : `Boletín Oficial de Sanción Disciplinaria`}
              </h2>
              <p className="text-[11px] text-slate-500">
                Modelo Oficial de Convivencia · Junta de Andalucía & IES Blas Infante
              </p>
            </div>
          </div>

          {/* Action buttons: Download PDF & Print */}
          <div className="flex items-center gap-2">
            {/* Direct PDF Download button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                isGeneratingPdf 
                  ? 'bg-sky-400 text-white cursor-wait' 
                  : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
              }`}
              title="Descargar archivo PDF oficial listo para imprimir o enviar"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            {/* Direct Print button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-sky-100/60 text-sky-900 border border-sky-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Imprimir directamente desde el navegador"
            >
              <Printer className="w-4 h-4 text-sky-700" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Close modal button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-sky-100 transition-colors cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback alert banners */}
        {pdfSuccessMessage && (
          <div className="print:hidden px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{pdfSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {pdfErrorMessage && (
          <div className="print:hidden px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{pdfErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfErrorMessage(null)}
              className="text-amber-700 hover:text-amber-950 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Printable & Canvas Capture Content Area */}
        <div 
          ref={printContainerRef}
          className="p-4 sm:p-8 overflow-y-auto space-y-8 bg-slate-100/50 print:bg-white print:p-0 flex-1"
        >
          {listaSanciones.map((currentSancion) => {
            const currentAlumno = alumnoMap.get(currentSancion.id_alumno);
            if (!currentAlumno) return null;
            const rofDef = MATRIZ_ROF_CATALOG[currentSancion.codigo_infraccion];

            return (
              <div
                key={currentSancion.id_sancion}
                className="parte-document-page bg-white border border-slate-300 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto space-y-5 text-slate-900 print:shadow-none print:border-0 print:p-4 print:max-w-none print:m-0 page-break-after rounded-xl"
              >
                {/* Official Institutional Header */}
                <div className="flex items-center justify-between border-b-2 border-sky-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-auto flex items-center justify-center p-1 bg-white rounded border border-slate-200 shrink-0">
                      <img
                        src={juntaLogo}
                        alt="Junta de Andalucía"
                        className="h-12 w-auto max-w-[120px] object-contain"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[12px] font-extrabold uppercase tracking-wide text-sky-950">
                        Junta de Andalucía
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        Consejería de Desarrollo Educativo y Formación Profesional
                      </div>
                      <div className="text-[11px] font-bold text-slate-900">
                        IES BLAS INFANTE · CÓRDOBA (CÓDIGO: 14007180)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900">
                        EXPEDIENTE: {currentSancion.numero_expediente}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Fecha: <strong>{currentSancion.fecha}</strong>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Sesión: <strong>{currentSancion.tramo_horario.split('(')[0]}</strong> {currentSancion.hora_incidente ? `(${currentSancion.hora_incidente}h)` : ''}
                      </div>
                      {currentSancion.registro_diferido && currentSancion.hora_registro && (
                        <div className="text-[9px] font-mono text-amber-800 font-semibold">
                          [Registrado en diferido a las {currentSancion.hora_registro}h]
                        </div>
                      )}
                    </div>
                    <div className="w-16 h-16 bg-white p-0.5 rounded border border-slate-200 flex items-center justify-center shrink-0">
                      <img
                        src={iesCrest}
                        alt="Logo IES Blas Infante"
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center space-y-1">
                  <h1 className="text-base font-bold uppercase tracking-wider text-slate-900 border-y border-slate-200 py-1 bg-slate-50">
                    PARTE DISCIPLINARIO Y COMUNICACIÓN DE DEDUCCIÓN DE PUNTOS
                  </h1>
                  <p className="text-[10px] text-slate-500 italic">
                    Conforme al Decreto 327/2010 (ROF) y Anexo II del Reglamento de Régimen Interior del Centro
                  </p>
                </div>

                {/* 1. Datos del Alumnado y Profesorado */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-200 p-3 rounded-lg space-y-1 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">
                      1. Datos del Alumno / Alumna
                    </div>
                    <div className="font-bold text-slate-900">
                      {currentAlumno.apellidos}, {currentAlumno.nombre}
                    </div>
                    <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                      <span>Grupo: <strong>{currentAlumno.grupo}</strong></span>
                      <span>NIE: <strong>{currentAlumno.nie}</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Tutor/a Legal: {currentAlumno.nombre_tutor} ({currentAlumno.telefono_tutor})
                    </div>
                  </div>

                  <div className="border border-slate-200 p-3 rounded-lg space-y-1 bg-slate-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">
                      2. Profesor/a que emite el parte
                    </div>
                    <div className="font-bold text-slate-900">
                      {currentSancion.nombre_profesor}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Materia / Función: <strong>{currentSancion.materia}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      Lugar del hecho: {currentSancion.ubicacion} · Tramo: {currentSancion.tramo_horario} {currentSancion.hora_incidente ? `(${currentSancion.hora_incidente}h)` : ''}
                    </div>
                  </div>
                </div>

                {/* 2. Calificación de la Conducta e Impacto en Carnet de 10 Puntos (V0) */}
                {(() => {
                  const tipif = obtenerTipificacionNormativa(currentSancion.codigo_infraccion);
                  const saldoAnt = currentSancion.saldo_anterior !== undefined ? currentSancion.saldo_anterior : Math.min(10, currentAlumno.puntos_actuales + currentSancion.puntos_restados);
                  const saldoRes = currentSancion.saldo_resultante !== undefined ? currentSancion.saldo_resultante : currentAlumno.puntos_actuales;

                  return (
                    <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                        <span className="font-bold uppercase tracking-wider text-sky-900 text-[10px]">
                          3. Conducta Registrada y Tipificación Normativa
                        </span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          CÓDIGO: {currentSancion.codigo_infraccion}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {rofDef ? rofDef.titulo : currentSancion.codigo_infraccion}
                        </div>
                        {/* PRECISIÓN JURÍDICA: Distinguir Decreto 327/2010 vs Plan de Convivencia */}
                        <div className="text-slate-600 text-[11px] mt-0.5 font-sans italic">
                          {tipif.tipoTexto} · <strong className="font-mono not-italic text-slate-700">[{tipif.referencia}]</strong>
                        </div>
                      </div>

                      <div className="bg-slate-100 p-2.5 rounded-lg font-mono text-xs flex justify-between items-center">
                        <div>
                          Pérdida asociada: <strong className={currentSancion.puntos_restados > 0 ? 'text-rose-700' : 'text-slate-700'}>
                            {currentSancion.puntos_restados > 0 ? `-${currentSancion.puntos_restados} puntos` : '0 puntos (Incidencia académica)'}
                          </strong>
                        </div>
                        <div>
                          Saldo: {saldoAnt} → <strong className={saldoRes <= 3 ? 'text-rose-700' : 'text-sky-800'}>{saldoRes} / 10 puntos</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Descripción de los Hechos */}
                <div className="border border-slate-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                  <div className="font-bold uppercase tracking-wider text-sky-900 text-[10px]">
                    4. Descripción circunstanciada de los hechos
                  </div>
                  <p className="text-slate-800 leading-relaxed font-serif text-[12px] italic bg-slate-50 p-2.5 rounded border border-slate-100">
                    "{currentSancion.descripcion_hechos}"
                  </p>
                </div>

                {/* 4. Medida Inmediata Adoptada (V0 - Página 3) */}
                <div className="border border-amber-300 bg-amber-50/50 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">
                    5. Medida Inmediata Adoptada
                  </div>
                  <div className="font-bold text-slate-900 text-xs">
                    Actuación seleccionada: {currentSancion.medida_inmediata_texto || 'Amonestación verbal / advertencia'}
                  </div>

                  {currentSancion.derivado_pac && (
                    <div className="text-[11px] text-amber-950 bg-white p-2.5 rounded border border-amber-200 space-y-1 font-mono">
                      <div>
                        Derivación al Aula PAC · Salida: {currentSancion.detalle_pac?.hora_salida || currentSancion.hora_incidente || '08:50'}h · Docente: {currentSancion.detalle_pac?.profesor_deriva || currentSancion.nombre_profesor} · ¿Reincorporación?: {currentSancion.detalle_pac?.reincorporacion || 'Sí'}
                      </div>
                      <div className="text-slate-700 not-italic">
                        Tareas prescritas: "{currentSancion.detalle_pac?.tarea_pac || currentSancion.tareas_enviadas_pac || 'Ficha de reflexión conductual y ejercicios lectivos.'}"
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Comunicación Legal a las Familias */}
                <div className="text-[10px] text-slate-500 space-y-1 border-t border-slate-200 pt-2">
                  <p>
                    <strong>Aviso a los representantes legales:</strong> Se comunica la deducción de puntos conforme al catálogo oficial V0 del Plan de Convivencia del IES Blas Infante. La aplicación no impone decisiones de expulsión; si el saldo del carnet alcanza los 0 puntos, se elevará a la Jefatura de Estudios para la adopción de las medidas correctoras oportunas. Se puede solicitar cita con la tutoría o con Jefatura. Fecha de notificación: <strong>{currentSancion.fecha_comunicacion_familia || currentSancion.fecha}</strong>.
                  </p>
                </div>

                {/* 6. Bloque de Firmas Oficiales */}
                <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                  <div className="space-y-12">
                    <div className="font-bold text-slate-700 text-[11px]">
                      El/La Profesor/a Actuante
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
                      Fdo.: {currentSancion.nombre_profesor}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="font-bold text-slate-700 text-[11px]">
                      Jefatura de Estudios / Convivencia
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
                      Sello del Centro y Vº Bº
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="font-bold text-slate-700 text-[11px]">
                      Enterado Padre / Madre / Tutor Legal
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
                      Firma y Fecha de Notificación
                    </div>
                  </div>
                </div>

                {/* Drive Link & Verification Code */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-[9px] font-mono text-slate-400">
                  <span>Documento custodiado en Google Drive: {currentSancion.url_pdf_drive}</span>
                  <span>Verificación CSV: BI-SEC-{currentSancion.id_sancion.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Footer */}
        <div className="print:hidden px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Documento normalizado A4 listo para impresión física o descarga en PDF.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isGeneratingPdf}
              className="px-3 py-2 bg-white hover:bg-sky-50 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
