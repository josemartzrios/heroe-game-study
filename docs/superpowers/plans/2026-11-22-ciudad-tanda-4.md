# Ciudad Núcleo — Tanda 4 (M05 y M09): plan de implementación (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los portales de M05 y M09 lleven a dos distritos de datos completos, sin tocar el código del juego. La ciudad pasa a tener 10 distritos.

**Architecture:**
- **Datos:** `city/districts/m05.mjs` y `m09.mjs` copian la forma de `m07.mjs` (`standardFrame()` y `people()`) y se registran en `city/districts.mjs`.
- **Pruebas:**
  - lo común de la factibilidad pasa a `tests/feasibility_lib.cjs` (`run`);
  - la regla de color va a `tests/district_rules.cjs` y solo se aplica a los distritos que se le pasan;
  - las pruebas jsdom que dependen de cuántos distritos hay se adaptan con valores independientes.

**Tech Stack:** Datos ES module (`.mjs`), Node con jsdom y fast-check (`tests/node_modules`), y un HTML único generado por `node build.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-22-ciudad-tanda-4-design.md` (v2, aprobado). Las tablas de contenido exactas están ahí y este plan no las repite.

## Global Constraints
- **Código del juego:** no se toca nada de `city/view.js`, `city/world2d.js`, `city/sprites2d.js`, `city/story.js`, `engine.html` ni `build.mjs`. Solo hay datos y pruebas.
- **Contenido:** los valores salen literalmente de las tablas del spec.
  - Colores: `#ff4800`/`#fff700` para M05 y `#36a3ff`/`#f4f4ff` para M09.
  - Semillas: 37 y 41.
  - También se copian tal cual las criaturas en su orden y con sus ids, las etiquetas, los aprendices y sus modos (`'explain'` / `'correct'`) y los textos de celebración.
  - `style: 'red'` y `need: 7`.
- **Orden del registro:** `{ M02, M08, M03, M01, M10, M04, M06, M07, M05, M09 }`.
- **Regla de color:**
  - Se aplica solo a M05 y M09. Los distritos anteriores no se revisan (spec).
  - Métrica `de00`, la de `tests/adv/tanda3_attack.cjs:67-84`, que hoy usa su ataque S5 en `:276`.
- **Ninguna prueba pierde comprobaciones ni gana una que pase siempre.**
  - Cada adaptación compara con un valor independiente: un literal, una tabla de esperados o un oráculo distinto del código que mide.
  - Cada adaptación conserva o aumenta el número de `ok(...)`.
- **Build y pruebas:**
  - Nunca dos `node build.mjs` a la vez.
  - Las pruebas leen `juego_estudio.html`, así que se construye antes.
  - Un `FALLO` se repite solo antes de tratarlo como real.
- **SUITE**, solo una vez, al final de la Tarea 4 y en segundo plano (tarda unos 15 min): `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/*.cjs; do case "$f" in tests/adv/lib.cjs|tests/adv/gen.cjs|tests/adv/runner.cjs) continue;; esac; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`. En verde imprime solo `VALIDACIÓN OK` y `FIN`.
  - Las Tareas 1-3 cierran con su lista de pruebas.
  - Por petición del usuario, la suite completa no se lanza en otros momentos.
- **Rama y commits:** el usuario decide la rama antes de la Tarea 1. Los commits llevan la línea `Co-Authored-By` que indique el sistema.

## Review Focus
1. **Un guardado de la Tanda 3 en la plaza.** Tras M07, el objetivo manda a «Mercado de Patrones», luego a «Laboratorio Neuronal», y al final dice «Ciudad al día».
   - Se fija en la Tarea 3: `celebrations` comprueba `#city-obj` con 8, 9 y 10 restaurados.
2. **Las criaturas de M05 y M09 tienen cara.**
   - En la Tarea 1, la regla exige que el cuerpo quede a ΔE ≥ 20 del blanco y con contraste ≥ 3:1 frente a la pupila.
   - En la Tarea 4, el humo mide los píxeles de los ojos.
3. **El botón «Entrar a Laboratorio Neuronal» a 320 px** no se sale de la pantalla, no se desborda y no tapa el joystick, ni en reposo ni activo. Se comprueba en el humo de la Tarea 4.
4. **Enseñar a un aprendiz en los distritos nuevos.**
   - `city_teach_content.cjs` (Tarea 2) recorre los 101 aprendices.
   - El humo (Tarea 4) enseña en los 4 casos y ve subir el porcentaje del distrito.
5. **Atlas de personas.** Mide 3 948 px y sigue por debajo de 4 096.
   - Lo comprueba `city_sprites.cjs` con los datos reales (Tarea 2).
   - El alto se anota en la Tarea 4.

