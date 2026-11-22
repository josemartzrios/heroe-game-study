# Ciudad Núcleo: enseñar escribiendo (diseño corto, v2)

## Por qué
Hoy enseñar a un aprendiz se siente como responder otra pregunta: *explicar* es elegir 3 de 6 frases y *corregir* es una pregunta `error` del banco.
El usuario quiere que enseñar sea distinto: escribir con tus palabras y que el juego lo valide.

## Objetivos
- Los dos modos de aprendiz pasan a texto libre:
  - **explicar**: explicas el tema.
  - **corregir**: el aprendiz suelta un error y tú escribes qué está mal y cómo es en realidad.
- Validación «C»: el juego detecta lo que cubriste, te lo muestra premarcado y tú confirmas o corriges. Tu confirmación es la última palabra.
- Las premarcas tienen que ser honestas: el texto vacío o sin relación no premarca nada, y una explicación correcta con otras palabras (plural, derivadas) sí suele premarcar.
- Al fallar se ve qué faltó y se reescribe sin perder el texto.

## No objetivos / anti-objetivos
- Sin IA ni servidor: el juego sigue siendo un HTML estático, sin red y sin claves.
- Los repartos de aprendices de los 8 distritos no cambian (`explain` / `correct` siguen en los datos).
- El texto del jugador no se guarda en la partida (ni en `S` ni en localStorage); solo el resultado `taught[id]`.
- Enseñar no cuenta como práctica: no suma estrellas, ni repaso de fallos, ni virtudes de ronda, y no admite poderes. Es intencional.
- Anti-objetivo: que se sienta como otra pregunta de opción múltiple, o que «Lo detecté» aparezca sobre algo falso o vacío.

## Enfoques considerados
1. **`city/teach.js` puro, que lee los datos que ya están en el HTML** — **elegido**. Es ES5, sigue el patrón de `city/story.js` y se prueba en Node; pruebas de contenido recorren los 10 módulos.
2. Términos precalculados en `build.mjs`: engorda el HTML y duplica información. Descartado.
3. Todo en `view.js`: mezcla lógica y UI y es difícil de probar. Descartado.

## Contenido (única edición de datos)
Se añaden negritas a 6 temas *explicar*: 5 tienen hoy menos de 3 puntos detectables y M04 T13 es de refuerzo. Solo se marcan palabras que ya están en el texto; no se cambia ninguna frase.

| Tema | Punto | Negrita nueva |
|---|---|---|
| M01 T02 (`content.mjs`) | 3 | **CDN**, **caché** |
| M01 T15 (`content.mjs`) | 3 y 4 | **base de datos**; **complejidad operativa** |
| M02 T09 (`content_m02.mjs`) | 1, 3, 5 y 6 | **leer**, **escribir**, **ejecutar**; **Notación numérica**; **777** (al inicio del 5); **`chmod`** |
| M03 T09 (`content_m03.mjs`) | 3 y 4 | **capa de Aplicación**; **IP** («qué **IP** le corresponde») |
| M04 T13 (`content_m04.mjs`) | 4 y 5 | **Simula** («las tomó de **Simula**»); **multiparadigma** |
| M06 T08 (`content_m06.mjs`) | 2 y 4 | **asociado**; **dueña** («parte» no: es tan común que un texto genérico la premarcaba) |

Los puntos de la tabla se cuentan desde 1.

Además, en M08 T02 (`content_m08.mjs`), el `error` del satélite es una negación: «no usa» frente a «sí usa». Con esas palabras no sale ningún término, así que su explicación pasa a ser «Versión correcta: el satélite es inalámbrico: transmite por microondas, que son ondas electromagnéticas.».

Si la prueba de contenido de «corregir» encuentra otro `error` sin términos, se arregla igual en los datos (una palabra concreta en su explicación), nunca debilitando la prueba.

