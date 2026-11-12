# Ciudad Núcleo en 2D neón — plan de implementación

> **Para agentes ejecutores:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** reemplazar el render 3D de Ciudad Núcleo por un mundo 2D pixel art neón en canvas, quitar el editor de aspecto del héroe, dar bonos nuevos a las virtudes, aplicar el tema neón a todo el juego y borrar todo lo que quede sin uso.

**Arquitectura:** la lógica ya existente (`move`, `story`, `input`, rondas, `view`) se queda; cambia la capa de dibujo. `city/sprites2d.js` genera atlas de pixel art y `city/world2d.js` dibuja con un mapa prerenderizado y cumple el contrato de §3.1 del spec. Ambos se insertan en el ancla `/*__CITY_VIEW__*/` antes de `view.js`.

**Stack:** JS vanilla, ES5 dentro de la IIFE (sin `let`, `const` ni flechas en `engine.html` y `city/*.js`), canvas 2D, Node 22, jsdom 31, `fast-check` (solo pruebas).

**Spec:** `docs/superpowers/specs/2026-11-12-ciudad-nucleo-2d-design.md` (v2). **Léelo completo.** Las secciones §N son de ahí. Si plan y spec difieren, manda el spec.

## Restricciones globales

- Un solo HTML (`node build.mjs` → `juego_estudio.html`); sin recursos nuevos ni orígenes de fuentes nuevos.
- No se tocan M01–M10, sus IDs, `estudio_isw_v1`, `v: 1` ni nada entre `// === MODULE:Mxx START/END ===`. El viaje 3D (`trip/*`, `vendor/`, `loadThree`) no cambia salvo lo de §6 (ganchos protegidos).
- Texto de datos en `innerHTML` solo con `esc()`/`fmt()`; `#city-act`, `#city-live`, `#city-obj` y el div de `?fps=1` solo con `textContent`.
- Dentro de una IIFE nunca `var X` con el nombre de un global que se quiera leer (alias: `T3` para `Three3D`, `CM` para `CityMove`).
- Por cuadro en el mundo 2D: prohibidos `shadowBlur`, `filter`, `globalCompositeOperation` distinto de `source-over`, crear canvas, `get/putImageData` y `toDataURL`. Un solo rAF. `pixelRatio` en [1, 1.5].
- Textos fijos: "No se pudo mostrar la ciudad.", "Se perdió la vista de la ciudad.", "Reintentar", "Salir", "Ir a los módulos", "Volver", "Preparando la ciudad…", "Acercar", "Alejar", "Empate", "Se acabaron las preguntas: vuelve a intentarlo", "Bono de Enfoque: +10 XP", "Bono de Liderazgo: +5 XP", "Ciudad Núcleo", "▶ Entrar a la ciudad".
- **Suite** (el verde de cada tarea, timeout 600000 ms):
  `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
  Se espera `OK`, `VALIDACIÓN OK` y `FIN` sin `FALLO`. `tests/hero.cjs` tiene un fallo intermitente preexistente (~3 %, teletransportación): si sale, reintentar una vez y anotarlo.
- Commits en `feat/ciudad-2d`, terminando con `Co-Authored-By: <modelo> <noreply@anthropic.com>`.
- Pruebas jsdom: copiar el `boot` de `tests/city_engine.cjs` (mundo falso por `window.__CITY_WORLD__` con `__CITY_TEST__`, `__TRIP_IMPORT__` y `URL.createObjectURL` falsos). No hacer `require` de `record.cjs` ni `trip_engine.cjs`.

## Foco de revisión

1. **Pellizco a medias y giro del teléfono / `resize` durante el pellizco:** al soltar, el zoom queda en [1, 1.75] y nada se queda pegado. → Tarea 3.
2. **Volver de una ronda con el teléfono en otra orientación:** el encuadre (55 % en vertical, centro en horizontal) se recalcula en `resize()`. → Tarea 2.
3. **Guardado de la versión anterior** con `hero.look`, `hero.welcomed`, `__proto__` y nombre de 5000 caracteres: arranca sin errores, nombre recortado a 20, sin claves extra. → Tarea 7.
4. **Valentía ganada a mitad de una batalla** (se gana al intentar un jefe, no en batalla; pero un guardado puede cambiar): el máximo se fija al empezar y no cambia durante la ronda. → Tarea 5.
5. **Cruzar la medianoche dentro de la ciudad** con la lista de lugares cacheada: la criatura de ayer vuelve a ofrecerse sin salir. → Tarea 4.

---

### Tarea 0: Medición previa en el teléfono (punto de control del usuario)

**Archivos:** solo scratchpad (`/tmp/claude-1000/-home-josma-myprojects-juego/<sesión>/scratchpad/diag/fps.html`); nada en el repo.

- [ ] **Paso 1:** escribir `fps.html` con dos modos por `?m=`: `vacio` (rAF que solo mide) y `copia` (rAF que copia un canvas de 1120×1880 lleno de rectángulos a un canvas de pantalla a `css × min(dpr,1.5)` con `imageSmoothingEnabled=false`, escala 1.25). Muestra en texto: fps medio, p95 del frame time (ventana de 120 cuadros) y `devicePixelRatio`.
- [ ] **Paso 2:** servirlo en el puerto 8765 (`python3 -m http.server 8765 --bind 0.0.0.0` desde la carpeta `diag`) y pedir al usuario que abra `http://192.168.100.27:8765/fps.html?m=vacio` y `?m=copia`, con y sin ahorro de batería, y reporte los cuatro p95.
- [ ] **Paso 3:** anotar en el ledger los números. Si `vacio` sin ahorro de batería da p95 > 22 ms, **detenerse y avisar** (el límite es del teléfono o del navegador). Si no, continuar. Cerrar el servidor.

