# Ciudad Núcleo: enseñar escribiendo — plan de implementación (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los aprendices de Ciudad Núcleo se enseñan escribiendo texto libre (explicar un tema o corregir un error) que el juego premarca localmente y el jugador confirma.

**Architecture:**
- Un módulo puro `city/teach.js` (`CityTeach`, ES5, patrón de `city/story.js`) hace la normalización, la coincidencia y la detección.
- `city/view.js` pinta la hoja `#city-sheet` en dos pasos (escribir y revisar) y aprueba con una sola función.
- La ronda de enseñar del motor (`engine.html`) desaparece.

**Tech Stack:**
- ES5 en navegador, en un HTML único generado por `node build.mjs`.
- Pruebas Node con jsdom y fast-check (`tests/node_modules`).

**Spec:** `docs/superpowers/specs/2026-11-21-ciudad-ensenar-escribiendo-design.md` (v2, aprobado, con los ajustes de la revisión del plan). Prototipo de referencia (desechable, solo guía): `/tmp/claude-1000/-home-josma-myprojects-juego/598aca39-b665-4dcd-963e-243eae4a06d9/scratchpad/v2/check.mjs`.

## Global Constraints
- **ES5** en `city/*.js` y `engine.html`: nada de `\p{…}`, bandera `u`, `let`/`const`, flechas ni plantillas. `normalize` se usa solo si existe.
- **Texto de datos** en `innerHTML` solo vía `esc()`/`fmt()`.
- **Texto del jugador:**
  - solo vía `esc()` por tramos (`CityTeach.marks`) o `textarea.value`;
  - nunca pasa por `fmt()`;
  - nunca se guarda en `S` ni en localStorage (tampoco en `_bak`).
- **Ganchos de prueba** solo con `window.__CITY_TEST__ === true`.
- **Código sin uso:** no se guarda ninguno (regla del usuario). Lo que el spec manda borrar se borra en la tarea que lo deja sin uso.
- **Build y suite:**
  - Nunca dos `node build.mjs` a la vez.
  - Las pruebas leen `juego_estudio.html`, así que siempre se construye antes.
  - La suite completa nunca corre en paralelo con otras pruebas.
  - Un `FALLO` de la suite se repite solo antes de tratarlo como real.
- **Suite completa (SUITE):** `node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/*.cjs; do case "$f" in tests/adv/lib.cjs|tests/adv/gen.cjs|tests/adv/runner.cjs) continue;; esac; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`. En verde imprime solo `VALIDACIÓN OK` y `FIN`. Tarda unos 10 minutos, así que se lanza en segundo plano.
- **Commits:**
  - Se hacen solo si el usuario los autorizó al empezar la ejecución; si no, cada paso «Commit» se salta y se anota.
  - Antes de la Tarea 1 el usuario decide qué hacer con los cambios sin commitear de la Tanda 3 y en qué rama se trabaja.
- **Valores fijos:**
  - `MAX_CHARS = 2000`, `MIN_WORDS_EXPLAIN = 12`, `MIN_WORDS_FIX = 6`, `PASS_POINTS = 3` (en la práctica `min(3, n)`);
  - palabras escritas = `CityTeach.norm(text).length`;
  - umbral de corregir: `ceil(terms/3)`, y con `terms = []` nunca se detecta;
  - prefijo común de 6 letras.
- **`STOP` literal** (sin repetidos; el orden es este y lo congela la prueba):
  `a al algo ante antes asi aun bajo bien cada como con contra cual cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa ese eso esta este esto estos estas fue ha hace hay la las le les lo los mas me mi mismo misma muy nada ni no nos o otra otro otros para pero poco por porque que quien se sea segun ser si sin sino sobre solo son su sus tambien tan tanto te tiene tienen todo todos tu un una uno unos unas usa y ya reves version correcta error realidad decir puede pueden`
- **Invisibles** (clase única, ES5): `/[­؜᠎​-‏‪-‮⁠-⁩﻿]/g`.
- **Textos de la interfaz con plural correcto:** «Falta 1 palabra de 12» / «Faltan 7 palabras de 12» / «Listo»; «de 6» en corregir; «Detecté 1 punto de 4» / «Detecté 3 de 4 puntos»; «Marca al menos 3» (o `min(3, n)`).

## Review Focus
1. **Pegar mucho texto o caracteres raros.** No se congela y el contador sigue bien. Tarea 1: el recorte va antes de todo, no hay NFKC y 1 MB tarda menos de 200 ms; `marks` también recorta.
2. **Escribir en el móvil con el teclado abierto.** No se repinta, no pierde el foco, no salta el aviso de girar y el botón queda visible sobre el teclado. Tareas 3 y 5 (mismo nodo, `resize` con foco, `--kb` en `bottom`, Playwright con `isMobile`).
3. **Cerrar o pulsar Esc a mitad de texto.** Se recupera el borrador. Tareas 3 y 5.
4. **Una premarca falsa** (vacío, basura, la frase equivocada o un texto genérico de informática). No se llega al aprobado premarcado. Tareas 1 y 2.
5. **El texto del jugador con HTML.** Se ve inerte y no se guarda, en las dos pantallas y en cada repintado. Tareas 3 y 4.

