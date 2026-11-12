# Estudio ISW

Juego de estudio de Ingeniería de Software (10 módulos, Ciudad Núcleo en 2D neón con mentores, criaturas y poderes).
Un solo archivo HTML autocontenido: `juego_estudio.html`. Ábrelo en el navegador.

## Stack
- HTML + CSS + JavaScript vanilla (sin frameworks), canvas 2D con pixel art generado por código (sin imágenes externas)
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

## Ciudad Núcleo (mundo abierto 2D neón, capítulo 1: Taller Comunal / M02)
Desde Inicio, "▶ Entrar a la ciudad". Tu héroe recorre la ciudad vista desde arriba: aprende con 23 mentores, se pone a prueba contra 6 criaturas de La Maraña (batallas por preguntas) y 10 retos de campo, y enseña a 12 aprendices. Con 8 aprendices enseñados y el jefe de M02 aprobado se restaura el distrito (poder Planos, rango Junior). Todo suma estrellas, repaso y XP como una ronda normal. Las virtudes dan bonos de juego (Valentía: energía máxima 4; Enfoque: +10 XP en rondas perfectas; Liderazgo: +5 XP al enseñar; Sabiduría: Memoria fotográfica ×2).
- Teléfono siempre en vertical (aparece un aviso si lo giras) y laptop en horizontal. Controles: joystick (cuarto inferior izquierdo); zoom con pellizco, rueda del mouse o teclas `+`/`-`; en laptop WASD, Shift, E o Enter y Esc.
- `?fps=1` en la URL muestra fps, p95 del cuadro, ms de tick y de dibujo, y cuántos personajes y partículas se dibujan.
- `city/districts.mjs` datos (se escriben como `CITY_DATA`) · `city/move.js` movimiento y colisión · `city/story.js` guardado, restauración y objetivo · `city/input.js` joystick, zoom y teclado · `city/sprites2d.js` atlas de pixel art · `city/world2d.js` mundo 2D en canvas · `city/view.js` vista, HUD, pausa y hojas · `three/shared.js` piezas comunes con el viaje (`Pauser`, `compileOrLost`, `disposeScene`).
- Pruebas: `node tests/city_move.cjs`, `city_story.cjs`, `city_input.cjs`, `city_sprites.cjs`, `city_world2d.cjs`, `city_rounds.cjs`, `city_engine.cjs`, `virtues2d.cjs`, `theme.cjs`, `preserve_2d.cjs`; ataques y fuzzing: `node tests/adv/city_base_attack.cjs`, `node tests/adv/spec2d_attack.cjs`, `node tests/adv/city_fuzz.cjs 150 20261111`.
- Diseño y plan: `docs/superpowers/specs/2026-11-12-ciudad-nucleo-2d-design.md` y `docs/superpowers/plans/2026-11-12-ciudad-nucleo-2d.md` (el diseño 3D anterior queda en `2026-11-11-*`).