---

### Tarea 1: `city/sprites2d.js` (atlas de pixel art)

**Archivos:** crear `city/sprites2d.js`, `tests/city_sprites.cjs`.

**Interfaces — Produces:**
- `var CitySprites = { frame(kind, variant, face, step) → { img, sx, sy, w, h }, paintIcons(root), kinds }` con `module.exports` guardado.
- `kind` ∈ `'hero' | 'person' | 'creature' | 'thing'`. `variant`: para `person`, un id de `CITY_DATA` (`iris`, `m01`…`m23`, `a01`…`a12`); para `creature`, `bit|silicio|kernel|eco|huerfano|alucina`; para `thing`, `repair|repaired|lamp|lampOn|star|ask`; para `hero`, `''`. Un `variant` desconocido usa el primero del tipo.
- `face` ∈ `up|down|left|right` (ignorado en `thing`), `step` ∈ {0,1}.
- Celdas de 14×14 px; `w = h = 14`. Un atlas (un canvas) por `kind`, creado la primera vez que se pide y cacheado globalmente. Los atlas se generan con un `document` que recibe `CitySprites.init(doc)`; en el navegador `init` se llama con `document` al cargar.
- `paintIcons(root)`: para cada `canvas[data-spr="hero"]` dentro de `root`, dibuja el cuadro `hero/down/0` escalado al tamaño del canvas sin suavizado; si `getContext` da `null`, lo salta.

- [ ] **Paso 1: escribir `tests/city_sprites.cjs`** (jsdom con `HTMLCanvasElement.prototype.getContext` falso que registra `fillRect`, `fillStyle` y cuenta `createElement('canvas')`). Casos:
  - `frame('hero','', f, s)` para las 4 caras × 2 pasos devuelve 8 rectángulos distintos dentro del mismo `img`.
  - Pedir 50 cuadros de `person` crea **1** canvas para ese tipo (atlas único); los 4 tipos crean en total 4.
  - `frame('person','zz','down',0)` devuelve lo mismo que el primer id de persona.
  - Todos los `fillStyle` asignados cumplen `/^#[0-9a-f]{6}$/i` o `rgba(...)`.
  - `paintIcons` con 3 canvas `data-spr="hero"` llama a `drawImage` 3 veces; con `getContext → null` no lanza.
  - Ninguna asignación a `shadowBlur` ni `filter` en el contexto falso.