---

### Task 1: Módulo `CityTeach` y su inclusión en el build

**Files:**
- Create: `city/teach.js`
- Modify: `build.mjs:43-48`, para leer `city/teach.js` y concatenarlo en `/*__CITY_CODE__*/` justo después de `cityStory`.
- Test (nuevo): `tests/city_teach.cjs`

**Interfaces:**
- Produces `CityTeach` (global en el HTML; `module.exports` en Node). Expone:
  - las constantes `MAX_CHARS`, `MIN_WORDS_EXPLAIN`, `MIN_WORDS_FIX`, `PASS_POINTS` y `STOP` (array de strings);
  - `norm(s) → string[]` (null/undefined → `[]`);
  - `same(a, b) → bool`;
  - `keyTerms(kp) → string[][]`: los tokens significativos de cada término válido;
  - `explainCheck(text, keyPoints) → bool[]`;
  - `fixItem(q) → {wrong, right, explanation} | null`, a partir de una pregunta `error` del HTML (`{prompt, options, answer, explanation}`); `null` si falta `prompt`, `options` no es array u `options[answer]` no es string;
  - `fixTerms(item) → string[]` (sin repetidos según `same`);
  - `fixCheck(text, item) → {terms, found, detected}`;
  - `marks(raw, found) → [{t, hit}]`.
- `fixItem` vive en `CityTeach` (ya recogido en el spec) porque lo usan la vista, R4 (`check_district.mjs`) y las pruebas de contenido.

- [ ] **Step 1: Escribir `tests/city_teach.cjs`** (formato `ok(nombre, cond, extra)` como `tests/city_story.cjs`; carga `require('../city/teach.js')`). Aserciones:
  - **`norm`:**
    - `norm('Árbol  BITS, 255.255.255.255 y 5G')` da `['arbol','bits','255.255.255.255','y','5g']`.
    - `norm('esca​lable')`, `norm('esca⁦lable')` y `norm('esca­lable')` dan `['escalable']`.
    - `norm(null)` y `norm(undefined)` dan `[]`.
    - Recorte primero: `norm('x'.repeat(5000)).join('').length === 2000` y `norm('a'.repeat(1999) + ' cpu')` no contiene `'cpu'`.
    - Sin NFKC: `norm('ﬁ')` no da `['fi']` y el código fuente de `teach.js` no contiene `NFKC`.
    - `'ﷺ'.repeat(1<<20)` tarda menos de 200 ms.
    - Idempotencia: `norm(norm(s).join(' '))` es igual a `norm(s)` (fast-check, 1000 ejecuciones).
  - **`same`:**
    - Casan: `('servidor','servidores')`, `('clientes','cliente')`, `('bit','bits')`, `('cpu','cpus')`, `('modular','modularidad')`, `('asociado','asociacion')`.
    - No casan: `('255','255.255')`, `('red','rojo')`, `('servidor','servicio')`.
    - Simetría con fast-check (1000 ejecuciones).
  - **`keyTerms`:**
    - `keyTerms('**es un** y **IP** y **C++**')` da `[['ip'],['c']]`. El término «es un» se descarta.
    - `keyTerms('sin negritas')` da `[]`.
  - **`explainCheck`:**
    - Con el texto vacío y con `'patata cosa nada'` todo sale `false`.
    - Para `kps = ['**Latencia:** tiempo', 'usa **CDN** y **caché**']`, `explainCheck('la latencia baja con un cdn', kps)` da `[true,true]`.
    - Un punto sin negritas siempre da `false`.
    - `explainCheck('constructor toString', ['**Constructor** x'])` da `[true]`; `explainCheck('hola', ['**Constructor** x', '**__proto__**'])` da `[false,false]`.
  - **`fixItem`:**
    - Sobre `{prompt:'Este fragmento contiene un error:\n“A es B.”\n¿Cuál es el error?', options:['x','A es C'], answer:1, explanation:'Versión correcta: A es C.'}` da `{wrong:'A es B.', right:'A es C', explanation:'A es C.'}`.
    - Usa `indexOf('“')` y `lastIndexOf('”')`: un `wrong` con `”` interior se conserva entero.
    - Sin comillas en el `prompt`, `wrong` es `''`.
    - `fixItem({})`, `fixItem(null)` y `fixItem({prompt:'x', options:'y', answer:0})` dan `null` sin lanzar.
  - **`fixTerms` y `fixCheck`:**
    - Con `{wrong:'Es prioridad en la RAM', right:'Es prioridad en el uso de CPU', explanation:''}` los términos contienen `'cpu'` (sigla) y no `'prioridad'`.
    - Sigla con regex sin `\b`: en `'Usa ÁRBOL y DNS'` la sigla `dns` entra; `'CPUs'` (4 mayúsculas + minúscula) no cuenta como sigla.
    - `fixTerms` no repite: `{right:'servidor servidores', …}` da un solo término.
    - Con un item sin términos, `fixCheck('lo que sea', item).detected === false`.
    - Con 3 términos basta 1 encontrado; con 4 hacen falta 2.
    - Propiedad (fast-check, 1000): para cualquier item, `fixCheck(item.wrong, item).detected === false`.
  - **`marks`:**
    - `marks('Hola, CPU!', ['cpu']).map(x=>x.t).join('') === 'Hola, CPU!'` y el tramo `'CPU'` lleva `hit:true`.
    - `marks('el satélite inalámbrico', ['inalambrico'])` tiene un único tramo `'inalámbrico'` con `hit:true` (no se parte por el acento).
    - `marks('esca​lable', ['escalable'])` marca el tramo entero.
    - Recorte: `marks('x '.repeat(1000) + 'escalable', ['escalable'])` no tiene ningún `hit`, y sus tramos unidos miden 2000.
    - Propiedad (fast-check, 1000, texto con letras acentuadas, números con punto e invisibles): unir los `t` reproduce `raw.slice(0, 2000)`, y `marks(raw, found).some(x => x.hit)` ⇔ `norm(raw).some(t => found.some(f => same(t, f)))`.
  - **`STOP`:** `CityTeach.STOP.join(' ')` es igual a la lista literal de Global Constraints, no tiene repetidos, contiene `'reves'` y no contiene `'verdad'`.
  - **Build:** tras `node build.mjs`, en `juego_estudio.html` el índice de `var CityTeach` es menor que el de `function cityTeachOpen` o, si aún no existe, que el de `/* city/view.js */` (o el marcador que deja `build.mjs`).

