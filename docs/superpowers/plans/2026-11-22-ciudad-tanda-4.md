# Ciudad Núcleo — Tanda 4 (M05 y M09): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los portales de M05 y M09 lleven a dos distritos de datos completos (10 distritos en total), sin tocar el código del juego.

**Architecture:**
- **Datos:** `city/districts/m05.mjs` y `m09.mjs` copian la forma de `m07.mjs` (`standardFrame()` y `people()`) y se registran en `city/districts.mjs`.
- **Pruebas:**
  - lo común de la factibilidad pasa a `tests/feasibility_lib.cjs`;
  - la regla de distancia de color va a `tests/district_rules.cjs`;
  - las pruebas jsdom que dependen de cuántos distritos hay se adaptan sin perder comprobaciones.

**Tech Stack:**
- ES modules de datos (`.mjs`), Node con jsdom y fast-check (`tests/node_modules`).
- HTML único generado por `node build.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-22-ciudad-tanda-4-design.md` (v2, aprobado). Las tablas de contenido exactas están ahí; este plan no las repite.

## Global Constraints
- **Código del juego:** no se toca nada de `city/view.js`, `city/world2d.js`, `city/sprites2d.js`, `city/story.js`, `engine.html` ni `build.mjs`. Solo hay datos y pruebas.
- **Contenido:** los valores salen literalmente de las tablas del spec:
  - nombres, colores (`#ff4800`/`#fff700` y `#36a3ff`/`#f4f4ff`) y semillas (37 y 41);
  - criaturas en ese orden, con sus ids;
  - etiquetas, aprendices y modos (`'explain'` / `'correct'`) y textos de celebración;
  - `style: 'red'` y `need: 7`.
- **Orden del registro:** `{ M02, M08, M03, M01, M10, M04, M06, M07, M05, M09 }`.
- **Distancia de color:** ΔE2000 ≥ 10 con `de00`, la misma de `tests/adv/tanda3_attack.cjs:73-97`. Se mide frente a:
  - los colores de los otros distritos;
  - `#ffd76a`, `#ff8f3a` y `#ffd23f`;
  - los 6 morados de referencia (`feasibility_lib.cjs:5`).
- **Ninguna prueba pierde comprobaciones.** Se adapta su cálculo, y cada adaptación conserva o aumenta el número de `ok(...)`.
- **Build y suite:**
  - Nunca dos `node build.mjs` a la vez. Las pruebas leen `juego_estudio.html`, así que se construye antes.
  - La suite nunca corre en paralelo con otras pruebas.
  - Un `FALLO` se repite solo antes de tratarlo como real.
- **SUITE:** `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/*.cjs; do case "$f" in tests/adv/lib.cjs|tests/adv/gen.cjs|tests/adv/runner.cjs) continue;; esac; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
  - En verde imprime solo `VALIDACIÓN OK` y `FIN`.
  - Tarda unos 15 minutos, así que se lanza en segundo plano.
- **Rama y commits:** el usuario decide la rama antes de la Tarea 1. Los commits llevan la línea `Co-Authored-By` que indique el sistema.

## Review Focus
1. **Un guardado de la Tanda 3 que entra a la plaza.** Tras M07, el objetivo debe mandar a «Mercado de Patrones», luego a «Laboratorio Neuronal», y al final decir «Ciudad al día». La prueba va en la Tarea 3 (6c ampliado: la plaza tras restaurar los 10).
2. **Criaturas de M05 y M09.** El cuerpo debe ser `colors.a` y los ojos tienen que verse. Se fija en la Tarea 1 (`colorDistanceProblems` incluye el blanco de los ojos) y en el humo de la Tarea 4.
3. **El botón «Entrar a Laboratorio Neuronal» a 320 px.** No debe tapar el joystick ni cortar palabras. Se comprueba en el humo de la Tarea 4.
4. **Enseñar a un aprendiz en los distritos nuevos.** Debe premarcar con texto real y no con texto genérico. Lo cubre `city_teach_content.cjs` (Tarea 2) recorriendo los 101 aprendices.
5. **Atlas de personas.** Debe medir 3 948 px y seguir por debajo de 4 096. Lo cubre `city_sprites.cjs` con los datos reales (Tarea 2); el alto se anota en la Tarea 4.

---

### Task 1: Factibilidad común y regla de distancia de color

**Files:**
- Modify: `tests/feasibility_lib.cjs`, que gana `run`.
- Modify: `tests/district_rules.cjs`, que gana `de00` y `colorDistanceProblems`.
- Modify: `tests/tanda3_feasibility.cjs:82-140`, que queda en su tabla `SPEC` más la llamada a `run`.
- Test: `tests/district_rules_test.cjs`.

**Interfaces:**
- Produces:
  - `run(SPEC, label, { imp, ok, root }) → Promise<void>` en `feasibility_lib`. Hace exactamente lo que hoy hace `tanda3_feasibility.cjs:82-138`:
    - el sondeo de lugares;
    - `shape`, los conteos 6/9/10/need, el nombre sin artículo, `build`, `checkDistrict` y `detail`;
    - la comparación con el archivo real;
    - las reglas entre todos los distritos registrados.

    Además añade la comprobación `colorDistanceProblems(city.districts, Object.keys(SPEC)).length === 0`.
  - `de00(hexA, hexB) → number` y `colorDistanceProblems(districts, ids) → string[]` en `district_rules`.
    - Para cada id de `ids` y cada color `a`/`b` de ese distrito, devuelve un texto por cada color de referencia a ΔE2000 < 10.
    - Los colores de referencia son: los `colors` de los demás distritos, `#ffd76a`, `#ff8f3a`, `#ffd23f`, los 6 morados y, solo para `colors.a`, el blanco de los ojos `#ffffff`.