- [ ] **Paso 2:** confirmar que falla (`node tests/city_sprites.cjs` → `MODULE_NOT_FOUND`).
- [ ] **Paso 3: implementar.** Paleta neón del spec §5 (`#5ce1ff` traje del héroe, magenta y morado para criaturas, `#ff8f3a` reto roto, `#7dff8a` reparado, `#ffd76a` farol encendido). Variantes de persona con `hash(id)` sobre una paleta fija de 6 trajes y 4 pieles. Las 6 criaturas con siluetas distintas por id.
- [ ] **Paso 4:** `node tests/city_sprites.cjs` en verde y suite en verde.
- [ ] **Paso 5: commit** `feat(city2d): atlas de sprites pixel art neón`.

---

### Tarea 2: `city/world2d.js` (mundo 2D con el contrato de §3.1)

**Archivos:** crear `city/world2d.js`, `tests/city_world2d.cjs`; modificar `build.mjs` (insertar `sprites2d.js` y `world2d.js` en `/*__CITY_VIEW__*/` antes de `view.js`; todavía no se usa).

**Interfaces:**
- Consumes: `CitySprites.frame`, `CityMove.layoutBuildings`, `CityMove.door`, `Three3D.Pauser` (alias `T3`), `CITY_DATA`.
- Produces: `var CityWorld2D = { create(canvas, D, opts) → Promise<api>, buildMap(D, doc) → canvas, PX: 8 }`.
  - `opts = { reducedMotion, tick, state, raf?, caf?, pixelRatio?, search?, doc? }`.
  - `api = { resize(), setPaused(reason, on), dispose(), encounter(id) → Promise, dissolve(id) }`.
  - `create` rechaza con `Error('sin-2d')` si `getContext('2d')` es `null` o `buildMap` lanza.
  - El mundo agrega en el canvas un listener `contextlost` que llama a `opts.onLost()` si existe. (La vista pasa `onLost` en la Tarea 4; agregar `onLost` al contrato es una aclaración del spec §3.1 — ledgerla como ruling.)

- [ ] **Paso 1: escribir `tests/city_world2d.cjs`** con contexto 2D falso que cuenta `drawImage`, registra asignaciones de `shadowBlur`/`filter`/`globalCompositeOperation`, raf/caf falsos y un canvas con `clientWidth/clientHeight` configurables. Casos (los nombres siguen el spec §9):
  - (a) `buildMap(D, doc)`: `w === 140*8` y `h === 235*8`, `w*h ≤ 4e6`, y se llama una vez por `create`.
  - (b) `create` resuelve; hay 1 rAF pendiente; un cuadro llama `tick`, luego `state`, luego dibuja; nunca más de 1 rAF pendiente.
  - (c) `setPaused('sheet', true)` → no se agendan cuadros; al quitar la pausa, 1 rAF.
  - (d) `resize()` con `setPaused('suspended', true)` o canvas 0×0 no cambia `canvas.width`; con 390×844 y `pixelRatio: 3` deja `canvas.width === Math.round(390*1.5)`.
  - (e) Encuadre: con canvas 390×844 el héroe se dibuja en `y ≈ 0.55 × alto`; tras cambiar a 1280×800 y `resize()`, en `y ≈ 0.5 × alto` (Foco de revisión 2).
  - (f) Solo se dibujan NPC en pantalla: héroe en (0, 8) con zoom 1 → no se dibuja ninguna criatura del distrito (todas tienen z < −50); héroe en el área de `bit` → `bit` sí.
  - (g) Flags: `beatenToday.bit` oculta a `bit`; `apprenticesVisible.a01` muestra a `a01`; `restored: true` dibuja el puente construido y no la neblina.
  - (h) Partículas: tras 300 cuadros con `dissolve` repetido, nunca más de 200 vivas.
  - (i) Nunca se asigna `shadowBlur` ni `filter`; `globalCompositeOperation` solo `source-over`.
  - (j) `dispose()`: canvas del mapa queda 0×0, el `encounter` pendiente resuelve, no hay rAF y llamadas posteriores no agendan nada; es idempotente.
  - (k) `getContext('2d') → null` → `create` rechaza `sin-2d`. `contextlost` llama `opts.onLost`.
  - (l) Con `reducedMotion: true`, `encounter` resuelve en el mismo tick y `dissolve` no crea partículas.
  - (m) `?fps=1` (`opts.search`) agrega un div cuyo `textContent` contiene solo dígitos, espacios, `.`, `·` y las palabras `fps p95 tick dibujo npc part ms`; `dispose` lo quita.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** según §3.1 y §3.2: mapa a 8 px/m sin dpr ni zoom con brillo horneado; escala por cuadro `s = round(zoom * pixelRatio * 4) / 4`; cámara centrada en el héroe más el desplazamiento del encuentro; orden de capas del spec; arreglo fijo de 200 partículas; `faceOf` no se usa aquí (llega en `state().hero.face`); medición de tick y dibujo con `performance.now()` para `?fps=1`.