- [ ] **Step 2: Comprobar que falla.** Run: `node tests/city_teach.cjs`. Expected: excepción «Cannot find module '../city/teach.js'».

- [ ] **Step 3: Implementar `city/teach.js`** siguiendo el spec («`city/teach.js` → `CityTeach`») y estas decisiones:
  - **Tokens:** `/[a-z0-9]+(?:[.,][0-9]+)*/g`.
  - **Invisibles y `STOP`:** los literales de Global Constraints.
  - **Sigla:** `/(^|[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ])([A-ZÁÉÍÓÚÑ]{2,4})(?![A-Za-z0-9ÁÉÍÓÚÑáéíóúñ])/g` sobre el texto original (grupo 2).
  - **`marks`:** recorta a `MAX_CHARS`; un tramo de palabra es una secuencia máxima de caracteres `[A-Za-z0-9À-ɏ̀-ͯ]`, invisibles de la clase, y `.`/`,` entre dos dígitos; todo lo demás es separador. `hit = norm(t).some(tok => found.some(f => same(tok, f)))`. Sin RegExp sobre HTML.
  - **Conjuntos:** arrays o `Object.create(null)`, nunca `{}`.
  - **Exportación:** termina con `if (typeof module !== 'undefined' && module.exports) module.exports = CityTeach;`.
  - **Build:** registrar en `build.mjs`.

- [ ] **Step 4: Comprobar que pasa.** Run: `node build.mjs && node tests/city_teach.cjs`. Expected: `CITY_TEACH OK (N comprobaciones)`, exit 0.

- [ ] **Step 5: Commit.** `git add city/teach.js build.mjs tests/city_teach.cjs juego_estudio.html && git commit -m "feat(city): módulo CityTeach para validar lo que el jugador escribe al enseñar"`

### Task 2: Negritas de contenido, explicación del satélite y reglas R4

**Files:**
- Modify (las negritas y el texto exactos están en la tabla «Contenido» del spec):
  - `content.mjs`: M01 T02 y T15;
  - `content_m02.mjs`: T09;
  - `content_m03.mjs`: T09 (p3 **capa de Aplicación**, p4 **IP**);
  - `content_m04.mjs`: T13;
  - `content_m06.mjs`: T08 (p2 **asociado**, p4 **dueña**; «parte» queda sin negrita);
  - `content_m08.mjs`: explicación del error del satélite en T02.
- Modify: `city/check_district.mjs:54-63` (R4).
- Test (nuevo): `tests/city_teach_content.cjs`
- Test: `tests/validate_districts.cjs`, con 2 casos nuevos de R4 (el de `:43` sigue valiendo: el mensaje nuevo incluye `a02`).

