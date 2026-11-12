# Estudio ISW

Juego de estudio de Ingeniería de Software (10 módulos, modo mundo abierto con mentores, villanos y poderes).
Un solo archivo HTML autocontenido: `juego_estudio.html`. Ábrelo en el navegador.

## Stack
- HTML + CSS + JavaScript vanilla (sin frameworks), canvas 2D con pixel art generado por código, SVG
- Progreso en `localStorage`
- Build/validación: Node (ESM) — `build.mjs`, `validate.mjs`
- Tests: jsdom (`tests/`); pruebas adversariales, de propiedades y fuzzing en `tests/adv/`
- Viaje 3D (M08): Three.js r169 en `vendor/`, incrustado como texto inerte y cargado solo al entrar

## Estructura
- `engine.html` motor; `content*.mjs` contenido por módulo; `contracts/` especificaciones
- `node build.mjs` genera `juego_estudio.html`; `node validate.mjs` valida
- `cd tests && npm i && node smoke.cjs`

## Viaje 3D "Viaja como paquete" (M08 Redes)
Modo nuevo dentro de M08: botón "Viaja como paquete". Recorres 10 estaciones (capas, router, internet, servidor) como un paquete, con estética de holograma técnico.
Las preguntas salen del banco de M08 y suman estrellas, repaso y XP igual que una ronda; no sustituye al jefe ni a las rondas.
- `trip/stations.mjs` datos · `trip/flow.js` lógica sin 3D · `trip/scene.js` escena Three.js
- Pruebas: `node tests/trip.cjs`, `node tests/trip_engine.cjs`, `node tests/scene.cjs`, `node tests/build_vendor.cjs`
- Para Netlify, `_headers` trae una CSP compatible con el `import()` desde `blob:`.
- Diseño y plan: `docs/superpowers/specs/` y `docs/superpowers/plans/`
