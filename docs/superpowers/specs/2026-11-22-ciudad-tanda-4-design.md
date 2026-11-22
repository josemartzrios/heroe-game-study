# Ciudad Núcleo — Tanda 4: distritos de M05 y M09 (diseño, v2)

Continúa la Tanda 3 (`2026-11-18-ciudad-tanda-3-design.md`). Usa:
- el mismo formato (§4.2 de `2026-11-12-ciudad-distritos-design.md`);
- las mismas reglas de validación R1–R11, con R4 ampliada por `2026-11-21-ciudad-ensenar-escribiendo-design.md`;
- las mismas **reglas de contenido** de la Tanda 3:
  - un color propio, sin el ámbar ni los morados de referencia;
  - etiquetas con artículo y de 28 caracteres o menos;
  - nombres sin parecido fonético con los de otros distritos;
  - criaturas y reparaciones que no repiten ideas, tampoco dentro del mismo distrito;
  - nombres de distrito sin artículo.

Esta tanda añade una regla nueva de **distancia de color**, que se explica más abajo.

## Intención
Que los portales de **M05 (Patrones de diseño)** y **M09 (IA para ingeniería de software)** lleven a distritos completos. Tras esta tanda habrá 10 distritos y solo faltará M11.

El usuario eligió **distritos normales**: solo datos y texto, sin mecánicas propias como la ruta del paquete de M08.

## Enfoques
- **Elegido: el molde de la Tanda 3.** Un archivo de datos por distrito, con `standardFrame()` y `people()` de `city/layout.mjs`, registrado en `city/districts.mjs`.
  - No cambia el código de la vista, el motor ni la plaza.
  - `ORDER` y `WALL_DIST` ya incluyen M05 y M09, y sus portales ya existen.
  - `standardFrame()` ofrece 72 lugares; M05 usa 47 y M09, 44.
- **Descartados:**
  - un marco geométrico propio, porque solo tiene sentido con una mecánica nueva;
  - una mecánica nueva en M09, porque el usuario la descartó.

## Cómo se construye
- `city/districts/m05.mjs` y `city/districts/m09.mjs`, con la misma forma que `m07.mjs`: `style: 'red'`, `need` 7 y 10 aprendices. Los modos van como `'explain'` / `'correct'`.
- En `city/districts.mjs` se importan los dos, y `districts` queda en el orden fijo `{ M02, M08, M03, M01, M10, M04, M06, M07, M05, M09 }`.

## Contenido
Comprobado sobre el contenido real antes de cerrar este documento:
- Las dos tablas, armadas con `standardFrame()` y `people()`, pasan `checkDistrict` con 0 errores, incluida la R4 nueva.
- Pasan `feasibility_lib` (`shape` y `detail`) y las reglas entre distritos de `tests/district_rules.cjs`: nombres, colores propios y semillas.
- Los 20 aprendices nuevos pasan todas las comprobaciones de `tests/city_teach_content.cjs`:
  - un tema de *explicar* tiene al menos `min(3, n)` puntos con términos;
  - el texto vacío, la basura y un texto genérico no llegan al aprobado premarcado;
  - todas las preguntas `error` de un tema de *corregir* se detectan con la versión correcta y no con la frase equivocada.

### M05 — Mercado de Patrones (Patrones de diseño, 22 temas)
- `colors` naranja rojizo `#ff4800` (cuerpo de las criaturas) y amarillo eléctrico `#fff700`; `seed` 37.
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
  - T18 "la máquina expendedora"
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
- Notas sobre los aprendices:
  - En M05 solo 8 temas tienen 3 puntos clave en negrita: T01, T05, T08, T10, T14, T17, T21 y T22. Los 5 de *explicar* salen de ahí y no se toca el contenido.
  - T21 y T22 no tienen preguntas `error`, así que no pueden ser de *corregir*.
- `celebrate`: "El Mercado de Patrones vuelve a abrir: cada problema encuentra su receta."

### M09 — Laboratorio Neuronal (IA para ingeniería de software, 19 temas)
- `colors` azul eléctrico `#36a3ff` (cuerpo de las criaturas) y blanco neón `#f4f4ff`; `seed` 41.
  - El blanco va en `b` porque los ojos de las criaturas teñidas son blancos (`city/sprites2d.js:73`). Con el cuerpo blanco, las criaturas se quedarían sin cara.
- **Mentores (T01–T19):** Anselmo, Berta, Clemente, Doroteo, Edurne, Gregorio, Hermenegildo, Ildefonso, Justino, Leocadia, Macario, Nazario, Obdulia, Primitivo, Rosendo, Severino, Telmo, Urbano, Wenceslao.
- **Criaturas**, en este orden:
  - `loro` Loro Estocástico (T01, T02, T19)
  - `desbordado` Contexto Desbordado (T03–T05)
  - `ambiguo` Prompt Ambiguo (T06–T08)
  - `vector` Vector Perdido (T09–T12)
  - `agente` Agente Sin Freno (T13–T15)
  - `factura` Factura Disparada (T16–T18)
  - No hay otra "Alucinación": M02 ya tiene esa criatura.
