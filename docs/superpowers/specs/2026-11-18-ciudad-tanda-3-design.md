# Ciudad Núcleo — Tanda 3: distritos de M04, M06 y M07 (diseño, v2)

Continúa la Tanda 2 (`2026-11-17-ciudad-tanda-2-design.md`): mismo formato (§4.2 de `2026-11-12-ciudad-distritos-design.md`), mismas reglas de validación (R1–R11) y mismas **reglas de contenido**:
- cada distrito con al menos un color propio, sin el ámbar `#ffd76a` ni los 6 morados de referencia;
- etiquetas de reparación con artículo y de 28 caracteres o menos;
- **nombres**: ningún nombre de mentor o aprendiz se repite ni se parece a otro de cualquier distrito. Se compara la **forma fonética** (sin acentos y en minúsculas; h muda; qu, c fuerte y k → k; ce/ci → se/si; ge/gi → je/ji; z → s; v → b; x → j; ll e y → i; letras dobles una sola vez) y se parecen si son iguales o comparten el inicio de k = min(4, largo de cada forma) letras con k ≥ 3 (Gil/Gilda, Ana/Hana, Javi/Xavier). No hay nombres de menos de 3 letras. Excepciones heredadas de las tandas 1 y 2: Carla/Karla y Elena/Helena;
- criaturas y reparaciones no repiten la idea de las de otros distritos;
- nombres de distrito sin artículo.

## Intención

Que los portales de **M04 (Historia de la programación)**, **M06 (Programación orientada a objetos)** y **M07 (Principios SOLID)** lleven a distritos completos. Tras esta tanda quedan 8 distritos; faltan M05 y M09 (Tanda 4) y M11.

## Cómo se construye

- Un archivo de datos por distrito (`city/districts/m04.mjs`, `m06.mjs`, `m07.mjs`) con `people()` y su registro en `city/districts.mjs` con el orden fijo `{ M02, M08, M03, M01, M10, M04, M06, M07 }`.
- **Marco geométrico común en `city/layout.mjs`:** hoy M03, M01 y M10 copian el mismo marco (manzanas, calles, torre, entrada, salida, bounds y `makeLayout`). Se saca a una función `standardFrame()` que devuelve `{ lay, tower, entry, exit, bounds, streets, blocks }` con **objetos nuevos en cada llamada** (dos distritos nunca comparten un objeto), y la usan M03, M01, M10, M04, M06 y M07 (M02 y M08 tienen marcos propios y no cambian). Se comprueba que `CITY_DATA` y el HTML de los 5 distritos actuales quedan **idénticos byte a byte**.
- Sin otros cambios de código: el tinte de criaturas, R11, el aviso de rango y la plaza ya son genéricos. `style: 'red'`, `need` 7, 10 aprendices.

## Contenido

### M04 — Museo del Código (Historia de la programación)
- `colors` turquesa `#2ee6c5` y rosa fuerte `#ff5ca8`; `seed` 23.
- **Mentores (T01–T17):** Amparo, Bernardo, Claudia, Damián, Esperanza, Francisco, Genaro, Hortensia, Iñaki, Jacinta, Leopoldo, Mercedes, Nicanor, Ofelia, Prudencio, Remedios, Saúl.
- **Criaturas:** `goto` GO TO Salvaje (T02, T03) · `paradigma` Paradigma Confundido (T01, T04, T05, T08, T09) · `impura` Función Impura (T06, T07) · `perforada` Tarjeta Perforada (T10–T12) · `compilador` Compilador Errante (T13–T15) · `bucle` Bucle Atascado (T16, T17).
- **Reparaciones (`r01`–`r09`):** T01 "el catálogo de paradigmas" · T03 "el programa espagueti" · T05 "la clase sin encapsular" · T07 "la lambda sin retorno" · T09 "el flujo de eventos" · T11 "el ensamblador sin traducir" · T12 "la tarjeta de COBOL" · T15 "la máquina virtual parada" · T17 "los hilos bloqueados".
- **Aprendices (`need` 7):** Ada T04 explicar · Boris T02 corregir · Cata T03 corregir · Dulce T06 explicar · Enzo T08 explicar · Flavio T10 corregir · Tobías T12 corregir · Mila T13 explicar · Nuria T14 corregir · Juan T16 explicar.
- `celebrate`: "El Museo del Código vuelve a abrir: cada lenguaje cuenta su historia."

