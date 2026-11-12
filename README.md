# Estudio ISW

Juego de estudio de Ingeniería de Software (10 módulos, Ciudad Núcleo en 3D con mentores, criaturas y poderes).
Un solo archivo HTML autocontenido: `juego_estudio.html`. Ábrelo en el navegador.

## Stack
- HTML + CSS + JavaScript vanilla (sin frameworks), SVG y Three.js (sin imágenes externas)
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

## Ciudad Núcleo (mundo abierto 3D, capítulo 1: Taller Comunal / M02)
Desde Inicio, "Entrar a la ciudad". Tu héroe recorre la ciudad en tercera persona: aprende con 23 mentores, se pone a prueba contra 6 criaturas de La Maraña (batallas por preguntas) y 10 retos de campo, y enseña a 12 aprendices. Con 8 aprendices enseñados y el jefe de M02 aprobado se restaura el distrito (poder Planos, rango Junior). Todo suma estrellas, repaso y XP como una ronda normal.
- Teléfono siempre en vertical (aparece un aviso si lo giras) y laptop en horizontal. Controles: joystick (cuarto inferior izquierdo) y arrastre para la cámara; en laptop WASD, Q/Z, E o Enter y Esc.
- `?fps=1` en la URL muestra fps, draw calls y triángulos.
- `city/districts.mjs` datos (se escriben como `CITY_DATA`) · `city/move.js` movimiento y colisión · `city/story.js` guardado, restauración y objetivo · `city/input.js` joystick y teclado · `city/hero3d.js` héroe · `city/world.js` escena Three.js · `city/view.js` vista, HUD, pausa y hojas · `three/shared.js` piezas comunes con el viaje.
- Pruebas: `node tests/city_move.cjs`, `city_story.cjs`, `city_input.cjs`, `city_hero.cjs`, `city_world.cjs`, `city_rounds.cjs`, `city_engine.cjs`; ataques y fuzzing: `node tests/adv/city_base_attack.cjs`, `node tests/adv/city_fuzz.cjs 150 20261111`.
- Diseño y plan: `docs/superpowers/specs/2026-11-11-ciudad-nucleo-design.md` y `docs/superpowers/plans/2026-11-11-ciudad-nucleo.md`.