- [ ] **Step 1: Contar las comprobaciones actuales.** Run: `node tests/tanda3_feasibility.cjs | tail -1`. Expected: `TANDA 3 FACTIBLE OK (N)`. Anotar N; tras el refactor debe salir N + 1 (por la regla de color nueva).
- [ ] **Step 2: Escribir las pruebas de `colorDistanceProblems` en `tests/district_rules_test.cjs`:**
  - `de00('#ffd76a', '#ffe600')` < 10 y `de00('#ff4800', '#ff8f3a')` ≥ 15.
  - Un distrito `{ X: { colors: { a: '#ff8c42', b: '#36a3ff' } } }` con `ids = ['X']` da un problema que nombra `#ff8f3a`.
  - `{ X: { colors: { a: '#f4f4ff', b: '#36a3ff' } } }` da un problema que nombra el blanco de los ojos.
  - `{ X: { colors: { a: '#7c5cff', … } } }` nombra `#8a5fe0`.
  - Los colores del spec, `{ M05: { a: '#ff4800', b: '#fff700' }, M09: { a: '#36a3ff', b: '#f4f4ff' } }` junto a los 8 distritos reales, dan `[]`.
  - Un id que no está en `ids` no se mide. Así M04/M08, a ≈ 14, no cuenta.
- [ ] **Step 3: Comprobar que falla.** Run: `node tests/district_rules_test.cjs`. Expected: excepción o FAIL porque `colorDistanceProblems` no existe.
- [ ] **Step 4: Implementar.**
  - En `district_rules.cjs`: `de00` (se mueve tal cual desde `tanda3_attack.cjs:73-97`, junto con su `lab`) y `colorDistanceProblems`. `tanda3_attack.cjs` pasa a importarlos, sin duplicar el código.
  - En `feasibility_lib.cjs`: `run`.
  - `tanda3_feasibility.cjs` queda en: cabecera, `SPEC` y `F.run(SPEC, 'TANDA 3', { imp, ok, root })`, con la misma línea final `TANDA 3 FACTIBLE OK (n)`.
- [ ] **Step 5: Comprobar que pasa.** Run: `node tests/district_rules_test.cjs && node tests/tanda3_feasibility.cjs | tail -1 && node tests/tanda2_feasibility.cjs | tail -1 && node tests/adv/tanda3_attack.cjs | tail -2`. Expected: todo OK, y tanda3 con N + 1 comprobaciones.
- [ ] **Step 6: Commit.** Mensaje: `test(city): factibilidad común en feasibility_lib y regla de distancia de color`.

### Task 2: Distritos M05 y M09, su factibilidad y las pruebas que dependen del número de distritos

