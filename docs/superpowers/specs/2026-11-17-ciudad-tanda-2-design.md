# Ciudad Núcleo — Tanda 2: distritos de M03, M01 y M10 (diseño)

Continúa `2026-11-12-ciudad-distritos-design.md` (Tanda 1). Ese spec es la autoridad para el formato (§4.2), las reglas (§4.3) y el comportamiento; este documento solo agrega tres distritos.

## Intención

Que el mundo abierto cubra más temario: los portales de **M03 (Fundamentos de internet)**, **M01 (Diseño de sistemas)** y **M10 (Ciberseguridad)** dejan de decir "Próximamente" y llevan a un distrito completo y pensado a mano, como Taller Comunal (M02) y Nodo Enlace (M08). El usuario pidió distritos completos, todos abiertos desde el inicio, por tandas; esta es la Tanda 2 del orden `M02, M08 | M03, M01, M10 | M04, M06, M07 | M05, M09 | M11`.

## Objetivos

- Tres distritos nuevos, cada uno con un mentor por tema, criaturas que cubren el módulo, reparaciones, aprendices, torre del jefe y celebración.
- **Solo datos y texto:** ningún cambio en `view.js`, `world2d.js`, `sprites2d.js`, `input.js`, `story.js`, `move.js`, `intro.js`, `route*.js` ni `engine.html`.
- Todo lo que ya funciona (M02, M08, plaza, guardado, migración) sigue igual.

## No objetivos y antiobjetivos

- No hay estilos visuales nuevos (decidido: **opción A**, reusar `taller` y `red` con colores propios). Un estilo por distrito queda para una tanda aparte.
- No hay ruta del paquete ni poderes nuevos en estos distritos.
- No se tocan los módulos (`content*.mjs`) ni las preguntas.
- **Antiobjetivo:** que un distrito nuevo se vea o se juegue como copia de otro con los nombres cambiados. Los nombres, criaturas y reparaciones salen de los temas reales de cada módulo.

## Cómo se construye (decidido)

**Enfoques considerados:**
1. **Un archivo por distrito copiando el patrón de `m08.mjs`** (elegido): cero código nuevo, cero riesgo para M02/M08, estrictamente "solo datos". Coste: el bloque de armado (`take`, `pad`, los `map`) queda copiado cinco veces.
2. Sacar ese armado a una función de `city/layout.mjs` (solo build): menos repetición, pero toca M02/M08. Se deja para cuando entre la tanda 3, en un cambio aparte.
3. Generar los distritos desde el temario: descartado, va contra "pensados a mano".

**Archivos:** `city/districts/m03.mjs`, `m01.mjs`, `m10.mjs` (formato §4.2 del spec de la Tanda 1, mismo patrón que `m08.mjs` sin `route`) y su registro en `city/districts.mjs` (`districts: { M02, M08, M03, M01, M10 }`). Es el único archivo de código que cambia, y §4.6 ya lo permite.

## Geometría (común a los tres)

Cada distrito es su propio mapa, así que los tres reusan el marco de Nodo Enlace (probado y con lugar de sobra):
- `bounds` −60..60 × −70..60; entrada (0, 52, yaw 0); salida (0, 57, 6 × 2); torre (0, −64, 8 × 8 × 20).
- Manzanas de 20 × 20 con centros x ∈ {−42, −14, 14, 42} y z ∈ {30, 2, −26, −54}; calles x ∈ {−28, 0, 28} y z ∈ {16, −12, −40}.
- `makeLayout` con esas calles, `reserve` = torre y entrada, `xRange` [−52, 52], `zRange` [52, −68], `step` 8, `min` 7. Sin pads, el marco da más de 44 lugares (M10 necesita 20 + 6 + 9 + 10 = 45). **Si `take()` se queda sin lugares, se agrega una calle o se baja `min` a 6 y se anota.**
- `seed` distinto por distrito (13, 17, 19) para que los edificios no salgan iguales.

## Contenido propuesto

Todos los textos van en español neutro. Ningún nombre de mentor o aprendiz se repite, ni dentro de un distrito ni con los de M02 y M08 (decisión de quien escribe: el revisor encontró ocho choques con M02 y se cambiaron). Las reparaciones están solo en temas con ≥ 2 preguntas de escenario o error, y los aprendices "corregir", solo en temas con ≥ 1 pregunta de error (comprobado con el contenido real).

### M03 — Barrio Byte (Fundamentos de internet)

- `colors` ámbar `#ffd76a` y magenta `#ff4fd8`; `style: 'red'`; `seed` 13.
- **Mentores (T01–T18, `m01`–`m18`):** Abel, Bea, César, Dora, Emilio, Frida, Gonzalo, Helena, Iván, Jimena, Kevin, Lorena, Marco, Nadia, Omar, Pilar, Quique, Romina.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `bitflip` | Bit Volteado | T01, T02, T03 |
  | `mojibake` | Mojibake | T04, T05 |
  | `fantasma` | Cable Fantasma | T06, T07, T08 |
  | `extraviado` | DNS Extraviado | T09, T10, T11 |
  | `intermediario` | Intermediario | T13, T14, T16 |
  | `atasco` | Render Atascado | T12, T15, T17, T18 |

