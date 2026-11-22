# Ciudad Núcleo — Tanda 4: distritos de M05 y M09 (diseño)

Continúa la Tanda 3 (`2026-11-18-ciudad-tanda-3-design.md`). Usa el mismo formato (§4.2 de `2026-11-12-ciudad-distritos-design.md`), las mismas reglas de validación (R1–R11, con R4 ampliada por `2026-11-21-ciudad-ensenar-escribiendo-design.md`) y las mismas **reglas de contenido** de la Tanda 3. Esas reglas son el color propio sin ámbar ni morados de referencia, las etiquetas con artículo de 28 caracteres o menos, los nombres sin parecido fonético con ningún otro distrito, las criaturas y reparaciones sin repetir ideas, y los nombres de distrito sin artículo.

## Intención
Que los portales de **M05 (Patrones de diseño)** y **M09 (IA para ingeniería de software)** lleven a distritos completos. Tras esta tanda hay 10 distritos y solo falta M11.

El usuario eligió **distritos normales**: solo datos y texto, sin mecánicas propias como la ruta del paquete de M08.

## Enfoques
- **Elegido: el molde de la Tanda 3.** Un archivo de datos por distrito con `standardFrame()` y `people()` de `city/layout.mjs`, registrado en `city/districts.mjs`. No hay cambios de código en la vista, el motor ni la plaza (los portales de M05 y M09 ya existen).
- **Descartados:**
  - un marco geométrico propio, porque solo tiene sentido con una mecánica nueva;
  - una mecánica nueva en M09, porque el usuario la descartó.

## Cómo se construye
- `city/districts/m05.mjs` y `city/districts/m09.mjs`, con la misma forma que `m07.mjs`: `style: 'red'`, `need` 7 y 10 aprendices.
- En `city/districts.mjs`:
  - se importan los dos;
  - `districts` queda en el orden fijo `{ M02, M08, M03, M01, M10, M04, M06, M07, M05, M09 }`;
  - `ORDER` y los portales no cambian.
- Los modos van en los `.mjs` como `'explain'` / `'correct'`.

## Contenido
Comprobado antes de escribir este documento:
- Las dos tablas se armaron con `standardFrame()` y `people()` y pasan `checkDistrict` con 0 errores, R4 nueva incluida, sobre el contenido real.
- Pasan también `feasibility_lib` (`shape` y `detail`) y las reglas entre distritos de `tests/district_rules.cjs`: nombres, colores propios y semillas.

### M05 — Mercado de Patrones (Patrones de diseño, 22 temas)
- `colors` naranja `#ff8c42` y amarillo intenso `#ffe600`; `seed` 37.
  - Un amarillo limón quedaba a ΔE ≈ 15 del ámbar reservado; `#ffe600` queda a ≈ 34.
- **Mentores (T01–T22):** Adela, Benjamín, Celestino, Delfina, Eusebio, Farah, Gaspar, Higinio, Imelda, Josué, Lázaro, Matilde, Norma, Olegario, Petra, Rafael, Salvador, Tadeo, Uriel, Vicente, Yolanda, Zacarías.
- **Criaturas**, en este orden. La primera contiene T01, así el objetivo guiado empieza por el tema 1:
  - `forzado` Patrón Forzado (T01, T21, T22)
  - `telescopico` Constructor Telescópico (T02–T06)
  - `envoltorio` Envoltorio Infinito (T07–T10)
  - `proxy` Proxy Lento (T11–T13)
  - `chismoso` Observador Chismoso (T14–T16)
  - `indeciso` Estado Indeciso (T17–T20)
- **Reparaciones (`r01`–`r09`):**
  - T02 "el pedido a medio armar"
  - T03 "el creador sin subclases"
  - T05 "la instancia duplicada"
  - T07 "el enchufe que no encaja"
  - T08 "el café sin decorar"
  - T09 "el mostrador de trámites"
  - T13 "el portero dormido"
  - T16 "el boletín sin suscriptores"
  - T18 "el interruptor sin estados"
- **Aprendices (`need` 7):**
  - Aitana T01 explicar
  - Dafne T08 explicar
  - Lara T14 explicar
  - Maite T17 explicar
  - Nerea T21 explicar
  - Rocío T04 corregir
  - Toño T06 corregir
  - Vito T11 corregir
  - Yago T15 corregir
  - Zoe T19 corregir
  - En M05 solo 8 temas tienen 3 puntos clave en negrita (T01, T05, T08, T10, T14, T17, T21, T22). Los 5 de *explicar* salen de ahí y no se toca el contenido. T21 y T22 no tienen preguntas `error`, así que no pueden ser de *corregir*.
- `celebrate`: "El Mercado de Patrones vuelve a abrir: cada problema encuentra su receta."

### M09 — Laboratorio Neuronal (IA para ingeniería de software, 19 temas)
- `colors` blanco neón `#f4f4ff` e índigo `#7c5cff`; `seed` 41.
- **Mentores (T01–T19):** Anselmo, Berta, Clemente, Doroteo, Edurne, Gregorio, Hermenegildo, Ildefonso, Justino, Leocadia, Macario, Nazario, Obdulia, Primitivo, Rosendo, Severino, Telmo, Urbano, Wenceslao.
- **Criaturas**, en este orden:
  - `loro` Loro Estocástico (T01, T02, T19)
  - `desbordado` Contexto Desbordado (T03–T05)
  - `ambiguo` Prompt Ambiguo (T06–T08)
  - `vector` Vector Perdido (T09–T12)
  - `agente` Agente Sin Freno (T13–T15)
  - `factura` Factura Infinita (T16–T18)
  - No hay otra "Alucinación": M02 ya tiene esa criatura.
