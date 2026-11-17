# Ciudad Núcleo — Tanda 2 (M03, M01, M10) Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir los distritos Barrio Byte (M03), Ciudadela Escalable (M01) y Muralla Cifrada (M10) en la ciudad, con criaturas distinguibles por distrito y un aviso de rango que no mienta.

**Architecture:** Tres archivos de datos con el patrón de `city/districts/m08.mjs` (sin ruta), registrados en `city/districts.mjs`. Cambios de código pequeños: tinte de criaturas por distrito en `city/sprites2d.js` y regla R11 de colores en `city/check_district.mjs` (Task 2); aviso de rango en `cityCelebrate` (`city/view.js`) y `rankOf` con claves propias (`city/story.js`) (Task 3). Las pruebas que suponían 2 distritos pasan a calcular sus valores desde los datos.

**Tech Stack:** HTML único generado por `node build.mjs`, JS ES5 en `city/*.js` y `engine.html`, ESM solo de build en `*.mjs`, pruebas Node 22 + jsdom 31 + fast-check (`tests/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-17-ciudad-tanda-2-design.md` (v2; formato y reglas base en `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` §4).

## Global Constraints

- ES5 en `city/*.js` y `engine.html` (sin `let`/`const`/flechas/`Array.from`); los `.mjs` pueden usar ES moderno. `engine.html` no cambia en esta tanda.
- Texto de datos a `innerHTML` solo con `esc()`/`fmt()`; nada de código que no se use; ganchos de prueba solo con `window.__CITY_TEST__ === true`.
- `city/districts.mjs`: `districts: { M02, M08, M03, M01, M10 }` en ese orden; el distrito de referencia de los sprites es `D.order[0]` (M02), nunca "el primero por posición".
- Datos exactos de las tablas del spec (nombres, temas, etiquetas, colores — M01 `#d580ff`/`#5ce1ff` —, `style: 'red'`, `seed` 13/17/19, `need` 7, `celebrate.text`).
- Marco de los tres distritos: `bounds` −60..60 × −70..60; entrada `{ x: 0, z: 52, yaw: 0 }`; salida `{ x: 0, z: 57, w: 6, d: 2 }`; torre `{ id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }`; manzanas x {−42, −14, 14, 42} × z {30, 2, −26, −54}; calles x {−28, 0, 28}, z {16, −12, −40}; `makeLayout({ reserve: [[0, -64], [0, 52]], streetX, streetZ, xRange: [-52, 52], zRange: [52, -68] })`; orden de `take()`: mentores → criaturas (`area.r` 6) → reparaciones → aprendices; usar `lay.take()` directo.
- Las pruebas nuevas o cambiadas no fijan conteos ni nombres de rango a mano: los calculan desde `city/districts.mjs` (`D.districts`, `D.order`, `D.ranks`, `need`).
- Antes de probar, `node build.mjs`; nunca dos builds a la vez.
- SUITE = `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs tests/adv/route_props.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (verde = solo `FIN`). ADV = el mismo bucle sobre `tests/adv/*.cjs` salvo `lib.cjs`, `gen.cjs` y `runner.cjs`. **Al final de cada tarea SUITE y ADV quedan verdes**; `tests/adv/tanda2_attack.cjs` y `tests/adv/tanda2_plan_attack.cjs` (hoy sin seguimiento) solo se agregan a git en la Task 3.
- Merge, push y deploy solo con confirmación del usuario.

## Review Focus

1. **Partida guardada en la Tanda 1 que entra a la ciudad:** `S.city.d` sin M03/M01/M10 → tras el primer guardado los tres quedan vacíos (`{ beaten: {}, repairs: {}, taught: {} }`), sin errores, y el HUD dice "Distritos 0 de 5". → Task 1.
2. **Jefe de M01 aprobado antes (desde Módulos):** con 0 aprendices la Ciudadela marca 50 % y el objetivo no manda a la torre; con `need − 1` enseñados, enseñar al siguiente restaura M01 sin poder nuevo. → Task 1.
3. **Restaurar un distrito sin cambio de rango** (2.º restaurado): "Sigues como Junior: te falta 1 distrito para Semi-senior.", nunca "Subes a". → Task 3.
4. **Criaturas de distritos distintos:** ningún par de criaturas de distritos distintos comparte forma y color de cuerpo; M02 idéntica a hoy aunque `districts` llegue en otro orden; un distrito sin `colors` no rompe el atlas. → Task 2.
5. **Teléfono 320 × 640 dentro de la Ciudadela** (nombre más largo): la pill del HUD no se sale (`right ≤ innerWidth`), el HUD queda ≤ 25 % del alto y la hoja de celebración cabe. → Task 4.

---

### Task 1: Datos de los tres distritos y pruebas que suponían 2

**Files:**
- Create: `city/districts/m03.mjs`, `city/districts/m01.mjs`, `city/districts/m10.mjs`
- Modify: `city/districts.mjs:3-4,29`
- Modify tests: `tests/tanda2_feasibility.cjs`, `tests/city_sprites.cjs:41-42,44`, `tests/city_move.cjs:55-56,68,70`, `tests/city_world2d.cjs:118-119`, `tests/city_scenes.cjs:87,161-167,239`, `tests/city_story.cjs:84,186,211`, `tests/validate_districts.cjs:68`, `tests/migrate.cjs:44-51`, `tests/city_progress.cjs`

**Interfaces:**
- Produces: `export const district` en cada archivo nuevo (forma §4.2); `CITY_DATA.districts` con 5 claves en el orden fijo.
- En las pruebas: `const OPEN = Object.keys(D.districts).length`, `PEND = D.order.length - OPEN`, `SIN = D.order.find((m) => !Object.prototype.hasOwnProperty.call(D.districts, m))` (hoy M04) y `MIDS = Object.keys(D.districts)`.

- [ ] **Step 1: Pruebas rojas**
  - `tanda2_feasibility.cjs`: `'<mid>: el archivo real es idéntico al armado desde la tabla del spec'` con `assert.deepStrictEqual(built[mid], city.districts[mid])` (cubre datos, coordenadas y orden de `take()`).
  - Conteos desde los datos: `city_move:55-56` → `existing.length === OPEN && pending.length === PEND`, `plazaBoxes.length === 1 + PEND + 4`; `city_world2d:118-119` → `OPEN`/`PEND`; `city_scenes:87` → `'Distritos 0 de ' + OPEN`; `city_sprites:41-42,44` → criaturas = Σ `creatures.length` en celdas distintas; personas = `1 + Σ(mentors + apprentices)`; la línea 44 (`setData` con otros datos) usa ese mismo valor calculado.
  - Portal sin distrito: `SIN` en `city_move:68` (y su etiqueta en `:70`), `city_story:84`, `city_scenes:161,239` y `validate_districts:68`; en `city_scenes:162-167` los textos esperados se arman con `SIN` y el título del módulo: `'Ver ' + SIN`, `SIN + ' · Próximamente'`, `SIN + ' · ' + MODULES.find((m) => m.id === SIN).title` y el h1 con ese título.
  - `city_story:186` ("con todos restaurados → Ciudad al día"): restaurar todos los `MIDS`. `city_story:211` (partida simulada): `sts` con una entrada por cada id de `MIDS`.
  - `migrate.cjs` M1: `full.city.d` lleva también `M03`, `M01` y `M10` con `{ beaten: {}, repairs: {}, taught: {} }`.
  - `city_progress.cjs` (helpers `boot`, `base`, `saved`, `set`, `answerOne`, `nextQ`, `quick`; patrón del caso 6b):
    - `'RF1 guardado de la Tanda 1: HUD "Distritos 0 de 5" y, tras guardar, M03/M01/M10 vacíos'` (semilla sin esos distritos en `d`; forzar `save()` con `quick(e)` antes de `saved()`).
    - `'RF2a jefe de M01 aprobado y 0 enseñados: Ciudadela 50 % y objetivo sin torre'` (semilla `boss: { M01: { best: 18, passed: true } }`, `city: { prologue: true, scene: 'M01', at: entrada }`; `#city-rest` = `'Ciudadela Escalable 50 %'`; `#city-obj` no contiene "torre").
    - `'RF2b con need − 1 enseñados, enseñar al siguiente restaura M01 sin poder nuevo'`: `R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid: 'M01', back: { name: 'city' }, city: { kind: 'teach', id: M1.apprentices[M1.need - 1].id, mid: 'M01' } }, [q])` con `q` = una `mcq` de M01; luego `answerOne`/`nextQ`; `restored.M01 === true` y `powers` sin claves nuevas.

- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/tanda2_feasibility.cjs; node tests/city_move.cjs; node tests/city_scenes.cjs; node tests/city_progress.cjs` → FAIL (no existen los archivos; conteos de 2 distritos).

- [ ] **Step 3: Implementar** los tres archivos (patrón de `m08.mjs` sin `route` ni pads, con el marco de Global Constraints y las tablas del spec) y su registro.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`; ADV → solo `FIN`.

- [ ] **Step 5: Commit** (con `juego_estudio.html`) — `feat(city): distritos Barrio Byte, Ciudadela Escalable y Muralla Cifrada`

---

### Task 2: Criaturas con los colores de su distrito y regla R11

**Files:**
- Modify: `city/sprites2d.js:8,17-29` (setData), `:51-61` (`creature`), `:82` (atlas)
- Modify: `city/check_district.mjs` (R11)
- Test: `tests/city_sprites.cjs`, `tests/validate_districts.cjs`

**Interfaces:**
- Consumes: `D.order[0]` (distrito de referencia), `D.districts[mid].colors = { a, b }`.
- Produces: `creature(g, ox, oy, step, i, tint)` con `tint` `null` (aspecto de referencia: paleta morada, marca `#3a2470`, ojos `#ffd23f`) o `[a, b]` (cuerpo `a`, rasgos `#12162e`, 2 px de acento `b`, ojos `#ffffff` con pupila `#12162e`). Array `TINT` paralelo a `CREATURE`/`STYLE`, vaciado en `setData`.

- [ ] **Step 1: Pruebas rojas** en `city_sprites.cjs`. Color de una celda: `f = S.frame('creature', id, 'down', 0)`; filtrar `env.rects` por `r[0] === f.img`, `f.sy <= r[2] < f.sy + 14`, `r[1] < 14`; el cuerpo es el rect `w === 10 && h === 7`.
  - `'(c1) cada criatura de M02 conserva cuerpo, marca #3a2470 y ojos #ffd23f'` (cuerpo según su índice en `['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0']`).
  - `'(c2) la 1.ª criatura de M03: cuerpo #ff9f43, rasgos #12162e, acento #4d7cff, ojos #ffffff'`.
  - `'(c3) ningún par de criaturas de distritos distintos comparte forma y color de cuerpo'` (todos los pares).
  - `'(c4) con districts en otro orden ({ M10, M03, M02, … }) M02 sigue idéntica (c1) y M10 lleva sus colores'`.
  - `'(c5) un distrito sin colors no hace lanzar setData, sus criaturas usan el aspecto de referencia, y un setData posterior con los colores corregidos sí los aplica'`.
  - `validate_districts.cjs`: `'R11 colors ausente o mal formado'` (sin `colors`, `a: 'rojo'`, `b: '#fff'`) → error `R11`.

- [ ] **Step 2: Correr y ver fallar** — `node tests/city_sprites.cjs; node tests/validate_districts.cjs` → FAIL en c2–c5 y R11.

- [ ] **Step 3: Implementar**:
  - `setData`: `var ref = D && D.order ? D.order[0] : null`; `TINT.length = 0` junto a los demás resets; por criatura `TINT.push(mid !== ref && validColors(M) ? [M.colors.a, M.colors.b] : null)`; `LOOK` usa `mid === ref` en vez de `di === 0`; asignar `data = D` solo al terminar sin errores.
  - `creature(..., tint)` según Interfaces; el atlas pasa `TINT[v]`.
  - `check_district.mjs`: R11 `colors.a` y `colors.b` con `/^#[0-9a-f]{6}$/i`.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`; ADV → solo `FIN`.

- [ ] **Step 5: Commit** — `feat(city): criaturas con los colores de su distrito; colores obligatorios (R11)`

---

### Task 3: El aviso de rango solo cuando sube, y pruebas adversariales de la tanda

**Files:**
- Modify: `city/view.js:579-595` (`cityCelebrate`), `city/story.js:134-140` (`rankOf`)
- Test: `tests/city_progress.cjs`, `tests/city_story.cjs`; agregar a git `tests/adv/tanda2_attack.cjs` y `tests/adv/tanda2_plan_attack.cjs`

**Interfaces:**
- Consumes: `CityStory.rankOf(C, D)`, `CITY_DATA.ranks` (`[[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], …]`).

- [ ] **Step 1: Pruebas rojas**
  - `city_progress.cjs`, con los nombres sacados de `city.ranks`:
    - `'restaurar el 1.º distrito: "Subes a Junior."'`.
    - `'restaurar M08 con M02 ya restaurado: "Sigues como Junior: te falta 1 distrito para Semi-senior." y ningún "Subes a"'`.
    - `'dos restauraciones acumuladas fuera de la ciudad (de 0 a 2) se celebran juntas: "Subes a Junior."'` (dos rondas con `back: { name: 'home' }` antes de entrar).
  - `city_story.cjs`: `'rankOf ignora claves heredadas de Object.prototype'` (`Object.prototype.M08 = true` durante la prueba, borrado al final).
  - `tests/adv/tanda2_attack.cjs`: base de la Tanda 1 = `city` real filtrado a `{ M02, M08 }`; `D5` = `city` real; borrar sus tablas copiadas (`SPEC`, `buildDistrict`, el caso "take() alcanza", que ya cubre `tanda2_feasibility`) y su caso de rango (lo cubren las pruebas de arriba y `tanda2_plan_attack`).
  - `tests/adv/tanda2_plan_attack.cjs`: la parte (a) usa la fórmula del spec (contar en `Object.keys(D.districts)` los `restored === true` fuera de `mids`) y el `rankOf` real; los casos con clave `__proto__` deben pasar. La parte (b) carga el `sprites2d.js` real (sin parche).

- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_progress.cjs; node tests/city_story.cjs` → FAIL en "Sigues como" y en las claves heredadas.

- [ ] **Step 3: Implementar**:
  - `rankOf`: contar `own.call(rs, id) && rs[id] === true`.
  - `cityCelebrate(mids, pre)`: `antes` = `CityStory.rankOf({ restored: obj }, CITY_DATA)` con `obj` armado recorriendo `Object.keys(CITY_DATA.districts)` (cada id restaurado que no esté en `mids`); `ahora` = `rankOf(S.city, CITY_DATA)`; texto según el spec: "Subes a X.", "Sigues como X: te falta 1 distrito para Y." / "te faltan N distritos para Y." (siguiente fila de `ranks` y distritos que faltan), o "Sigues como X." si no hay siguiente rango alcanzable.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`; ADV → solo `FIN` (con los dos archivos nuevos).

- [ ] **Step 5: Commit** — `fix(city): la celebración solo anuncia una subida de rango cuando la hay`

---

### Task 4: Humo en navegador, README y cierre

**Files:**
- Create (scratchpad, no se comitea): script Playwright; instalar `playwright@1.65.0 --ignore-scripts` en el scratchpad y lanzar con `executablePath` = `~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`; borrar ese directorio al terminar.
- Modify: `README.md` (Ciudad Núcleo: los cinco distritos), spec (sección final "Cambios de la implementación").

- [ ] **Step 1: Humo** en 390 × 844, 320 × 640 y 1280 × 800, con 0 errores de consola:
  - Entrar por el portal de cada distrito nuevo, hablar con el primer mentor (hoja dentro de la pantalla), volver a la plaza.
  - En cada escena: `.city-hud` ≤ 25 % del alto; `#city-rest` con `getBoundingClientRect().right <= innerWidth` y `scrollWidth <= clientWidth` (Review Focus 5).
  - Guardado sembrado con el jefe de M01 aprobado: Ciudadela al 50 % y objetivo sin torre; enseñar al 7.º aprendiz → hoja de celebración que cabe en 320 px, dice "Subes a" o "Sigues como" y se cierra con Escape sin dejar el foco en `body`.
  - Capturas recortadas de una criatura por distrito, revisadas con esta lista: rasgos oscuros visibles, ojos blancos, en M03 no se confunde con la reparación naranja.
- [ ] **Step 2: Si la pill de la Ciudadela se sale en 320 px**, acortar el nombre a "Ciudadela" en `m01.mjs`, en la tabla de `tests/tanda2_feasibility.cjs`, en el spec y en `celebrate` ("La Ciudadela aguanta la hora pico: ningún servidor carga solo con todo."); volver a correr SUITE.
- [ ] **Step 3: README y sección final del spec** (decisiones tomadas; incluye que el ícono "Ponte a prueba" sigue mostrando la criatura morada de M02).
- [ ] **Step 4: Correr** — SUITE → `FIN`; ADV → `FIN`.
- [ ] **Step 5: Commit** — `docs(city): Tanda 2 en el README y cambios de la implementación`
- [ ] **Step 6:** Revisión final de la rama (revisor de modelo potente) y cierre con `superpowers:finishing-a-development-branch`; merge y deploy a Netlify (`estudio-isw`) solo con confirmación del usuario.
