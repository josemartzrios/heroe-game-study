# Diseño: Ciudad Núcleo en 2D neón (reemplaza el render 3D)

**Fecha:** 2026-11-12 · **Rama:** `feat/ciudad-2d` (antes `feat/ciudad-3d`, sin mergear) · **Base:** spec `2026-11-11-ciudad-nucleo-design.md` (v3) y su plan, ya implementados.

## 1. Por qué

El usuario probó la ciudad 3D low-poly en su teléfono: corre a 30 fps (27 draw calls, 2028 triángulos) y no le gustó cómo se ve. Más realismo 3D sería más pesado y no cabe en un HTML para un teléfono de gama media. Decide un **mundo 2D abierto visto desde arriba**, con **pixel art neón nocturno**, y que **todo el juego** use esa interfaz neón.

**Lo que dijo el usuario:**
- Vista desde arriba, movimiento libre (estilo Pokémon o Stardew), estilo **B · neón nocturno**.
- Cámara **media** (personajes de ~28 px) con **pellizco** para acercar y alejar (rueda en laptop).
- **Quitar la edición del aspecto del héroe.** Se quedan poderes y virtudes; las virtudes que solo daban ropa ahora dan **bonos de juego**.
- **Toda la interfaz en neón**: Inicio, módulos, lecciones, rondas, resultados, "Tu héroe" y la ciudad.
- **No guardar código que no se use**: se borra todo lo que quede sin uso.

**Éxito:**
1. En el teléfono, en vertical: **≥ 45 fps (meta 60)**, sin cuadros negros ni errores.
2. El capítulo 1 completo (prólogo → restaurar el Taller → puente) se juega igual que hoy y todo cuenta en estrellas, repaso y XP.
3. Se ve como un juego neón; no quedan pantallas con aspecto de página web.
4. Sigue siendo un solo HTML sin recursos nuevos; la ciudad ya no carga Three.js.
5. Ningún archivo, función, estilo ni prueba sin uso.

**Fuera de alcance:** M11 (Kubernetes), capítulos 2+, Netlify, merge.

## 2. Qué se conserva

- Contenido M01–M10, IDs, `estudio_isw_v1` y `v: 1`. Exámenes: estrellas con ≥ 6 respuestas, repaso, jefe de 20 preguntas con 80 %.
- Toda la lógica de Ciudad Núcleo: `city/districts.mjs` (posiciones en metros), `city/move.js` (`step`, colisiones, `door`, `nearest`, `within`), `city/story.js` (normalización, restauración, rangos, objetivo), las rondas del motor (batalla hasta vida 0 o energía 0 con pool, `repairItems`, `cfg.city`, `cityRestorePending`), y en `city/view.js` el ciclo de vida, suspender y reanudar durante rondas, estados de error, HUD, pausa con sus 6 opciones, hojas, mentores, criaturas, retos, enseñar, torre, restauración, puente, prólogo y objetivo.
- El viaje 3D de M08 (`trip/*`, `vendor/three.module.min.js`, carga diferida) no cambia.

## 3. Mundo 2D

### 3.1 Contrato con la vista (sustituye al del mundo 3D)
`CityWorld2D.create(canvas, D, opts) → Promise<api>` (sin `THREE`). La vista lo resuelve con el mismo patrón protegido: `window.__CITY_WORLD__` falso solo con `__CITY_TEST__ === true`.
- `opts = { reducedMotion, tick(dt), state(), raf?, caf?, pixelRatio?, search? }`.
- **Un solo rAF**, del mundo. En cada cuadro: `dt` del `Pauser` (de `three/shared.js`, que se queda por el viaje) → `opts.tick(dt)` → `opts.state()` → dibuja. Con pausa no agenda cuadros (como hoy).
- `state()` devuelve `{ hero:{ x, z, face, speed }, zoom, flags:{ beatenToday, repairs, apprenticesVisible, stars, restored, lit } }`. `face` ∈ `up|down|left|right`.
- `api = { resize(), setPaused(reason, on), dispose(), encounter(id) → Promise, dissolve(id) }`. Sin `setLook`.
- `dispose()` cancela el rAF, suelta el canvas del mapa y quita el contador de fps.

