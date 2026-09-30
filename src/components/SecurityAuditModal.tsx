/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Lock, 
  FileText, 
  ExternalLink,
  Info,
  Check,
  X
} from 'lucide-react';
import { SecurityTestRunner, SecurityTestReport } from '../services/securityTestRunner';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [report, setReport] = useState<SecurityTestReport>(() => SecurityTestRunner.runAll());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const newReport = SecurityTestRunner.runAll();
      setReport(newReport);
      setIsRunning(false);
    }, 450);
  };

  const handleDownloadReport = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Auditoria_Seguridad_RGPD_IES_Blas_Infante_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    const text = `INFORME DE AUDITORÍA DE SEGURIDAD Y PRIVACIDAD - IES BLAS INFANTE
Fecha: ${new Date(report.timestamp).toLocaleString('es-ES')}
Puntuación de Seguridad: ${report.score}%
Tests Superados: ${report.passedTests}/${report.totalTests}
Tiempo de Ejecución: ${report.durationMs}ms

Resultados:
${report.results.map(r => `[${r.passed ? 'PASS' : 'FAIL'}] ${r.id} (${r.severity}): ${r.name} - ${r.message}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const categories = [
    { id: 'TODAS', label: 'Todas las Categorías' },
    { id: 'RBAC_ACCESS_CONTROL', label: 'Control de Acceso (RBAC)' },
    { id: 'INPUT_SANITIZATION', label: 'Sanitización e Inyecciones' },
    { id: 'DATA_INTEGRITY_AUDIT', label: 'Integridad y Auditoría' },
    { id: 'BUSINESS_LOGIC_ROF', label: 'Reglas de Negocio ROF' },
    { id: 'PRIVACY_RGPD', label: 'Privacidad y RGPD' },
  ];

  const filteredResults = selectedCategory === 'TODAS'
    ? report.results
    : report.results.filter(r => r.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* ========================================================================= */}
        {/* HEADER */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 flex items-start justify-between border-b border-sky-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  Auditoría y Tests de Seguridad y Protección de Datos (RGPD)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  SCORE {report.score}%
                </span>
              </div>
              <p className="text-xs text-sky-200/80 mt-0.5">
                IES Blas Infante (14007180) · Verificación formal de cumplimiento normativo y blindaje de datos sensibles de menores.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* KPI RESUMEN */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado General</span>
            <div className="flex items-center gap-1.5 mt-1">
              {report.failedTests === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-emerald-800 text-sm">100% Conforme</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-800 text-sm">{report.failedTests} Fallos</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Batería de Pruebas</span>
            <div className="mt-1 font-mono font-bold text-slate-800 text-sm">
              {report.passedTests} / {report.totalTests} superadas
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custodia Oficial Drive</span>
            <div className="mt-1 font-mono text-[11px] font-semibold text-slate-700 truncate" title="14007180.aplicaciones@g.educaand.es">
              14007180.aplicaciones
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latencia de Verificación</span>
            <div className="mt-1 font-mono text-sm font-bold text-sky-700">
              {report.durationMs} ms
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTROLES Y FILTROS */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-sky-100 text-sky-900 border border-sky-300 font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 border border-transparent'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Ejecutando...' : 'Re-ejecutar Tests'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              title="Copiar informe al portapapeles"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              title="Descargar informe técnico JSON para inspección educativa"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LISTADO DETALLADO DE TESTS */}
        {/* ========================================================================= */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {filteredResults.map((t) => {
            const isPass = t.passed;
            const sevBadge = 
              t.severity === 'CRITICA'
                ? 'bg-purple-100 text-purple-900 border-purple-200'
                : t.severity === 'ALTA'
                ? 'bg-amber-100 text-amber-900 border-amber-200'
                : 'bg-blue-100 text-blue-900 border-blue-200';

            return (
              <div 
                key={t.id}
                className={`p-3.5 rounded-xl border bg-white shadow-2xs transition-all ${
                  isPass ? 'border-slate-200 hover:border-slate-300' : 'border-red-300 bg-red-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {isPass ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500">{t.id}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${sevBadge}`}>
                          {t.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{t.category}]
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {SecurityTestRunner.getTestCases().find(c => c.id === t.id)?.description}
                      </p>
                      <div className={`mt-2 p-2 rounded-lg text-xs font-mono ${
                        isPass 
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80' 
                          : 'bg-red-50 text-red-900 border border-red-200'
                      }`}>
                        <strong>Dictamen:</strong> {t.message}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${
                    isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isPass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Auditoría conforme a RGPD (Reglamento UE 2016/679) y LOPDGDD 3/2018.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