**Interfaces:**
- Consumes: `CityTeach.keyTerms`, `explainCheck`, `fixItem`, `fixTerms` y `fixCheck` (Task 1).
- Produces: R4, dentro del `for (const a of dist.apprentices)` y solo si `Object.prototype.hasOwnProperty.call(byTopic, a.topic)` (si el tema no existe ya salta «tema inexistente» y no se evalúa más):
  - un `explain` cuyo tema tenga menos de `min(3, n)` puntos con `keyTerms(kp).length > 0` → `${a.id}: 'explain' necesita >= ${k} puntos clave con negritas en ${a.topic}`;
  - un `correct` cuyo tema no tenga ningún `error` con `fixTerms(fixItem(q)).length > 0` → `${a.id}: 'correct' necesita una pregunta error con términos en ${a.topic}`. **Sustituye** a la regla vieja «'correct' necesita >= 1 pregunta error», que queda incluida.
  - Carga: `const CityTeach = createRequire(import.meta.url)('./teach.js');` al principio del módulo (`teach.js` no usa nada de `move.js`, así que no hace falta `vm`).
  - Las preguntas que ve R4 son las expandidas (las mismas que `count()` ya usa); si `count()` trabaja con la forma compacta, se expande con `expandModule` de `content_expand.mjs` antes de llamar a `fixItem`.

- [ ] **Step 1: Escribir `tests/city_teach_content.cjs`.** Carga los módulos expandidos con `expandModule` de `content_expand.mjs` y `city/districts.mjs`. Para cada aprendiz de los 8 distritos:
  - **Si es *explain*:**
    - `keyPoints.filter(kp => keyTerms(kp).length).length >= Math.min(3, n)`;
    - ningún punto se premarca con `''` ni con `'patata cosa nada '.repeat(5)`;
    - cada punto con términos se detecta con su propio texto sin `**`;
    - texto genérico: con `GENERIC = 'En este ejemplo el sistema guarda los datos del usuario y forma parte del programa principal que la aplicacion puede leer escribir y ejecutar cada dia sin problemas en la red de la empresa'` se premarcan como mucho 1 punto, y nunca `min(3, n)`.
  - **Si es *correct*:** para cada `error` del tema, con `it = fixItem(q)`:
    - `it !== null` y `fixTerms(it).length > 0`;
    - `fixCheck(it.right + ' ' + it.explanation, it).detected`;
    - `!fixCheck(it.wrong, it).detected`.
  - **Recuento:** se espera `aprendices === 81` y 0 fallos.
  - **En `tests/validate_districts.cjs`:**
    - un *explain* sobre un tema sin negritas da `R4` con /puntos clave con negritas/;
    - un *correct* cuyo único `error` no da términos (se reescriben su opción correcta y su explicación con palabras de `wrong`) da `R4` con /pregunta error con términos/;
    - un aprendiz con tema `'T99'` da solo «tema inexistente» y no lanza.

- [ ] **Step 2: Comprobar que falla.** Run: `node tests/city_teach_content.cjs; node tests/validate_districts.cjs`. Expected: fallos de detectables en M01/T02, M01/T15, M02/T09, M03/T09 y M06/T08 (5; M04/T13 ya pasa y sus negritas son de refuerzo), el error sin términos de M08/T02 y los casos nuevos de R4.

- [ ] **Step 3: Aplicar las negritas y el texto del satélite** de la tabla del spec. Solo se envuelven en `**` palabras que ya existen; la única frase nueva es la explicación del satélite. Después, ampliar R4.