**Comprobado con un prototipo de estas reglas sobre el contenido real** (los 81 aprendices):
- Las pruebas de contenido de abajo pasan: 0 fallos.
- En *corregir*, la explicación sola premarca 60 de 71 errores.
- La frase equivocada más un distractor premarca 29 de 213. La confirmación del jugador cubre ese margen.

**Límite conocido:** en los errores de tipo «es al revés» (SAST/DAST, atributos/métodos), la versión correcta usa las mismas palabras que la equivocada. Solo premarcan si escribes las palabras de la explicación («estático», «dinámico»).

## Diseño

### `city/teach.js` → `CityTeach` (ES5, sin DOM)
Termina con `if (typeof module !== 'undefined' && module.exports) module.exports = CityTeach;`, como `story.js`. `build.mjs` lo concatena en `/*__CITY_CODE__*/` antes de `view.js`.

**Constantes:**
- `MAX_CHARS = 2000`;
- `MIN_WORDS_EXPLAIN = 12`;
- `MIN_WORDS_FIX = 6`;
- `PASS_POINTS = 3`, que en la práctica es `min(3, nº de puntos)`.

**Normalización `norm(s)` → lista de tokens:**
1. `String(s).slice(0, MAX_CHARS)`.
2. Se quitan los invisibles con una clase explícita: `/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g` (incluye los aislantes bidi U+2066-2069).
3. `normalize('NFD')` solo si existe, y luego se quitan `/[̀-ͯ]/g`. No se usa NFKC: la expansión de NFKC es la que colgaba el fuzzing.
4. Se pasa a minúsculas y se extraen los tokens con `/[a-z0-9]+(?:[.,][0-9]+)*/g`. Así `255.255.255.255` y `1.1` quedan enteros, `5g` y `c` son tokens y todo lo demás separa.
5. Nada de `\p{…}` ni de la bandera `u`.

**Coincidencia de palabras `same(a, b)`.** Dos tokens casan si se cumple una de estas:
- son iguales;
- uno es el otro con `s` o `es` al final, en cualquier dirección;
- los dos tienen 6 letras o más y comparten las 6 primeras, como `modular` y `modularidad`, o `asociado` y `asociación`. Los números solo casan si son iguales.

Los conjuntos de tokens se arman con `Object.create(null)` o con arrays, nunca con `{}`.

**Palabras vacías:** una lista fija en `CityTeach.STOP` (artículos, preposiciones, conectores y verbos auxiliares comunes, además de `reves`, `version`, `correcta`, `error`; no `verdad`, que es término en M04 T08). Una prueba congela la lista.

**Términos de un punto clave, `keyTerms(kp)`.** Son los fragmentos `**…**` del texto crudo, y cada uno se pasa a sus tokens con `norm`.
- Un término se descarta si todos sus tokens son palabras vacías (por ejemplo `"es un"`).
- Los **tokens significativos** de un término son los números y las palabras de 3 letras o más que no son vacías.
- Si un término no tiene ninguno pero sí tokens (`C`, `IP`, `5G`), sus tokens enteros pasan a ser los significativos. Esto rescata las siglas.
- Un término **aparece** en el texto si cada uno de sus tokens significativos casa (`same`) con algún token del texto.
- Un texto vacío no hace aparecer nada.

**`explainCheck(text, keyPoints)` → `[bool]`**, alineado con `keyPoints`. Un punto se detecta si aparece alguno de sus términos; un punto sin términos válidos nunca se detecta.

**Error en tiempo de ejecución.** Las preguntas `error` del HTML son `{prompt, options, answer, explanation}` (`content_expand.mjs:23-27`). El objeto se arma en un solo sitio, `CityTeach.fixItem(q)` (lo usan la vista, R4 y las pruebas); devuelve `null` si la pregunta está mal formada:
- `wrong` es el texto entre el primer `“` y el último `”` del `prompt` (`''` si no hay comillas);
- `right` es `options[answer]`;
- `explanation` es `explanation` sin el prefijo `Versión correcta:`.

