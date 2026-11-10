# Estudio ISW

Juego de estudio de Ingeniería de Software (10 módulos, modo mundo abierto con mentores, villanos y poderes).
Un solo archivo HTML autocontenido: `juego_estudio.html`. Ábrelo en el navegador.

## Stack
- HTML + CSS + JavaScript vanilla (sin frameworks), canvas 2D con pixel art generado por código, SVG
- Progreso en `localStorage`
- Build/validación: Node (ESM) — `build.mjs`, `validate.mjs`
- Tests: jsdom (`tests/`)

## Estructura
- `engine.html` motor; `content*.mjs` contenido por módulo; `contracts/` especificaciones
- `node build.mjs` genera `juego_estudio.html`; `node validate.mjs` valida
- `cd tests && npm i && node smoke.cjs`