- [ ] **Step 4: Comprobar que pasa.**
  - Run: `node build.mjs && node validate.mjs && for f in tests/city_teach_content.cjs tests/validate_districts.cjs tests/m03.cjs tests/m04.cjs tests/m06.cjs tests/m08.cjs tests/modules.cjs tests/tanda2_feasibility.cjs tests/tanda3_feasibility.cjs tests/spec_districts.cjs tests/build_validate.cjs tests/review_district_gaps.cjs tests/adv/tanda2_attack.cjs tests/adv/tanda3_attack.cjs tests/adv/review_tanda3_attack.cjs; do [ -f "$f" ] || { echo "NO EXISTE $f"; continue; }; node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
  - Expected: `VALIDACIÓN OK` y `FIN`, sin `FALLO`. Un `NO EXISTE` se anota y se busca el nombre real con `ls tests`.
  - Si una prueba de módulo comparaba un texto de punto clave literal, se actualiza su texto esperado. Nunca se quita la comprobación.

- [ ] **Step 5: Commit.** `git commit -m "feat(city): negritas para enseñar escribiendo y R4 comprueba que cada aprendiz se pueda enseñar"`

### Task 3: Pantalla *explicar* escribiendo, `cityTeachDone` y gancho de prueba

**Files:**
- Modify: `city/view.js`.
  - Se reemplazan `cityKpPool`, `cityTeachExplain`, `cityTeachPick` y `cityTeachGo` (:534-571) por `cityTeachOpen`, su pintado y `cityTeachDone`.
  - `view.js:645` queda `if (o.mode === 'correct') cityTeachCorrect(o); else cityTeachOpen(o);`. **`cityTeachCorrect` no se toca en esta tarea** (corregir sigue con la ronda hasta la Task 4).
  - En `cityAct` (:752-754) se quitan `kp` y `teach-go`, y se añaden `teach-send`, `teach-ok` y `teach-edit`. `retry-teach` se quita aquí si solo lo usaba explicar; si no, en la Task 4.
  - Se añade un listener `input` delegado junto al de `click` (:759).
  - `__CITY_TEST_API__` (:766) recibe `teach(id)`.
- Modify: `engine.html`, CSS de `#city-teach-text` (`font-size: 16px` o más para que iOS no haga zoom, ancho 100 %, `box-sizing: border-box`), `.teach-miss`, el `fieldset`/`legend` de revisión y las etiquetas de casilla con altura mínima de 44 px. La clase `.mark` ya existe y no se reutiliza.
- Test (nuevo): `tests/city_teach_ui.cjs`, con un solo helper de arranque de jsdom (copiado de `tests/city_progress.cjs:13-33`) que reutilizan todos sus bloques.
- Test (migrar al flujo nuevo, manteniendo lo que comprobaban):
  - `tests/city_engine.cjs:354-381` (explicar: título, contador, aciertos y XP) y `:400-406` (restaurar al enseñar al 8.º: si `D5.mode === 'explain'`, escribir los términos y confirmar);
  - `tests/city_engine.cjs:510-515` (explicar con Liderazgo: «+20 XP»);
  - `tests/city_scenes.cjs:249-254` (el foco tras elegir punto pasa a: el foco sigue en el textarea tras escribir);
  - `tests/review_gaps.cjs:152-163` (3d: el doble clic en `teach-ok` suma XP una sola vez; 3e se mantiene).

**Interfaces:**
- Consumes: `CityTeach.*` (Task 1).
- Produces (en `view.js`):
  - `cityTeachOpen(o)`: crea o reutiliza `CD.teach` (si `CD.teach && CD.teach.id === o.id` se conserva el borrador) y pinta el paso actual.
  - `CD.teach = { id, o, mode, step: 'write' | 'review', text, item, checks, miss }`.
  - `cityTeachDone(o)`, con esta secuencia exacta:
    1. `touch()`; 2. `var gain = teachXp(); S.xp += gain;` 3. `cityD(CD.scene).taught[o.id] = true;` 4. `var rs = CityStory.applyRestore(S.city, CITY_DATA, bossPassedOf); checkVirtues(); save();` 5. `CD.teach = null;` 6. si `rs.changed.length`: `cityRestorePending = []; cityRefresh(); cityCelebrate(rs.changed, '¡Gracias, ' + o.name + ' lo entendió!');` si no, la hoja de éxito con «+N XP» y, si `S.virtues.liderazgo`, «(incluye +LEAD_XP de Liderazgo)».
  - **Guarda de doble toque en `teach-ok`:** `if (!CD.teach || CD.teach.step !== 'review') return;` antes de evaluar. `cityTeachDone` no lleva guarda propia.
  - `window.__CITY_TEST_API__.teach(id)`: busca el aprendiz `id` en el distrito actual (ciudad abierta) y llama a `cityTeachDone`. Si no existe, no hace nada.

- [ ] **Step 1: Escribir `tests/city_teach_ui.cjs`.** Se entra a M02 con un aprendiz *explain* disponible, se teletransporta al jugador y se abre la hoja. Aserciones:
  - **Abrir:** se ve «¿Me explicas {título}?». El foco está en el `h2[tabindex="-1"]`.
  - **Textarea:** `#city-teach-text` tiene `maxlength="2000"`, `spellcheck="false"`, `autocorrect="off"`, `autocapitalize="sentences"`, `autocomplete="off"` y un `label[for]`.
  - **`#city-count`:** no tiene `aria-live` y el textarea lo referencia con `aria-describedby`.
  - **Al escribir** (poniendo `.value` y disparando `input`):
    - con 11 palabras el contador dice «Falta 1 palabra de 12» y `[data-c="teach-send"]` está `disabled`; con 5, «Faltan 7 palabras de 12»;
    - `'a b c d e f g h i j k l'` cuenta 12 (palabras = `norm(text).length`);
    - antes y después del `input` el nodo del textarea es el mismo (`===`), y `save` no se llama (se cuenta con un envoltorio de `localStorage.setItem`);
    - con 12 palabras el botón se activa y `#city-live` anuncia el mínimo una sola vez (otro `input` con 13 no lo repite).
  - **Revisar:** con un texto que menciona los términos de 3 puntos, quedan 3 casillas premarcadas con «Lo detecté» dentro de su `label`, dentro de un `fieldset` con `legend` «Marca al menos 3», el texto «Detecté 3 de N puntos» y el foco en la primera casilla. Hay botón «Cerrar».
  - **Confirmar:**
    - Pulsar `teach-ok` deja `taught[id] === true` en `S` guardado y la XP sube `TEACH_XP`.
    - Pulsarlo dos veces seguidas suma XP una sola vez.
    - Con la virtud liderazgo, sube `TEACH_XP + LEAD_XP` y la hoja dice «Liderazgo».
  - **Fallar:** desmarcar hasta 2 y confirmar vuelve a escribir con el mismo texto en `.value`, «Te faltó:» en un elemento `role="status"` y el foco en ese elemento (`tabindex="-1"`), no en el textarea.
  - **Reescribir:** `teach-edit` vuelve a escribir con el texto y el foco en el textarea.
  - **Borrador:** «Cerrar» (en escribir y en revisar) y reabrir el mismo aprendiz recupera el texto.
  - **Restaurar:** con `need − 1` enseñados y el jefe aprobado, aprobar al último saca una sola celebración (`¡Distrito restaurado!` aparece una vez y no vuelve al cerrar y reentrar).
  - **HTML del jugador:** el texto `</textarea><img src=x onerror="window.__x=1"><script>window.__x=2</script>` no ejecuta nada (`window.__x` es undefined) ni crea `img`/`script` en la hoja, tras pintar escribir, revisar, fallar y reescribir.
  - **Privacidad:** con un borrador abierto y tras aprobar, ni `localStorage.getItem(KEY)` ni la clave `_bak` contienen una palabra única del texto (`zxqwv`).
  - **Gancho:** `__CITY_TEST_API__.teach(id)` marca `taught`.

