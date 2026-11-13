# Estudio ISW

Juego de estudio de Ingeniería de Software (10 módulos, Ciudad Núcleo en 2D neón con plaza central, distritos, mentores, criaturas y poderes).
Un solo archivo HTML autocontenido: `juego_estudio.html`. Ábrelo en el navegador.

## Stack
- HTML + CSS + JavaScript vanilla (sin frameworks, sin librerías de terceros), canvas 2D con pixel art generado por código (sin imágenes externas)
- Progreso en `localStorage`
- Build/validación: Node (ESM) — `build.mjs`, `validate.mjs`
- Tests: jsdom (`tests/`); pruebas adversariales, de propiedades y fuzzing en `tests/adv/`

## Estructura
- `engine.html` motor; `content*.mjs` contenido por módulo; `contracts/` especificaciones
- `node build.mjs` genera `juego_estudio.html`; `node validate.mjs` valida (datos, reglas de los distritos, identificadores retirados y la CSP de `_headers`, que no permite `blob:`)
- `cd tests && npm i && node smoke.cjs`

## Ciudad Núcleo (mundo abierto 2D neón: plaza + un distrito por módulo)
Desde Inicio, "▶ Entrar a la ciudad". La primera vez hay un prólogo de 4 paneles, pistas breves una sola vez y, en la pausa, "¿Cómo se juega?".
La **plaza** es el centro: un portal por módulo (M01–M11), todos abiertos desde el inicio. Cada distrito es su propio mapa, con fundido de 0,5 s al entrar y salir. Los módulos sin distrito todavía muestran un muro "Próximamente".
- **Taller Comunal (M02):** aprende con 23 mentores, ponte a prueba contra 6 criaturas de La Maraña (batallas por preguntas) y 10 retos de campo, y enseña a 12 aprendices. Con 8 aprendices enseñados y el jefe de M02 aprobado se restaura el distrito (poder Planos, rango Junior).
- **Nodo Enlace (M08, Redes):** 15 mentores, 5 criaturas, 8 retos y 9 aprendices (6 para restaurar), más la ruta del paquete: 10 estaciones con un cable que se enciende tramo a tramo (capas Datos · Puerto · IP · Trama).
- Todo suma estrellas, repaso y XP como una ronda normal. Las virtudes dan bonos de juego (Valentía: energía máxima 4; Enfoque: +10 XP en rondas perfectas; Liderazgo: +5 XP al enseñar; Sabiduría: Memoria fotográfica ×2).
- Teléfono siempre en vertical (aparece un aviso si lo giras) y laptop en horizontal. Controles: joystick (cuarto inferior izquierdo); zoom con pellizco, rueda del mouse o teclas `+`/`-`; en laptop WASD, Shift, E o Enter y Esc.
- `?fps=1` en la URL muestra fps, p95 del cuadro, ms de tick y de dibujo, y cuántos personajes y partículas se dibujan.
- Código: `city/districts.mjs` (plaza y orden) + `city/districts/m02.mjs`, `m08.mjs`, `m08_route.mjs` datos (se escriben como `CITY_DATA`) · `city/layout.mjs` y `city/check_district.mjs` generador y reglas de los mapas · `city/move.js` escenas, movimiento y colisión · `city/story.js` guardado por distrito, restauración y objetivo · `city/input.js` joystick, zoom y teclado · `city/sprites2d.js` atlas de pixel art · `city/world2d.js` mundo 2D en canvas (plaza, distrito, ruta; incluye `Pauser`) · `city/view.js` vista, HUD, pausa y hojas · `city/intro.js` prólogo y pistas · `city/route.js` y `city/route_view.js` ruta del paquete.
- Para agregar un distrito: un archivo en `city/districts/` con el mismo formato que `m02.mjs`, registrarlo en `city/districts.mjs` y `node validate.mjs` (las reglas R1–R10 dicen qué falta). El código de la vista no nombra ningún distrito.
- Pruebas: `node tests/city_move.cjs`, `city_layout.cjs`, `validate_districts.cjs`, `city_story.cjs`, `city_input.cjs`, `city_sprites.cjs`, `city_world2d.cjs`, `city_scenes.cjs`, `city_progress.cjs`, `city_intro.cjs`, `city_route.cjs`, `city_route_view.cjs`, `city_rounds.cjs`, `city_engine.cjs`, `virtues2d.cjs`, `theme.cjs`, `preserve_2d.cjs`, `xss_data.cjs`, `build_validate.cjs`; ataques y fuzzing: `node tests/adv/city_base_attack.cjs`, `spec2d_attack.cjs`, `spec_districts_attack.cjs`, `route_props.cjs`, `plan_districts_props.cjs`, `node tests/adv/city_fuzz.cjs 150 20261111`.
- Diseño y plan: `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` y `docs/superpowers/plans/2026-11-12-ciudad-distritos.md` (el diseño de la ciudad de un solo distrito queda en `2026-11-12-ciudad-nucleo-2d-*`; el 3D, en `2026-11-11-*`).
