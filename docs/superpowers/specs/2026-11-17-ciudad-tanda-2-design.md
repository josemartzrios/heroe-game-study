# Ciudad Núcleo — Tanda 2: distritos de M03, M01 y M10 (diseño, v2)

Continúa `2026-11-12-ciudad-distritos-design.md` (Tanda 1). Ese spec es la autoridad para el formato (§4.2), las reglas (§4.3) y el comportamiento; este documento agrega tres distritos y tres cambios de código mínimos que la revisión mostró necesarios (§ "Cambios de código").

## Intención

Que el mundo abierto cubra más temario: los portales de **M03 (Fundamentos de internet)**, **M01 (Diseño de sistemas)** y **M10 (Ciberseguridad)** dejan de decir "Próximamente" y llevan a un distrito completo y pensado a mano, como Taller Comunal (M02) y Nodo Enlace (M08). El usuario pidió distritos completos, todos abiertos desde el inicio, por tandas; esta es la Tanda 2 del orden `M02, M08 | M03, M01, M10 | M04, M06, M07 | M05, M09 | M11`.

## Objetivos

- Tres distritos nuevos, cada uno con un mentor por tema, criaturas que cubren el módulo, reparaciones, aprendices, torre del jefe y celebración.
- **Casi solo datos:** además de los tres archivos de distrito y su registro, solo cambian tres cosas pequeñas en el código (abajo). Nada más en `view.js`, `world2d.js`, `sprites2d.js`, `input.js`, `story.js`, `move.js`, `intro.js`, `route*.js` ni `engine.html`.
- Todo lo que ya funciona (M02, M08, plaza, guardado, migración) sigue igual; M02 conserva su aspecto exacto.

## No objetivos y antiobjetivos

- No hay estilos visuales nuevos (decidido: **opción A**, reusar los estilos existentes con colores propios). Un estilo por distrito queda para una tanda aparte.
- No hay ruta del paquete ni poderes nuevos en estos distritos.
- No se tocan los módulos (`content*.mjs`) ni las preguntas.
- **Antiobjetivo:** que un distrito nuevo se vea o se juegue como copia de otro con los nombres cambiados. Los nombres, criaturas y reparaciones salen de los temas reales de cada módulo, y cada distrito se distingue por sus colores (edificios y criaturas).

## Cómo se construye (decidido)

**Enfoques considerados:**
1. **Un archivo por distrito copiando el patrón de `m08.mjs`** (elegido): cero riesgo para M02/M08. Coste: el bloque de armado (`take`, `pad`, los `map`) queda copiado cinco veces. En los archivos nuevos se usa `lay.take()` directo, sin el envoltorio `take`.
2. Sacar ese armado (y el marco geométrico, si sigue igual) a una función de `city/layout.mjs` (solo build): se hará **antes de la Tanda 3**, en un cambio aparte, respetando el orden de `take()` (mentores → criaturas → reparaciones → aprendices) para que M02 conserve sus coordenadas.
3. Generar los distritos desde el temario: descartado, va contra "pensados a mano".

**Archivos de datos:** `city/districts/m03.mjs`, `m01.mjs`, `m10.mjs` (formato §4.2 de la Tanda 1, mismo patrón que `m08.mjs` sin `route`) y su registro en `city/districts.mjs` con el orden fijo `districts: { M02, M08, M03, M01, M10 }` (los sprites dependen de que M02 sea el primero).

## Cambios de código (mínimos, encontrados en la revisión)

1. **Criaturas distinguibles por distrito (`city/sprites2d.js`).** Hoy la forma sale de `(ci + di*3) % 6` y el color del cuerpo de una paleta fija de 6 morados: las criaturas de M03 y M10 saldrían idénticas a las de M02, y las de M01 a las de M08. Cambio: en todo distrito que no sea el primero, el cuerpo de la criatura usa el `colors.a` del distrito y la marca oscura su `colors.b`; la forma sigue rotando por índice dentro del distrito. **M02 conserva su aspecto exacto** (prueba). M08 cambia de morado a sus colores (verde y cian): se acepta.
2. **El aviso de rango solo cuando sube (`city/view.js`, `cityCelebrate`).** Hoy siempre dice "Subes a X", aunque el rango no cambie (con 5 distritos y la tabla 0/1/3/6/8/11 pasa en la 2.ª, 4.ª y 5.ª restauración). Cambio: comparar el rango con el que había antes de esta restauración (mismo cálculo con los distritos de `mids` sin contar); si subió, "Subes a X."; si no, "Sigues como X.". La prueba roja ya existe en `tests/adv/tanda2_attack.cjs`.
3. **Colores propios visibles:** con `style: 'taller'` los edificios usan la paleta fija de M02 (`city/world2d.js:87`), así que los tres distritos nuevos usan **`style: 'red'`**, que pinta las fachadas con `colors.a`/`colors.b`. No hay cambio de código en `world2d.js`.

## Geometría (común a los tres)