### 3.2 Dibujo
- **Escala:** 8 px por metro en la cámara media (nivel 1). El zoom va de 1 a 1.75 (pellizco continuo; rueda en pasos de 0.25). El héroe queda centrado; en vertical, en el tercio inferior de la pantalla.
- **Mapa fijo prerenderizado una vez** en un canvas fuera de pantalla a 8 px/m: suelo, calles con líneas cian, plaza, sede, espejo, torre, edificios de `CityMove.layoutBuildings` (relleno oscuro, borde neón por manzana, ventanas encendidas deterministas), muros de La Maraña con letrero "Próximamente". El puente tiene dos versiones (cerrado y construido) que se dibujan encima según `flags.restored`.
- **Cada cuadro:** se copia del mapa solo el rectángulo visible (`imageSmoothingEnabled = false`), y encima: sombras, retos (naranja con chispas / verde reparado), faroles (8, encendidos según `flags.lit`), NPC visibles (Iris, 23 mentores con ★ de color por estrellas, 6 criaturas flotando si no están vencidas hoy, aprendices con "?" si están visibles), el héroe, la neblina de La Maraña sobre el distrito mientras no esté restaurado y las partículas (≤ 200 en total). Solo se dibuja lo que cae en pantalla (+1 m de margen).
- **Canvas** al tamaño CSS × `min(devicePixelRatio, 2)`.
- **Restauración:** sin neblina, faroles encendidos, ventanas del Taller más brillantes y puente construido.
- **Encuentro:** la cámara se desplaza hacia la criatura ~0.6 s y resuelve (al instante con movimiento reducido). **Disolver:** partículas moradas 0.7 s.
- **Movimiento reducido:** sin flotar, sin neblina animada ni desplazamiento de cámara.
- **`?fps=1`:** un `div` con fps, NPC dibujados y partículas.

### 3.3 Sprites (`city/sprites2d.js`)
Pixel art generado por código en canvas (sin imágenes), cacheado por clave: héroe fijo neón (traje cian, 2 cuadros de caminar × 4 direcciones), Iris, mentores y aprendices (variantes de paleta por id con `hash`), 6 criaturas (formas distintas, moradas y magenta), retos (roto y reparado), farol, estrella y "?". `CitySprites.get(kind, variant, face, frame) → canvas`. También da el **icono del héroe** que usan la cabecera, Inicio y el HUD de batalla (canvas con `data-spr="hero"` pintado tras `render()`; el motor no puede usar `<img>`).

### 3.4 Entrada (`city/input.js`)
- Se queda: joystick por `pointerId` (cuarto inferior izquierdo), margen de gestos del sistema, teclado WASD/flechas, Shift, E/Enter y Esc.
- **Sale:** arrastre de cámara, `consumeCamera`, teclas Q/Z.
- **Entra:** pellizco con dos dedos fuera del joystick y rueda del mouse → `consumeZoom()` devuelve el factor acumulado (multiplicativo). La vista limita el zoom a [1, 1.75].
- El movimiento es **relativo a la pantalla**: arriba = −z. La vista pasa `camYaw: 0` a `CityMove.step`.

### 3.5 Vista (`city/view.js`)
- Usa `CityWorld2D` y ya no llama a `loadThree()`; "Preparando la ciudad…" solo se ve mientras se prerenderiza el mapa.
- `cam` pasa a ser `{ zoom }`; se quitan yaw, tilt, brazo y re-centrado. `face` sale de la dirección del movimiento.
- La flecha del objetivo apunta en pantalla (sin restar el yaw de cámara).
- La opción "Correr", los estados, la pausa y las hojas no cambian.

## 4. Héroe sin editor de aspecto

- **"Tu héroe"** muestra: icono del héroe, nombre editable, nivel y barra, poderes y virtudes. Desaparecen las piezas, "Aleatorio" y el avatar grande.
- **Inicio y cabecera:** el icono del héroe reemplaza al avatar SVG. Se quita la tarjeta "Llegó el modo héroe / Crear mi héroe".
- **Subir de nivel:** el aviso menciona solo poderes nuevos.
- **Virtudes**, recompensas nuevas (las que daban pieza + bono conservan solo el bono):
  - **Valentía:** +1 de energía máxima (4) en batallas contra criaturas. El HUD de batalla pinta tantos corazones como energía máxima.
  - **Enfoque:** +10 XP al terminar una ronda perfecta (la misma condición con que se gana).
  - **Liderazgo:** +5 XP extra al enseñar a un aprendiz (explicar: 20 en vez de 15; corregir: +5 sobre lo que dé la respuesta).
  - Constancia, Curiosidad, Humildad, Integridad y Resiliencia: su bono actual, sin pieza. El tope de +20 % de XP de bonos pasivos no cambia.