**Files:**
- Create: `tests/tanda4_feasibility.cjs`, con la tabla `SPEC` de M05 y M09 transcrita del spec y la llamada `F.run(SPEC, 'TANDA 4', …)`.
- Create: `city/districts/m05.mjs` y `city/districts/m09.mjs`, con la forma de `m07.mjs`.
- Modify: `city/districts.mjs`: los dos `import` y `districts`.
- Modify: `tests/city_teach_content.cjs:1,45`: el número de aprendices se calcula desde los datos.
- Modify: `tests/review_tanda3_gaps.cjs`, en estos puntos:
  - `:177`: el rango máximo esperado se calcula desde `D.ranks` y `TOTAL`. La aserción queda `reach === D.ranks.filter((r) => r[0] <= TOTAL).pop()[1]` y, además, `TOTAL < 8 || reach !== 'Becario'`. No vale una condición que pase siempre.
  - `:195-196`: `OLD = SEQ.slice(0, SEQ.indexOf(NEW[0]))`.
  - `:213-215`: se compara `SEQ.slice(OLD.length, OLD.length + NEW.length)`.
  - `:265-267`: «todos restaurados» incluye los que van detrás de NEW, y el rango final se compara con `rkName(TOTAL)`.
- Modify: `tests/city_scenes.cjs:80,162-169`. Las pruebas (p), (p2) y (p3) arrancan con una copia del HTML en la que el JSON de `var CITY_DATA = …;` ya no tiene `districts.M09`. Se reescribe con `JSON.stringify(...).replace(/</g, '\\u003c')`. Con eso `SIN` vuelve a ser un módulo con contenido (M09).

**Interfaces:**
- Consumes: `F.run` y `colorDistanceProblems` (Task 1).
- Produces: `city.districts.M05` y `city.districts.M09`, idénticos a lo que arma `F.build` desde la tabla.

- [ ] **Step 1: Escribir `tests/tanda4_feasibility.cjs`.** La tabla sale del spec. Nombres, colores, ids de criatura, etiquetas y aprendices se copian literalmente.
- [ ] **Step 2: Comprobar que falla.** Run: `node tests/tanda4_feasibility.cjs | grep FAIL`. Expected: solo fallan «el archivo real city/districts/m05.mjs …» y «… m09.mjs …» y «existen todos los de la tabla». Todo lo demás pasa, porque las tablas ya se comprobaron.
- [ ] **Step 3: Crear `m05.mjs` y `m09.mjs`** como `m07.mjs`, con los datos del spec, y registrarlos en `city/districts.mjs`.
- [ ] **Step 4: Comprobar la factibilidad y ver qué se rompe.** Run: `node build.mjs && node validate.mjs && node tests/tanda4_feasibility.cjs | tail -1 && for f in tests/city_teach_content.cjs tests/review_tanda3_gaps.cjs tests/city_scenes.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done`. Expected: `VALIDACIÓN OK`, `TANDA 4 FACTIBLE OK (…)` y `FALLO` en las tres pruebas listadas, que es la parte roja de este paso.
- [ ] **Step 5: Adaptar las tres pruebas** como dice «Files». Anotar el número de `ok` de cada una antes y después: tiene que ser igual o mayor.
- [ ] **Step 6: Comprobar que pasa.** Run: `node build.mjs && for f in tests/tanda4_feasibility.cjs tests/tanda3_feasibility.cjs tests/city_teach_content.cjs tests/review_tanda3_gaps.cjs tests/city_scenes.cjs tests/city_sprites.cjs tests/validate_districts.cjs tests/district_rules_test.cjs tests/adv/tanda3_attack.cjs tests/adv/tanda3_plan_attack.cjs tests/adv/review_tanda3_attack.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`. Expected: solo `FIN`.
- [ ] **Step 7: Commit.** Mensaje: `feat(city): distritos Mercado de Patrones (M05) y Laboratorio Neuronal (M09)`. Incluye `juego_estudio.html`.

### Task 3: Pruebas nuevas — celebración y HUD de los distritos nuevos, ancla de `people()` y líneas de rango más rápidas

**Files:**
- Modify: `tests/review_tanda3_gaps.cjs`. Los bloques 6b (`:236-246`) y 6c (`:248-268`) pasan a funciones que reciben la lista de distritos nuevos (`hudLoad(NEW)` y `celebrations(NEW)`). Se llaman con `['M04', 'M06', 'M07']` y con `['M05', 'M09']`.
- Modify: `tests/city_layout.cjs`, junto a las pruebas de `standardFrame()` (`:55-59`).
- Modify: `tests/review_tanda2_gaps.cjs:125-139`, para que `line` use `rankLineWith(data)` (`tests/rankline.cjs:18`) y compile una sola vez por juego de datos.

**Interfaces:**
- Consumes: los distritos M05 y M09 registrados (Task 2).