Cada distrito es su propio mapa; los tres reusan el marco de Nodo Enlace:
- `bounds` −60..60 × −70..60; entrada (0, 52, yaw 0); salida (0, 57, 6 × 2); torre (0, −64, 8 × 8 × 20).
- Manzanas de 20 × 20 con centros x ∈ {−42, −14, 14, 42} y z ∈ {30, 2, −26, −54}; calles x ∈ {−28, 0, 28} y z ∈ {16, −12, −40}.
- `makeLayout` con esas calles, `reserve` = torre y entrada, `xRange` [−52, 52], `zRange` [52, −68], `step` 8, `min` 7. Sin pads el marco da **72 lugares**; el que más pide es M10 (45).
- `seed` distinto por distrito: M03 13, M01 17, M10 19.

## Reglas de contenido de esta tanda

- **Colores:** cada distrito tiene al menos un color que no usa ningún otro distrito, y ninguno usa el ámbar de las ventanas y los muros "Próximamente" (`#ffd76a`).
- **Etiquetas de reparación:** con artículo y de **28 caracteres como máximo** (en pantalla se lee "Reparar " + etiqueta, y en un teléfono de 320 px una más larga ocupa dos líneas).
- **Nombres:** ningún nombre de mentor o aprendiz se repite ni se parece mucho (mismo inicio de 4 letras) a otro de cualquier distrito; criaturas y reparaciones no repiten la idea de las de M02 y M08.
- **Nombres de distrito sin artículo**, como en M02 y M08 ("Entrar a Barrio Byte").

## Contenido

Las reparaciones están solo en temas con ≥ 2 preguntas de escenario o error, y los aprendices "corregir", solo en temas con ≥ 1 pregunta de error (comprobado con el contenido real en `tests/tanda2_feasibility.cjs`).

### M03 — Barrio Byte (Fundamentos de internet)

- `colors` naranja `#ff9f43` y azul eléctrico `#4d7cff`; `style: 'red'`; `seed` 13.
- **Mentores (T01–T18, `m01`–`m18`):** Abel, Bea, César, Dora, Ernesto, Frida, Gonzalo, Helena, Ismael, Jimena, Kevin, Lorena, Marco, Nadia, Omar, Pilar, Quique, Romina.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `bitflip` | Bit Invertido | T01, T02, T03 |
  | `mojibake` | Mojibake | T04, T05 |
  | `fantasma` | Señal Fantasma | T06, T07, T08, T16 |
  | `extraviado` | DNS Extraviado | T09, T11 |
  | `intermediario` | Intermediario | T13, T14 |
  | `atasco` | Render Atascado | T10, T12, T15, T17, T18 |

- **Reparaciones (`r01`–`r09`):** T01 "el panel de luces binario" · T04 "el cartel sin acentos" · T05 "la pantalla sin color" · T06 "la fibra del fondo del mar" · T08 "la pila de protocolos" · T11 "la URL mal escrita" · T13 "la petición sin respuesta" · T14 "el certificado vencido" · T17 "la página a medio dibujar".
- **Aprendices (`a01`–`a10`, `need` 7):** Ari T02 explicar · Brenda T03 corregir · Coco T06 corregir · Dalia T07 explicar · Elio T09 explicar · Fede T10 corregir · Gema T12 corregir · Ivo T13 explicar · Jade T16 explicar · Kira T18 corregir.
- **Torre:** jefe de M03.
- `celebrate`: "El Barrio Byte vuelve a hablar el idioma de internet: cada paquete llega a su página."

### M01 — Ciudadela Escalable (Diseño de sistemas)

- `colors` violeta `#b06cff` y cian `#5ce1ff`; `style: 'red'`; `seed` 17.
- **Mentores (T01–T19, `m01`–`m19`):** Adrián, Blanca, Camilo, Débora, Eduardo, Fernanda, Gerardo, Hilda, Ignacio, Josefina, Leandro, Marina, Norberto, Octavia, Pascual, Raquel, Samuel, Tania, Úrsula.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `latencia` | Latencia Eterna | T01, T02, T03 |
  | `embudo` | Embudo Saturado | T04, T06, T17 |
  | `rebelde` | Réplica Rebelde | T07, T08, T09, T12 |
  | `rancia` | Caché Rancia | T10, T14 |
  | `desparramado` | Dato Desparramado | T05, T11, T13 |
  | `cascada` | Fallo en Cascada | T15, T16, T18, T19 |

- **Reparaciones (`r01`–`r08`):** T03 "el proxy mal configurado" · T05 "la base de datos equivocada" · T08 "la réplica atrasada" · T09 "el shard sobrecargado" · T10 "la caché desactualizada" · T12 "la red partida en dos" · T16 "la cola de mensajes atascada" · T19 "el cobro duplicado".
- **Aprendices (`a01`–`a10`, `need` 7):** Alba T01 explicar · Bastián T02 explicar · Cris T04 corregir · Dino T06 explicar · Ema T08 corregir · Fito T09 corregir · Gia T12 corregir · Iara T14 explicar · Joel T15 explicar · Kai T18 corregir.
- **Torre:** jefe de M01.
- `celebrate`: "La Ciudadela Escalable aguanta la hora pico: ningún servidor carga solo con todo."
- El nombre es el más largo de la ciudad: el humo comprueba que la pill "Ciudadela Escalable 100 %" cabe en 320 px; si no cabe, se acorta a "Ciudadela" y se anota.