- **Reparaciones (`r01`–`r09`):**
  - T03 "el contador de tokens"
  - T04 "la memoria de corto plazo"
  - T05 "el dial de temperatura"
  - T08 "la plantilla de prompts"
  - T11 "el buscador de documentos"
  - T13 "la caja de herramientas"
  - T14 "el plan de tareas olvidado"
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
- `celebrate`: "El Laboratorio Neuronal vuelve a pensar: cada modelo reconoce cuándo no sabe algo."

## Distancia de color (regla nueva)
Con 10 distritos la paleta está cerca del límite. «No ser exactamente igual» ya no basta: el primer borrador tenía un naranja casi idéntico al de las reparaciones pendientes (ΔE00 ≈ 2) y un índigo a ΔE00 ≈ 5 de un morado de referencia.

**La regla:** cada color de un distrito queda a **ΔE2000 ≥ 10** de todos estos colores:
- los colores de los demás distritos;
- el ámbar de ventanas y muros `#ffd76a`;
- el naranja de las reparaciones pendientes `#ff8f3a`;
- el amarillo de la torre y del traje de Iris `#ffd23f`;
- los 6 morados de referencia de las criaturas.

Se usa la métrica `de00` y el umbral de `tests/adv/tanda3_attack.cjs` (S5).
- La regla se aplica a los distritos de esta tanda y a los futuros.
- Los distritos anteriores no se revisan: el par M04/M08 queda a ≈ 14 y pasa igualmente.

**Valores medidos (ΔE00 al color más cercano):**

| Color | Distancia | Color más cercano |
|---|---|---|
| `#ff4800` | 15,6 | reparaciones |
| `#fff700` | 12,1 | torre e Iris |
| `#36a3ff` | 14,4 | azul de M03 |
| `#f4f4ff` | 20,4 | lavanda de M10 |

Entre ellos los cuatro quedan a ≥ 32.

**Ojos blancos:** los cuerpos quedan a ΔE00 ≥ 34 del blanco de los ojos. Los cuerpos actuales con menos distancia son M07, con 20,6.

**Aceptado:** el acento amarillo sobre el cuerpo naranja de M05 tiene poco contraste de luminancia. Como en otros distritos, el acento es un detalle de 2 px.

## Rangos con 10 distritos
La tabla de rangos no cambia: 0/1/3/6/8/11.

La celebración ya se calcula desde los datos (`cityRankLine`, `city/view.js:641-650`). Solo anuncia un siguiente rango que se pueda alcanzar con los distritos que existen. Tech Lead pide 11 y hay 10, así que dirá:
- con el 9.º: "Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados.";
- con el 10.º, o con los dos a la vez: "Sigues como Arquitecto. Llevas 10 de 10 distritos restaurados.".

No se toca la vista. Es el comportamiento diseñado (no promete un rango que todavía no existe) y lo resolverá M11.

## Atlas de personas
El atlas tiene la fila de Iris y una fila por cada mentor y aprendiz de **todos** los distritos, a 14 px cada una. Con 8 distritos son 221 filas (3 094 px). M05 y M09 suman 61 (32 + 29), así que quedan **282 filas = 3 948 px**.

El tope de 4 096 px que vigila `tests/city_sprites.cjs` equivale a 292 filas, así que **solo caben 10 personas más**. Por eso:
- no se parte en esta tanda;
- se partirá en M11, en columnas o con un atlas por distrito;
- cualquier persona extra antes de M11 lo obligaría antes, y se para y se decide.

## Pruebas
**1. Factibilidad sin copiar código.**
- Lo genérico de `tests/tanda3_feasibility.cjs:82-140` pasa a `tests/feasibility_lib.cjs` como `run(SPEC, etiqueta)`. Eso incluye el sondeo de lugares, los conteos 6/9/10/need, la comparación con el archivo real y las reglas entre distritos.
- `tanda3_feasibility.cjs` y la nueva `tests/tanda4_feasibility.cjs` quedan cada una con su tabla y esa llamada.
- Las reglas entre distritos (nombres, colores, semillas, nombres de distrito y de criatura) se ejecutan en un solo sitio y recorren `city.districts` entero.
- La regla de distancia de color se añade a `tests/district_rules.cjs` como `colorDistanceProblems(districts, ids)` y se aplica a M05 y M09.
- `tanda3_feasibility.cjs` sigue comprobando lo mismo. El refactor no puede quitarle ninguna comprobación.

**2. Pruebas que se rompen al registrar M05 y M09.** Se adaptan sin debilitarlas:
- **`tests/city_teach_content.cjs:45`:** fija «81 aprendices».
  - Se calcula desde los datos, sumando los aprendices de `city.districts`, y se mantiene «0 fallos».