- **Reparaciones (`r01`–`r09`):**
  - T03 "el contador de tokens"
  - T04 "la memoria de corto plazo"
  - T05 "el dial de temperatura"
  - T08 "la plantilla de prompts"
  - T11 "el buscador de documentos"
  - T13 "la caja de herramientas"
  - T14 "el agente sin plan"
  - T15 "el conector sin protocolo"
  - T16 "el filtro de instrucciones"
  - T01 y T19 no tienen 2 preguntas scenario+error, así que no llevan reparación.
- **Aprendices (`need` 7):**
  - Ainhoa T01 explicar
  - Chema T06 explicar
  - Gerva T10 explicar
  - Iratxe T12 explicar
  - Lupe T17 explicar
  - Mabel T02 corregir
  - Nacho T07 corregir
  - Quima T09 corregir
  - Rita T14 corregir
  - Sixto T18 corregir
- `celebrate`: "El Laboratorio Neuronal vuelve a pensar: cada modelo sabe lo que no sabe."

## Rangos con 10 distritos
La tabla de rangos no cambia: 0/1/3/6/8/11. El 9.º y el 10.º distrito no suben de rango: Arquitecto llega con el 8.º y Tech Lead pide 11.

La celebración ya se calcula desde los datos (`cityRankLine`, `city/view.js:641-650`), y solo anuncia un siguiente rango que se pueda alcanzar con los distritos que existen. Tech Lead pide 11 y hay 10, así que dirá:
- con el 9.º: "Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados.";
- con el 10.º: "Sigues como Arquitecto. Llevas 10 de 10 distritos restaurados.".

No se toca la vista: es el comportamiento diseñado (no promete un rango que todavía no existe) y lo cubrirá M11 cuando llegue. Es la primera vez que la rama «Llevas N de M» sale con un distrito recién restaurado que no es el último posible.

## Atlas de personas
Cada persona ocupa una fila de 14 px. Con 8 distritos el atlas mide 3 094 px (221 filas). M05 y M09 suman 61 personas (32 + 29), y el atlas sube a unos **3 948 px**, por debajo del tope de 4 096 que vigila `tests/city_sprites.cjs`.

**No se parte en esta tanda.** Se partirá en columnas con M11, que ya no cabría. La prueba del tope se mantiene. Si algún número real sale distinto y supera el tope, se para y se decide.

## Pruebas
- **Factibilidad:** `tests/tanda4_feasibility.cjs`, con el mismo esquema que `tests/tanda3_feasibility.cjs`.
  - Transcribe las tablas de este documento, arma cada distrito con `feasibility_lib.build` y comprueba `shape`, `detail` y `checkDistrict`.
  - Comprueba que los archivos reales `m05.mjs` y `m09.mjs` coinciden con la tabla.
  - Añade las reglas entre los 10 distritos de `district_rules.cjs`.
- **Las pruebas de la Tanda 3 no deben romperse.** Se fijan a sus 8 distritos con `cityAt(city, TANDA3)` (`tests/city_at.cjs`). Si alguna prueba cuenta distritos a mano y falla al registrar los nuevos, se pasa a calcularlo desde los datos o a `cityAt`. No se debilita.
- **Ancla literal de `standardFrame()` en `tests/city_layout.cjs`**, pendiente desde la Tanda 3: unas coordenadas fijas (entrada, salida, torre y bounds) para que un cambio del marco común se note aunque todos los distritos cambien a la vez.
- **Atlas:** `tests/city_sprites.cjs` ya comprueba el tope con los datos reales. Se anota el alto real obtenido en «Cambios de la implementación».
- **Celebración del 9.º y el 10.º distrito:** una prueba en jsdom del motor completo, con el patrón de `review_tanda3_gaps.cjs` 6c, que gana el jefe con los aprendices ya enseñados. Comprueba las dos líneas «Llevas 9 de 10» y «Llevas 10 de 10», el texto de cada distrito y el HUD «Distritos 9 de 10» / «Distritos 10 de 10».
- Suite completa en verde.
- **Humo en Chromium** (320 × 640, 390 × 844 y laptop):
  - entrar a cada distrito nuevo desde su portal, hablar con un mentor, ver criaturas y volver a la plaza;
  - el HUD ≤ 25 % del alto y «Mercado de Patrones 100 %» / «Laboratorio Neuronal 100 %» sin recortarse en 320 px;
  - enseñar a un aprendiz de cada modo en cada distrito.
- `README.md`: 10 distritos, enlace a este documento y lista de pruebas con `tanda4_feasibility.cjs`.

## Riesgos conocidos (sin cambio de código)
- **Pestaña vieja:** como en las tandas anteriores, una pestaña con el código anterior que guarde encima pierde el progreso de los distritos nuevos.
- **"Entrar a Mercado de Patrones" / "Entrar a Laboratorio Neuronal":** el botón sigue sin artículo. Es la deuda conocida de la Tanda 3.
- **Colores:** con 10 distritos la paleta está cerca del límite.
  - Índigo `#7c5cff` queda a ΔE ≈ 28 del azul de M03.
  - Blanco neón queda a ≈ 37 del melocotón de M07.
  - Naranja queda a ≈ 40 del rojo de M10.
  - El par más cercano de toda la ciudad sigue siendo M04/M08 (≈ 14).

## Fuera de alcance
- M11 y el corte del atlas.
- Estilos visuales nuevos y el artículo del botón de portal.
- Las decisiones de contenido pendientes de la Tanda 3: Ciro/Cira, y la encapsulación repetida en M04 T05 y M06 T03.
- Los menores diferidos de enseñar escribiendo.

## Lo que queda al constructor
- Las coordenadas exactas del ancla de `standardFrame()`, que se leen del código actual.
- Cómo adaptar una prueba que cuente distritos a mano, siempre sin debilitarla.