### M10 — Muralla Cifrada (Ciberseguridad)

- `colors` rojo `#ff5f6d` y lila `#c9b8ff`; `style: 'red'`; `seed` 19.
- **Mentores (T01–T20, `m01`–`m20`):** Alicia, Benito, Cecilia, David, Eva, Felipe, Gloria, Horacio, Isabel, Jorge, Laura, Manuel, Natalia, Orlando, Patricia, Ramiro, Sara, Tomás, Valeria, Xavier.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `pescador` | Pescador de Claves | T01, T04, T17 |
  | `robada` | Llave Robada | T02, T03, T05 |
  | `debil` | Cifrado Débil | T06, T13 |
  | `inyector` | Inyector | T07, T09, T10, T11 |
  | `abierta` | Puerta Abierta | T08, T12, T14, T15 |
  | `tormenta` | Tormenta de Tráfico | T16, T18, T19, T20 |

- **Reparaciones (`r01`–`r09`):** T03 "la puerta sin cerradura" · T04 "la contraseña en una nota" · T05 "la cookie sin protección" · T06 "el mensaje sin cifrar" · T09 "el formulario inyectable" · T10 "el script escondido" · T12 "el servidor de fábrica" · T16 "la alarma sin registro" · T18 "el servidor bajo ataque".
- **Aprendices (`a01`–`a10`, `need` 7):** Aldo T01 corregir · Bela T02 explicar · Coral T04 corregir · Dante T06 explicar · Elsa T08 corregir · Fina T11 corregir · Gilda T13 explicar · Irma T14 corregir · Juno T17 explicar · Lino T19 corregir.
- **Torre:** jefe de M10.
- `celebrate`: "La Muralla Cifrada vuelve a proteger la ciudad: nadie entra sin permiso."

## Pruebas

- `node validate.mjs` pasa con los cinco distritos (R1–R10).
- `tests/tanda2_feasibility.cjs` comprueba las tablas de este spec contra el contenido real con `checkDistrict`, que `take()` alcanza, las reglas de contenido de esta tanda (colores, etiquetas ≤ 28, nombres únicos y no parecidos entre los cinco distritos) y, cuando existan los archivos, que los datos de `city/districts/m03|m01|m10.mjs` coinciden con estas tablas. No se crea otra prueba de factibilidad.
- **Pruebas que cambian por haber 5 distritos** (nuevo valor esperado):
  - `tests/city_sprites.cjs` (conteos de personas y criaturas; M02 con el mismo aspecto exacto; criaturas de distritos distintos con colores distintos).
  - `tests/city_move.cjs` y `tests/city_world2d.cjs` (5 portales abiertos y 6 pendientes; cajas de la plaza).
  - `tests/city_scenes.cjs` ("Distritos 0 de 5").
  - `tests/migrate.cjs` M1 (el `d` normalizado trae los 5 distritos).
- **Pruebas que usaban M03, M01 o M10 como portal sin distrito** (`city_move`, `city_story`, `city_scenes`, `validate_districts`): eligen el módulo sin distrito con `ORDER.find((m) => !districts[m])` en vez de fijarlo a mano, para no reescribirlas en cada tanda. Las que solo usan M01/M03 como claves de `boss` o `topics` (`migrate` fuera de M1, `adv/plan_districts_props`, `adv/review_attack`) no cambian.
- `tests/adv/tanda2_attack.cjs` (ataques, propiedades y fuzzing con 5 distritos) queda verde con el cambio de código 2.
- `tests/xss_data.cjs` ya recorre todos los distritos: debe seguir verde.
- Suite y ADV completas en verde. Humo en navegador (320 × 640 y laptop): entrar a cada distrito nuevo desde su portal, ver edificios y criaturas con sus colores, hablar con un mentor y volver a la plaza, sin errores de consola. Un paso extra con un guardado que ya tiene aprobado el jefe de M01: la Ciudadela marca 50 %, el objetivo no manda a la torre y se celebra al enseñar al 7.º aprendiz.

## Riesgos conocidos (sin cambio de código)

- **Rangos:** con cinco distritos el máximo es "Semi-senior" (tabla 0/1/3/6/8/11 de la Tanda 1). Es intencional hasta la Tanda 4; no se toca R10 ni el texto del prólogo.
- **Pestaña vieja:** el espejo plano solo cubre M02; una pestaña con el código anterior que guarde encima pierde el progreso de M03, M01 y M10, igual que ya pasa con M08.

## Lo que queda a quien construye

- Las coordenadas exactas (las da `makeLayout`) y el orden de `take()` (mentores → criaturas → reparaciones → aprendices, como en `m08.mjs`).
- Cambiar un nombre o una etiqueta si choca con la lista de palabras prohibidas o con las reglas de contenido (anotado).