### M06 — Fábrica de Objetos (Programación orientada a objetos)
- `colors` rosa `#ff9ec7` y verde claro `#b5ff8c`; `seed` 29.
- **Mentores (T01–T14):** Agustín, Begoña, Casimiro, Dolores, Ezequiel, Fortunato, Graciela, Humberto, Isidro, Jazmín, Lucrecia, Mauricio, Nélida, Osvaldo.
- **Criaturas:** `molde` Molde Vacío (T01, T02) · `atributo` Atributo Fugado (T03, T04) · `torcida` Herencia Torcida (T05, T06) · `contrato` Contrato Roto (T07, T14) · `acople` Acople Pegajoso (T08–T10) · `flecha` Flecha Perdida (T11–T13).
- **Reparaciones (`r01`–`r09`):** T02 "la clase que nadie instancia" · T03 "el atributo expuesto" · T04 "el constructor olvidado" · T05 "el árbol de herencia" · T07 "el contrato incumplido" · T09 "el equipo desarmado" · T10 "el coche sin motor" · T13 "el diagrama sin flechas" · T14 "el método sin polimorfismo".
- **Aprendices (`need` 7):** Ale T01 corregir · Bibi T02 explicar · Cira T03 corregir · Duna T05 explicar · Pía T06 corregir · Fiona T08 explicar · Goyo T10 corregir · Ulla T11 explicar · Jael T12 explicar · Sol T13 corregir.
- `celebrate`: "La Fábrica de Objetos vuelve a producir: cada clase sabe qué hacer."

### M07 — Cinco Calles (Principios SOLID)
- `colors` melocotón `#ffd1a1` y violeta `#e05cff`; `seed` 31. (El salmón anterior quedaba muy cerca del rojo de Muralla Cifrada y del rojo de error.)
- **Mentores (T01–T13):** Amelia, Bautista, Constanza, Domingo, Eugenia, Fulgencio, Guadalupe, Hipólito, Ingrid, Jerónimo, Leonor, Moisés, Nora.
- **Criaturas:** `dios` Clase Dios (T03, T04) · `rigido` Código Rígido (T05, T06) · `impostora` Subclase Impostora (T07, T08) · `gorda` Interfaz Gorda (T09, T10) · `mandon` Detalle Mandón (T11, T12) · `caos` Diseño Caótico (T01, T02, T13).
- **Reparaciones (`r01`–`r09`):** T01 "el software frágil" · T02 "el acrónimo olvidado" · T04 "la clase que hace de todo" · T06 "el switch interminable" · T08 "el pato de juguete" · T09 "la interfaz gigante" · T10 "el control con mil botones" · T12 "la base de datos soldada" · T13 "el código que huele mal".
- **Aprendices (`need` 7):** Asier T01 explicar · Blas T02 corregir · Cande T03 explicar · Dámaso T05 explicar · Elvira T06 corregir · Fidel T07 explicar · Gisela T08 corregir · Hilario T09 corregir · Ion T11 explicar · Rubén T12 corregir.
- `celebrate`: "Cinco Calles vuelve a ordenarse: cada principio SOLID tiene su calle."

En los archivos `.mjs` los modos van como `'explain'` / `'correct'` (explicar / corregir).

## Rangos con 8 distritos

Tabla 0/1/3/6/8/11: restaurar el 6.º da **Senior**, el 8.º **Arquitecto**; Tech Lead sigue sin alcanzarse hasta M11. La celebración ya calcula el "siguiente rango alcanzable" con el número de distritos, así que con datos reales aparecen por primera vez el plural ("te faltan 2 distritos para Senior"), "Subes a Senior." y "Subes a Arquitecto.".

## Pruebas

- **Factibilidad:** `tests/tanda3_feasibility.cjs` (ya escrita por la revisión, sin versionar) es la prueba de la tanda; no se crea otra. Comprueba cada archivo contra su tabla y las reglas de contenido entre los 8 distritos, incluida la regla ampliada de nombres. **`tests/adv/tanda3_attack.cjs`** (adversarial de la revisión) también entra, con las tablas de esta v2.
- **Pruebas que cambian por haber 8 distritos** (valores calculados desde los datos, no a mano):
  - `tests/review_tanda2_gaps.cjs:104-110,123-140`: la tabla de líneas de rango se rehace para 8 distritos (5→6 "Subes a Senior.", 6→7 "Sigues como Senior: te falta 1 distrito para Arquitecto.", 7→8 "Subes a Arquitecto.", 8/8 "Sigues como Arquitecto. Llevas 8 de 8…"); los límites con `withRanks` usan `total` y `total + 1`, no 5 y 6; el plural "te faltan" ya existe con datos reales.
  - `tests/adv/tanda2_impl_attack.cjs`: `MODS` incluye M04, M06 y M07 (o se arma desde las claves de `districts`); S3 y K2 usan el primer módulo sin distrito (`ORDER.find(m => !districts[m])`) en vez de `'M04'`; V2 calcula el texto esperado con `total`.
  - `tests/adv/tanda2_attack.cjs:189-192`: la secuencia de la plaza se compara con `ORDER.filter(m => districts[m])`; `:239,242` usan el módulo sin distrito en vez de `'M04'`.
  - `tests/tanda2_feasibility.cjs`: sus reglas entre distritos (color propio, nombres) pasan a recorrer todos los distritos de `city.districts`, no solo cinco, y aplican la regla ampliada de nombres.
