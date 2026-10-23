/* Datos del caso: Cartera media-varianza de n = 6 activos (Markowitz sin restricciones).
 *   max  μᵀw − (γ/2) wᵀΣw   ⇒   Σ w = μ/γ   ⇒   A = Σ  (SPD),  b = μ/γ,  x = w
 * Unidades: A en (%)², μ en %, γ adimensional. Para que w sea fracción del capital:
 *   Σ[%²] w = 100·μ[%]/γ   ⇒   b = 100·μ/γ.
 * Los escenarios cambian volatilidades σ, correlaciones ρ y rendimientos μ de forma fundamentada.
 */
(function (root) {
  'use strict';

  const VARIABLES = [
    { id: 'x1', name: 'Bonos soberanos', desc: 'Fracción del capital en deuda pública de corto/mediano plazo' },
    { id: 'x2', name: 'Fondo balanceado', desc: 'Fracción en fondo mixto renta fija / variable' },
    { id: 'x3', name: 'Acciones nacionales', desc: 'Fracción en renta variable local' },
    { id: 'x4', name: 'Acciones globales', desc: 'Fracción en ETF de mercados desarrollados' },
    { id: 'x5', name: 'Oro', desc: 'Fracción en oro físico / ETF (activo refugio)' },
    { id: 'x6', name: 'Criptoactivos', desc: 'Fracción en cartera de criptomonedas (alta volatilidad)' },
  ];

  const r4 = (v) => Math.round(v * 10000) / 10000;

  // Σ_ij = ρ_ij σ_i σ_j  (ρ dado como triángulo superior por filas)
  function buildSystem(sigma, rhoUpper, mu, gamma) {
    const n = sigma.length;
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    let k = 0;
    for (let i = 0; i < n; i++) {
      A[i][i] = r4(sigma[i] * sigma[i]);
      for (let j = i + 1; j < n; j++) {
        const rho = rhoUpper[k++];
        A[i][j] = A[j][i] = r4(rho * sigma[i] * sigma[j]);
      }
    }
    const b = mu.map((m) => r4((100 * m) / gamma));
    return { A, b };
  }

  const SCENARIOS = {
    ideal: {
      key: 'ideal',
      title: 'Escenario 1 · Ideal',
      precond: 'jacobi',
      gamma: 20,
      sigma: [6, 8, 10, 12, 14, 16],
      mu: [4, 6, 8, 9, 7, 12],
      // ρ12 ρ13 ρ14 ρ15 ρ16 | ρ23 ρ24 ρ25 ρ26 | ρ34 ρ35 ρ36 | ρ45 ρ46 | ρ56
      rho: [0.30, 0.15, 0.10, 0.05, 0.00, 0.35, 0.25, 0.10, 0.10, 0.45, 0.05, 0.15, 0.05, 0.20, 0.00],
      justification:
        'Mercado estable: volatilidades moderadas y parecidas (6 %–16 % anual) y correlaciones bajas a moderadas. ' +
        'La diversificación funciona, por lo que Σ está bien escalada y bien condicionada (κ bajo).',
      interpretation:
        'La cartera óptima reparte capital en todos los activos; el sistema es muy estable: un error pequeño en μ ' +
        'produce un error pequeño en w. GC y GCP convergen rápido y con gran exactitud.',
    },
    stress: {
      key: 'stress',
      title: 'Escenario 2 · Bajo estrés financiero',
      precond: 'jacobi',
      gamma: 20,
      sigma: [9, 13, 21, 22, 20, 38],
      mu: [2.5, 3, 1.5, 2, 5, 4],
      rho: [0.55, 0.60, 0.65, 0.20, 0.45, 0.75, 0.70, 0.30, 0.60, 0.80, 0.25, 0.65, 0.20, 0.60, 0.35],
      justification:
        'Crisis: las volatilidades suben (inflación, tasas, caída de ingresos) y las correlaciones se disparan ' +
        '(“todo cae a la vez”), mientras los rendimientos esperados bajan; el oro conserva rol refugio (baja correlación). ' +
        'Se modifican A (σ, ρ) y b (μ) respecto al escenario ideal.',
      interpretation:
        'El capital migra a bonos y fondo balanceado, aparecen posiciones cortas en renta variable y cripto (bajo μ, alta σ y ρ) ' +
        'y el oro mantiene un peso positivo como refugio. κ(A) crece de forma moderada: el estrés desplaza el punto de equilibrio ' +
        'más de lo que daña el condicionamiento.',
    },
    ill: {
      key: 'ill',
      title: 'Escenario 3 · Mal condicionado',
      precond: 'jacobi',
      gamma: 20,
      sigma: [1, 4, 10, 25, 60, 120],
      mu: [1.5, 5, 8, 10, 6, 15],
      rho: [0.05, 0.05, 0.00, 0.00, 0.00, 0.15, 0.10, 0.05, 0.05, 0.20, 0.10, 0.10, 0.15, 0.10, 0.20],
      justification:
        'Mal escalamiento diagonal: la cartera mezcla un instrumento casi sin riesgo (σ = 1 %) con posiciones ' +
        'nocionales apalancadas/derivados (σ efectiva hasta 120 %). Las varianzas difieren en 5 órdenes de magnitud, ' +
        'pero las correlaciones son moderadas ⇒ el precondicionador de Jacobi (diagonal) es el adecuado.',
      interpretation:
        'Una Σ con escalas tan dispares amplifica el error de datos (κ grande). El precondicionador diagonal ' +
        'reescala las variables y reduce κ(M⁻¹A) en varios órdenes, de modo que GCP necesita menos iteraciones que GC.',
    },
  };

  Object.values(SCENARIOS).forEach((s) => {
    const sys = buildSystem(s.sigma, s.rho, s.mu, s.gamma);
    s.A = sys.A; s.b = sys.b;
  });

  const api = { VARIABLES, SCENARIOS, buildSystem };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scenarios = api;
})(typeof window !== 'undefined' ? window : globalThis);