**`fixTerms({wrong, right, explanation})` → tokens.** Sale de los tokens de `right` y de `explanation`, sin repetidos. Entra un token si es:
- un número;
- una palabra de 5 letras o más que no sea vacía;
- una sigla, es decir una palabra de 2 a 4 letras escrita en mayúsculas en el texto original (CPU, RAM, DNS, TCP), delimitada sin `\b` para que funcione junto a letras acentuadas.

Se excluye cualquier token que case con alguno de `wrong`, y no se repiten tokens que casen entre sí.

**`fixCheck(text, item)` → `{ terms, found, detected }`.**
- `detected` es verdadero solo si `terms.length > 0` y `found.length >= ceil(terms.length / 3)`.
- Si no hay términos, nunca se detecta.

**`marks(raw, found)` → `[{ t, hit }]`.** Recorta el texto crudo a `MAX_CHARS` y lo parte en tramos de palabra y de separador. Un tramo de palabra es una secuencia de letras (con acentos y ñ), dígitos, invisibles y `.`/`,` entre dígitos, para que «inalámbrico» no quede partido. Un tramo lleva `hit` si alguno de sus tokens (`norm(t)`) casa con `found`; así lo resaltado coincide con lo encontrado. La vista solo hace `esc(t)` y envuelve en `<mark class="hit">` los tramos marcados, sin RegExp ni `replace` sobre HTML. Los `` `código` `` de `right` se muestran sin `fmt`, solo con `esc`.

### Pantallas (`city/view.js`, en la hoja `#city-sheet`)
**Estado en memoria:** `CD.teach = { id, o, mode, step: 'write' | 'review', text, item?, checks }`.
- Nunca se serializa.
- Al aprobar se pone a `null`.
- Al cerrar se conserva, y reabrir al mismo aprendiz recupera el borrador.

**Escribir:**
- Título «¿Me explicas *título*?», o en *corregir* la frase equivocada del aprendiz y «¿Qué está mal y cómo es en realidad?».
- Un `<textarea id="city-teach-text">` con `<label for>` visible, `maxlength="2000"`, `autocapitalize="sentences"`, `autocorrect="off"`, `spellcheck="false"` y `autocomplete="off"`.
- El texto se restaura siempre con `textarea.value = CD.teach.text`, nunca dentro de `innerHTML`.
- Un listener `input` delegado en la raíz hace solo tres cosas: actualizar `CD.teach.text`, poner el `textContent` de `#city-count` («Faltan 4 palabras de 12» / «Listo») y fijar `disabled` del botón. **Nunca repinta la hoja.**
- `#city-count` no lleva `aria-live`; va ligado con `aria-describedby`. Al llegar al mínimo se anuncia una sola vez en `#city-live`.
- Si se vuelve de una revisión fallida, encima del cuadro aparece «Te faltó:» con los puntos no marcados (en *corregir*, «Revisa la versión correcta»), en `role="status"`.
- Botones: «Revisar» (`data-c="teach-send"`) y «Cerrar».

**Revisar (explicar):**
- Cada punto clave es una casilla con su `<label>`. Si `explainCheck` lo detectó, la casilla sale premarcada y el texto «Lo detecté» va dentro de la etiqueta.
- Arriba se lee «Detecté N de M puntos».
- Se aprueba con `min(3, M)` casillas marcadas.

**Revisar (corregir):**
- Se muestra tu texto con los tramos encontrados marcados y, debajo, la versión correcta.
- Una línea dice «Encontré N de M términos».
- Una casilla «Lo corregí bien», premarcada si `detected`.

**Botones de revisión:** «Confirmar» (`teach-ok`) y «Reescribir» (`teach-edit`, que vuelve a escribir con el texto y el cursor al final). Si no alcanza el aprobado, «Confirmar» vuelve a la pantalla de escribir con la lista de lo que faltó.

**Foco:**
- Al abrir, va al `h2` (`tabindex="-1"`), para que el teclado del móvil no tape el enunciado.
- En revisión, va a la primera casilla.
- Al reescribir, va al textarea.