- [ ] **Paso 4:** `node tests/city_world2d.cjs` y suite en verde.
- [ ] **Paso 5: commit** `feat(city2d): mundo 2D neón con mapa prerenderizado`.

---

### Tarea 3: zoom en `input.js` y `faceOf` en `move.js`

**Archivos:** `city/input.js`, `city/move.js`, `tests/city_input.cjs`, `tests/city_move.cjs`, `tests/adv/plan_city_oracle.cjs`.

**Interfaces — Produces:**
- `CityInput.create(root, opts)` → `{ intent(), consumeZoom() → { factor, steps }, consumeAction(), consumePause(), dispose() }`. Sale `consumeCamera`.
- `CityMove.step(s, intent, dt, boxes, opts)` con `intent = { mx, mz, run }` (sin `camYaw`): `wx = mx`, `wz = mz`.
- `CityMove.faceOf(yaw) → 'up'|'down'|'left'|'right'`: con la convención de `step` (`yaw = atan2(-vx, -vz)`): yaw 0 → `up`, π → `down`, π/2 → `left`, −π/2 → `right`; en el empate exacto a 45° gana el eje vertical.
- Salen `CityMove.cameraArm` y `rayBox`.

- [ ] **Paso 1: actualizar las pruebas**, que deben fallar:
  - `city_input.cjs`: quitar los casos de cámara y Q/Z. Agregar:
    - pellizco: dos `pointerdown` en zona libre separados 100 px → mover a 200 px → `consumeZoom().factor ≈ 2`; un segundo `consumeZoom()` da factor 1;
    - un dedo que nace en la zona del joystick con un pellizco en curso mueve el joystick y no cambia el zoom;
    - al soltar un dedo del pellizco, mover el otro no cambia ni el zoom ni el `intent`; `pointercancel` igual (Foco de revisión 1);
    - un pellizco que empieza sobre un `button` (`isFree → false`) no hace nada;
    - cada evento de pellizco se limita a [0.5, 2];
    - `wheel` con `deltaY: -100` → `steps === 1`; 5 `wheel` en 50 ms (reloj falso por `opts.now`) → `steps === 1`; con `deltaY: NaN` → 0; con `ctrlKey: true` cuenta igual y llama a `preventDefault`; si `opts.isActive()` devuelve `false`, no llama a `preventDefault` y no cuenta;
    - teclas `+`, `=` → +1 paso; `-` → −1;
    - `dispose()` quita el listener `wheel`.
  - `city_move.cjs` y `plan_city_oracle.cjs`: `step` sin `camYaw` (`mz = -1` baja z); `faceOf` con 0, π, ±π/2, ±π/4 (empate → vertical), 7π (normaliza); que `CityMove.cameraArm` sea `undefined`.
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: implementar.** `CityInput.create` acepta `opts.isActive()` (la vista lo pasa: ciudad visible, sin pausa ni hoja) y registra `wheel` con `{ passive: false }` en `root`. Paso de rueda: uno cada ≥ 120 ms. Corregir los comentarios de cabecera de ambos archivos.
- [ ] **Paso 4:** pruebas y suite en verde (la vista todavía usa `consumeCamera`: en esta tarea `view.js` pasa a llamar `consumeZoom` y deja `cam.yaw` en 0 — cambio mínimo; el rediseño de la vista es la Tarea 4).
- [ ] **Paso 5: commit** `feat(city2d): zoom por pellizco, rueda y teclas; faceOf; sin cámara orbital`.

