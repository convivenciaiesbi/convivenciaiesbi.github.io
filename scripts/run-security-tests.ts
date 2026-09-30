/**
 * CLI Test Runner for Security & Data Protection in SIGC IES Blas Infante
 */

// Polyfill localStorage in node if not defined
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (idx: number) => Array.from(store.keys())[idx] || null,
    length: 0,
  } as any;
}

import { SecurityTestRunner } from '../src/services/securityTestRunner';

console.log('========================================================================');
console.log('   BATERÍA OFICIAL DE TESTS DE SEGURIDAD Y PROTECCIÓN DE DATOS (RGPD)   ');
console.log('             S.I.G.C. - IES BLAS INFANTE (CÓRDOBA - 14007180)           ');
console.log('========================================================================\n');

const report = SecurityTestRunner.runAll();

report.results.forEach((test, idx) => {
  const symbol = test.passed ? '✅ [PASS]' : '❌ [FAIL]';
  const tagSev = `[${test.severity}]`;
  console.log(`${symbol} ${test.id} - ${tagSev} ${test.name}`);
  console.log(`   Categoría: ${test.category}`);
  console.log(`   Resultado: ${test.message}\n`);
});

console.log('------------------------------------------------------------------------');
console.log(`RESUMEN DE AUDITORÍA:`);
console.log(`Tests Ejecutados: ${report.totalTests}`);
console.log(`Superados:        ${report.passedTests} (${report.score}%)`);
console.log(`Fallidos:         ${report.failedTests}`);
console.log(`Tiempo de Test:   ${report.durationMs} ms`);
console.log('------------------------------------------------------------------------');

if (report.failedTests > 0) {
  console.error('\n⚠️ SE DETECTARON DEFICIENCIAS DE SEGURIDAD. Revisar los fallos señalados.');
  process.exit(1);
} else {
  console.log('\n🔒 SISTEMA SEGURO Y CONFORME: 100% de los tests fundamentales superados.');
  process.exit(0);
}