---

### Task 1: Factibilidad común y regla de color

**Files:**
- Modify: `tests/district_rules.cjs`, que gana `lab`, `de00`, `REF_COLORS` y `colorDistanceProblems`.
- Modify: `tests/feasibility_lib.cjs`, que gana `run` y toma los morados y el ámbar de `district_rules` (hoy en `feasibility_lib.cjs:5-6`), para que no estén repetidos ni haya importaciones circulares.
- Modify: `tests/tanda3_feasibility.cjs:82-140`, que queda en su tabla `SPEC` más la llamada a `run`.
- Modify: `tests/adv/tanda3_attack.cjs`. Se borran `lab`/`de00` (`:67-84`) y `:276` usa `RULES.de00`; `RULES` ya se importa en `:94`.
- Test: `tests/district_rules_test.cjs`.

**Interfaces:**
- Produces, en `district_rules.cjs`:
  - `de00(hexA, hexB) → number`: la función de `tanda3_attack.cjs:73-84`, tal cual.
  - `REF_COLORS`, con estas claves:
    - `amber: '#ffd76a'`, `repair: '#ff8f3a'`, `tower: '#ffd23f'`;
    - `purples`: los 6 de `feasibility_lib.cjs:5`;
    - `eyes: '#ffffff'`, `pupil: '#12162e'`;
    - `grounds: ['#141a3a', '#232a52', '#2a2f5e', '#0d1230']`.
  - `colorDistanceProblems(districts, ids) → string[]`, con un texto por problema. Para cada `id` de `ids`, sin repetidos:
    - si `id` no es propio de `districts` o no tiene `colors`, devuelve `"<id>: no registrado"` y sigue con el siguiente;
    - `a` o `b` sin la forma `/^#[0-9a-f]{6}$/i` da `"<id>: color mal formado <c>"`;
    - `a` o `b` a ΔE00 < 10 de cualquiera de estos da problema: `amber`, `repair`, `tower`, los `purples`, el otro color del mismo distrito, o un color de otro distrito de `districts`;
    - solo para `a` (el cuerpo de las criaturas): ΔE00(a, `eyes`) < 20 o contraste WCAG(a, `pupil`) < 3 dan problema;
    - `a` o `b` con contraste WCAG < 3 frente a cualquiera de los `grounds` da problema.
- Produces, en `feasibility_lib.cjs`: `run(SPEC, label, ok, opts) → Promise<void>`.
  - Calcula `root` e `imp` por su cuenta, porque vive en `tests/`.
  - Hace exactamente las comprobaciones de hoy de `tanda3_feasibility.cjs:82-136`, sin la impresión ni la salida.
  - Si `opts.colorIds` es un array, añade `ok('distancia de color (…)', colorDistanceProblems(city.districts, opts.colorIds).length === 0, …)`.
  - Las reglas entre distritos (`:125-136`) se ejecutan solo si `opts.cross !== false`.
  - Quien llama conserva `results`, la impresión final y `process.exit`.

- [ ] **Step 1: Línea base.** Run: `node tests/tanda3_feasibility.cjs | tail -1`. Expected: `TANDA 3 FACTIBLE OK (124)`. Tras el refactor debe seguir en 124.
- [ ] **Step 2: Escribir las pruebas en `tests/district_rules_test.cjs`.** Todas con `{ X: { colors: { a, b } } }` y los `ids` indicados:
  - `de00`:
    - `de00('#ffd76a', '#ffe600') < 10`;
    - `de00('#ff4800', '#ff8f3a') >= 15`;
    - simétrica y `de00(x, x) === 0`, con 1000 ejecuciones de fast-check sobre `#rrggbb`.
  - Colores que deben dar problema:
    - `a: '#ff8c42'` nombra `#ff8f3a`;
    - `a: '#f4f4ff'` nombra los ojos;
    - `b: '#7c5cff'` nombra `#8a5fe0`;
    - `a: '#2a2f5e'` nombra un fondo;
    - `a === b` da problema dentro del mismo distrito;
    - `a: '#fff'` y `b: ''` dan «mal formado».
  - Ids no registrados: `ids: ['M05']` sobre un objeto sin M05 da `["M05: no registrado"]` sin lanzar. Lo mismo con `'__proto__'` y `'constructor'`.
  - Exclusión por `ids`: con los 8 distritos reales, `ids: []` da `[]` y `ids: ['M07']` no está vacío (M07 `b` está a 6,4 de M01 `a`).
  - Los 8 reales más `M05: { colors: { a: '#ff4800', b: '#fff700' } }` y `M09: { colors: { a: '#36a3ff', b: '#f4f4ff' } }`, con `ids: ['M05', 'M09']`, dan `[]`.