---

### Tarea 4: vista conectada al mundo 2D; adiós al 3D de la ciudad

**Archivos:** `city/view.js`, `build.mjs`, `tests/city_engine.cjs`, `tests/record2.cjs`, `tests/adv/city_fuzz.cjs`, `tests/adv/city_base_attack.cjs`, `tests/preserve_2d.cjs` (solo si su mundo falso lo requiere). Borrar `city/world.js`, `city/hero3d.js`, `tests/city_world.cjs`, `tests/city_hero.cjs`.

**Interfaces:**
- Consumes: `CityWorld2D.create(canvas, D, { reducedMotion, tick, state, onLost })`, `CityInput.consumeZoom`, `CityMove.faceOf`.
- Produces: `cityState()` con el objeto reutilizado de §3.1; `CD.zoom`; `cityZoomBy(factor, steps)`; botones de pausa `data-c="zoomin"`/`"zoomout"` ("Acercar"/"Alejar").

- [ ] **Paso 1: actualizar las pruebas**, que deben fallar:
  - Dobles: todos los mundos falsos pasan a `create(canvas, D, o)` sin `setLook` (city_engine, record2, city_fuzz, city_base_attack). `city_engine` deja de comprobar `opts.look`/`opts.portrait` y comprueba que `opts` tenga exactamente `reducedMotion`, `tick`, `state` y `onLost`.
  - `city_engine.cjs`, casos nuevos:
    - entrar a la ciudad no llama a `__TRIP_IMPORT__` (sin `loadThree`);
    - "Preparando la ciudad…" no aparece si el mundo resuelve en < 250 ms; sí si tarda más (con un mundo falso pendiente y reloj falso);
    - `create` rechazado → "No se pudo mostrar la ciudad." con "Ir a los módulos" y "Volver"; `onLost()` → "Se perdió la vista de la ciudad." con "Reintentar" y "Salir"; `onLost()` con la ciudad suspendida → el aviso aparece al volver; ningún texto contiene "3D";
    - flecha: objetivo arriba/derecha/abajo/izquierda del héroe → `rotate(0deg)`, `90deg`, `180deg`, `270deg`; a < 1 m la flecha está `hidden`;
    - zoom: `consumeZoom` falso con factor 3 → `state().zoom === 1.75`; factor 0.1 → 1; `steps: 1` desde 1 → 1.25; factor NaN → 1; botones "Acercar"/"Alejar" en la pausa cambian 0.25;
    - `face`: con W 0.5 s → `state().hero.face === 'up'`; quieto mantiene la última; al entrar con `at.yaw = π` → `'down'`;
    - `state()` devuelve el mismo objeto en dos cuadros seguidos;
    - guardado periódico: quieto 6 s → no escribe `localStorage`; caminando 6 s → sí;
    - medianoche: con `beaten.bit = hoy`, reloj +25 h y un `tick`, junto a `bit` la acción vuelve a ofrecer "Enfrentar a Bit Errante" (Foco de revisión 5).
  - `city_world.cjs` y `city_hero.cjs` se borran en el paso 3.
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: implementar** según §3.5: `cityWorldFactory` resuelve `CityWorld2D`; `cityStart` sin `loadThree` (aviso de carga diferido 250 ms); estados de error con los textos nuevos y `onLost` en lugar de `webglcontextlost`; zoom (dueño único, fórmula del spec); `face` con `faceOf`; flecha `atan2(dx, −dz)`; lista de lugares y objetivo recalculados solo al cambiar flags o el día (`today()` cambia); `cityUpdateNear` con bucle de mínimo; guardado periódico solo con > 1 m de movimiento. Quitar `CITY_TILT*`, `cityAngDiff`, `cityPortrait`, re-centrado y el paso de `look`/`PARTS`. En `build.mjs`, quitar `world.js` y `hero3d.js`. Borrar los 4 archivos.
- [ ] **Paso 4:** suite en verde; `node tests/adv/city_base_attack.cjs` y `node tests/adv/city_fuzz.cjs 150 20261111` sin fallos.
- [ ] **Paso 5: commit** `feat(city2d): la vista usa el mundo 2D; se retira el render 3D de la ciudad`.

