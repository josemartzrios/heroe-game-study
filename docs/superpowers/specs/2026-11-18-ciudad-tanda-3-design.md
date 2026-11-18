# Ciudad Núcleo — Tanda 3: distritos de M04, M06 y M07 (diseño)

Continúa la Tanda 2 (`2026-11-17-ciudad-tanda-2-design.md`): mismo formato (§4.2 de `2026-11-12-ciudad-distritos-design.md`), mismas reglas de validación (R1–R11) y mismas **reglas de contenido** de la Tanda 2 (color propio por distrito, sin el ámbar `#ffd76a` ni los 6 morados de referencia; etiquetas con artículo y de 28 caracteres o menos; ningún nombre de mentor o aprendiz repetido ni con el mismo inicio de 4 letras que otro de cualquier distrito; nombres de distrito sin artículo).

## Intención

Que los portales de **M04 (Historia de la programación)**, **M06 (Programación orientada a objetos)** y **M07 (Principios SOLID)** lleven a distritos completos, como los de las tandas 1 y 2. Tras esta tanda quedan 8 distritos; faltan M05 y M09 (Tanda 4) y M11.

## Cómo se construye (mismo enfoque que la Tanda 2)

- Un archivo de datos por distrito (`city/districts/m04.mjs`, `m06.mjs`, `m07.mjs`) que arma sus personajes con `people()` de `city/layout.mjs`, y su registro en `city/districts.mjs` con el orden fijo `{ M02, M08, M03, M01, M10, M04, M06, M07 }`.
- Sin cambios de código: el tinte de criaturas, R11, el aviso de rango y la plaza ya son genéricos.
- Marco geométrico de la Tanda 2 (el de Nodo Enlace sin pads): `bounds` −60..60 × −70..60, entrada (0, 52), salida (0, 57), torre (0, −64), mismas manzanas y calles, `makeLayout` con `reserve` torre y entrada. `style: 'red'`, `need` 7, 10 aprendices.
- Comprobado con el contenido real (script de validación): R1–R7 sin errores, etiquetas ≤ 28, nombres sin choques ni parecidos con los 5 distritos existentes, cada distrito con color propio.

## Contenido

### M04 — Museo del Código (Historia de la programación)
- `colors` turquesa `#2ee6c5` y melocotón `#ffd1a1`; `seed` 23.
- **Mentores (T01–T17):** Amparo, Bernardo, Claudia, Damián, Esperanza, Francisco, Genaro, Hortensia, Iñaki, Jacinta, Leopoldo, Mercedes, Nicanor, Ofelia, Prudencio, Remedios, Saúl.
- **Criaturas:** `goto` GOTO Salvaje (T02, T03) · `paradigma` Paradigma Mezclado (T01, T04, T05) · `impura` Función Impura (T06–T09) · `perforada` Tarjeta Perforada (T10–T12) · `compilador` Compilador Errante (T13–T15) · `hilo` Hilo Enredado (T16, T17).
- **Reparaciones (`r01`–`r09`):** T01 "el catálogo de paradigmas" · T03 "el programa espagueti" · T05 "la clase sin encapsular" · T07 "la lambda sin retorno" · T09 "el flujo de eventos" · T11 "el ensamblador sin traducir" · T12 "la tarjeta de COBOL" · T15 "la máquina virtual parada" · T17 "los hilos bloqueados".
- **Aprendices (`need` 7):** Ada T04 explicar · Boris T02 corregir · Cata T03 corregir · Dulce T06 explicar · Enzo T08 explicar · Flavio T10 corregir · Gil T12 corregir · Hana T13 explicar · Isa T14 corregir · Juan T16 explicar.
- `celebrate`: "El Museo del Código vuelve a abrir: cada lenguaje cuenta su historia."

### M06 — Fábrica de Objetos (Programación orientada a objetos)
- `colors` rosa `#ff9ec7` y verde claro `#b5ff8c`; `seed` 29.
- **Mentores (T01–T14):** Agustín, Begoña, Cayetano, Dolores, Ezequiel, Fortunato, Graciela, Humberto, Isidro, Jazmín, Lucrecia, Mauricio, Nélida, Osvaldo.
- **Criaturas:** `molde` Molde Vacío (T01, T02) · `atributo` Atributo Fugado (T03, T04) · `torcida` Herencia Torcida (T05, T06) · `rota` Interfaz Rota (T07, T14) · `acople` Acople Pegajoso (T08–T10) · `confuso` Diagrama Confuso (T11–T13).
- **Reparaciones (`r01`–`r09`):** T02 "el molde sin objetos" · T03 "el atributo expuesto" · T04 "el constructor olvidado" · T05 "el árbol de herencia" · T07 "la interfaz a medias" · T09 "el equipo desarmado" · T10 "el coche sin motor" · T13 "el diagrama sin flechas" · T14 "el método que no cambia".
- **Aprendices (`need` 7):** Ale T01 corregir · Bibi T02 explicar · Cira T03 corregir · Duna T05 explicar · Eli T06 corregir · Fiona T08 explicar · Goyo T10 corregir · Ina T11 explicar · Jael T12 explicar · Leo T13 corregir.
- `celebrate`: "La Fábrica de Objetos vuelve a producir: cada clase sabe qué hacer."

### M07 — Cinco Calles (Principios SOLID)
- `colors` salmón `#ff9a8a` y rosa fuerte `#ff5ca8`; `seed` 31.
- **Mentores (T01–T13):** Amelia, Bautista, Constanza, Domingo, Eugenia, Fulgencio, Guadalupe, Hipólito, Ingrid, Jerónimo, Leonor, Moisés, Nora.
- **Criaturas:** `dios` Clase Dios (T03, T04) · `cerrado` Código Cerrado (T05, T06) · `impostora` Subclase Impostora (T07, T08) · `gorda` Interfaz Gorda (T09, T10) · `atado` Módulo Atado (T11, T12) · `caos` Diseño Caótico (T01, T02, T13).
- **Reparaciones (`r01`–`r09`):** T01 "el software frágil" · T02 "el acrónimo olvidado" · T04 "la clase que hace de todo" · T06 "el switch interminable" · T08 "el pato de juguete" · T09 "la interfaz gigante" · T10 "el control con mil botones" · T12 "la base de datos soldada" · T13 "el código que huele mal".
- **Aprendices (`need` 7):** Asier T01 explicar · Blas T02 corregir · Cande T03 explicar · Dámaso T05 explicar · Elvira T06 corregir · Fidel T07 explicar · Gisela T08 corregir · Hilario T09 corregir · Ion T11 explicar · Javi T12 corregir.
- `celebrate`: "Cinco Calles vuelve a ordenarse: cada módulo tiene un solo motivo para cambiar."

## Pruebas

- `node validate.mjs` (R1–R11 con 8 distritos) y una prueba de factibilidad de la tanda (como `tests/tanda2_feasibility.cjs`): cada archivo idéntico a su tabla, reglas de contenido entre los 8 distritos.
- Las pruebas ya calculan distritos, portales, personas y criaturas desde los datos; las que fijan nombres de rango o el número de distritos (por ejemplo "rango máximo Semi-senior") se ajustan: con 8 distritos el máximo alcanzable es **Arquitecto**.
- Suite y ADV completas en verde; humo en navegador (320 × 640 y laptop): entrar a cada distrito nuevo, mentor, criaturas, salida y HUD ≤ 25 %.

## Fuera de alcance

Estilos visuales nuevos, cambios de código en la vista o en los sprites, M05, M09 y M11.