- [ ] **Step 3: Comprobar que falla.** Run: `node tests/district_rules_test.cjs`. Expected: excepción o FAIL porque `colorDistanceProblems` no existe.
- [ ] **Step 4: Implementar.**
  - `district_rules.cjs` y `feasibility_lib.cjs` según las interfaces de arriba.
  - `tanda3_feasibility.cjs` queda en cabecera, `SPEC`, `await F.run(SPEC, 'TANDA 3', ok)` (sin `colorIds`) y su bloque final, que sigue imprimiendo `TANDA 3 FACTIBLE OK (n)`.
  - `tanda3_attack.cjs` usa `RULES.de00`.
- [ ] **Step 5: Comprobar que pasa.** Run: `node tests/district_rules_test.cjs && node tests/tanda3_feasibility.cjs | tail -1 && node tests/tanda2_feasibility.cjs | tail -1 && node tests/adv/tanda3_attack.cjs | tail -2`. Expected: todo OK, y tanda3 con 124 comprobaciones.
- [ ] **Step 6: Commit.** Mensaje: `test(city): factibilidad común en feasibility_lib y regla de color para distritos nuevos`.

### Task 2: Distritos M05 y M09, su factibilidad y las pruebas que dependen del número de distritos

**Files:**
- Create: `tests/tanda4_feasibility.cjs`, con la tabla `SPEC` de M05 y M09 transcrita del spec y `await F.run(SPEC, 'TANDA 4', ok, { colorIds: ['M05', 'M09'], cross: false })`.
  - Las reglas entre distritos ya las ejecuta `tanda3_feasibility` sobre `city.districts` entero, así que se ejecutan una sola vez (spec).
  - Imprime `TANDA 4 FACTIBLE OK (n)`.
- Create: `city/districts/m05.mjs` y `city/districts/m09.mjs`, con la forma de `m07.mjs`.
- Modify: `city/districts.mjs`: los dos `import` y `districts`.
- Modify: `tests/city_teach_content.cjs:1,45`.
  - El total se compara con el literal `101`. Así vigila que no falte ni sobre ningún aprendiz.
  - Se añade, por distrito, que `apprentices.length >= need`.
- Modify: `tests/review_tanda3_gaps.cjs`, en estos puntos:
  - `:176-177`: la aserción pasa a ser `const RANK_AT = { 8: 'Arquitecto', 9: 'Arquitecto', 10: 'Arquitecto' }` y `ok(…, RANK_AT[TOTAL] !== undefined && reach === RANK_AT[TOTAL] && reach === CS.rankName(TOTAL, D))`. Usa la tabla literal y el oráculo de `city/story.js`. La etiqueta pierde el ternario `TOTAL === 8 ? …`.
  - `:196`: `OLD = SEQ.slice(0, SEQ.indexOf(NEW[0]))`.
  - `:213-215`: se compara `SEQ.slice(OLD.length, OLD.length + NEW.length).join() === NEW.join()`.
  - `:221` (6a): `firstNew` vuelve a ser M04. Sale solo al corregir `OLD`, y se comprueba.
  - `:265-267`: «todos restaurados» incluye también los distritos que van detrás de NEW. El rango final se compara con `RANK_AT[TOTAL]` y la etiqueta pierde su ternario.
- Modify: `tests/city_scenes.cjs:6,21,80,162-169,240-242`.
  - `boot(opts)` acepta `opts.html`, que por defecto es el HTML real.
  - Al cargar el módulo se calcula una sola vez `HTML_NO_M09`:
    - `i = html.indexOf('var CITY_DATA = ') + 16`, `j = html.indexOf(';\n', i)`;
    - `data = JSON.parse(html.slice(i, j))` y `delete data.districts.M09`;
    - `html.slice(0, i) + JSON.stringify(data).replace(/</g, '\\u003c') + html.slice(j)`.
  - Sobre esa copia:
    - `SIN` se calcula desde `data` (el primer id de `data.order` sin distrito), no desde `city/districts.mjs`;
    - se comprueba `SIN === 'M09'`;
    - reescribir sin borrar nada reproduce el HTML byte a byte.
  - (p), (p2), (p3) y (v3) arrancan con `opts.html = HTML_NO_M09` y conservan sus aserciones.

**Interfaces:**
- Consumes: `F.run` y `colorDistanceProblems` (Task 1).
- Produces: `city.districts.M05` y `city.districts.M09`, idénticos a lo que arma `F.build` desde la tabla.