---

### Tarea 5: batalla con energía máxima y Empate

**Archivos:** `engine.html` (`startRound`, `finalize`, `finish`, `vBattleHud`, `vResults`), `tests/city_rounds.cjs`, `tests/adv/city_base_attack.cjs`, `tests/adv/spec2d_attack.cjs` (sin cambios: D6 debe pasar).

**Interfaces — Produces:** `R.battle = { hp: 4, en, max, fx, msg }` con `max = S.virtues.valentia ? 4 : 3` fijado en `startRound`; `R.tie` (booleano) cuando se acaban las preguntas con `hp > 0 && en > 0`.

- [ ] **Paso 1: pruebas**, que deben fallar:
  - `city_rounds.cjs`: con `virtues.valentia` → HUD con 4 corazones y aria "Energía 4 de 4"; Regenerar sube hasta 4 (no topa en 3); sin la virtud, "de 3". Las búsquedas `/de 3/` de `city_rounds.cjs` y `city_base_attack.cjs` pasan a leer el máximo del aria.
  - **Foco de revisión 4:** iniciar la batalla sin Valentía y escribir `virtues.valentia` en `localStorage` a mitad → el máximo sigue en 3 hasta el final.
  - Empate: `battleItems({mod:'M02',topics:['T01'],n:2})` con pool vacío y 2 aciertos → título "Empate", banner "Se acabaron las preguntas: vuelve a intentarlo", `beaten.bit` sin marcar, `stats.bossFailed` intacto.
- [ ] **Paso 2:** confirmar que fallan; `node tests/adv/spec2d_attack.cjs 60 20261112 20000` muestra D6 en FAIL.
- [ ] **Paso 3: implementar** en los 4 sitios de §4.1 y el Empate de §4.2 (`finish`: `R.tie = R.battle && R.battle.hp > 0 && R.battle.en > 0`; `R.won = hp <= 0`).
- [ ] **Paso 4:** suite en verde y `spec2d_attack.cjs` sin FAIL.
- [ ] **Paso 5: commit** `feat(city2d): energía máxima por Valentía y Empate al agotar preguntas`.

---

### Tarea 6: virtudes con recompensas nuevas

**Archivos:** `engine.html` (`VIRTUES[].reward`, `powerUses`, `finish`, `vResults`), `city/view.js` (`cityTeachGo`), crear `tests/virtues2d.cjs`.

**Interfaces — Produces:** `R.focusBonus` y `R.leadBonus` (enteros, 0 si no aplica) mostrados en resultados junto a `R.integrityBonus`; `R.hadFocus`/`R.hadLead` capturados en `startRound`.

- [ ] **Paso 1: escribir `tests/virtues2d.cjs`** (boot de `city_rounds.cjs`):
  - Enfoque ya ganado + ronda perfecta de 8 → `+10` en `R.xp` y `S.xp` (XP mostrado = XP guardado) y texto "Bono de Enfoque: +10 XP"; la ronda que gana Enfoque por primera vez **no** lo cobra.
  - Liderazgo ya ganado: explicar con éxito → `S.xp` +20 y la hoja dice "+20 XP"; sin Liderazgo, +15 y "+15 XP"; corregir con acierto → "Bono de Liderazgo: +5 XP" y XP mostrado = guardado.
  - Sabiduría → Memoria fotográfica `×2`; sin ella `×1`.
  - Los 9 `reward` no contienen nombres de piezas (`Emblema`, `Gafas`, `Capa`, `Visor`, `Reloj`, `Banda`, `Etiqueta`).
  - Tope: Constancia + Integridad + Enfoque → el porcentaje se topa en 20 % y los +10 se suman aparte.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** con constantes (`FOCUS_XP = 10`, `LEAD_XP = 5`, `TEACH_XP = 15`), sin aritmética sobre valores del guardado. Textos `reward` de la tabla de §4.1.