- [ ] **Step 2: Comprobar que falla.** Run: `node build.mjs && node tests/city_teach_ui.cjs`. Expected: FAIL desde «¿Me explicas…» con textarea, porque hoy no existe `#city-teach-text`.

- [ ] **Step 3: Implementar.** Se siguen las secciones del spec «Pantallas», «Escribir», «Revisar (explicar)», «Foco» y «Aprobar».
  - **Listener `input`:** solo actúa si `e.target.id === 'city-teach-text'` y `CD.teach`; actualiza `CD.teach.text`, `#city-count.textContent` y `disabled`, y anuncia el mínimo una vez. Nunca repinta, guarda ni detecta.
  - **Pintar** la pantalla de escribir calcula también el contador y `disabled` (con el texto restaurado), y después restaura `textarea.value = CD.teach.text`.
  - **Texto del jugador en revisión:** se muestra con `white-space: pre-wrap; overflow-wrap: anywhere`.
  - **Borrar** `cityKpPool`, `cityTeachPick`, `cityTeachExplain` y `cityTeachGo`.

- [ ] **Step 4: Comprobar que pasa.** Run: `node build.mjs && for f in tests/city_teach_ui.cjs tests/city_engine.cjs tests/city_scenes.cjs tests/review_gaps.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`. Expected: solo `FIN`.

- [ ] **Step 5: Commit.** `git commit -m "feat(city): enseñar a un aprendiz explicando el tema por escrito"`

### Task 4: *Corregir* escribiendo, quitar la ronda de enseñar y migrar sus pruebas

**Files:**
- Modify `city/view.js`:
  - `cityTeachCorrect` se borra; `view.js:645` queda `cityTeachOpen(o)` para los dos modos;
  - `cityTeachOpen` en modo `correct` elige el error con `shuffle(ofType(mod(CD.scene), 'error', o.topic))`, lo pasa por `CityTeach.fixItem`, descarta los `null` y guarda el primero en `CD.teach.item`; si no queda ninguno, no abre (igual que hoy);
  - se quita `retry-teach` de `cityAct` si sigue ahí.
- Modify `engine.html`:
  - se borra la rama `c.kind === 'teach'` (:779) y se actualiza el comentario de `cityResolve` (:773: «vencida o reparada»);
  - se borra la línea del bono (:807);
  - se borran `leadBonus: 0` y `hadLead: …` de :666;
  - se borra `R.leadBonus` en :1023-1025;
  - CSS de `mark.hit`.