- Suite y ADV completas en verde. **Humo** en navegador (320 × 640 y laptop): entrar a cada distrito nuevo, mentor, criaturas y salida; HUD ≤ 25 % y la pill del distrito sin salirse; la hoja de celebración con un texto nuevo largo ("te faltan 2 distritos para Senior" y "Subes a Arquitecto.") cabe en 320 px.
- `README.md`: 8 distritos y rango máximo Arquitecto (Tech Lead pide M11); enlace a este spec.

## Riesgos conocidos (sin cambio de código)

- **Pestaña vieja:** el espejo plano solo cubre M02; una pestaña con el código anterior que guarde encima pierde el progreso de los distritos nuevos (igual que en las tandas 1 y 2).
- **Alto del atlas de personas:** con 8 distritos mide unos 3 100 px; con los 11 rondará los 4 100 px, por encima del tope de textura de algunos móviles de gama baja. Se decide en la Tanda 4 (partir el atlas en columnas).
- **"Entrar a Museo del Código" / "Entrar a Fábrica de Objetos":** el botón no pone artículo (ya pasa con "Taller Comunal" o "Barrio Byte"). Arreglarlo pide un campo opcional en los datos y un cambio en la vista; queda como deuda fuera de esta tanda.
- Colores: con 8 distritos los tonos están cerca del límite; los cuerpos más parecidos quedan a ΔE ≈ 14 (M04 turquesa frente a M08 verde). Cada distrito conserva un color propio.

## Fuera de alcance

Estilos visuales nuevos, el artículo del botón de portal, M05, M09 y M11.

## Cambios de la implementación

- **`standardFrame()`** quedó como el spec lo pide; `CITY_DATA` y el HTML de los 5 distritos de antes salieron idénticos byte a byte (comparados antes y después del refactor).
- **Pruebas calculadas desde los datos:** `tests/modules.cjs` (id → archivo y título, contrastado con `build.mjs`) y `tests/district_rules.cjs` (regla de nombres, colores propios, seeds y nombres únicos) sirven a todas las pruebas de distritos; `migrate`, `review_tanda2_gaps`, `tanda2_*` y `city_progress` ya no fijan cuántos distritos hay. En la regla fonética, `gue/gui` conservan el sonido /g/ (el orden literal del spec las habría vuelto /j/) y una racha de letras repetidas cuenta como una.
- **Humo en Chromium** (390 × 844, 320 × 640 y 1280 × 800; 46 comprobaciones, 0 errores de consola, `pageerror` ni `requestfailed`): los tres distritos se entran desde su portal, se habla con su primer mentor y se vuelve a la plaza; `#city-act` cabe en el ancho en los tres tamaños. Peor caso del HUD (dentro de M06 al 100 %, Arquitecto, nivel ≥ 5 con Correr, 320 × 640): `.city-hud` ocupa el 22 % del alto, `#city-rest` no se recorta y no hay desplazamiento horizontal. La hoja de celebración a 320 px (4.º: «Sigues como Semi-senior: te faltan 2 distritos para Senior.»; 8.º: «Subes a Arquitecto.») muestra título, línea de rango y Cerrar sin desplazar, no desborda y el foco cae en Cerrar; tras Escape queda en `#city-pause`.
- **Criaturas:** en las 12 de M06 y M07 se ven los ojos y la marca de color, y la forma cambia dentro de cada distrito. La primera criatura de M08 y la de M04 tienen la misma forma y se distinguen solo por el color (verde frente a turquesa, ΔE ≈ 14): no se confunden, pero es el par más cercano.
- **Atlas:** personas 112 × 3 094 px y criaturas 28 × 658 px con 8 distritos (como se esperaba, unos 3 100 px de alto).
- **Entrar a un portal:** pisar el rectángulo del portal entra al distrito por sí solo; el botón «Entrar a …» aparece a menos de 4 m (comprobado a 3,6 m).