- [ ] **Step 1: Escribir `tests/tanda4_feasibility.cjs`.** Nombres, colores, ids, etiquetas y aprendices se copian literalmente del spec.
- [ ] **Step 2: Comprobar que falla.** Run: `node tests/tanda4_feasibility.cjs | grep FAIL`. Expected: exactamente 4 FAIL, sin `EXC`:
  - «el archivo real city/districts/m05.mjs …»;
  - «… m09.mjs …»;
  - «existen todos los de la tabla»;
  - «distancia de color», con `M05: no registrado` y `M09: no registrado`.
- [ ] **Step 3: Crear `m05.mjs` y `m09.mjs`** como `m07.mjs`, con los datos del spec, y registrarlos.
- [ ] **Step 4: Comprobar la factibilidad y la parte roja.** Run: `node build.mjs && node validate.mjs && node tests/tanda4_feasibility.cjs | tail -1 && for f in tests/city_teach_content.cjs tests/review_tanda3_gaps.cjs tests/city_scenes.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done`. Expected: `VALIDACIÓN OK`, `TANDA 4 FACTIBLE OK (…)` y `FALLO` en las tres pruebas listadas.
- [ ] **Step 5: Adaptar las tres pruebas** como dice «Files». Anotar el número de `ok` de cada una antes y después: tiene que ser igual o mayor.
- [ ] **Step 6: Comprobar que pasa.** Run: `node build.mjs && for f in tests/tanda4_feasibility.cjs tests/tanda3_feasibility.cjs tests/tanda2_feasibility.cjs tests/city_teach_content.cjs tests/review_tanda3_gaps.cjs tests/city_scenes.cjs tests/city_sprites.cjs tests/city_move.cjs tests/city_story.cjs tests/city_world2d.cjs tests/city_progress.cjs tests/validate_districts.cjs tests/district_rules_test.cjs tests/review_tanda2_gaps.cjs tests/adv/tanda2_attack.cjs tests/adv/tanda2_impl_attack.cjs tests/adv/tanda3_attack.cjs tests/adv/tanda3_plan_attack.cjs tests/adv/review_tanda3_attack.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`. Expected: solo `FIN`.
- [ ] **Step 7: Commit.** Mensaje: `feat(city): distritos Mercado de Patrones (M05) y Laboratorio Neuronal (M09)`. Incluye `juego_estudio.html`.

### Task 3: Pruebas nuevas — celebración, objetivo y HUD de los distritos nuevos, ancla de `people()` y líneas de rango compiladas una vez

**Files:**
- Modify: `tests/review_tanda3_gaps.cjs`.
  - Los bloques 6b (`:238-248`) y 6c (`:250-267`) pasan a ser funciones `hudLoad(NEW)` y `celebrations(NEW)`. Cada una calcula dentro su `OLD = SEQ.slice(0, SEQ.indexOf(NEW[0]))`.
  - Se llaman con `['M04', 'M06', 'M07']` (lo de hoy, sin perder aserciones) y con `['M05', 'M09']`.
- Modify: `tests/city_layout.cjs`, junto a las pruebas de `standardFrame()` (`:55-67`).
- Modify: `tests/review_tanda2_gaps.cjs:126-143`.
  - `const lineReal = RANK.rankLineWith(D)` se crea una vez y la usa el bucle de combinaciones.
  - Los casos con `withRanks(...)` siguen con `rankLineFn`.

**Interfaces:**
- Consumes: los distritos M05 y M09 registrados (Task 2).

- [ ] **Step 1: Escribir las aserciones nuevas** con valores literales:
  - `hudLoad(['M05', 'M09'])`: por distrito, el HUD dice exactamente `"Mercado de Patrones 0 %"` / `"… 50 %"` / `"… 93 %"`, y lo mismo con «Laboratorio Neuronal».
    - Las tres situaciones son: sin progreso, con el jefe aprobado, y con el jefe y 6 de 7 enseñados.
    - Los tres números van escritos tal cual, sin calcularlos desde `need`.
    - Sin errores.
  - `celebrations(['M05', 'M09'])`:
    - con los 8 de la Tanda 3 restaurados, `#city-obj` en la plaza contiene `"Entra a Mercado de Patrones"`;
    - el 9.º (M05) dice exactamente `"Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados."` y su texto de celebración, y después `#city-obj` contiene `"Entra a Laboratorio Neuronal"`;
    - el 10.º (M09) dice `"… Llevas 10 de 10 …"`;
    - los dos a la vez dicen `"¡Distritos restaurados!"`, los dos textos y `"Llevas 10 de 10"`;
    - el HUD dice `"Distritos 9 de 10"` / `"Distritos 10 de 10"` y `#city-rank` es `"Arquitecto"`;
    - con los 10, la plaza dice «Ciudad al día».
  - `tests/city_layout.cjs`, con `standardFrame().lay`:
    - las 3 primeras llamadas a `take()` dan `[{x:-52,z:16},{x:-44,z:16},{x:-36,z:16}]`;
    - hay exactamente 72 lugares;
    - el último es `{x:28,z:-68}`.
