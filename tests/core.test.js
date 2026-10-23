// Pruebas del núcleo numérico: node tests/core.test.js
const assert = require('assert');
const C = require('../js/core.js');
const { SCENARIOS } = require('../js/scenarios.js');

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('Cholesky coincide con Gauss en los 3 escenarios', () => {
  for (const s of Object.values(SCENARIOS)) {
    const a = C.solveCholesky(s.A, s.b), g = C.solveGauss(s.A, s.b);
    a.forEach((v, i) => assert(Math.abs(v - g[i]) < 1e-10));
  }
});
t('GCP converge con residuo < 1e-6 en los 3 escenarios', () => {
  for (const s of Object.values(SCENARIOS)) {
    const r = C.analyze(s.A, s.b, { precond: s.precond });
    assert(r.valid && r.gcp.converged && r.relResGCP < 1e-6);
  }
});
t('Escenario 3: GCP <= GC en iteraciones y κ(M⁻¹A) < κ(A)', () => {
  const s = SCENARIOS.ill, r = C.analyze(s.A, s.b, { precond: 'jacobi' });
  assert(r.gcp.iterations <= r.gc.iterations && r.condMA.cond < r.condA.cond);
});
t('Se rechaza matriz no simétrica y no definida positiva', () => {
  const A = SCENARIOS.ideal.A.map((r) => r.slice()), b = SCENARIOS.ideal.b;
  A[0][1] = 99;
  assert(!C.validate(A, b).ok);
  const B = SCENARIOS.ideal.A.map((r) => r.slice()); B[0][0] = -5;
  assert(!C.validate(B, b).ok);
});
t('b = 0 y n < 4 se rechazan', () => {
  assert(!C.validate(SCENARIOS.ideal.A, new Array(6).fill(0)).ok);
  assert(!C.validate([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 1, 1]).ok);
});
t('Sylvester: menores principales positivos en los 3 escenarios', () => {
  for (const s of Object.values(SCENARIOS)) assert(C.leadingMinors(s.A).every((m) => m > 0));
});
console.log(n + ' pruebas superadas');
