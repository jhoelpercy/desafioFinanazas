/* Núcleo numérico: GC, GCP (Suñagua, 2020), método directo, condicionamiento.
 * Sin dependencias. Funciona en el navegador (window.Core) y en Node (module.exports). */
(function (root) {
  'use strict';

  // ---------- Álgebra lineal básica ----------
  const dot = (u, v) => { let s = 0; for (let i = 0; i < u.length; i++) s += u[i] * v[i]; return s; };
  const norm2 = (u) => Math.sqrt(dot(u, u));
  const matVec = (A, x) => A.map((row) => dot(row, x));
  const zeros = (n) => new Array(n).fill(0);
  const copyM = (A) => A.map((r) => r.slice());
  const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  // ---------- Validación: cuadrada, simétrica, definida positiva ----------
  function isSymmetric(A, tol) {
    tol = tol === undefined ? 1e-10 : tol;
    const n = A.length;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const scale = Math.max(1, Math.abs(A[i][j]), Math.abs(A[j][i]));
        if (Math.abs(A[i][j] - A[j][i]) > tol * scale) return { ok: false, i, j };
      }
    return { ok: true };
  }

  // Determinante por eliminación (para menores principales, Criterio de Sylvester)
  function det(M) {
    const n = M.length, A = copyM(M);
    let d = 1;
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[p][k])) p = i;
      if (A[p][k] === 0) return 0;
      if (p !== k) { [A[p], A[k]] = [A[k], A[p]]; d = -d; }
      d *= A[k][k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / A[k][k];
        for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      }
    }
    return d;
  }

  function leadingMinors(A) {
    const out = [];
    for (let k = 1; k <= A.length; k++) out.push(det(A.slice(0, k).map((r) => r.slice(0, k))));
    return out;
  }

  // Cholesky A = L L^T. Devuelve null si A no es definida positiva.
  function cholesky(A) {
    const n = A.length, L = Array.from({ length: n }, () => zeros(n));
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) {
        let s = A[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) {
          if (!(s > 0)) return null;
          L[i][i] = Math.sqrt(s);
        } else L[i][j] = s / L[j][j];
      }
    return L;
  }

  function forwardSolve(L, b) {
    const n = b.length, y = zeros(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
      y[i] = s / L[i][i];
    }
    return y;
  }
  function backwardSolveT(L, y) { // resuelve L^T x = y
    const n = y.length, x = zeros(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
      x[i] = s / L[i][i];
    }
    return x;
  }

  // Método directo 1: Cholesky
  function solveCholesky(A, b) {
    const L = cholesky(A);
    if (!L) throw new Error('A no es definida positiva (Cholesky falló).');
    return backwardSolveT(L, forwardSolve(L, b));
  }

  // Método directo 2: Eliminación de Gauss con pivoteo parcial (contraste)
  function solveGauss(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      if (Math.abs(M[p][k]) < 1e-300) throw new Error('Matriz singular.');
      [M[p], M[k]] = [M[k], M[p]];
      for (let i = k + 1; i < n; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    const x = zeros(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = M[i][n];
      for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  // ---------- Autovalores (Jacobi cíclico para matrices simétricas) ----------
  function eigenSym(S) {
    const n = S.length, A = copyM(S);
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-30) break;
      for (let p = 0; p < n - 1; p++)
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
          }
        }
    }
    return A.map((r, i) => r[i]).sort((a, b) => a - b);
  }

  // ---------- Precondicionadores ----------
  // Cada uno devuelve { name, apply(r) -> z = M^{-1} r, L (factor tal que M = L L^T) }
  function buildPreconditioner(A, kind, omega) {
    const n = A.length;
    if (kind === 'none') {
      return { name: 'Sin precondicionar (M = I)', apply: (r) => r.slice(), L: identity(n) };
    }
    if (kind === 'jacobi') {
      const d = A.map((r, i) => r[i]);
      const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? Math.sqrt(d[i]) : 0)));
      return { name: 'Jacobi (M = diag(A))', apply: (r) => r.map((v, i) => v / d[i]), L };
    }
    if (kind === 'ic0') {
      // IC(0): Cholesky restringido al patrón de A (si A es densa, coincide con Cholesky completo)
      const L = Array.from({ length: n }, () => zeros(n));
      for (let i = 0; i < n; i++)
        for (let j = 0; j <= i; j++) {
          if (A[i][j] === 0 && i !== j) continue;
          let s = A[i][j];
          for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
          if (i === j) {
            if (!(s > 0)) throw new Error('IC(0) falló: pivote no positivo.');
            L[i][i] = Math.sqrt(s);
          } else L[i][j] = s / L[j][j];
        }
      return { name: 'Cholesky Incompleto IC(0)', apply: (r) => backwardSolveT(L, forwardSolve(L, r)), L };
    }
    if (kind === 'ssor') {
      // SSOR: M = 1/(w(2-w)) (D + wL) D^{-1} (D + wL)^T
      const w = omega || 1;
      const d = A.map((r, i) => r[i]);
      const c = 1 / Math.sqrt(w * (2 - w));
      // L_M = c (D + wL) D^{-1/2}
      const L = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (j > i ? 0 : c * (i === j ? d[i] : w * A[i][j]) / Math.sqrt(d[j]))));
      return { name: 'SSOR (ω = ' + w + ')', apply: (r) => backwardSolveT(L, forwardSolve(L, r)), L };
    }
    throw new Error('Precondicionador desconocido: ' + kind);
  }

  function inverseLower(L) {
    const n = L.length, X = Array.from({ length: n }, () => zeros(n));
    for (let c = 0; c < n; c++) {
      const e = zeros(n); e[c] = 1;
      const col = forwardSolve(L, e);
      for (let r = 0; r < n; r++) X[r][c] = col[r];
    }
    return X;
  }

  // Número de condición espectral de M^{-1}A (≡ L^{-1} A L^{-T}, simétrica con los mismos autovalores)
  function condPrecond(A, P) {
    const n = A.length, Li = inverseLower(P.L);
    const LA = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => { let s = 0; for (let k = 0; k < n; k++) s += Li[i][k] * A[k][j]; return s; }));
    const B = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => { let s = 0; for (let k = 0; k < n; k++) s += LA[i][k] * Li[j][k]; return s; }));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const m = (B[i][j] + B[j][i]) / 2; B[i][j] = B[j][i] = m; }
    const ev = eigenSym(B);
    return { cond: ev[n - 1] / ev[0], lmin: ev[0], lmax: ev[n - 1], eig: ev };
  }
  function condA(A) {
    const ev = eigenSym(A);
    return { cond: ev[ev.length - 1] / ev[0], lmin: ev[0], lmax: ev[ev.length - 1], eig: ev };
  }

  // ---------- Gradientes Conjugados Precondicionado (Suñagua, 2020) ----------
  // r0 = b - A x0;  M z0 = r0;  p0 = z0
  // alpha_k = (r_k·z_k)/(p_k·A p_k);  x_{k+1} = x_k + alpha_k p_k;  r_{k+1} = r_k - alpha_k A p_k
  // M z_{k+1} = r_{k+1};  beta_k = (r_{k+1}·z_{k+1})/(r_k·z_k);  p_{k+1} = z_{k+1} + beta_k p_k
  function pcg(A, b, opts) {
    opts = opts || {};
    const n = b.length;
    const tol = opts.tol === undefined ? 1e-6 : opts.tol;
    const nmax = opts.nmax || 1000;
    const P = opts.precond || buildPreconditioner(A, 'none');
    let x = opts.x0 ? opts.x0.slice() : zeros(n);
    const nb = norm2(b);
    const Ax0 = matVec(A, x);
    let r = b.map((v, i) => v - Ax0[i]);
    const history = [norm2(r) / nb];
    let k = 0, converged = history[0] < tol;
    let z = P.apply(r), p = z.slice(), rz = dot(r, z);
    while (!converged && k < nmax) {
      const Ap = matVec(A, p);
      const pAp = dot(p, Ap);
      if (!(pAp > 0)) break; // pérdida de definición positiva numérica
      const alpha = rz / pAp;
      for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; }
      k++;
      const rel = norm2(r) / nb;
      history.push(rel);
      if (rel < tol) { converged = true; break; }
      z = P.apply(r);
      const rzNew = dot(r, z);
      const beta = rzNew / rz;
      for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
      rz = rzNew;
    }
    return { x, iterations: k, converged, history, relResidual: history[history.length - 1] };
  }

  // GC simple = PCG con M = I
  function cg(A, b, opts) {
    return pcg(A, b, Object.assign({}, opts, { precond: buildPreconditioner(A, 'none') }));
  }

  // ---------- Errores por componente ----------
  function errors(xref, xapp) {
    return xref.map((xr, i) => {
      const ea = Math.abs(xr - xapp[i]);
      const defined = xr !== 0;
      const er = defined ? ea / Math.abs(xr) : null;
      return { ea, er, ep: defined ? er * 100 : null };
    });
  }
  function relResidual(A, b, x) {
    const Ax = matVec(A, x);
    return norm2(b.map((v, i) => v - Ax[i])) / norm2(b);
  }

  // ---------- Validación completa de un sistema Ax = b ----------
  function validate(A, b) {
    const issues = [];
    const n = A.length;
    if (n < 4) issues.push('Se requiere n ≥ 4 (se recibió n = ' + n + ').');
    if (A.some((r) => r.length !== n)) issues.push('A no es cuadrada.');
    if (A.some((r) => r.some((v) => !Number.isFinite(v))) || b.some((v) => !Number.isFinite(v)))
      issues.push('Hay entradas vacías o no numéricas en A o b.');
    if (b.length !== n) issues.push('b debe tener n componentes.');
    if (issues.length) return { ok: false, issues };
    if (norm2(b) === 0) issues.push('b = 0: el residuo relativo ‖r‖/‖b‖ no está definido.');
    const sym = isSymmetric(A);
    if (!sym.ok) issues.push('A no es simétrica: a[' + (sym.i + 1) + '][' + (sym.j + 1) + '] ≠ a[' + (sym.j + 1) + '][' + (sym.i + 1) + '].');
    if (sym.ok && !cholesky(A)) issues.push('A no es definida positiva (existe un menor principal o autovalor ≤ 0).');
    return { ok: issues.length === 0, issues };
  }

  // ---------- Análisis completo de un escenario ----------
  function analyze(A, b, cfg) {
    cfg = cfg || {};
    const tol = cfg.tol === undefined ? 1e-6 : cfg.tol;
    const nmax = cfg.nmax || 1000;
    const kind = cfg.precond || 'jacobi';
    const v = validate(A, b);
    if (!v.ok) return { valid: false, issues: v.issues };
    const n = b.length;
    const x0 = cfg.x0 && cfg.x0.length === n ? cfg.x0 : zeros(n);
    const P = buildPreconditioner(A, kind, cfg.omega);
    const xref = solveCholesky(A, b);
    const xgauss = solveGauss(A, b);
    const gcp = pcg(A, b, { tol, nmax, x0, precond: P });
    const gc = cg(A, b, { tol, nmax, x0 });
    const cA = condA(A), cM = condPrecond(A, P);
    return {
      valid: true, n, tol, nmax, kind, precondName: P.name,
      xref, xgauss, gcp, gc,
      err: errors(xref, gcp.x),
      relResGCP: relResidual(A, b, gcp.x),
      relResRef: relResidual(A, b, xref),
      condA: cA, condMA: cM,
      minors: leadingMinors(A),
      eig: cA.eig,
    };
  }

  const Core = {
    dot, norm2, matVec, identity, isSymmetric, det, leadingMinors, cholesky,
    solveCholesky, solveGauss, eigenSym, buildPreconditioner, condA, condPrecond,
    pcg, cg, errors, relResidual, validate, analyze,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