- **Reparaciones (`r01`–`r09`):** T01 "el panel de luces binario" · T04 "el cartel con los acentos rotos" · T05 "la pantalla con los colores cambiados" · T06 "el cable submarino cortado" · T08 "la pila de protocolos desordenada" · T11 "la dirección web mal escrita" · T13 "el formulario que no envía" · T14 "el candado del sitio vencido" · T17 "la página que no termina de dibujarse".
- **Aprendices (`a01`–`a10`, `need` 7):** Ari T02 explicar · Bruna T03 corregir · Coco T06 corregir · Dalia T07 explicar · Elio T09 explicar · Fede T10 corregir · Gema T12 corregir · Ivo T13 explicar · Jade T16 explicar · Kira T18 corregir.
- **Torre:** jefe de M03.
- `celebrate`: "El Barrio Byte vuelve a hablar el idioma de internet: cada bit llega a su página."

### M01 — Ciudadela Escalable (Diseño de sistemas)

- `colors` violeta `#b06cff` y cian `#5ce1ff`; `style: 'taller'`; `seed` 17.
- **Mentores (T01–T19, `m01`–`m19`):** Adrián, Blanca, Camilo, Daniela, Esteban, Fabiola, Gerardo, Hilda, Ignacio, Julia, Leandro, Marina, Nicolás, Octavia, Pascual, Raquel, Samuel, Tania, Úrsula.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `latencia` | Latencia Eterna | T01, T02, T03 |
  | `cuello` | Cuello de Botella | T04, T05, T06 |
  | `rebelde` | Réplica Rebelde | T07, T08, T09 |
  | `rancia` | Caché Rancia | T10, T11, T12, T13 |
  | `cascada` | Fallo en Cascada | T14, T15, T16 |
  | `avalancha` | Avalancha de Peticiones | T17, T18, T19 |

- **Reparaciones (`r01`–`r08`):** T03 "el proxy mal configurado" · T05 "la base de datos equivocada" · T08 "la réplica atrasada" · T09 "el shard sobrecargado" · T10 "la caché desactualizada" · T12 "la red partida en dos" · T16 "la cola de mensajes atascada" · T19 "el cobro duplicado".
- **Aprendices (`a01`–`a10`, `need` 7):** Alba T01 explicar · Bastián T02 explicar · Cris T04 corregir · Dino T06 explicar · Ema T08 corregir · Fito T09 corregir · Gia T12 corregir · Iara T14 explicar · Joel T15 explicar · Kai T18 corregir.
- **Torre:** jefe de M01.
- `celebrate`: "La Ciudadela Escalable aguanta la hora pico: ningún servidor carga solo con todo."

### M10 — Muralla Cifrada (Ciberseguridad)

- `colors` rojo `#ff5f6d` y ámbar `#ffd76a`; `style: 'red'`; `seed` 19.
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

- **Reparaciones (`r01`–`r09`):** T03 "la puerta sin control de acceso" · T04 "la contraseña pegada en una nota" · T05 "la cookie sin protección" · T06 "el mensaje sin cifrar" · T09 "el formulario que acepta código" · T10 "el comentario con un script escondido" · T12 "el servidor con la configuración de fábrica" · T16 "la alarma que no deja registro" · T18 "el servidor saturado".
- **Aprendices (`a01`–`a10`, `need` 7):** Aldo T01 corregir · Bela T02 explicar · Coral T04 corregir · Dante T06 explicar · Elsa T08 corregir · Fina T11 corregir · Gilda T13 explicar · Irma T14 corregir · Juno T17 explicar · Lino T19 corregir.
- **Torre:** jefe de M10.
- `celebrate`: "La Muralla Cifrada vuelve a proteger la ciudad: nadie entra sin permiso."

## Pruebas

- `node validate.mjs` pasa con los tres distritos: las reglas R1–R10 son la prueba principal de los datos.
- `tests/spec_districts_feasibility.cjs` (o un archivo nuevo `tests/tanda2_feasibility.cjs`) comprueba con el contenido real el reparto de esta tabla: cobertura de temas, ≥ 8 preguntas por criatura, reparaciones y "corregir" factibles, y que `take()` alcanza.
- **Pruebas que hoy suponen que M03, M01 o M10 no tienen distrito** (usan su portal como "Próximamente" o como muro sólido: `city_scenes`, `city_move`, `city_story`, `validate_districts`, `migrate`, `adv/plan_districts_props`, `adv/review_attack`, entre otras) pasan a usar un módulo que sigue sin distrito (M04–M07, M09 o M11), sin perder lo que comprueban.
- `tests/xss_data.cjs` ya recorre todos los distritos de `CITY_DATA`: debe seguir verde con los nuevos.
- Suite y ADV completas en verde; humo en navegador: entrar a cada distrito nuevo desde su portal, hablar con un mentor y volver a la plaza, sin errores de consola.

## Lo que queda a quien construye

- Las coordenadas exactas (las da `makeLayout`), el orden de `take()` y cualquier ajuste del marco si faltan lugares (anotado).
- Cambiar un nombre o una etiqueta si choca con la lista de palabras prohibidas o con otro nombre del mismo distrito (anotado).
