# Ciudad Núcleo — Tanda 3 (M04, M06, M07) Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir los distritos Museo del Código (M04), Fábrica de Objetos (M06) y Cinco Calles (M07), dejar el marco geométrico común en una sola función y las reglas entre distritos de las pruebas en un solo sitio.

**Architecture:** `standardFrame()` en `city/layout.mjs` sustituye el marco copiado en M03, M01 y M10 (salida idéntica byte a byte). Las pruebas que suponían 5 distritos pasan a calcular desde los datos, con las reglas entre distritos y el mapa de módulos en dos helpers de prueba compartidos. Después, tres archivos de datos nuevos y su registro. Sin cambios en el código del juego.

**Tech Stack:** HTML único generado por `node build.mjs`; `.mjs` de build en ES moderno; pruebas Node 22 + jsdom 31 + fast-check (`tests/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-18-ciudad-tanda-3-design.md` (v2).

## Global Constraints

- Datos exactos de las tablas del spec v2 (nombres —incluidos Mila, Casimiro y Rubén—, temas, etiquetas, colores, `style: 'red'`, `seed` 23/29/31, `need` 7, `celebrate.text`); modos `'explain'` / `'correct'`.
- Registro en `city/districts.mjs`: `{ M02, M08, M03, M01, M10, M04, M06, M07 }`.
- Marco común: `bounds` −60..60 × −70..60; entrada `{ x: 0, z: 52, yaw: 0 }`; salida `{ x: 0, z: 57, w: 6, d: 2 }`; torre `{ id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }`; manzanas x {−42, −14, 14, 42} × z {30, 2, −26, −54}; calles x {−28, 0, 28}, z {16, −12, −40}; `makeLayout` con `reserve` calculado desde torre y entrada, `xRange` [−52, 52], `zRange` [52, −68]. El orden de claves del objeto distrito no cambia (bounds, entry, exit, streets, blocks…), para que la salida sea idéntica.
- **Regla de nombres** (spec): `phon(nombre)` aplica, en este orden y sobre el nombre sin acentos y en minúsculas: `ch` → marca; `qu` → k; `gu` antes de e/i → g; `c` antes de e/i → s; `c` → k; `g` antes de e/i → j; `h` se borra; la marca vuelve a `ch`; `z` → s; `v` → b; `x` → j; `ll` → i; `y` → i; letras dobles → una. Se parecen si las formas son iguales o comparten el inicio de k = min(4, largo de cada forma) con k ≥ 3. No hay nombres de menos de 3 letras (`nameClashes` también los reporta). Excepciones heredadas: Carla/Karla y Elena/Helena. Vive en un solo helper (`tests/district_rules.cjs`) y todas las pruebas lo importan.
- Las pruebas nuevas o cambiadas no fijan conteos, nombres de rango ni listas de distritos a mano; el "módulo sin distrito" es `FIRST_WALL = ORDER.find(m => !districts[m])`.
- Antes de probar, `node build.mjs`. **La SUITE nunca corre en paralelo con otras pruebas ni builds** (los fuzz con límite de tiempo fallan si la máquina está cargada), y todo `FALLO` se repite solo, sin carga, antes de darlo por real.
- SUITE = `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/*.cjs; do case "$f" in tests/adv/lib.cjs|tests/adv/gen.cjs|tests/adv/runner.cjs) continue;; esac; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (verde = solo `FIN`). **Hasta la Task 2b**, la SUITE salta los archivos sin versionar de la revisión: `tests/tanda3_feasibility.cjs`, `tests/adv/tanda3_attack.cjs` y `tests/adv/tanda3_plan_attack.cjs` (hoy fallan a propósito).
- Merge, push y deploy solo con confirmación del usuario.

## Review Focus

1. **Guardado de la Tanda 2 que entra a la ciudad:** los distritos que no estaban aparecen vacíos, el HUD dice "Distritos 0 de N" y no se pierde nada. → Task 2a (`city_progress`, RF1 generalizado).
2. **Rango con 8 distritos:** 3→4 "Sigues como Semi-senior: te faltan 2 distritos para Senior.", 5→6 "Subes a Senior.", 6→7 "Sigues como Senior: te falta 1 distrito para Arquitecto.", 7→8 "Subes a Arquitecto.". → Task 2b (`tanda3_attack` T6).
3. **Distritos existentes intactos tras `standardFrame()`, sin objetos compartidos:** `CITY_DATA` idéntico byte a byte y dos marcos sin ningún objeto en común. → Task 1.
4. **Criaturas de 8 distritos:** ningún par de distritos distintos comparte forma y color de cuerpo; M02 intacta. → Task 2b (`city_sprites` c3 recorre todos).
5. **Teléfono 320 × 640 en el peor caso:** dentro de Fábrica de Objetos al 100 %, rango Arquitecto y nivel ≥ 5 (con "Correr"), el HUD no pasa del 25 % ni desborda; el botón "Entrar a Fábrica de Objetos" cabe; la hoja de celebración se lee sin desplazar. → Task 3 (humo).

---

### Task 1: `standardFrame()` para el marco común

**Files:**
- Modify: `city/layout.mjs` (nueva exportación), `city/districts/m03.mjs`, `m01.mjs`, `m10.mjs`
- Test: `tests/city_layout.cjs`; adaptar la parte (a) de `tests/adv/tanda3_plan_attack.cjs` al `standardFrame()` real (sin candidatas propias)

**Interfaces:**
- Produces: `standardFrame() → { lay, tower, entry, exit, bounds, streets: { x, z }, blocks }`, con todos los objetos y arrays nuevos en cada llamada.

- [ ] **Step 1: Pruebas rojas** en `tests/city_layout.cjs`: `'standardFrame(): devuelve el marco común'` (valores de Global Constraints y 16 manzanas); `'standardFrame(): dos llamadas no comparten ningún objeto ni array'` (recorrido profundo con `!==`); `'standardFrame(): cada llamada da un lay nuevo (el primer take() de dos marcos es el mismo lugar)'`. Guardar en el scratchpad `JSON.stringify(city)` y el md5 de `juego_estudio.html` antes del cambio.
- [ ] **Step 2: Correr y ver fallar** — `node tests/city_layout.cjs` → FAIL (`standardFrame` no existe).
- [ ] **Step 3: Implementar** `standardFrame()` y usarlo en M03, M01 y M10 desestructurando sus campos (nunca `...standardFrame()` en el literal, que metería `lay` y cambiaría el orden de las claves).
- [ ] **Step 4: Verificar** — `node tests/city_layout.cjs` → OK; `cmp` del `JSON.stringify(city)` guardado; `node build.mjs` deja el mismo md5; `node tests/adv/tanda3_plan_attack.cjs` → su parte (a) en verde; SUITE → `FIN`.
- [ ] **Step 5: Commit** — `refactor(city): marco geométrico común en layout.mjs (standardFrame)`

---

### Task 2a: Pruebas calculadas desde los datos (verde con 5 distritos)

Un cambio de pruebas sin cambio de datos: antes y después la SUITE queda verde con 5 distritos; su valor es que la Task 2b no tenga que tocarlas.

**Files:**
- Create: `tests/modules.cjs` (mapa id → `{ file, title }` de los 10 módulos, el mismo de `build.mjs:20-29`), `tests/district_rules.cjs` (`phon(name)`, `namesNear(a, b)`, `nameClashes(districts)` con las excepciones heredadas, `ownColorProblems(districts)`, y comprobaciones de seeds y nombres de distrito únicos)
- Modify: `tests/migrate.cjs:46-48` (M1: `full.city.d` se arma con `Object.keys` de `city.districts`), `tests/tanda2_feasibility.cjs` (sin su sección "entre distritos": usa `district_rules` sobre `city.districts`; `build()` usa `standardFrame()` + `people()`), `tests/review_tanda2_gaps.cjs:98-110,123-140` (escenarios jsdom del 3.º, 4.º, 5.º y acumulados, y la tabla de líneas: oráculo genérico con `total` = número de distritos; límites de `withRanks` con `total` y `total + 1`), `tests/adv/tanda2_impl_attack.cjs` (`MODS` desde `tests/modules.cjs` y las claves de `districts`; `FIRST_WALL` en lugar de `'M04'` en S3 y K2 (en `:231,260,281` y en `tanda2_attack.cjs:239,242,284` `'M04'` es solo una clave basura de fuzz: se deja); V2 con `total`), `tests/adv/tanda2_attack.cjs` (secuencia de la plaza con `ORDER.filter(m => districts[m])`), `tests/city_progress.cjs` (RF1 generalizado: los distritos que faltan en el guardado se calculan desde `D.districts` y el HUD se compara con su número)

- [ ] **Step 1: Escribir los helpers y adaptar las pruebas** como dice Files. Prueba propia de `district_rules` (en `tests/district_rules_test.cjs`): `namesNear('Ana','Hana')`, `namesNear('Javi','Xavier')`, `namesNear('Gil','Gilda')` verdaderos; `namesNear('Ana','Ada')`, `namesNear('Sol','Saúl')` falsos; `nameClashes` no reporta las excepciones heredadas y sí reporta un nombre de 2 letras.
- [ ] **Step 2: Mutación de control** — cambiar en una copia temporal un nombre de M10 por "Ana" y comprobar que `tanda2_feasibility` falla; deshacer.
- [ ] **Step 3: Correr** — SUITE (saltando los `tanda3_*`) → `FIN`.
- [ ] **Step 4: Commit** — `test(city): pruebas de distritos calculadas desde los datos y reglas entre distritos en un solo helper`

---

### Task 2b: Distritos M04, M06 y M07

**Files:**
- Create: `city/districts/m04.mjs`, `m06.mjs`, `m07.mjs`
- Modify: `city/districts.mjs`
- Tests (agregar a git): `tests/tanda3_feasibility.cjs` (SPEC reemplazado entero desde el spec v2; `build()` con `standardFrame()` + `people()`; reglas entre distritos vía `district_rules`; "existen todos los de `NEW` y los registrados", sin fijar un 8), `tests/adv/tanda3_attack.cjs` (`NEW = ['M04', 'M06', 'M07']`; `D8 = city` real; `D5 = city` sin `NEW`; conteos con `.length` y rangos con `rankName`; su C3 usa `district_rules`; T6 con los textos de Review Focus 2), `tests/adv/tanda3_plan_attack.cjs` (parte (b): las personas salen de `city.districts` real, sin `NEW_PEOPLE` copiado, y usa `district_rules`; B5 comprueba que un nombre de 2 letras se reporta como demasiado corto; parte (c) `cityRankLine` real)

**Interfaces:**
- Consumes: `standardFrame()` (Task 1), `people()`, `tests/district_rules.cjs` y `tests/modules.cjs` (Task 2a).
- Produces: `CITY_DATA.districts` con 8 claves en el orden fijo.

- [ ] **Step 1: Pruebas rojas** — los tres archivos de prueba como dice Files.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/tanda3_feasibility.cjs; node tests/adv/tanda3_attack.cjs` → FAIL ("el distrito no está registrado" y T6).
- [ ] **Step 3: Implementar** los tres archivos con `standardFrame()` + `people()` y las tablas del spec, y su registro.
- [ ] **Step 4: Correr** — SUITE completa (ya sin saltar nada) → `FIN`.
- [ ] **Step 5: Commit** (con `juego_estudio.html`) — `feat(city): distritos Museo del Código, Fábrica de Objetos y Cinco Calles`

---

### Task 3: Humo, README, revisión y cierre

**Files:**
- Create (scratchpad, no se comitea): script Playwright (`npm i playwright@1.65.0 --ignore-scripts` en el scratchpad; `executablePath` = `~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`, que debe existir; borrar el directorio al terminar).
- Modify: `README.md` (líneas 22 y 26: 8 distritos, rango máximo Arquitecto, Tech Lead pide M11; la lista de archivos incluye `m04`, `m06` y `m07`; enlace al spec), spec (sección final "Cambios de la implementación").

- [ ] **Step 1: Humo** en 390 × 844, 320 × 640 y 1280 × 800, escuchando `console` (errores), `pageerror` y `requestfailed` (0 de cada uno):
  - Entrar por el portal de cada distrito nuevo, primer mentor, salida a la plaza.
  - En la plaza a 320 px, ante cada portal nuevo: el `getBoundingClientRect()` de `#city-act` queda entre 0 e `innerWidth`.
  - Peor caso del HUD: guardado sembrado dentro de M06 con M06 restaurado (100 %), rango Arquitecto y nivel ≥ 5. `.city-hud` ≤ 25 % del alto; `#city-rest` con `left ≥ 0`, `right ≤ innerWidth` y `scrollWidth ≤ clientWidth`; `document.documentElement.scrollWidth ≤ innerWidth`.
  - Celebración en 320 px con un guardado de 3 restaurados al restaurar el 4.º ("te faltan 2 distritos para Senior") y con 7 al restaurar el 8.º ("Subes a Arquitecto."). Recién abierta y sin desplazar se ven `#city-sheet-title`, el `<b>` con la línea de rango y el botón Cerrar (rects dentro de 0..innerHeight); la hoja no desborda en ancho; el foco cae en Cerrar al abrir; tras Escape, el foco queda en un elemento visible fuera de `#city-sheet` y de cualquier `[inert]` (p. ej. `#city-pause`).
  - Capturas a 390 px de las 6 criaturas de M06 y de M07, y una tira con la primera criatura de M08 y de M04 lado a lado; anotar en "Cambios de la implementación" si se ven los ojos y la forma y si M08/M04 se confunden. Anotar el alto del atlas de personas.
- [ ] **Step 2: README y sección final del spec.**
- [ ] **Step 3: Correr** — SUITE → `FIN`.
- [ ] **Step 4: Commit** — `docs(city): Tanda 3 en el README y cambios de la implementación`
- [ ] **Step 5:** Revisión final de la rama (revisor de modelo potente) y cierre con `superpowers:finishing-a-development-branch`; merge y deploy a Netlify (`estudio-isw`) solo con confirmación del usuario.