- Test: `tests/city_teach_ui.cjs`, con un bloque *corregir* nuevo.
- Test (migrar; cada uno sigue comprobando lo mismo: `taught`, restauración, celebración y XP):
  - **Con la ciudad abierta → `__CITY_TEST_API__.teach(id)`:** `tests/city_progress.cjs:55, 84, 132`; `tests/xss_data.cjs:152`.
  - **Con la ciudad cerrada (la celebración pendiente al entrar)** → se siembra el distrito con `need` enseñados y el jefe **sin** aprobar, y se gana el jefe fuera de la ciudad con `startRound({kind:'boss', mid, back:{name:'home'}}, qs)` respondiendo todo bien (patrón de `tests/city_rounds.cjs:145-151`): `tests/city_progress.cjs:142, 173, 183`; `tests/review_tanda2_gaps.cjs:81-86`; `tests/review_tanda3_gaps.cjs:200-205`; `tests/adv/tanda2_impl_attack.cjs:298-302`. El nombre de cada prueba cambia de «enseñar» a «ganar al jefe»; lo que se comprueba al entrar (celebración, rango, poder) no cambia.
  - **`tests/city_rounds.cjs:129-135`** («Enseñar con 1 acierto marca taught»): se sustituye por la aserción de que `startRound({…, city:{kind:'teach', …}})` con un acierto **no** marca `taught` (la rama ya no existe).
  - **`tests/city_engine.cjs:383-394`** (corregir): pasa a abrir la hoja de corregir con la ciudad visible; `:393` se invierte: enseñar **no** registra nada en `qs`.
  - **`tests/city_engine.cjs:400-406`**: la rama `correct` del 8.º aprendiz pasa a escribir `right + explanation` y confirmar.
  - **`tests/city_engine.cjs:516-524`**: «Bono de Liderazgo» pasa a «(incluye +5 de Liderazgo)» en la hoja de éxito de corregir; sin la virtud, no aparece.
  - **`tests/adv/review_attack.cjs:631-692`**: la acción `teach` deja de abrir una ronda: llama al gancho `teach(id)` con la ciudad abierta y la regla pasa a buscar «Liderazgo» en `#city-sheet`; la regla `:692` («bono fuera de enseñar») busca que ningún resultado de ronda diga «Liderazgo».

**Interfaces:**
- Consumes: `cityTeachOpen`, `cityTeachDone`, la guarda de `teach-ok`, `CityTeach.fixItem`, `fixCheck` y `marks`.
- Produces: `CD.teach.item` (`{wrong, right, explanation}`), que se conserva hasta aprobar.

- [ ] **Step 1: Escribir el bloque *corregir* en `tests/city_teach_ui.cjs`** con el aprendiz `correct` de M02 T06. Aserciones:
  - **Abrir:** se ve la frase `wrong` y «¿Qué está mal y cómo es en realidad?». Con 5 palabras el botón está `disabled` y el contador dice «Falta 1 palabra de 6»; con 6, activo.
  - **Revisar con `right + explanation` escritos:**
    - aparece tu texto con algún `mark.hit`;
    - debajo, la versión correcta (con `esc`, sin `fmt`);
    - «Encontré N de M términos»;
    - la casilla «Lo corregí bien» premarcada.
  - **Revisar con `wrong` escrito:** la casilla no sale premarcada.
  - **Confirmar** sin marcar vuelve a escribir con el texto y «Revisa la versión correcta» en `role="status"`. Marcada, da `taught` y `TEACH_XP`; doble toque suma una vez.
  - **Mismo error:** reabrir tras «Cerrar» muestra la misma frase.
  - **Sin ronda (DOM):** durante todo el flujo `#city-root` sigue visible, no aparece `.prompt` ni `[data-act="back"]` en `main`, y `saved().qs` no cambia.
  - **HTML del jugador:** el texto con `<img onerror>` y `<script>` se ve inerte en la revisión de corregir (la única que pinta tu texto con `innerHTML`, por tramos) y tras «Reescribir».
  - **Motor:** en `juego_estudio.html` no quedan `hadLead`, `leadBonus` ni `kind === 'teach'`.

- [ ] **Step 2: Comprobar que falla.** Run: `node build.mjs && node tests/city_teach_ui.cjs`. Expected: FAIL en el bloque corregir, porque hoy abre una ronda `error`.

- [ ] **Step 3: Implementar** según «Revisar (corregir)» y «Corregir» del spec. Después, borrar el código del motor indicado y migrar las pruebas de la lista.
  - Si una aserción dependía de la ronda (por ejemplo `R.ok`), se cambia por el efecto equivalente de `cityTeachDone`. No se borra sin reemplazo.

- [ ] **Step 4: Comprobar que pasa.**
  - Run: `node build.mjs && for f in tests/city_teach_ui.cjs tests/city_progress.cjs tests/city_rounds.cjs tests/city_engine.cjs tests/review_gaps.cjs tests/review_tanda2_gaps.cjs tests/review_tanda3_gaps.cjs tests/xss_data.cjs tests/adv/tanda2_impl_attack.cjs tests/adv/review_attack.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`.
  - Expected: solo `FIN`. `review_attack` tarda varios minutos.

- [ ] **Step 5: Commit.** `git commit -m "feat(city): corregir a un aprendiz por escrito y sin la ronda de enseñar del motor"`

### Task 5: Robustez del textarea (Esc, teclado virtual, aviso de giro)