**Aprobar.** Hay una sola función, `cityTeachDone(o)`, para los dos modos:
1. `touch()`;
2. `gain = teachXp()` y `S.xp += gain`;
3. `taught[o.id] = true`;
4. `applyRestore`, `checkVirtues` y `save`;
5. `CD.teach = null`;
6. si cambió algún distrito, `cityRestorePending = []`, `cityRefresh()` y la celebración; si no, la hoja de éxito con «+N XP», añadiendo «(incluye +LEAD_XP de Liderazgo)» si la virtud está activa.

El doble toque se para en la acción `teach-ok`, que no hace nada si `CD.teach` es nulo o no está en revisión.

**Corregir:** el error se elige al azar entre `ofType(m, 'error', topic)` al abrir, y se conserva en `CD.teach.item` hasta aprobar. Si el aprendiz no tiene errores, no se abre, igual que hoy.

### Robustez con el textarea
- **Esc:** si el foco está en un `TEXTAREA`, solo quita el foco (que pasa al `h2` de la hoja) y no cierra la hoja ni pausa el juego (`city/input.js:57`, antes del guard `typing()`). En un `INPUT` sigue como hoy. Las demás teclas ya las ignora `typing()`; se prueba.
- **Teclado virtual:** un único listener de `visualViewport` (`resize` y `scroll`), si existe, fija en `#city-sheet` una variable `--kb` igual a `innerHeight − vv.height − vv.offsetTop`, como mínimo 0. Solo actúa con la ciudad abierta, solo escribe si el valor cambia y vuelve a 0 al cerrar la hoja. Las `.actions` sticky usan `bottom: var(--kb, 0px)` (un `padding-bottom` no las subiría).
- **Aviso de giro:** `cityRotateCheck` (`view.js:332`) no cambia `CD.rotate` mientras `document.activeElement` sea el textarea de la hoja, y se vuelve a llamar al perder el foco.

### Se elimina
- En `view.js`: `cityKpPool`, `cityTeachPick`, `cityTeachExplain`, `cityTeachGo`, el arranque de ronda de `cityTeachCorrect` y las acciones `kp`, `teach-go` y `retry-teach` de `cityAct` (`view.js:752-754`).
- En `engine.html`: el caso `c.kind === 'teach'` (`:779`), el bono de `:807`, y `R.hadLead` y `leadBonus` (`:666`, `:1023-1025`), que quedan sin uso.
- No hay CSS que borrar: `.kp` se sigue usando en otras hojas.

### Reglas de distrito (`city/check_district.mjs`, R4)
Se mantienen las reglas actuales y se añaden dos, que solo se evalúan si el tema existe:
- Un aprendiz `explain` necesita que su tema tenga al menos `min(3, n)` puntos con `explainCheck` posible, es decir con un término válido.
- Un aprendiz `correct` necesita al menos un `error` de su tema con `fixTerms` no vacío. Sustituye a la regla actual «`correct` necesita una pregunta `error`», que queda incluida.

Se usa `CityTeach` desde ESM con `createRequire`.

## Restricciones
- ES5 en `city/*.js` y `engine.html`.
- El texto de datos entra en `innerHTML` solo con `esc()` / `fmt()`. El texto del jugador solo entra con `esc()` por tramos (`marks`) o por `.value`, y nunca pasa por `fmt()`.
- Ganchos de prueba solo con `window.__CITY_TEST__ === true`.

## Pruebas
- **Unitarias de `CityTeach`:**
  - `norm`: acentos, mayúsculas, invisibles, números con puntos, un texto de 1 MB recortado antes de todo, sin NFKC, y menos de 200 ms con `'ﷺ'.repeat(1 << 20)`.
  - `same`: plural `s`/`es` en las dos direcciones, prefijo de 6 letras, números exactos.
  - Términos vacuos descartados, siglas cortas, el texto vacío no detecta nada.
  - `fixCheck` sin términos da `false` y casos con umbral de un tercio.
  - `constructor` y `toString` no casan sin escribirlos; `marks` devuelve tramos que, unidos, reproducen el original.
