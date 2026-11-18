# Ciudad Núcleo — Tanda 3 (M04, M06, M07) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir los distritos Museo del Código (M04), Fábrica de Objetos (M06) y Cinco Calles (M07) y dejar el marco geométrico común en una sola función.

**Architecture:** `standardFrame()` en `city/layout.mjs` sustituye el marco copiado en M03, M01 y M10 (salida idéntica byte a byte). Tres archivos de datos nuevos con `standardFrame()` + `people()` y su registro. Sin cambios en el código del juego; las pruebas que suponían 5 distritos pasan a calcular sus valores desde los datos.

**Tech Stack:** HTML único generado por `node build.mjs`; `.mjs` de build en ES moderno; pruebas Node 22 + jsdom 31 + fast-check (`tests/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-18-ciudad-tanda-3-design.md` (v2).

## Global Constraints

- Datos exactos de las tablas del spec v2 (nombres, temas, etiquetas, colores, `style: 'red'`, `seed` 23/29/31, `need` 7, `celebrate.text`); modos `'explain'` / `'correct'`.
- Registro en `city/districts.mjs`: `{ M02, M08, M03, M01, M10, M04, M06, M07 }`.
- Marco común (spec): `bounds` −60..60 × −70..60; entrada `{ x: 0, z: 52, yaw: 0 }`; salida `{ x: 0, z: 57, w: 6, d: 2 }`; torre `{ id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }`; manzanas x {−42, −14, 14, 42} × z {30, 2, −26, −54}; calles x {−28, 0, 28}, z {16, −12, −40}; `makeLayout({ reserve: [[0, -64], [0, 52]], streetX, streetZ, xRange: [-52, 52], zRange: [52, -68] })`.
- Regla de nombres ampliada: dos nombres se parecen si comparten el inicio de `k = min(4, len(a), len(b))` letras sin acentos con `k ≥ 3`, o son iguales.
- Las pruebas nuevas o cambiadas no fijan conteos ni nombres de rango a mano.
- Antes de probar, `node build.mjs`; nunca dos builds a la vez.
- SUITE = `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/*.cjs; do case "$f" in tests/adv/lib.cjs|tests/adv/gen.cjs|tests/adv/runner.cjs) continue;; esac; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (verde = solo `FIN`).
- Merge, push y deploy solo con confirmación del usuario.

## Review Focus

1. **Guardado de la Tanda 2 que entra a la ciudad:** M04/M06/M07 aparecen vacíos, el HUD dice "Distritos n de 8" y no se pierde nada de los 5 anteriores. → Task 2 (`city_progress`).
2. **Rango con 8 distritos:** el 6.º restaurado dice "Subes a Senior.", el 7.º "Sigues como Senior: te falta 1 distrito para Arquitecto.", el 8.º "Subes a Arquitecto."; con 3 restaurados, el 4.º dice el plural "te faltan 2 distritos para Senior". → Task 2 (`review_tanda2_gaps`).
3. **Distritos existentes intactos tras `standardFrame()`:** `CITY_DATA` de M03, M01 y M10 idéntico byte a byte. → Task 1.
4. **Criaturas de 8 distritos:** ningún par de distritos distintos comparte forma y color de cuerpo; M02 intacta. → Task 2 (`city_sprites` c3 ya recorre todos los distritos).
5. **Teléfono 320 × 640:** pill "Fábrica de Objetos 100 %" sin salirse y hoja de celebración con "te faltan 2 distritos para Senior" dentro de la pantalla. → Task 3 (humo).

---

### Task 1: `standardFrame()` para el marco común

**Files:**
- Modify: `city/layout.mjs` (nueva exportación), `city/districts/m03.mjs`, `m01.mjs`, `m10.mjs`
- Test: `tests/city_layout.cjs`

**Interfaces:**
- Produces: `standardFrame() → { lay, tower, entry, exit, bounds, streets: { x, z }, blocks }` (un `lay` nuevo por llamada, con los valores del marco común).

- [ ] **Step 1: Pruebas rojas** en `tests/city_layout.cjs`: `'standardFrame(): devuelve el marco común (bounds, entrada, salida, torre, calles y 16 manzanas)'` comparando con los valores de Global Constraints; `'standardFrame(): cada llamada da un lay nuevo (el primer take() de dos marcos es el mismo lugar)'`. Además, en el scratchpad, guardar `JSON.stringify(city)` de `city/districts.mjs` y el md5 de `juego_estudio.html` antes del cambio.
- [ ] **Step 2: Correr y ver fallar** — `node tests/city_layout.cjs` → FAIL (`standardFrame` no existe).
- [ ] **Step 3: Implementar** `standardFrame()` y usarlo en M03, M01 y M10 (`const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();`), quitando sus constantes de marco.
- [ ] **Step 4: Verificar** — `node tests/city_layout.cjs` → OK; `JSON.stringify(city)` idéntico al guardado (`cmp`) y `node build.mjs` deja `juego_estudio.html` con el mismo md5; SUITE → `FIN`.
- [ ] **Step 5: Commit** — `refactor(city): marco geométrico común en layout.mjs (standardFrame)`

---

### Task 2: Distritos M04, M06 y M07, y pruebas que suponían 5

**Files:**
- Create: `city/districts/m04.mjs`, `m06.mjs`, `m07.mjs`
- Modify: `city/districts.mjs`
- Modify tests: `tests/tanda3_feasibility.cjs` y `tests/adv/tanda3_attack.cjs` (agregar a git), `tests/tanda2_feasibility.cjs`, `tests/review_tanda2_gaps.cjs:104-110,123-140`, `tests/adv/tanda2_impl_attack.cjs`, `tests/adv/tanda2_attack.cjs:189-192,239,242`, `tests/city_progress.cjs`

**Interfaces:**
- Consumes: `standardFrame()` (Task 1), `people()`.
- Produces: `CITY_DATA.districts` con 8 claves en el orden fijo.

- [ ] **Step 1: Pruebas rojas**
  - `tanda3_feasibility.cjs`: tablas de la v2 del spec (criaturas, etiquetas, colores, nombres renombrados) y la regla de nombres ampliada; su caso "el archivo real es idéntico a la tabla" queda rojo hasta el Step 3.
  - `tanda3_attack.cjs`: que arme D8 desde los datos reales de `city/districts.mjs` (sin tablas copiadas) y que su regla de nombres use la ampliada.
  - `tanda2_feasibility.cjs`: las reglas entre distritos (color propio, nombres) recorren todos los distritos de `city.districts` (los 5 actuales más los de la tabla de la tanda 2 si no están registrados) con la regla ampliada.
  - `review_tanda2_gaps.cjs`: la tabla de líneas de rango se calcula para `total` = número de distritos: 5→6 "Subes a Senior.", 6→7 "Sigues como Senior: te falta 1 distrito para Arquitecto.", 7→8 "Subes a Arquitecto.", 8/8 "Sigues como Arquitecto. Llevas 8 de 8 distritos restaurados.", 3→4 "Sigues como Semi-senior: te faltan 2 distritos para Senior."; los límites con `withRanks` usan `total` y `total + 1`; los escenarios jsdom del 4.º y 5.º esperan los textos calculados; el recorrido de todas las combinaciones compara con la lista calculada (incluye el plural).
  - `tanda2_impl_attack.cjs`: `MODS` se arma desde las claves de `districts` con un mapa id → archivo y título; S3 y K2 usan `SIN = ORDER.find(m => !districts[m])` en vez de `'M04'`; V2 calcula el texto esperado con `total`.
  - `tanda2_attack.cjs`: la secuencia de la plaza se compara con `ORDER.filter(m => districts[m])`; `:239,242` usan `SIN` en vez de `'M04'`.
  - `city_progress.cjs`: `'RF1-T3 guardado de la Tanda 2: tras guardar, M04, M06 y M07 existen vacíos y el HUD dice "Distritos 0 de 8"'` (mismo patrón que RF1, forzando `save()` con `quick(e)`).
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/tanda3_feasibility.cjs; node tests/review_tanda2_gaps.cjs; node tests/city_progress.cjs` → FAIL (faltan los distritos o los textos de 8).
- [ ] **Step 3: Implementar** los tres archivos con `standardFrame()` + `people()` y las tablas del spec, y su registro.
- [ ] **Step 4: Correr** — SUITE → solo `FIN`.
- [ ] **Step 5: Commit** (con `juego_estudio.html`) — `feat(city): distritos Museo del Código, Fábrica de Objetos y Cinco Calles`

---

### Task 3: Humo, README, revisión y cierre

**Files:**
- Create (scratchpad, no se comitea): script Playwright (`npm i playwright@1.65.0 --ignore-scripts` en el scratchpad; `executablePath` = `~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`; borrar el directorio al terminar).
- Modify: `README.md`, spec (sección final "Cambios de la implementación").

- [ ] **Step 1: Humo** en 390 × 844, 320 × 640 y 1280 × 800, con 0 errores de consola: entrar por el portal de cada distrito nuevo, primer mentor (hoja dentro de la pantalla), primera criatura (captura), salida a la plaza; HUD ≤ 25 % del alto y `#city-rest` con `right ≤ innerWidth` y sin desbordar; celebración en 320 px con un guardado de 3 restaurados al restaurar el 4.º ("te faltan 2 distritos para Senior") y con 7 al restaurar el 8.º ("Subes a Arquitecto."): la hoja cabe y se cierra con Escape sin dejar el foco en `body`.
- [ ] **Step 2: README** (8 distritos, rango máximo Arquitecto, Tech Lead pide M11; enlace a este spec) y sección final del spec.
- [ ] **Step 3: Correr** — SUITE → `FIN`.
- [ ] **Step 4: Commit** — `docs(city): Tanda 3 en el README y cambios de la implementación`
- [ ] **Step 5:** Revisión final de la rama (revisor de modelo potente) y cierre con `superpowers:finishing-a-development-branch`; merge y deploy a Netlify (`estudio-isw`) solo con confirmación del usuario.
