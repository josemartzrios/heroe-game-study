# Ciudad Núcleo — Tanda 2 (M03, M01, M10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir los distritos Barrio Byte (M03), Ciudadela Escalable (M01) y Muralla Cifrada (M10) en la ciudad, con criaturas distinguibles por distrito y un aviso de rango que no mienta.

**Architecture:** Tres archivos de datos con el patrón de `city/districts/m08.mjs` (sin ruta), registrados en `city/districts.mjs`. Dos cambios de código pequeños: los colores de criatura salen del distrito en `city/sprites2d.js`, y `cityCelebrate` en `city/view.js` compara el rango con el de antes. Las pruebas que suponían 2 distritos pasan a contar los distritos desde los datos.

**Tech Stack:** HTML único generado por `node build.mjs`, JS ES5 en `city/*.js` y `engine.html`, ESM solo de build en `*.mjs`, pruebas Node 22 + jsdom 31 + fast-check (`tests/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-17-ciudad-tanda-2-design.md` (v2; para formato y reglas, `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` §4).

## Global Constraints

- ES5 en `city/*.js` y `engine.html` (sin `let`/`const`/flechas/`Array.from`); los `.mjs` pueden usar ES moderno.
- Texto de datos a `innerHTML` solo con `esc()`/`fmt()`; nada de código que no se use; ganchos de prueba solo con `window.__CITY_TEST__ === true`.
- `city/districts.mjs`: `districts: { M02, M08, M03, M01, M10 }` en ese orden (M02 primero: conserva su aspecto).
- Datos exactos de las tablas del spec (nombres, temas, etiquetas, colores, `style: 'red'`, `seed` 13/17/19, `need` 7, `celebrate.text`).
- Marco de los tres distritos: `bounds` −60..60 × −70..60; entrada (0, 52, yaw 0); salida (0, 57, 6 × 2); torre `{ id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }`; manzanas x {−42, −14, 14, 42} × z {30, 2, −26, −54}; calles x {−28, 0, 28}, z {16, −12, −40}; `makeLayout({ reserve: [[0, -64], [0, 52]], streetX, streetZ, xRange: [-52, 52], zRange: [52, -68] })`; orden de `take()`: mentores → criaturas (`area.r` 6) → reparaciones → aprendices. Usar `lay.take()` directo.
- Antes de probar siempre `node build.mjs` (las pruebas leen `juego_estudio.html`); nunca dos builds a la vez.
- SUITE = `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs tests/adv/route_props.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (verde = solo `FIN`). ADV = el mismo bucle sobre `tests/adv/*.cjs` salvo `lib.cjs`, `gen.cjs` y `runner.cjs`.
- Merge, push y deploy solo con confirmación del usuario.

## Review Focus

1. **Partida guardada en la Tanda 1 que entra a un distrito nuevo:** `S.city.d` sin M03/M01/M10 → los distritos aparecen vacíos, sin errores, y el HUD dice "Distritos n de 5". → Task 1 (`city_progress`).
2. **Jefe de M01 aprobado antes (desde Módulos):** la Ciudadela marca 50 %, el objetivo no manda a la torre y enseñar al 7.º aprendiz celebra M01 sin poder. → Task 1 (`city_progress`).
3. **Restaurar un distrito con el rango sin cambio** (2.º restaurado: ya Junior): la celebración dice "Sigues como Junior.", nunca "Subes a Junior.". → Task 3.
4. **Criaturas de distritos distintos con el mismo índice** (la 1.ª de M02 y la 1.ª de M03): colores de cuerpo distintos; M02 idéntica a hoy. → Task 2.
5. **Teléfono 320 × 640 dentro de la Ciudadela** (nombre más largo): la pill "Ciudadela Escalable n %" no desborda y el HUD queda ≤ 25 % del alto. → Task 4 (humo).

---

### Task 1: Datos de los tres distritos y pruebas que suponían 2

**Files:**
- Create: `city/districts/m03.mjs`, `city/districts/m01.mjs`, `city/districts/m10.mjs`
- Modify: `city/districts.mjs:3-4,29` (imports y `districts`)
- Modify tests: `tests/tanda2_feasibility.cjs`, `tests/city_sprites.cjs:41-42`, `tests/city_move.cjs:55-56,68`, `tests/city_world2d.cjs:118-119`, `tests/city_scenes.cjs:87,161,239`, `tests/city_story.cjs:84`, `tests/validate_districts.cjs:68`, `tests/migrate.cjs:44-51`, `tests/city_progress.cjs`, `tests/adv/tanda2_attack.cjs` (lo agrega este task)

**Interfaces:**
- Produces: `export const district` en cada archivo nuevo, forma §4.2; `CITY_DATA.districts` con 5 claves en el orden fijo.

- [ ] **Step 1: Pruebas rojas**
  - En `tests/tanda2_feasibility.cjs`, nuevo bloque: importar `city/districts.mjs` y para M03, M01, M10 comprobar `'<mid>: los datos del archivo coinciden con la tabla del spec'` (nombre, colores, style, seed, need, celebrate, nombres de mentores en orden de tema, criaturas id/nombre/temas, reparaciones tema/etiqueta, aprendices nombre/tema/modo) y `'<mid>: checkDistrict R1–R7 sin errores con el archivo real'`.
  - Pruebas que cuentan distritos, reescritas para leer los datos: `const OPEN = Object.keys(D.districts).length` (5) y `PEND = D.order.length - OPEN` (6). `city_move:55-56` → `existing.length === OPEN && pending.length === PEND` y `plazaBoxes.length === 1 + PEND + 4`; `city_world2d:118-119` → `open.length === OPEN`, `pend.length === PEND`; `city_scenes:87` → `'Distritos 0 de 5'`; `city_sprites:41-42` → criaturas `6 + 5 + 6 + 6 + 6 = 29` en celdas distintas y personas `1 + Σ(mentores + aprendices)` calculado desde `D` (= 147).
  - Portal sin distrito elegido desde los datos: `const SIN = D.order.find((m) => !Object.prototype.hasOwnProperty.call(D.districts, m))` (hoy M04) en lugar de `'M03'` en `city_move:68`, `city_story:84`, `city_scenes:161,239` y `validate_districts:68`.
  - `migrate.cjs` M1: el estado `full` lleva también `M03`, `M01` y `M10` con `{ beaten: {}, repairs: {}, taught: {} }`.
  - `city_progress.cjs` (Review Focus 1 y 2): `'guardado de la Tanda 1: M03, M01 y M10 vacíos y HUD "Distritos 0 de 5"'`; `'jefe de M01 aprobado: 50 %, objetivo sin torre, y el 7.º aprendiz enseñado restaura M01 sin poder'` (semilla `boss: { M01: { best: 18, passed: true } }`, `d.M01.taught` con 6 ids; enseñar el 7.º con `startRound({ kind: 'teach', mid: 'M01', city: { kind: 'teach', id, mid: 'M01' } })`; `restored.M01 === true`, `powers` sin claves nuevas).
  - `git add tests/adv/tanda2_attack.cjs` y cambiar su fuente de datos: los tres distritos nuevos se leen de `city/districts.mjs` (no de tablas copiadas). Su caso `A: cada restauración nueva sube el rango` sigue rojo hasta Task 3.

- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/tanda2_feasibility.cjs; node tests/city_move.cjs; node tests/city_scenes.cjs` → FAIL (no existen los archivos; conteos de 2 distritos).

- [ ] **Step 3: Implementar** los tres archivos (patrón de `m08.mjs` sin `route` ni pads, con el marco de Global Constraints y las tablas del spec) y el registro en `city/districts.mjs`.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`. `node tests/adv/tanda2_attack.cjs` → 1 FAIL (el del rango), el resto PASS.

- [ ] **Step 5: Commit** (con `juego_estudio.html` recompilado) — `feat(city): distritos Barrio Byte, Ciudadela Escalable y Muralla Cifrada`

---

### Task 2: Criaturas con los colores de su distrito

**Files:**
- Modify: `city/sprites2d.js:18-28` (setData), `:51-56` (`creature`), `:82` (dibujo del atlas)
- Test: `tests/city_sprites.cjs`

**Interfaces:**
- Consumes: `CITY_DATA.districts[mid].colors = { a, b }`.
- Produces: `creature(g, ox, oy, step, i, body, mark)`; `body`/`mark` `null` → paleta actual (M02); si no, `body = colors.a` y `mark = colors.b` del distrito.

- [ ] **Step 1: Pruebas rojas** en `tests/city_sprites.cjs` (el atlas falso ya registra `fillStyle` por celda):
  - `'(c1) las criaturas de M02 siguen con su paleta: la celda de M02:<id> usa exactamente los mismos colores que antes'` (comparar contra los 6 morados `['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0']` según su índice).
  - `'(c2) la 1.ª criatura de M03 usa #ff9f43 en el cuerpo y #4d7cff en la marca, distinta de la 1.ª de M02'`.
  - `'(c3) dos distritos distintos nunca dan el mismo par de colores a criaturas con el mismo índice'` (recorrer los 5).

- [ ] **Step 2: Correr y ver fallar** — `node tests/city_sprites.cjs` → FAIL en c2 y c3.

- [ ] **Step 3: Implementar**: en `setData`, junto a `STYLE`, guardar por criatura `TINT.push(di === 0 ? null : [M.colors.a, M.colors.b])`; `creature` usa `body`/`mark` cuando vienen y la paleta actual si no. La forma sigue con `STYLE`.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`.

- [ ] **Step 5: Commit** — `feat(city): criaturas con los colores de su distrito`

---

### Task 3: El aviso de rango solo cuando sube

**Files:**
- Modify: `city/view.js:579-595` (`cityCelebrate`)
- Test: `tests/city_scenes.cjs` (o `tests/city_progress.cjs`, donde ya hay celebraciones), `tests/adv/tanda2_attack.cjs`

**Interfaces:**
- Consumes: `CityStory.rankOf(C, D)` (sin cambios).

- [ ] **Step 1: Pruebas rojas**
  - `'restaurar M08 con M02 ya restaurado: la hoja dice "Sigues como Junior." y no "Subes a"'`.
  - `'restaurar el primer distrito: la hoja dice "Subes a Junior."'`.
  - `'restaurar dos a la vez (de 0 a 2): "Subes a Junior."'` (rango antes Becario).

- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_progress.cjs` → FAIL en el primer caso.

- [ ] **Step 3: Implementar**: en `cityCelebrate`, calcular el rango previo con `CityStory.rankOf({ restored: copia de S.city.restored sin los ids de mids }, CITY_DATA)` (copia con un bucle ES5) y escribir `'Subes a ' + ahora + '.'` si difiere o `'Sigues como ' + ahora + '.'` si no.

- [ ] **Step 4: Correr** — SUITE → solo `FIN`; ADV → solo `FIN` (incluye `tanda2_attack` ya verde).

- [ ] **Step 5: Commit** — `fix(city): la celebración solo anuncia una subida de rango cuando la hay`

---

### Task 4: Humo en navegador, README y cierre

**Files:**
- Create (scratchpad, no se comitea): script Playwright con Chromium de `~/.cache/ms-playwright/chromium_headless_shell-1248` (instalar `playwright@1.65.0` en el scratchpad y lanzar con `executablePath`).
- Modify: `README.md` (sección Ciudad Núcleo: los cinco distritos), `docs/superpowers/specs/2026-11-17-ciudad-tanda-2-design.md` (sección final "Cambios de la implementación" con las decisiones tomadas).

- [ ] **Step 1: Humo** en 390 × 844, 320 × 640 y 1280 × 800: desde la plaza entrar por el portal de cada distrito nuevo, comprobar que el nombre llega al HUD, hablar con el primer mentor (hoja dentro de la pantalla), salir a la plaza; 0 errores de consola; `.city-hud` ≤ 25 % del alto (en 320 × 640 dentro de la Ciudadela, Review Focus 5); capturas de cada distrito (edificios y criaturas con sus colores).
- [ ] **Step 2: Si la pill de la Ciudadela desborda en 320 px**, acortar el nombre a "Ciudadela" en `m01.mjs` y en la tabla del spec y anotarlo; volver a correr SUITE.
- [ ] **Step 3: README y sección final del spec**.
- [ ] **Step 4: Correr** — SUITE → `FIN`; ADV → `FIN`.
- [ ] **Step 5: Commit** — `docs(city): Tanda 2 en el README y cambios de la implementación`
- [ ] **Step 6:** Revisión final de la rama (revisor de modelo potente) y cierre con `superpowers:finishing-a-development-branch`; merge y deploy a Netlify (`estudio-isw`) solo con confirmación del usuario.