- **De contenido**, sobre los 10 módulos y los 8 distritos:
  - Todo tema *explicar* tiene al menos `min(3, n)` puntos detectables.
  - Los términos vacuos (`**otros**`, `**tiene**`, `**es un**`) no cuentan: solo cuentan los puntos con un término válido.
  - Un texto genérico de informática no llega al aprobado premarcado en ningún tema.
  - Todo `error` de un tema *corregir* tiene `fixTerms` no vacío, y `fixCheck(right + ' ' + explanation)` sale detectado. Se usan los dos juntos por el límite de «al revés».
  - `fixCheck(wrong)` nunca sale detectado.
  - Pegar el texto de un punto clave lo detecta.
- **Integración (jsdom):**
  - Los dos flujos completos (escribir, revisar, confirmar), con `taught` y XP, y el aviso de Liderazgo visible.
  - Al fallar se conserva el texto y aparece «Te faltó».
  - Escribir no repinta la hoja: el mismo nodo textarea antes y después de un `input`.
  - Esc en el textarea no cierra la hoja; «Cerrar» y reabrir conserva el borrador.
  - Texto con `</textarea><img onerror>` y `<script>` se ve inerte.
  - `localStorage` no contiene el texto escrito.
  - `resize` con el foco en el textarea no activa el giro.
- **Ganchos:** `__CITY_TEST_API__.teach(id)` ejecuta `cityTeachDone` sobre el aprendiz con la ciudad abierta. Las pruebas que hoy llaman a `startRound({city:{kind:'teach'}})` se migran todas (la lista exacta está en el plan):
  - con la ciudad abierta, al gancho;
  - con la ciudad cerrada (celebración pendiente al entrar), a ganar al jefe desde fuera con los aprendices ya enseñados;
  - `tests/adv/review_attack.cjs` busca el aviso de Liderazgo en la hoja de éxito.

  También se actualizan las que pulsaban `kp`/`teach-go`, miraban `#city-count` o el «Bono de Liderazgo» (`tests/city_scenes.cjs`, `tests/city_engine.cjs`, `tests/review_gaps.cjs`).

## Lo que queda al constructor
- Los textos finos de la interfaz.
- (La lista exacta de `STOP` quedó fijada en el plan y la congela su prueba.)

## Cambios de la implementación
Decisiones tomadas al ejecutar el plan (el spec sigue siendo la referencia del comportamiento):
- `CityTeach.fixItem(q)` vive en el módulo (lo usan la vista, R4 y las pruebas de contenido) y devuelve `null` si la pregunta está mal formada.
- `norm` y `marks` comparten un único plegado carácter a carácter (`fold`): lo que se resalta es exactamente lo que se cuenta, también con acentos, invisibles y números con punto.
- El foco vuelve al título de la hoja con un `focusout` en `view.js` (`input.js` solo suelta el cuadro de texto con Esc, porque no conoce la hoja). Al soltar el cuadro de texto también se revisa el aviso de giro que se pospuso mientras se escribía.
- Las acciones de la hoja se anclan con `bottom: var(--kb)` y `--kb` se pone a `0px` al cerrar la hoja.
- Las pruebas que enseñaban con la ciudad cerrada ahora ganan el jefe del módulo con los aprendices ya enseñados (la restauración sigue quedando pendiente hasta entrar); las que enseñaban con la ciudad abierta usan `__CITY_TEST_API__.teach(id)`.
- `tests/city_teach_ui.cjs` usa el mundo falso de `city_engine.cjs` (permite teletransportar, forzar `matchMedia` y un `visualViewport` falso).
- Comprobado en un navegador real (Chromium móvil, 360×740 y 412×915): escribir con el teclado, revisar y confirmar, con los botones dentro de la pantalla, 3 puntos premarcados y 0 errores de consola.