**Files:**
- Modify: `city/input.js:57`. Si `e.key === 'Escape'` y `doc.activeElement` es un `TEXTAREA`, se hace `doc.activeElement.blur()`, se mueve el foco al `h2` de la hoja si existe y `return`, sin `pause = true`. Un `INPUT` sigue como hoy.
- Modify: `city/view.js`.
  - En `cityRotateCheck` (:332) se añade una salida temprana sin cambiar `CD.rotate` si `document.activeElement` es `#city-teach-text`.
  - Un listener `blur` (fase de captura, en la raíz) sobre `#city-teach-text` llama a `cityRotateCheck()`, para que el aviso aparezca si se giró mientras se escribía.
  - Un único registro, junto al `resize` de `:764`: si existe `window.visualViewport`, en su `resize` y `scroll` se calcula `kb = Math.max(0, Math.round(innerHeight − vv.height − vv.offsetTop))`; si no hay ciudad abierta (`!CD`) no hace nada; solo escribe `#city-sheet.style.setProperty('--kb', kb + 'px')` si el valor cambió.
  - Al cerrar la hoja, `--kb` vuelve a `0px`.
- Modify: `engine.html`, CSS: `#city-sheet .actions{bottom:var(--kb,0px)}` (las acciones son sticky; `padding-bottom` no las sube).
- Test: `tests/city_input.cjs` y `tests/city_teach_ui.cjs`.

**Interfaces:**
- Consumes: `#city-teach-text` (Task 3).
- Produces: nada nuevo para otras tareas.

- [ ] **Step 1: Escribir las pruebas.**
  - **En `tests/city_input.cjs`:** con el foco en un `<textarea>`, Escape no activa la pausa (el estado de pausa que ya leen sus pruebas de Escape) y el textarea pierde el foco. Con el foco en un `<input>` y sin foco, Escape se comporta como hoy.
  - **En `tests/city_teach_ui.cjs`:**
    - Esc en el textarea deja la hoja abierta, el foco en el `h2` y el texto intacto;
    - con el foco en el textarea, forzar `matchMedia` para que la consulta de giro dé `true` y disparar `resize` deja `#city-rotate` oculto y la hoja sin `inert`; al hacer `blur`, el aviso aparece; sin foco, el `resize` lo muestra;
    - con un `visualViewport` falso (`height: innerHeight − 300`, `offsetTop: 0`, con `addEventListener`) en `beforeParse`, tras su `resize`, `#city-sheet.style.getPropertyValue('--kb') === '300px'`; un segundo `resize` igual no vuelve a llamar a `setProperty` (envoltorio con contador); al cerrar la hoja vale `'0px'`;
    - el CSS generado contiene `bottom:var(--kb` en la regla de `.actions` de la hoja.

- [ ] **Step 2: Comprobar que falla.** Run: `node build.mjs && node tests/city_input.cjs; node tests/city_teach_ui.cjs`. Expected: FAIL en Escape, giro y `--kb`.

- [ ] **Step 3: Implementar** los cambios descritos en Files.

- [ ] **Step 4: Comprobar que pasa.** Run: `node build.mjs && node tests/city_input.cjs && node tests/city_teach_ui.cjs`. Expected: OK en ambas.

- [ ] **Step 5: Comprobación en navegador real.**
  - Con Playwright (`playwright-core` en el scratchpad `pw`) con `isMobile: true` y `hasTouch: true` a 360×740 y 412×915: abrir un aprendiz, escribir 12 palabras con `keyboard.type`, revisar y confirmar. Para simular el teclado, reducir el viewport a 360×400 con el textarea enfocado.
  - Expected: sin errores de consola; el `getBoundingClientRect().bottom` del botón «Revisar» ≤ alto visible; `taught` guardado.

- [ ] **Step 6: Commit.** `git commit -m "fix(city): Esc, teclado virtual y aviso de giro no interrumpen al escribir"`

### Task 6: Documentación, restos y suite completa

**Files:**
- Modify: `README.md`, en la sección de Ciudad Núcleo o de aprendices: explicar y corregir ahora se escriben, y cómo funcionan la premarca y la confirmación.
- Modify: el spec, con una sección final «Cambios de la implementación» que recoja los *Ruling* del ledger, por ejemplo `fixItem` en `CityTeach`.

- [ ] **Step 1:** Comprobar que no queda nada sin uso. `grep -rn "cityKpPool\|cityTeachPick\|cityTeachExplain\|cityTeachGo\|cityTeachCorrect\|retry-teach\|teach-go\|data-c=\"kp\"\|hadLead\|leadBonus\|Bono de Liderazgo\|kind === 'teach'\|kind: 'teach'" city/*.js engine.html validate.mjs build.mjs tests README.md` debe dar 0 resultados, salvo en pruebas que afirmen su ausencia o que comprueben que una ronda `teach` ya no marca nada.
- [ ] **Step 2:** Run SUITE en segundo plano. Expected: solo `VALIDACIÓN OK` y `FIN`. Un `FALLO` se repite solo antes de tratarlo como real.
- [ ] **Step 3: Commit.** `git commit -m "docs(city): enseñar escribiendo en el README y cambios de la implementación"`
