# Gradientes Conjugados Precondicionado en finanzas

Desafío académico de Métodos Numéricos (UMSA · Informática). Página web interactiva que resuelve un problema de
cartera de inversión media-varianza como sistema simétrico definido positivo `Ax = b` (n = 6) con el algoritmo de
Gradientes Conjugados Precondicionado (Suñagua, 2020), comparándolo con GC simple y con un método directo.

## Modelo

`máx μᵀw − (γ/2) wᵀΣw  ⇒  Σw = μ/γ`, con `A = Σ` (covarianzas en %²), `b = 100·μ/γ`, `x = w` (fracción del capital por activo).
Tres escenarios con las mismas variables: **Ideal**, **Bajo estrés** (σ y ρ suben, μ baja) y **Mal condicionado**
(varianzas que difieren en 5 órdenes de magnitud → precondicionador de Jacobi).

## Estructura

```
index.html        Página (10 secciones del enunciado)
css/style.css     Estilos (modo claro/oscuro)
js/core.js        Núcleo numérico: Cholesky, Gauss, GC, GCP, Jacobi/SSOR/IC(0), κ, errores, validación
js/scenarios.js   Variables y datos de los tres escenarios
js/app.js         Interfaz reactiva, gráfico, tabla comparativa y módulo QA
tests/core.test.js  Pruebas del núcleo con Node
serve.js          Servidor estático local opcional
```

## Ejecución local

No requiere instalación ni dependencias. Opciones:

```bash
node serve.js
```

y abrir <http://localhost:5173>, o simplemente abrir `index.html` en el navegador.

Pruebas del núcleo:

```bash
node tests/core.test.js
```

El módulo QA (sección 9 de la página) ejecuta además las pruebas obligatorias contra la interfaz real.

## Publicación (GitHub Pages)

Sube la carpeta a un repositorio público → *Settings → Pages → Deploy from branch → main / root*.

## Referencias

- Suñagua S., P. (2020). Método de Gradientes Conjugados Precondicionado. *Revista Boliviana de Matemática*, UMSA, 04, 2–7.
- Golub & Van Loan (2013). *Matrix Computations*, 4.ª ed. · Saad (2003). *Iterative Methods for Sparse Linear Systems*, 2.ª ed.
