/* Interfaz interactiva: entrada de datos, recálculo reactivo, gráficos, tablas y módulo QA. */
(function () {
  'use strict';
  const { VARIABLES, SCENARIOS } = window.Scenarios;
  const C = window.Core;
  const $ = (id) => document.getElementById(id);

  // ---------- Formato ----------
  function fmt(v, d) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (v === 0) return '0';
    d = d === undefined ? 6 : d;
    const a = Math.abs(v);
    if (a < 1e-4 || a >= 1e6) return v.toExponential(Math.max(1, d - 3));
    return v.toFixed(d);
  }
  const fmtSci = (v) => (v === null || v === undefined ? '—' : v.toExponential(2));
  const fmtVec = (x, d) => '[' + x.map((v) => fmt(v, d === undefined ? 5 : d)).join(', ') + ']';
  const varName = (i) => (VARIABLES[i] ? VARIABLES[i].name : 'Activo ' + (i + 1));
  const badge = (ok, yes, no) => '<span class="badge ' + (ok ? 'pass' : 'fail') + '">' + (ok ? yes : no) + '</span>';

  // ---------- Estado ----------
  let state = null;       // sistema y parámetros editables
  let last = null;        // último análisis
  const deep = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__NaN__' : v)),
    (k, v) => (v === '__NaN__' ? NaN : v));

  function stateFromScenario(key) {
    const s = SCENARIOS[key];
    return {
      key, modified: false, n: s.b.length,
      A: s.A.map((r) => r.slice()), b: s.b.slice(), x0: new Array(s.b.length).fill(0),
      tol: 1e-6, nmax: 1000, precond: s.precond, omega: 1, mirror: false,
    };
  }

  // ---------- Entrada de datos ----------
  function buildInputPanel() {
    const n = state.n;
    let h = '<div class="grid3">' +
      '<label>Dimensión n (≥ 4)<select id="selN">' + [4, 5, 6, 7, 8].map((k) => '<option' + (k === n ? ' selected' : '') + '>' + k + '</option>').join('') + '</select></label>' +
      '<label>Tolerancia ‖r‖₂/‖b‖₂<input id="inTol" type="text" inputmode="decimal" value="' + state.tol + '"></label>' +
      '<label>Iteraciones máximas N<sub>máx</sub><input id="inNmax" type="number" min="1" step="1" value="' + state.nmax + '"></label>' +
      '<label>Precondicionador<select id="selPre">' +
      [['jacobi', 'Jacobi (diagonal)'], ['ssor', 'SSOR'], ['ic0', 'Cholesky incompleto IC(0)'], ['none', 'Ninguno (M = I)']]
        .map((p) => '<option value="' + p[0] + '"' + (state.precond === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') +
      '</select></label>' +
      '<label>ω (solo SSOR, 0 &lt; ω &lt; 2)<input id="inOmega" type="number" min="0.05" max="1.95" step="0.05" value="' + state.omega + '"></label>' +
      '<label style="flex-direction:row;align-items:center;gap:8px;margin-top:20px"><input id="chkMirror" type="checkbox"' + (state.mirror ? ' checked' : '') + '> Espejar simetría al editar A</label>' +
      '</div>';
    h += '<h3>Matriz A (covarianzas Σ, en %²)</h3><div class="scroll"><table class="mat"><thead><tr><th></th>';
    for (let j = 0; j < n; j++) h += '<th>x' + (j + 1) + '</th>';
    h += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
      h += '<tr><th>x' + (i + 1) + '</th>';
      for (let j = 0; j < n; j++)
        h += '<td><input type="number" step="any" data-k="A" data-i="' + i + '" data-j="' + j + '" value="' + (Number.isNaN(state.A[i][j]) ? '' : state.A[i][j]) + '" aria-label="a' + (i + 1) + (j + 1) + '"></td>';
      h += '</tr>';
    }
    h += '</tbody></table></div>';
    h += '<div class="grid2"><div><h3>Vector b (100·μ/γ)</h3><div class="vec">';
    for (let i = 0; i < n; i++)
      h += '<label style="display:inline-flex;margin:0 6px 6px 0">b' + (i + 1) + '<input type="number" step="any" data-k="b" data-i="' + i + '" value="' + (Number.isNaN(state.b[i]) ? '' : state.b[i]) + '"></label>';
    h += '</div></div><div><h3>Vector inicial x₀</h3><div class="vec">';
    for (let i = 0; i < n; i++)
      h += '<label style="display:inline-flex;margin:0 6px 6px 0">x₀,' + (i + 1) + '<input type="number" step="any" data-k="x0" data-i="' + i + '" value="' + state.x0[i] + '"></label>';
    h += '</div></div></div>';
    $('inputPanel').innerHTML = h;
  }

  function setupInputEvents() {
    const panel = $('inputPanel');
    panel.addEventListener('input', (e) => {
      const t = e.target, k = t.dataset.k;
      if (k) {
        const v = t.value === '' ? NaN : parseFloat(t.value);
        const i = +t.dataset.i;
        if (k === 'A') {
          const j = +t.dataset.j;
          state.A[i][j] = v;
          if (state.mirror && i !== j) {
            state.A[j][i] = v;
            const twin = panel.querySelector('input[data-k="A"][data-i="' + j + '"][data-j="' + i + '"]');
            if (twin) twin.value = t.value;
          }
        } else if (k === 'b') state.b[i] = v;
        else if (k === 'x0') state.x0[i] = Number.isNaN(v) ? 0 : v;
        state.modified = true;
      } else if (t.id === 'inTol') state.tol = parseFloat(t.value);
      else if (t.id === 'inNmax') state.nmax = parseInt(t.value, 10) || 1;
      else if (t.id === 'inOmega') state.omega = parseFloat(t.value) || 1;
      recompute();
    });
    panel.addEventListener('change', (e) => {
      const t = e.target;
      if (t.id === 'selPre') { state.precond = t.value; recompute(); }
      else if (t.id === 'chkMirror') state.mirror = t.checked;
      else if (t.id === 'selN') resize(parseInt(t.value, 10));
    });
  }

  function resize(n) {
    const old = state.n;
    const avgD = state.A.reduce((s, r, i) => s + (r[i] || 0), 0) / old || 1;
    const avgB = state.b.reduce((s, v) => s + (v || 0), 0) / old || 1;
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
      (i < old && j < old ? state.A[i][j] : i === j ? Math.round(avgD * 100) / 100 : 0)));
    state.A = A;
    state.b = Array.from({ length: n }, (_, i) => (i < old ? state.b[i] : Math.round(avgB * 100) / 100));
    state.x0 = Array.from({ length: n }, (_, i) => (i < old ? state.x0[i] : 0));
    state.n = n; state.modified = true;
    buildInputPanel();
    recompute();
  }

  // ---------- Escenarios ----------
  function loadScenario(key) {
    state = stateFromScenario(key);
    buildInputPanel();
    document.querySelectorAll('#scenarioButtons button[data-key]').forEach((b) => b.classList.toggle('active', b.dataset.key === key));
    recompute();
  }

  function buildScenarioButtons() {
    $('scenarioButtons').innerHTML = Object.values(SCENARIOS)
      .map((s) => '<button data-key="' + s.key + '">' + s.title + '</button>').join('');
    $('scenarioButtons').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-key]');
      if (b) loadScenario(b.dataset.key);
    });
  }

  // ---------- Recálculo ----------
  function compute() {
    const tolOk = Number.isFinite(state.tol) && state.tol > 0 && state.tol < 1;
    if (!tolOk) return { valid: false, issues: ['La tolerancia debe ser un número en (0, 1), p. ej. 1e-6.'] };
    return C.analyze(state.A, state.b, { tol: state.tol, nmax: state.nmax, precond: state.precond, omega: state.omega, x0: state.x0 });
  }

  function recompute() {
    try { last = compute(); }
    catch (err) { last = { valid: false, issues: ['Error numérico controlado: ' + err.message] }; }
    const banner = $('banner');
    if (!last.valid) {
      banner.hidden = false;
      banner.innerHTML = '<strong>No se puede resolver el sistema:</strong><ul>' + last.issues.map((m) => '<li>' + m + '</li>').join('') + '</ul>';
    } else banner.hidden = true;
    markBadCells();
    renderScenarioInfo();
    renderSystem();
    renderReference();
    renderGCP();
    renderErrors();
    renderMention();
  }

  function markBadCells() {
    document.querySelectorAll('#inputPanel input[data-k="A"]').forEach((el) => {
      const i = +el.dataset.i, j = +el.dataset.j;
      const bad = i !== j && state.A[i][j] !== state.A[j][i];
      el.classList.toggle('bad', bad || Number.isNaN(state.A[i][j]));
    });
  }

  function renderScenarioInfo() {
    const s = SCENARIOS[state.key];
    $('scenarioInfo').innerHTML = '<strong>' + s.title + '</strong>' + (state.modified ? ' <span class="badge no">datos modificados manualmente</span>' : '') +
      '<p>' + s.justification + '</p>' +
      '<p class="muted">σ (% anual) = [' + s.sigma.join(', ') + '] · μ (% anual) = [' + s.mu.join(', ') + '] · γ = ' + s.gamma +
      ' · Precondicionador recomendado: Jacobi (el mal condicionamiento proviene del escalamiento diagonal).</p>';
  }

  // ---------- Sección 3: formulación ----------
  function renderSystem() {
    const n = state.n;
    let eq = '';
    for (let i = 0; i < n; i++) {
      const terms = [];
      for (let j = 0; j < n; j++) terms.push(fmt(state.A[i][j], 4) + '·x' + (j + 1));
      eq += terms.join(' + ') + ' = ' + fmt(state.b[i], 4) + '\n';
    }
    $('sysEq').textContent = eq.replace(/\+ -/g, '- ');
    if (!last || !last.valid) { $('curProof').innerHTML = '<p class="muted">Sistema actual no válido.</p>'; return; }
    $('curProof').innerHTML = proofHTML(state.A, last, 'Sistema actual (con tus ediciones)');
  }

  function proofHTML(A, r, title) {
    const sym = C.isSymmetric(A).ok;
    return '<h4>' + title + '</h4>' +
      '<p>Simetría A = Aᵀ: ' + badge(sym, 'Verificada', 'Falla') + ' · Autovalores: λmín = ' + fmt(r.eig[0], 5) + ' &gt; 0, λmáx = ' + fmt(r.eig[r.eig.length - 1], 4) + ' ' + badge(r.eig[0] > 0, 'SPD', 'No SPD') + '</p>' +
      '<div class="scroll"><table><thead><tr><th class="l">Menor principal</th>' + r.minors.map((_, k) => '<th>Δ' + (k + 1) + '</th>').join('') + '</tr></thead>' +
      '<tbody><tr><td class="l">det (A[1..k]) (Sylvester: todos &gt; 0)</td>' + r.minors.map((m) => '<td>' + fmtSci(m) + '</td>').join('') + '</tr></tbody></table></div>';
  }

  function buildFormulation() {
    let h = '<div class="card"><h3 style="margin-top:0">Modelo</h3>' +
      '<p>Un inversionista distribuye su capital entre <b>n = 6 activos</b> maximizando la utilidad media-varianza de Markowitz: ' +
      '<code>máx<sub>w</sub> μᵀw − (γ/2) wᵀΣw</code>. La condición de primer orden es el sistema lineal <code>Σ w = μ/γ</code>, es decir ' +
      '<code>A = Σ</code>, <code>b = 100·μ/γ</code> (Σ en %², μ en %), <code>x = w</code>. Como Σ es una matriz de covarianzas de activos no redundantes, ' +
      'es simétrica y definida positiva, justo lo que exige el GCP. Un x<sub>i</sub> negativo equivale a una posición corta; ' +
      'valores &gt; 1 implican apalancamiento (el modelo no impone restricciones).</p>' +
      '<p class="muted">Procedencia de los datos: volatilidades, correlaciones y rendimientos son valores ilustrativos coherentes con órdenes de magnitud históricos de cada clase de activo ' +
      '(bonos ≈ 5–6 %, renta variable ≈ 10–16 %, oro ≈ 14–15 %, cripto ≫ 16 %). Σ<sub>ij</sub> = ρ<sub>ij</sub>σ<sub>i</sub>σ<sub>j</sub>.</p></div>';
    h += '<h3>Variables</h3><div class="scroll"><table><thead><tr><th>Var.</th><th class="l">Activo</th><th class="l">Significado financiero</th></tr></thead><tbody>' +
      VARIABLES.map((v, i) => '<tr><td>x' + (i + 1) + '</td><td class="l">' + v.name + '</td><td class="l">' + v.desc + '</td></tr>').join('') + '</tbody></table></div>';
    h += '<h3>Sistema Ax = b (datos actuales)</h3><div class="eq" id="sysEq"></div>' +
      '<p class="muted"><b>Interpretación:</b> a<sub>ii</sub> = σ<sub>i</sub>² es la varianza (riesgo propio) del activo i; a<sub>ij</sub> = ρ<sub>ij</sub>σ<sub>i</sub>σ<sub>j</sub> (i ≠ j) es la covarianza: ' +
      'positiva si los activos se mueven juntos (menos diversificación) y negativa si se compensan. b<sub>i</sub> es el rendimiento esperado ajustado por la aversión al riesgo γ.</p>';
    h += '<h3>Demostración de A = Aᵀ y A definida positiva</h3>' +
      '<p>Simetría: Σ<sub>ij</sub> = Cov(R<sub>i</sub>,R<sub>j</sub>) = Cov(R<sub>j</sub>,R<sub>i</sub>) = Σ<sub>ji</sub>. Definida positiva: para w ≠ 0, ' +
      'wᵀΣw = Var(wᵀR) &gt; 0 si ningún activo es combinación lineal exacta de los otros. Se comprueba numéricamente con el Criterio de Sylvester ' +
      '(todos los menores principales líderes &gt; 0) y con los autovalores (todos &gt; 0):</p>';
    h += '<div id="curProof" class="card"></div>';
    Object.values(SCENARIOS).forEach((s) => {
      const r = C.analyze(s.A, s.b, { precond: s.precond });
      h += '<details class="card"><summary>' + s.title + '</summary>' + proofHTML(s.A, r, 'Verificación en ' + s.title) + '</details>';
    });
    $('formulation').innerHTML = h;
  }

  // ---------- Sección 6: referencia ----------
  function renderReference() {
    const el = $('referenceOut');
    if (!last || !last.valid) { el.innerHTML = '<p class="muted">Corrige el sistema para ver la solución de referencia.</p>'; return; }
    const diff = Math.max(...last.xref.map((v, i) => Math.abs(v - last.xgauss[i])));
    el.innerHTML = '<p>La solución de referencia se obtiene con <b>factorización de Cholesky</b> (A = LLᵀ, forward/backward substitution); ' +
      'por la precisión de máquina se clasifica como <b>solución exacta</b>. Se contrasta con eliminación de Gauss con pivoteo parcial.</p>' +
      '<div class="scroll"><table><thead><tr><th>Var.</th><th class="l">Activo</th><th>x<sub>ref</sub> (Cholesky)</th><th>x (Gauss)</th><th>|diferencia|</th></tr></thead><tbody>' +
      last.xref.map((v, i) => '<tr><td>x' + (i + 1) + '</td><td class="l">' + varName(i) + '</td><td>' + fmt(v, 8) + '</td><td>' + fmt(last.xgauss[i], 8) + '</td><td>' + fmtSci(Math.abs(v - last.xgauss[i])) + '</td></tr>').join('') +
      '</tbody></table></div><p class="muted">Máxima diferencia Cholesky–Gauss: ' + fmtSci(diff) + ' · Residuo relativo de la referencia: ' + fmtSci(last.relResRef) + '</p>';
  }

  // ---------- Sección 7: GCP vs GC ----------
  function renderGCP() {
    const el = $('gcpOut');
    if (!last || !last.valid) { el.innerHTML = '<p class="muted">Sin resultados: el sistema no es válido.</p>'; return; }
    const r = last;
    el.innerHTML =
      '<div class="note">Algoritmo de Suñagua (2020): r₀ = b − Ax₀; M z₀ = r₀; p₀ = z₀. Para k = 0,1,…: α<sub>k</sub> = (r<sub>k</sub>·z<sub>k</sub>)/(p<sub>k</sub>·Ap<sub>k</sub>); ' +
      'x<sub>k+1</sub> = x<sub>k</sub> + α<sub>k</sub>p<sub>k</sub>; r<sub>k+1</sub> = r<sub>k</sub> − α<sub>k</sub>Ap<sub>k</sub>; M z<sub>k+1</sub> = r<sub>k+1</sub>; β<sub>k</sub> = (r<sub>k+1</sub>·z<sub>k+1</sub>)/(r<sub>k</sub>·z<sub>k</sub>); ' +
      'p<sub>k+1</sub> = z<sub>k+1</sub> + β<sub>k</sub>p<sub>k</sub>. Parada: ‖r‖₂/‖b‖₂ &lt; ' + r.tol + ' (o N<sub>máx</sub> = ' + r.nmax + ').</div>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + r.gcp.iterations + '</b><span>Iteraciones GCP (' + r.precondName + ')</span></div>' +
      '<div class="kpi"><b>' + r.gc.iterations + '</b><span>Iteraciones GC (sin precondicionar)</span></div>' +
      '<div class="kpi"><b>' + fmtSci(r.relResGCP) + '</b><span>Residuo relativo final GCP</span></div>' +
      '<div class="kpi"><b>' + (r.gcp.converged ? 'Sí' : 'No') + '</b><span>¿Convergió GCP?</span></div></div>' +
      '<table><thead><tr><th class="l">Método</th><th class="l">Vector aproximado</th><th>Iter.</th><th>Residuo final</th><th>Convergió</th></tr></thead><tbody>' +
      '<tr><td class="l">GCP</td><td class="l mono">' + fmtVec(r.gcp.x) + '</td><td>' + r.gcp.iterations + '</td><td>' + fmtSci(r.gcp.relResidual) + '</td><td class="c">' + badge(r.gcp.converged, 'Sí', 'No') + '</td></tr>' +
      '<tr><td class="l">GC</td><td class="l mono">' + fmtVec(r.gc.x) + '</td><td>' + r.gc.iterations + '</td><td>' + fmtSci(r.gc.relResidual) + '</td><td class="c">' + badge(r.gc.converged, 'Sí', 'No') + '</td></tr>' +
      '<tr><td class="l">Referencia</td><td class="l mono">' + fmtVec(r.xref) + '</td><td>—</td><td>' + fmtSci(r.relResRef) + '</td><td class="c">—</td></tr></tbody></table>' +
      '<h3>Historial del residuo relativo</h3><canvas id="chart" role="img" aria-label="Residuo relativo por iteración, GC contra GCP"></canvas>' +
      '<details><summary>Ver tabla de residuos por iteración</summary><div class="scroll"><table><thead><tr><th>k</th><th>GCP ‖r‖/‖b‖</th><th>GC ‖r‖/‖b‖</th></tr></thead><tbody>' +
      Array.from({ length: Math.max(r.gcp.history.length, r.gc.history.length) }, (_, k) =>
        '<tr><td>' + k + '</td><td>' + (r.gcp.history[k] === undefined ? '—' : fmtSci(r.gcp.history[k])) + '</td><td>' + (r.gc.history[k] === undefined ? '—' : fmtSci(r.gc.history[k])) + '</td></tr>').join('') +
      '</tbody></table></div></details>' +
      '<p class="muted">Nota: en exactitud aritmética el GC termina en a lo sumo n pasos; con n pequeño la ganancia en iteraciones es modesta, y se aprecia mejor en la reducción del número de condición y en la caída temprana del residuo.</p>';
    drawChart();
  }

  function drawChart() {
    const cv = $('chart');
    if (!cv || !last || !last.valid) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const col = (v) => cs.getPropertyValue(v).trim();
    const L = 56, R = 14, T = 14, B = 34;
    const lg = (v) => Math.log10(Math.max(v, 1e-17));
    const all = last.gcp.history.concat(last.gc.history, [last.tol]);
    const hi = Math.ceil(Math.max(...all.map(lg))), lo = Math.floor(Math.min(...all.map(lg)));
    const maxK = Math.max(last.gcp.history.length, last.gc.history.length) - 1 || 1;
    const X = (k) => L + (k / maxK) * (W - L - R), Y = (v) => T + ((hi - lg(v)) / (hi - lo || 1)) * (H - T - B);
    g.font = '12px system-ui'; g.fillStyle = col('--muted'); g.strokeStyle = col('--line'); g.lineWidth = 1;
    for (let e = lo; e <= hi; e++) {
      const y = Y(Math.pow(10, e)); g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
      g.textAlign = 'right'; g.fillText('1e' + e, L - 6, y + 4);
    }
    g.textAlign = 'center';
    for (let k = 0; k <= maxK; k += Math.max(1, Math.ceil(maxK / 10))) g.fillText(k, X(k), H - 14);
    g.fillText('iteración k', (L + W - R) / 2, H - 1);
    const line = (hist, color, dash) => {
      g.strokeStyle = color; g.lineWidth = 2; g.setLineDash(dash); g.beginPath();
      hist.forEach((v, k) => (k ? g.lineTo(X(k), Y(v)) : g.moveTo(X(k), Y(v)))); g.stroke();
      g.setLineDash([]); g.fillStyle = color;
      hist.forEach((v, k) => { g.beginPath(); g.arc(X(k), Y(v), 3, 0, 7); g.fill(); });
    };
    line(last.gc.history, col('--c2'), [6, 4]);
    line(last.gcp.history, col('--c1'), []);
    g.strokeStyle = col('--bad'); g.setLineDash([2, 3]); g.beginPath(); g.moveTo(L, Y(last.tol)); g.lineTo(W - R, Y(last.tol)); g.stroke(); g.setLineDash([]);
    g.textAlign = 'left'; g.fillStyle = col('--c1'); g.fillText('● GCP', W - R - 250, T + 30);
    g.fillStyle = col('--c2'); g.fillText('● GC simple', W - R - 196, T + 30);
    g.fillStyle = col('--bad'); g.fillText('-- tolerancia', W - R - 100, T + 30);
  }

  // ---------- Sección 8: errores ----------
  function renderErrors() {
    const el = $('errorsOut');
    if (!last || !last.valid) { el.innerHTML = '<p class="muted">Sin resultados: el sistema no es válido.</p>'; return; }
    const r = last;
    el.innerHTML =
      '<div class="scroll"><table><thead><tr><th>Var.</th><th class="l">Activo</th><th>x<sub>ref</sub></th><th>x<sub>GCP</sub></th><th>Error absoluto E<sub>a</sub></th><th>Error relativo E<sub>r</sub></th><th>Error porcentual E<sub>p</sub> (%)</th></tr></thead><tbody>' +
      r.err.map((e, i) => '<tr><td>x' + (i + 1) + '</td><td class="l">' + varName(i) + '</td><td>' + fmt(r.xref[i], 6) + '</td><td>' + fmt(r.gcp.x[i], 6) + '</td><td>' + fmtSci(e.ea) + '</td><td>' +
        (e.er === null ? 'no definido (x<sub>ref</sub> = 0)' : fmtSci(e.er)) + '</td><td>' + (e.ep === null ? 'no definido' : fmtSci(e.ep)) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + fmtSci(r.relResGCP) + '</b><span>Residuo relativo global ‖b − Ax<sub>GCP</sub>‖₂/‖b‖₂</span></div>' +
      '<div class="kpi"><b>' + fmtSci(r.condA.cond) + '</b><span>κ(A) = ‖A‖‖A⁻¹‖ (norma 2: λmáx/λmín)</span></div>' +
      '<div class="kpi"><b>' + fmtSci(r.condMA.cond) + '</b><span>κ(M⁻¹A) con ' + r.precondName + '</span></div>' +
      '<div class="kpi"><b>' + fmt(r.condA.cond / r.condMA.cond, 1) + '×</b><span>Reducción de condicionamiento</span></div></div>' +
      '<p class="muted">κ(M⁻¹A) se calcula con los autovalores de la matriz simétrica L⁻¹AL⁻ᵀ (M = LLᵀ), que coinciden con los de M⁻¹A. ' +
      'Con IC(0) sobre una A densa el patrón de relleno es completo, por lo que IC(0) equivale a Cholesky completo (κ ≈ 1, 1 iteración).</p>' +
      '<p>Cota teórica del error: ‖x − x<sub>GCP</sub>‖/‖x‖ ≤ κ(A)·‖r‖/‖b‖ = <b>' + fmtSci(r.condA.cond * r.relResGCP) + '</b>.</p>';
  }

  // ---------- Aporte de la mención (ciencia de datos: correlaciones + sensibilidad) ----------
  function renderMention() {
    const el = $('mentionOut');
    if (!last || !last.valid) { el.innerHTML = '<p class="muted">Sin resultados.</p>'; return; }
    const n = state.n, A = state.A;
    let h = '<p>Matriz de correlaciones estimada a partir de A: ρ<sub>ij</sub> = a<sub>ij</sub>/√(a<sub>ii</sub>a<sub>jj</sub>). Correlaciones altas (≥ 0,7) indican fuerte acoplamiento fuera de la diagonal; ahí Jacobi ayuda poco y conviene SSOR o IC(0).</p>' +
      '<div class="scroll"><table class="heat"><thead><tr><th></th>' + Array.from({ length: n }, (_, j) => '<th>x' + (j + 1) + '</th>').join('') + '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
      h += '<tr><th>x' + (i + 1) + '</th>';
      for (let j = 0; j < n; j++) {
        const rho = A[i][j] / Math.sqrt(A[i][i] * A[j][j]);
        const a = Math.min(1, Math.abs(rho));
        const c = rho >= 0 ? 'var(--c1)' : 'var(--c2)';
        h += '<td style="background:color-mix(in srgb,' + c + ' ' + Math.round(a * 55) + '%,transparent)">' + rho.toFixed(2) + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table></div>';
    const db = state.b.map((v) => 0.01 * v);
    const b2 = state.b.map((v, i) => v + db[i]);
    const x2 = C.solveCholesky(A, b2);
    const dx = C.norm2(x2.map((v, i) => v - last.xref[i])) / C.norm2(last.xref);
    const bound = last.condA.cond * 0.01;
    h += '<h4>Sensibilidad ante un error de 1 % en los rendimientos esperados (b)</h4>' +
      '<p>Variación relativa de la solución: <b>' + fmtSci(dx) + '</b> frente a la cota κ(A)·‖δb‖/‖b‖ = <b>' + fmtSci(bound) + '</b>. ' +
      (dx > 0.05 ? 'La cartera óptima es muy sensible a errores de estimación: típico de sistemas mal condicionados.' : 'La cartera óptima es estable frente a errores de estimación de μ.') + '</p>';
    el.innerHTML = h;
  }

  // ---------- Tabla comparativa de los tres escenarios ----------
  let presetResults = null;
  function buildCompare() {
    presetResults = Object.values(SCENARIOS).map((s) => ({ s, r: C.analyze(s.A, s.b, { precond: s.precond, tol: 1e-6 }) }));
    const cols = presetResults;
    const row = (label, f) => '<tr><td class="l"><b>' + label + '</b></td>' + cols.map((c) => '<td class="l">' + f(c.r, c.s) + '</td>').join('') + '</tr>';
    $('compareTable').innerHTML = '<table><thead><tr><th class="l">Indicador</th>' + cols.map((c) => '<th>' + c.s.title.replace('Escenario ', 'Esc. ') + '</th>').join('') + '</tr></thead><tbody>' +
      row('Solución de referencia', (r) => '<span class="mono">' + fmtVec(r.xref, 4) + '</span>') +
      row('Solución GCP', (r) => '<span class="mono">' + fmtVec(r.gcp.x, 4) + '</span>') +
      row('Error absoluto E<sub>a</sub> (por variable)', (r) => '<span class="mono">[' + r.err.map((e) => fmtSci(e.ea)).join(', ') + ']</span>') +
      row('Error porcentual E<sub>p</sub> (por variable)', (r) => '<span class="mono">[' + r.err.map((e) => (e.ep === null ? 'n/d' : fmtSci(e.ep))).join(', ') + ']</span>') +
      row('Iteraciones GC (sin precondicionar)', (r) => r.gc.iterations) +
      row('Iteraciones GCP (' + 'Jacobi' + ')', (r) => r.gcp.iterations) +
      row('Número de condición κ(A)', (r) => fmtSci(r.condA.cond)) +
      row('Número de condición κ(M⁻¹A)', (r) => fmtSci(r.condMA.cond)) +
      row('Residuo relativo final GCP', (r) => fmtSci(r.relResGCP)) +
      row('¿Convergió el algoritmo?', (r) => badge(r.gcp.converged, 'Sí', 'No')) +
      row('Interpretación financiera', (r, s) => s.interpretation) +
      '</tbody></table>';
  }

  // ---------- Sección 9: QA ----------
  function snapshot() { return deep(state); }
  function restore(snap) {
    state = snap;
    buildInputPanel();
    document.querySelectorAll('#scenarioButtons button[data-key]').forEach((b) => b.classList.toggle('active', b.dataset.key === state.key));
    recompute();
  }
  function typeInto(sel, value) {
    const el = document.querySelector(sel);
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function runQA() {
    const rows = [];
    const add = (name, input, expected, obtained, pass) => rows.push({ name, input, expected, obtained, pass });
    const snap = snapshot();
    const safe = (fn) => { try { fn(); } catch (e) { add('Error inesperado', '—', 'Sin excepciones', 'Excepción: ' + e.message, false); } };

    // 1. Carga de escenarios (a través de la UI)
    safe(() => {
      Object.values(SCENARIOS).forEach((s) => {
        loadScenario(s.key);
        const r = last;
        const bound = r.valid ? r.condA.cond * r.tol : 0;
        const nrm = r.valid ? C.norm2(r.err.map((e) => e.ea)) / C.norm2(r.xref) : NaN;
        add('1. Carga de escenarios', 'Clic en «' + s.title + '»', 'Sistema SPD válido, GCP converge, ‖e‖/‖x‖ ≤ κ(A)·tol',
          r.valid ? 'Convergió en ' + r.gcp.iterations + ' it.; ‖e‖/‖x‖ = ' + fmtSci(nrm) + ' ≤ ' + fmtSci(bound) : 'Inválido', r.valid && r.gcp.converged && nrm <= bound);
      });
    });

    // 2. Matriz no válida (a través de la UI)
    safe(() => {
      loadScenario('ideal');
      typeInto('input[data-k="A"][data-i="0"][data-j="1"]', 99);
      const b1 = !$('banner').hidden && !last.valid;
      add('2. Matriz no válida (no simétrica)', 'a₁₂ = 99 con a₂₁ sin cambiar', 'Aviso en pantalla, sin cálculo ni caída', b1 ? 'Aviso mostrado: «' + last.issues[0] + '»' : 'No se detectó', b1);
      loadScenario('ideal');
      typeInto('input[data-k="A"][data-i="0"][data-j="0"]', -5);
      const b2 = !$('banner').hidden && !last.valid;
      add('2. Matriz no válida (no definida positiva)', 'a₁₁ = −5 (A sigue simétrica)', 'Aviso «no definida positiva», sin caída', b2 ? 'Aviso mostrado: «' + last.issues[0] + '»' : 'No se detectó', b2);
      loadScenario('ideal');
      typeInto('input[data-k="b"][data-i="0"]', '');
      const b3 = !$('banner').hidden && !last.valid;
      add('2. Entrada vacía', 'b₁ vacío', 'Aviso de entrada no numérica', b3 ? 'Aviso mostrado: «' + last.issues[0] + '»' : 'No se detectó', b3);
    });

    // 3. Edición dinámica
    safe(() => {
      loadScenario('ideal');
      const before = last.xref.slice();
      typeInto('input[data-k="A"][data-i="2"][data-j="2"]', 150);
      const gauss = C.solveGauss(state.A, state.b);
      const moved = Math.abs(last.xref[2] - before[2]) > 1e-6;
      const agree = last.valid && Math.max(...last.xref.map((v, i) => Math.abs(v - gauss[i]))) < 1e-10 && last.gcp.converged && last.relResGCP < 1e-6;
      add('3. Edición dinámica', 'a₃₃: 100 → 150', 'x_ref cambia, coincide con Gauss; GCP y errores se recalculan',
        'x₃ref: ' + fmt(before[2], 5) + ' → ' + fmt(last.xref[2], 5) + '; residuo GCP ' + fmtSci(last.relResGCP), moved && agree);
      typeInto('input[data-k="b"][data-i="1"]', 31);
      const g2 = C.solveGauss(state.A, state.b);
      const ok2 = Math.max(...last.xref.map((v, i) => Math.abs(v - g2[i]))) < 1e-10 && last.gcp.converged;
      add('3. Edición dinámica', 'b₂: 30 → 31', 'Recalcula referencia, GCP y errores sin recargar', 'x_ref = ' + fmtVec(last.xref, 4), ok2);
    });

    // 4. Comparativa de precondicionamiento
    safe(() => {
      loadScenario('ill');
      const r = last;
      add('4. Comparativa de precondicionamiento', 'Escenario 3, Jacobi, tol 1e-6', 'It(GCP) ≤ It(GC) y κ(M⁻¹A) < κ(A)',
        'GCP: ' + r.gcp.iterations + ' it. · GC: ' + r.gc.iterations + ' it. · κ ' + fmtSci(r.condA.cond) + ' → ' + fmtSci(r.condMA.cond),
        r.gcp.converged && r.gcp.iterations <= r.gc.iterations && r.condMA.cond < r.condA.cond);
    });

    // Pruebas adicionales
    safe(() => {
      const s = SCENARIOS.stress;
      const xc = C.solveCholesky(s.A, s.b), xg = C.solveGauss(s.A, s.b);
      const d = Math.max(...xc.map((v, i) => Math.abs(v - xg[i])));
      add('5. Cholesky vs Gauss', 'Escenario 2', 'Diferencia < 1e-10', 'Máx. diferencia = ' + fmtSci(d), d < 1e-10);
      const r = C.analyze(s.A, s.b, { precond: 'jacobi', x0: [1, 1, 1, 1, 1, 1] });
      add('6. Vector inicial no nulo', 'x₀ = (1,…,1), Escenario 2', 'Converge a la misma solución', 'Iteraciones: ' + r.gcp.iterations + '; residuo ' + fmtSci(r.relResGCP), r.gcp.converged && r.relResGCP < 1e-6);
      const bad = C.validate(s.A, new Array(6).fill(0));
      add('7. b = 0', 'b = (0,…,0)', 'Se rechaza (‖r‖/‖b‖ no definido)', bad.ok ? 'Aceptado' : bad.issues[0], !bad.ok);
      const small = C.validate([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 1, 1]);
      add('8. n < 4', 'Sistema 3×3', 'Se rechaza (n ≥ 4)', small.ok ? 'Aceptado' : small.issues[0], !small.ok);
      const ic = C.analyze(s.A, s.b, { precond: 'ic0' });
      add('9. Precondicionadores alternativos', 'IC(0) en Escenario 2', 'Converge y κ(M⁻¹A) ≤ κ Jacobi', 'It = ' + ic.gcp.iterations + ', κ(M⁻¹A) = ' + fmtSci(ic.condMA.cond), ic.gcp.converged && ic.condMA.cond <= presetResults[1].r.condMA.cond * 1.0001);
    });

    restore(snap);
    const ok = rows.filter((r) => r.pass).length;
    $('qaOut').innerHTML = '<p><b>' + ok + ' de ' + rows.length + ' pruebas superadas.</b> ' + badge(ok === rows.length, 'TODO OK', 'HAY FALLOS') + '</p>' +
      '<table><thead><tr><th>#</th><th class="l">Prueba</th><th class="l">Entrada</th><th class="l">Resultado esperado</th><th class="l">Resultado obtenido</th><th>Conclusión</th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr><td>' + (i + 1) + '</td><td class="l">' + r.name + '</td><td class="l">' + r.input + '</td><td class="l">' + r.expected + '</td><td class="l">' + r.obtained + '</td><td class="c">' + badge(r.pass, 'Aprobada', 'Fallida') + '</td></tr>').join('') +
      '</tbody></table>';
    return rows;
  }

  // ---------- Inicio, caso y conclusiones ----------
  function buildStatic() {
    $('caseText').innerHTML =
      '<div class="card"><p><b>Problema.</b> Un inversionista debe repartir capital entre seis clases de activos con distinto riesgo y rendimiento. ' +
      'El modelo media-varianza conduce a un sistema lineal simétrico definido positivo. Se estudia cómo se comporta el GCP cuando el mercado es estable, ' +
      'cuando entra en crisis y cuando los activos tienen escalas de riesgo muy dispares.</p>' +
      '<p><b>Por qué un método iterativo.</b> Con carteras de cientos de activos Σ es grande y a menudo mal condicionada; los métodos iterativos precondicionados escalan mejor que la factorización directa y permiten parar al alcanzar la tolerancia.</p></div>';
    $('conclusions').innerHTML = '<div id="concDyn" class="card"></div>' +
      '<h3>Referencias</h3><ul>' +
      '<li>Suñagua S., P. (2020). Método de Gradientes Conjugados Precondicionado. <i>Revista Boliviana de Matemática</i>, UMSA, 04, 2–7.</li>' +
      '<li>Golub, G. H., &amp; Van Loan, C. F. (2013). <i>Matrix Computations</i> (4th ed.). Johns Hopkins University Press.</li>' +
      '<li>Saad, Y. (2003). <i>Iterative Methods for Sparse Linear Systems</i> (2nd ed.). SIAM.</li>' +
      '<li>Markowitz, H. (1952). Portfolio Selection. <i>The Journal of Finance</i>, 7(1), 77–91.</li></ul>';
  }

  function renderConclusions() {
    const [a, b, c] = presetResults.map((p) => p.r);
    $('concDyn').innerHTML = '<ul>' +
      '<li><b>Exactitud.</b> En los tres escenarios el GCP converge con residuo relativo final ≤ ' + fmtSci(Math.max(a.relResGCP, b.relResGCP, c.relResGCP)) + ' y coincide con la solución de Cholesky.</li>' +
      '<li><b>Condicionamiento.</b> κ(A) pasa de ' + fmtSci(a.condA.cond) + ' (ideal) a ' + fmtSci(b.condA.cond) + ' (estrés) y ' + fmtSci(c.condA.cond) + ' (mal condicionado). ' +
      'El estrés sobre todo desplaza el equilibrio (la cartera se concentra en el activo refugio); el mal escalamiento sí deteriora la estabilidad numérica.</li>' +
      '<li><b>Precondicionamiento.</b> En el escenario 3 Jacobi reduce κ de ' + fmtSci(c.condA.cond) + ' a ' + fmtSci(c.condMA.cond) + ' y el GCP usa ' + c.gcp.iterations + ' iteraciones frente a ' + c.gc.iterations + ' del GC. ' +
      'La ganancia en iteraciones es acotada porque n = 6 limita al GC a ≤ n pasos; en problemas grandes la diferencia crece con √κ.</li>' +
      '<li><b>Lectura financiera.</b> Un Σ mal escalado o muy correlacionado hace que pequeños errores en μ muevan mucho la cartera óptima; conviene regularizar o restringir pesos en la práctica.</li>' +
      '<li><b>Limitaciones.</b> Datos ilustrativos, sin restricciones de largo plazo ni costos de transacción; IC(0) sobre A densa equivale a Cholesky completo.</li></ul>';
  }

  function setupHome() {
    const nameEl = $('studentName'), menEl = $('studentMencion');
    try { nameEl.value = localStorage.getItem('gcp_name') || nameEl.value; menEl.value = localStorage.getItem('gcp_men') || menEl.value; } catch (e) { /* sin almacenamiento */ }
    nameEl.addEventListener('input', () => { try { localStorage.setItem('gcp_name', nameEl.value); } catch (e) { /* ignorar */ } });
    menEl.addEventListener('change', () => { try { localStorage.setItem('gcp_men', menEl.value); } catch (e) { /* ignorar */ } });
    $('homeSummary').innerHTML = '<b>Síntesis.</b> Se resuelve <code>Σw = μ/γ</code> (n = 6, tolerancia 10⁻⁶) con Cholesky como referencia y se compara el ' +
      'Gradiente Conjugado Precondicionado con el simple en tres escenarios: <b>Ideal</b>, <b>Bajo estrés</b> y <b>Mal condicionado</b>. ' +
      'Edita los datos en la sección 4 o carga un escenario en la sección 5; todo se recalcula en vivo.';
  }

  function setupNavHighlight() {
    const links = [...document.querySelectorAll('#nav a')];
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section').forEach((s) => io.observe(s));
  }

  // ---------- Arranque ----------
  function init() {
    setupHome();
    buildStatic();
    buildScenarioButtons();
    buildFormulation();
    buildCompare();
    renderConclusions();
    setupInputEvents();
    loadScenario('ideal');
    $('runQA').addEventListener('click', runQA);
    runQA();
    setupNavHighlight();
    window.addEventListener('resize', drawChart);
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawChart);
  }
  init();
})();