- **`tests/review_tanda3_gaps.cjs`, con varios puntos:**
  - `:195-196`: `OLD` mete a M05 y M09 en «los de antes». Pasa a ser `SEQ.slice(0, SEQ.indexOf(NEW[0]))`.
  - `:213-215`: se compara `SEQ.slice(OLD.length, OLD.length + NEW.length)` con NEW.
  - `:234` (6a): `firstNew` vuelve a ser M04.
  - En el caso «todos restaurados» de 6c (`:265-267`) también se restauran los distritos que van detrás de NEW.
  - `:177` y `:267`: la condición `TOTAL !== 8 || …` pasaría siempre sin comprobar nada. Se cambia por el rango máximo esperado, calculado desde `D.ranks` y `TOTAL`.
- **`tests/city_scenes.cjs:80,162-169`:** `SIN` (el primer módulo sin distrito) pasaría a ser M11, que no tiene módulo, y la búsqueda de su título lanza una excepción. Esa rama («Ver ‹módulo›» e «Ir al módulo») se queda sin caso real.
  - En esas pruebas se arranca jsdom con una copia del HTML en la que el JSON de `var CITY_DATA = …;` ya no tiene M09 (se lee, se borra `districts.M09` y se vuelve a escribir con el mismo escape de `<`). Así existe un muro con módulo.
  - Las comprobaciones (p), (p2) y (p3) se mantienen tal cual.
  - (p4) ya cubre el muro de M11.
- `cityAt(city, TANDA3)` solo protege las pruebas de Node (`tanda3_attack`, `tanda3_plan_attack` y `review_tanda3_attack`). Las de jsdom leen el HTML con los 10 distritos, por eso aparecen en esta lista.

**3. Nuevas.**
- **Celebración y HUD en el motor completo:** el bucle 6c de `review_tanda3_gaps.cjs` se generaliza para recibir la lista de distritos nuevos y se ejecuta también con `['M05', 'M09']`. Gana el jefe con los aprendices ya enseñados y comprueba:
  - el 9.º, el 10.º y los dos a la vez: «Llevas 9/10 de 10», «¡Distritos restaurados!» y el texto de cada distrito;
  - el HUD «Distritos 9 de 10» / «Distritos 10 de 10» y `#city-rank` = Arquitecto.
- **HUD al cargar en el distrito:** el bucle 6b de `review_tanda3_gaps.cjs` también se ejecuta con M05 y M09. Comprueba el 0 %, el 50 % con el jefe y el % con `need − 1` enseñados.
- **Ancla de `people()`:** el ancla literal del marco ya existe en `tests/city_layout.cjs:55-58`. Falta fijar la **secuencia de lugares** que reparte `people()`, que es lo que movería a todos los personajes. Se fijan:
  - los primeros lugares que toma `people()` con `standardFrame()`;
  - el total de 72.
- **Atlas:** `tests/city_sprites.cjs` ya comprueba el tope. Se anota el alto real en «Cambios de la implementación».

**4. Mejora de rendimiento de una prueba:** `tests/review_tanda2_gaps.cjs:131-139` recompila `cityRankLine` en cada llamada (3^N − 2^N combinaciones: 58 025 con 10 distritos). Se pasa a `rankLineWith(D)` (`tests/rankline.cjs`), que compila una vez.

**5. Suite completa en verde.**

**6. Humo en Chromium** (320 × 640, 390 × 844 y laptop):
- entrar a cada distrito nuevo desde su portal, hablar con un mentor, ver las criaturas (con ojos visibles) y volver a la plaza;
- el HUD ocupa ≤ 25 % del alto, y «Mercado de Patrones 100 %» / «Laboratorio Neuronal 100 %» no se recortan a 320 px;
- el botón «Entrar a Laboratorio Neuronal» no tapa el joystick ni corta palabras;
- enseñar a un aprendiz de cada modo en cada distrito.

**7. `README.md`:** 10 distritos, enlace a este documento y lista de pruebas con `tanda4_feasibility.cjs`.

## Riesgos conocidos (sin cambio de código)
- **Pestaña vieja:** como en las tandas anteriores, una pestaña con el código anterior que guarde encima pierde el progreso de los distritos nuevos.
- **"Entrar a Mercado de Patrones" / "Entrar a Laboratorio Neuronal":** el botón sigue sin artículo. Es la deuda conocida de la Tanda 3.
- **`frame()` busca la variante con `indexOf` en cada cuadro** (`city/sprites2d.js:43`), sobre todas las personas de la ciudad. Hoy no se nota. Conviene resolverlo junto al corte del atlas en M11.

## Fuera de alcance
- M11 y el corte del atlas.
- Estilos visuales nuevos y el artículo del botón de portal.
- Las decisiones de contenido pendientes de la Tanda 3: Ciro/Cira, y la encapsulación repetida en M04 T05 y M06 T03.
- Los menores diferidos de enseñar escribiendo.
- Que `build.mjs` ejecute `checkDistrict`, y R6 sobre `celebrate.text`. Los dos son deuda anterior de nivel bajo; `validate.mjs` ya cubre ambos casos.

## Lo que queda al constructor
- Cómo exponer `run` en `feasibility_lib` y `colorDistanceProblems` en `district_rules`, siempre que ninguna prueba pierda comprobaciones.
- El detalle de cómo reescribir el JSON de `CITY_DATA` en la copia del HTML de `city_scenes`.