- **Guardado:** `migrate()` borra `hero.look` y `hero.welcomed`; `fresh()` ya no los crea. El resto del guardado no cambia.

## 5. Interfaz neón en todo el juego

- **Tema:** variables CSS nuevas en `:root` (fondo azul noche `#0d1230`, superficie `#151c45`, línea `#2e3a7a`, cian `#5ce1ff`, magenta `#ff4fd8`, verde `#7dff8a`, amarillo `#ffd76a`, texto `#e8ecff`). Brillos con `box-shadow`/`text-shadow` suaves; botón principal en degradado magenta.
- **Letra pixel** ("Press Start 2P", que ya se carga) para títulos de pantalla y del HUD; el texto de lectura (preguntas, lecciones) sigue en la letra actual por legibilidad. Contraste AA en todo el texto.
- **Pantallas:** Inicio (título "Ciudad Núcleo", botón grande "▶ Entrar a la ciudad", icono del héroe, repaso y módulos como fichas), módulo, tema, lección, rondas (opciones como placas con borde neón; correcto en verde, incorrecto en rojo), resultados, "Tu héroe", y las hojas, la pausa y el HUD de la ciudad.
- Es un cambio de estilos y de algunos textos de títulos; no cambia la estructura ni los `data-act`.
- `prefers-reduced-motion` sigue quitando animaciones.

## 6. Limpieza (nada sin uso)

Se borran:
- `city/world.js`, `city/hero3d.js`, `tests/city_world.cjs`, `tests/city_hero.cjs`.
- De `three/shared.js`: `mergeBoxes` (solo lo usaba la ciudad). `Pauser`, `compileOrLost` y `disposeScene` se quedan por el viaje.
- De `city/move.js`: `cameraArm` y su rayo contra cajas.
- De `city/input.js`: arrastre de cámara, `consumeCamera`, Q/Z.
- De `city/districts.mjs` y `validate.mjs`: `villainsM01` y su regla.
- Del motor: `PARTS`, `SLOTS`, `avatarSvg`, `slotBox`, `unlocked`, `reqText`, `fixLook`, piezas en `unlocksAt`/`nextUnlockText`/`unlockCount`, acciones `piece`, `random`, `welcome`, `welcomeclose`, la tarjeta de bienvenida y sus estilos (`.piece`, `.pieces`, `.herocard`, `.avwrap`, etc.), y los estilos que queden sin uso tras el tema neón.
- En `build.mjs`: la inserción de `world.js` y `hero3d.js`; entra `sprites2d.js` y `world2d.js`.
- Pruebas que revisaban piezas del avatar se reescriben a lo nuevo o se borran si ya no hay qué probar.

Una comprobación automática en `validate.mjs` falla si quedan identificadores retirados (`avatarSvg`, `PARTS`, `mergeBoxes`, `cameraArm`, `CityHero`, `CityWorld =`) en el HTML generado.

## 7. Pruebas

- **Nuevas:** `tests/city_world2d.cjs` (canvas falso con contador de llamadas: un solo rAF, pausa sin cuadros, `resize` suspendido o 0×0 sin redimensionar, `dispose` libera, solo se dibujan NPC en pantalla, ≤ 200 partículas, flags cambian lo dibujado, zoom limitado), `tests/city_sprites.cjs` (claves en caché, 4 direcciones × 2 cuadros, sin colores inválidos).
- **Se actualizan:** `city_input.cjs` (pellizco, rueda, sin cámara), `city_move.cjs` y el oráculo (sin `cameraArm`), `city_engine.cjs` (sin `loadThree` en la ciudad, flecha en pantalla, zoom), `three_shared.cjs` (sin `mergeBoxes`), `hero.cjs` y `migrate.cjs` (sin piezas, `look` y `welcomed` borrados), pruebas de virtudes (Valentía, Enfoque, Liderazgo).
- **Se conservan:** rondas, batalla, migración de `S.city`, ataques y fuzzing (`city_base_attack`, `city_fuzz`, `fuzz_state`, `props`, `attacks`).
- **Humo en Chromium** en 390×844 y 1280×800 con `?fps=1`; **prueba del usuario en el teléfono**: ≥ 45 fps.