- [ ] **Step 1: Escribir las aserciones nuevas:**
  - `hudLoad(['M05', 'M09'])`: por cada distrito, el HUD dice `"<nombre> 0 %"`, `"… 50 %"` con el jefe aprobado y `"… 93 %"` con el jefe y 6 de 7 enseñados (`Math.round(100 * (0.5 * 6 / 7 + 0.5))`), sin errores.
  - `celebrations(['M05', 'M09'])`:
    - el 9.º (M05) dice exactamente `"Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados."` y su texto de celebración;
    - el 10.º (M09) dice `"… Llevas 10 de 10 …"`;
    - los dos a la vez dicen `"¡Distritos restaurados!"`, los dos textos y `"Llevas 10 de 10"`;
    - el HUD dice `"Distritos 9 de 10"` / `"Distritos 10 de 10"`, `#city-rank` es `Arquitecto` y la plaza dice «Ciudad al día» con los 10.
  - `tests/city_layout.cjs`, `standardFrame().lay`:
    - las 3 primeras llamadas a `take()` dan `[{x:-52,z:16},{x:-44,z:16},{x:-36,z:16}]`;
    - hay exactamente 72 lugares;
    - el último es `{x:28,z:-68}`.
- [ ] **Step 2: Comprobar.** Run: `node build.mjs && node tests/review_tanda3_gaps.cjs | tail -1 && node tests/city_layout.cjs | tail -1`.
  - Expected: OK. Las pruebas describen el comportamiento existente y se escriben después de los datos, así que pasan a la primera.
  - Para demostrar que pueden fallar se hace una mutación temporal: cambiar `need` de M05 a 6 en `m05.mjs`, reconstruir y ver FAIL en `hudLoad` y en la factibilidad. Después revertir y reconstruir.
- [ ] **Step 3: `review_tanda2_gaps` con `rankLineWith`.** Run: `time node tests/review_tanda2_gaps.cjs | tail -1`. Expected: el mismo número de comprobaciones que antes y menos tiempo que el medido sin el cambio. Se anotan los dos tiempos.
- [ ] **Step 4: Commit.** Mensaje: `test(city): celebración y HUD de M05/M09, ancla de people() y líneas de rango compiladas una vez`.

### Task 4: Humo en navegador, documentación y suite completa

**Files:**
- Modify: `README.md`, sección de Ciudad Núcleo:
  - una línea para M05 (22 mentores, 6 criaturas, 9 retos, 10 aprendices, 7 para restaurar) y otra para M09 (19 mentores, lo demás igual);
  - «Quedan M11»;
  - enlace al spec y al plan;
  - `tanda4_feasibility.cjs` en la lista de pruebas.
- Modify: el spec, con una sección final «Cambios de la implementación»: rulings, alto real del atlas y resultado del humo.

- [ ] **Step 1: Humo con Playwright** (`playwright-core` en el scratchpad `pw`; Chrome en `~/.cache/ms-playwright/chromium_headless_shell-1248/...`), a 320×640, 390×844 y 1280×800, con `isMobile`/`hasTouch` en los dos móviles.
  - Desde la plaza, ponerse a unos 3,6 m del portal de M05 y de M09 y pulsar el botón. Se comprueba que:
    - dice «Entrar a Mercado de Patrones» / «Entrar a Laboratorio Neuronal»;
    - su rectángulo no se solapa con `#city-joy .jbase`;
    - no hay palabras cortadas, es decir, ningún `scrollWidth > clientWidth` en sus spans.
  - Dentro del distrito se comprueba que:
    - `#city-rest` no se recorta (`scrollWidth <= clientWidth`) y el HUD ocupa ≤ 25 % del alto;
    - se puede hablar con el primer mentor;
    - en una captura de una criatura se ven los ojos;
    - se enseña a un aprendiz de cada modo con el texto de su punto clave o su versión correcta;
    - se vuelve a la plaza.
  - Expected: 0 errores de consola ni `pageerror`.
- [ ] **Step 2: Restos.** Run: `grep -rn "81 aprendices\|TOTAL === 8\|TOTAL !== 8" tests`. Expected: 0 resultados.
- [ ] **Step 3: SUITE en segundo plano.** Expected: solo `VALIDACIÓN OK` y `FIN`.
- [ ] **Step 4: Commit.** Mensaje: `docs(city): Tanda 4 en el README y cambios de la implementación`.
