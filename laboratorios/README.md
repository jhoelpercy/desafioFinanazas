# Laboratorios de Métodos Numéricos

Estudiante: González Herrera Jhoel Percy. Mención: Ingeniería de Sistemas.

## Ejecutar localmente

Requisitos: Node.js 18 o posterior. Sin dependencias de npm.

```sh
npm test
npm start
```

Abrir http://127.0.0.1:8765 . No abrir los HTML como archivos porque usan módulos ES.

## Estructura

- `dist/cohete/`: Euler, Heun, RK4, solución analítica, gráficos, tablas y exportación CSV.
- `dist/finanzas/`: Cholesky, GC, GCP con Jacobi, tres escenarios y validaciones.
- `dist/core.js`: cálculo numérico independiente de la interfaz.
- `dist/ui.js`: tablas, formatos y gráficos SVG.
- `tests.mjs`: 16 comprobaciones reproducibles; exporta cálculos y resultados.
- `serve.mjs`: servidor estático local.

## Modelo financiero

Minimizar 1/2 sum(q_i (x_i-d_i)^2) + 1/2 sum(w_ij (x_i-x_j)^2).
Su condición de primer orden es (Q+L)x=Qd. Las cuatro variables son presupuestos
trimestrales en miles de Bs para Infraestructura, Desarrollo, Operaciones y Seguridad.
Se usa un ciclo de cuatro relaciones entre unidades. q>0 y w>=0 garantizan SPD.
Las matrices y solicitudes son datos ficticios, no información de una organización real.
Los escenarios modifican q, d y w de forma documentada en la interfaz.

Jacobi resuelve Mz=r con M=diag(A). CG y PCG comprueban el residuo real relativo.
Cholesky produce una referencia numérica. La condición 2 de M^-1 A se calcula por
valores singulares, no por el cociente de autovalores de una matriz no simétrica.
El techo de 200 mil Bs es un control posterior: no una restricción incluida en J.
Se validan entradas finitas, simetría, SPD, tolerancia y límite de iteraciones.

## Cohete

m v'=T-mg-cv y z'=v. Masa, empuje, gravedad y resistencia lineal constantes.
Euler actualiza ambas variables con el estado anterior. El último paso se acorta
para alcanzar el extremo. Se compara contra solución analítica y se maneja c=0.
La simulación es didáctica; no modela combustible, órbitas ni impactos con el suelo.

## Referencias

Suñagua, P. (2020). Método de Gradientes Conjugados Precondicionado.
Revista Boliviana de Matemática - UMSA, 04, 2-7.
https://cmat.umsa.bo/revmat/rbm4/psunagua_gcp.pdf

Consigna del cohete: https://chatgpt.com/share/6af31905-d5ec-83ea-ab3d-6f97975acffe

## Autoría y revisión

Proyecto preparado con apoyo de Codex en programación, redacción y comprobación.
El estudiante debe revisar y comprender el código y los resultados antes de entregarlo.
Los archivos y enlaces no se envían a Classroom automáticamente.