- [ ] **Paso 4:** `virtues2d.cjs`, `preserve_2d.cjs` y suite en verde.
- [ ] **Paso 5: commit** `feat(city2d): bonos de Valentía, Enfoque, Liderazgo y Sabiduría`.

---

### Tarea 7: héroe sin editor de aspecto

**Archivos:** `engine.html` (`fresh`, `migrate`, `header`, `vHome`, `vHero`, `vResults`, `unlocksAt`, `nextUnlockText`, `render`, delegado de clics), `tests/hero.cjs`, `tests/migrate.cjs`, `tests/m03.cjs`…`m10.cjs`, `tests/record.cjs`, `tests/city_engine.cjs`, `tests/city_rounds.cjs`, `tests/smoke.cjs` y cualquier otra prueba que siembre `look`/`welcomed`.

**Interfaces — Consumes:** `CitySprites.paintIcons(root)`. **Produces:** `<canvas class="heroic" data-spr="hero" width="28" height="28" aria-hidden="true">` en cabecera, Inicio, "Tu héroe" (96×96) y HUD de batalla (56×56).

- [ ] **Paso 1: pruebas**, que deben fallar:
  - `migrate.cjs` (Foco de revisión 3): guardado con `hero: { name: 'x'.repeat(5000), look: {...}, welcomed: true, extra: 1, __proto__: {...} }` → `hero` es exactamente `{ name: 'xxxxxxxxxxxxxxxxxxxx' }` (20) y sin errores; sin nombre → `'Héroe'`; `fresh()` → `hero: { name: 'Héroe' }`.
  - `hero.cjs`: "Tu héroe" muestra nombre editable, nivel, poderes y virtudes; no hay `.piece`, `[data-act="random"]` ni `[data-act="piece"]`; subir de nivel no menciona "Piezas".
  - Inicio: no hay tarjeta de bienvenida ni `[data-act="welcome"]`; la cabecera y el HUD de batalla tienen `canvas[data-spr="hero"]` y `paintIcons` los pinta tras cada `render()`.
  - Las semillas de las demás pruebas dejan de llevar `look`/`welcomed` (solo `migrate.cjs` los conserva como dato viejo).
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: implementar** §4 y borrar del motor lo listado en §7 relativo al avatar (`PARTS`, `SLOTS`, `avatarSvg`, `shade`, `lay`, `slotBox`, `unlocked`, `reqText`, `fixLook` y sus llamadas, `hex`, bloque `lookSrc`/`lookNew`, `brandNew` → `fresh`, `hasProgress`, `heroCard`, piezas de `unlocksAt`/`nextUnlockText`/`unlockCount`, acciones `piece`/`random`/`welcome`/`welcomeclose`, tarjeta de bienvenida) y sus estilos. `render()` termina con `CitySprites.paintIcons(document.body)`.
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city2d): héroe sin editor de aspecto; icono pixel en la interfaz`.

---

### Tarea 8: tema neón y accesibilidad en todo el juego

**Archivos:** `engine.html` (CSS y textos de títulos de `vHome`, `vPlay`, `vResults`), `city/view.js` (clases del HUD y hojas si hace falta), crear `tests/theme.cjs`.

**Interfaces — Produces:** tokens CSS `--bg #0d1230`, `--surface #151c45`, `--cyan #5ce1ff`, `--magenta #ff4fd8`, `--green #7dff8a`, `--yellow #ffd76a`, `--red #ff5a5f`, `--ink #e8ecff`, `--deco #2e3a7a`; en cada `.opt` respondida, `<span class="mark" aria-hidden="true">✓|✗</span>` y `<span class="sronly">respuesta correcta|tu respuesta</span>`.