- [ ] **Step 2: Comprobar que pasan y que pueden fallar.** Run: `node build.mjs && node tests/review_tanda3_gaps.cjs | tail -1 && node tests/city_layout.cjs | tail -1`. Expected: OK.
  - Estas pruebas describen un comportamiento que ya existe. Para demostrar que pueden fallar, se hace una mutación temporal: `need` de M05 a 6 en `m05.mjs`.
  - Al reconstruir, debe fallar `hudLoad` (el 93 % pasa a 100 %) y también `tanda4_feasibility`.
  - Después se revierte y se reconstruye.
- [ ] **Step 3: `review_tanda2_gaps`.** Run: `node tests/review_tanda2_gaps.cjs | tail -1`. Expected: el mismo número de comprobaciones que antes. El ahorro, unos 0,8 s, se mide solo sobre el bucle y se anota.
- [ ] **Step 4: Commit.** Mensaje: `test(city): celebración, objetivo y HUD de M05/M09, ancla de people() y líneas de rango compiladas una vez`.

### Task 4: Humo en navegador, documentación y suite completa

**Files:**
- Modify: `README.md`, en la sección de Ciudad Núcleo:
  - una línea para M05 y otra para M09 (22 y 19 mentores; 6 criaturas, 9 retos y 10 aprendices; 7 para restaurar);
  - «Quedan M11»;
  - enlace al spec y al plan;
  - `tanda4_feasibility.cjs` en la lista de pruebas.
- Modify: el spec, con una sección final «Cambios de la implementación». Recoge las decisiones tomadas, el alto real del atlas y el resultado del humo.

- [ ] **Step 1: Instalar el humo.** En el scratchpad, `npm i playwright-core@1.65.0`. Es la versión que corresponde a `~/.cache/ms-playwright/chromium_headless_shell-1248`. No usar `latest`.
- [ ] **Step 2: Humo con Playwright** a 320×640 y 390×844 (`isMobile`, `hasTouch`) y a 1280×800, con el prólogo saltado («Saltar»). Para cada distrito nuevo:
  - **Portal:**
    - a unos 3,6 m del portal, `#city-act` dice «Entrar a Mercado de Patrones» / «Entrar a Laboratorio Neuronal»;
    - `#city-act` cumple `scrollWidth <= clientWidth` y su `getBoundingClientRect()` queda dentro de `innerWidth` × `innerHeight`;
    - solo en los dos móviles: `.jbase` tiene ancho > 0, y el rectángulo de `#city-act` no se solapa con él ni en reposo ni con el joystick activo (un `touchstart` en su posición por defecto).
  - **Dentro del distrito, con el distrito al 100 %:**
    - cada hijo de `.city-hud` cumple `rect.right <= innerWidth`;
    - `.city-hud.getBoundingClientRect().bottom <= 0.25 * innerHeight`, contando `.city-objrow`.
  - **Ojos de una criatura,** con `getImageData` sobre `#city-cv` en la caja de la criatura, en las tres resoluciones:
    - al menos 4 píxeles `#ffffff` pegados a píxeles de `colors.a`;
    - al menos 1 píxel `#12162e`.
  - **Enseñar,** en 4 casos a 320 px (M05 y M09, *explicar* y *corregir*):
    - con el texto de su punto clave o con la versión correcta, la casilla sale premarcada;
    - al confirmar, `#city-rest` sube de `0 %` a `7 %`;
    - no aparece scroll horizontal y el foco vuelve al juego.
  - **Teclado a 1280 px:** se entra al distrito con flechas, Enter (con el foco en `#city-act`) y Escape, y `#city-live` contiene «Entraste a Mercado de Patrones».
  - **Errores:** 0 errores de consola y 0 `pageerror`.
- [ ] **Step 3: Restos.** Run: `grep -rn "81 aprendices\|TOTAL === 8\|TOTAL !== 8" tests`. Expected: 0 resultados.
- [ ] **Step 4: SUITE en segundo plano** (la única ejecución completa del plan). Expected: solo `VALIDACIÓN OK` y `FIN`.
- [ ] **Step 5: Commit.** Mensaje: `docs(city): Tanda 4 en el README y cambios de la implementación`.