- [ ] **Paso 1: escribir `tests/theme.cjs`** (jsdom + lectura del `<style>` generado):
  - Los 9 tokens existen en `:root` con esos valores.
  - Contraste calculado (WCAG) de cada par texto/fondo usado por las reglas `body`, `.btn.primary`, `.opt`, `.pill`, `.chip` ≥ 4.5; `.btn.primary` tiene `color: var(--bg)` (o `#0d1230`).
  - `min-height` ≥ 44 px en `.btn`, `.btn.sm`, `.linkbtn`, `.opt` y el botón del icono de la cabecera.
  - Toda regla con `font-family` que contenga `Press Start 2P` tiene `font-size` ≥ 14 px; `.chip`, `.gname` y `#city-obj` no usan esa familia.
  - En una ronda: tras responder mal, la correcta tiene `✓` y "respuesta correcta", la elegida `✗` y "tu respuesta".
  - Inicio contiene "Ciudad Núcleo" y el botón "▶ Entrar a la ciudad"; ningún texto visible dice "3D" fuera del viaje de M08.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** §5 (solo estilos y textos de títulos; mismos `data-act`). `prefers-reduced-motion` quita los brillos que laten.
- [ ] **Paso 4:** `theme.cjs` y suite en verde; humo rápido con el script de Chromium del scratchpad (capturas de Inicio, ronda y ciudad) y revisarlas.
- [ ] **Paso 5: commit** `feat(ui): tema neón y accesibilidad en todo el juego`.

---

### Tarea 9: limpieza final, guardas y seguridad

**Archivos:** `three/shared.js`, `tests/three_shared.cjs`, `city/districts.mjs`, `validate.mjs`, `tests/build_validate.cjs`, `engine.html` (ganchos del viaje, estilos sin uso), `_headers`, `README.md`.

- [ ] **Paso 1: pruebas**, que deben fallar:
  - `three_shared.cjs`: `Three3D.mergeBoxes === undefined`; `Pauser`, `compileOrLost` y `disposeScene` siguen.
  - `build_validate.cjs`: un HTML con `avatarSvg`, `mergeBoxes`, `cameraArm`, `consumeCamera`, `CityHero`, `setLook`, `fixLook`, `welcomed` o `PARTS` hace fallar `validate.mjs`; también `window.__CITY_TEST_API__ =` fuera de un bloque `if (window.__CITY_TEST__ === true)`; el HTML real pasa.
  - Ganchos del viaje: con `__TRIP_IMPORT__` definido y sin `__CITY_TEST__`, el viaje no lo usa (`tests/trip_engine.cjs` agrega el caso y sus boots ponen `__CITY_TEST__ = true`).
  - `validate.mjs` sin la regla de `villainsM01`; `CITY_DATA` sin esa clave.
  - `_headers` contiene `img-src 'none'` y conserva `blob:` en `script-src`.
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: implementar** el resto de §7 y §6. Barrido de estilos: para cada selector de clase del `<style>`, `grep` en el motor y en `city/*.js`; borrar los que no aparecen (anotar la lista en el commit). Actualizar `README.md` (sección Ciudad Núcleo: 2D, archivos `sprites2d.js`/`world2d.js`, zoom, pruebas nuevas; quitar `world.js`/`hero3d.js`).
- [ ] **Paso 4:** suite en verde; `city_base_attack`, `city_fuzz 150 20261111`, `spec2d_attack`, `fuzz_state 320 20261111`, `props 240 777` y `REAL=1 plan_city_oracle` sin fallos.
- [ ] **Paso 5: commit** `chore(city2d): limpieza final, guardas de validate y endurecimiento`.

---

### Tarea 10: humo real y prueba en el teléfono (cierre)

**Archivos:** solo scratchpad (script de humo de Chromium) y el ledger.

- [ ] **Paso 1:** humo en Chromium (`/home/josma/dev/career-ops/node_modules/playwright-core`) en 390×844 (táctil) y 1280×800 con `?fps=1`: entrar, caminar 3 s, pellizcar o rueda, pegarse a un muro, abrir Pausa, iniciar y terminar una batalla y volver. Sin errores de consola; anotar p95 y ms de dibujo; guardar capturas y revisarlas.
- [ ] **Paso 2:** servir el HTML en el puerto 8765 y pedir al usuario que lo abra en su teléfono con `?fps=1`, sin ahorro de batería: caminar, pellizcar, pegarse a un muro, una batalla. Anotar p95. **Si p95 > 22 ms, detenerse y avisar.**
- [ ] **Paso 3:** cerrar el servidor y avisar al usuario de quitar el proxy y la regla de firewall de Windows. Decirle que ya se puede correr `/review`.
