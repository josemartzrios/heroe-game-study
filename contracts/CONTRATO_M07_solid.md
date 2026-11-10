# CONTRATO DE EJECUCIÓN — Módulo M07 "Principios SOLID"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01 a M06 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M07.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 a M06, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues principios, nombres de clases, autores, fechas ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los nombres de los principios y de las clases se quedan como aparecen en la Parte B (`Rectangle`, `Square`, `Worker`, `Coder`, SRP, OCP…).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego", "delego" o "colegio"). Si el validador marca una palabra, cambia la redacción de M07; no toques esa lista.
5. **Ningún enunciado (`prompt`) de M07 puede ser idéntico a uno de M01 a M06.** M05 ya pregunta "¿Qué dice el principio abierto/cerrado?" y "¿Qué es el acoplamiento?": redacta distinto. El validador debe comprobarlo.
6. En este módulo los distractores deben ser **los otros principios SOLID** (o las otras cualidades de T01). Distinguir qué principio se viola es la dificultad real del tema.
7. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v7.html`. Sirve para comprobar que M01 a M06 no cambian.
- `content.mjs` (M01) y `content_m02.mjs` a `content_m06.mjs` están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m07.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m07.mjs`, llama `expand('M07', 'Principios SOLID', c7)` y emite su bloque después de `// === MODULE:M06 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01 a M07 en ese orden; marcadores de M07 presentes; bloques M01 a M06 idénticos a `published_v7.html`; M07 validado con `checkModule` y los mínimos de B2; ningún `prompt` de M07 repetido en otro módulo; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs` a `m06.cjs`). Deben seguir pasando; si alguna cuenta módulos, actualiza solo ese número (de 6 a 7). Copia `m06.cjs` como `m07.cjs`, cambia `M06` por `M07`, `MODULES[5]` por `MODULES[6]` y el número de temas (de 14 a 13; no cambies otros números), y ejecútala al menos 10 veces (las rondas son aleatorias).
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "7 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M06 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // ... M02 a M06 sin cambios ...
  // === MODULE:M07 START ===
  { id: "M07", title: "Principios SOLID", topics: [...], questions: [...] },
  // === MODULE:M07 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M07",
  title: "Principios SOLID",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M07-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M07-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M07-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M07-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo. Las preguntas no llevan bloques de código de varias líneas.

---

# PARTE B — Módulo M07: Principios SOLID

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta. Las marcadas **[AÑADIDO]** no estaban en los apuntes y completan el tema.

## B1. Base de hechos por tema

### T01 — Elementos de un buen software
- **Modularidad**: cada componente tiene bien definidos su función y su alcance.
- **[CORREGIDO]** **Tolerancia a fallos**: el sistema **sigue funcionando** (aunque sea de forma limitada) **cuando una de sus partes falla**. Los apuntes la describen como "que el error sea identificable"; poder reconocer qué falló ayuda a lograrla, pero no es la definición.
- **[CORREGIDO]** **Robustez**: el sistema **soporta condiciones inesperadas o extremas sin colapsar**: demasiadas peticiones al servidor, una base de datos que se está llenando, entradas inválidas.
- **Seguridad**: el software está listo para exponerse al exterior, con credenciales y control de accesos.
- **[CORREGIDO]** **Usabilidad**: el sistema es **claro y fácil de usar** para el usuario. (La rapidez es rendimiento; los apuntes la mezclan aquí.)
- **Reusabilidad**: lo que se construyó se puede **reutilizar en otros sistemas**.
- **Extensibilidad**: se pueden **añadir cambios o funciones nuevas sin modificar lo que ya existe**.
- Diferencia clave: **reusabilidad** = usar lo mismo en otro lugar; **extensibilidad** = hacer crecer el sistema sin tocar lo existente.

### T02 — Qué es SOLID
- SOLID es un conjunto de **cinco principios de diseño de software** orientado a objetos.
- Objetivo: sistemas más **modulares, flexibles y mantenibles**; facilitan la **extensibilidad** y la **reusabilidad** en proyectos a largo plazo.
- Las letras: **S** = Single Responsibility (responsabilidad única); **O** = Open/Closed (abierto/cerrado); **L** = Liskov Substitution (sustitución de Liskov); **I** = Interface Segregation (segregación de interfaces); **D** = Dependency Inversion (inversión de dependencias).
- Siglas de cada principio: **SRP, OCP, LSP, ISP, DIP**.
- **[CORREGIDO]** Los apuntes escriben "Single responsability simple"; el nombre correcto es **Single Responsibility Principle**.
- **[AÑADIDO]** Los reunió **Robert C. Martin** ("Uncle Bob"); el acrónimo SOLID lo propuso **Michael Feathers**. La L lleva el nombre de **Barbara Liskov**.
- **[AÑADIDO]** Son **guías, no leyes**: se aplican cuando el código va a crecer o cambiar. Aplicarlos todos a un programa pequeño produce **sobreingeniería**.

### T03 — S: responsabilidad única (definición)
- **SRP**: una clase (o función) debe tener **una y solo una razón para cambiar**, es decir, **una sola responsabilidad**.
- Identificar las responsabilidades del código y dejar **una por clase** es lo que permite modularizar.
- **[CORREGIDO]** **Responsabilidad no es lo mismo que función o método.** Los apuntes las igualan. Una clase puede tener **varios métodos** y cumplir SRP, si todos sirven a la misma responsabilidad.
- **[AÑADIDO]** "Razón para cambiar" = un tipo de cambio que alguien puede pedir. Si las reglas de cálculo, el formato de impresión y la base de datos pueden obligar a tocar la misma clase, esa clase tiene tres razones para cambiar.
- **[AÑADIDO]** Resultado de aplicarlo: **alta cohesión** (todo lo que hay en la clase trata de lo mismo).

### T04 — S: responsabilidad única en la práctica
- Imagen de los apuntes (cada robot es una clase): **mal**, un solo robot que es chef, jardinero, pintor y chofer; **bien**, cuatro robots, uno por oficio.
- **[AÑADIDO]** Ejemplo: una clase `Factura` que **calcula el total**, **imprime** la factura y la **guarda en la base de datos** viola SRP: tiene tres razones para cambiar.
- **[AÑADIDO]** Corrección: `Factura` (solo calcula), `ImpresorFactura` (solo imprime) y `RepositorioFactura` (solo guarda).
- **[AÑADIDO]** Síntomas de violación: la clase se describe con "y" ("calcula **y** imprime **y** guarda"); clases enormes; un cambio pequeño en una parte rompe otra que no tiene relación.
- **[AÑADIDO]** Beneficios: cada clase es más fácil de entender, de probar y de reutilizar.

### T05 — O: abierto/cerrado (definición)
- **OCP**: el software debe estar **abierto para añadir nuevos comportamientos** (extensión) y **cerrado para cambiar código ya probado y validado** (modificación).
- Cómo se logra: con **clases abstractas o interfaces** que se **implementan o heredan** en clases específicas; así se añaden funcionalidades **sin cambiar la clase base**.
- **[AÑADIDO]** La idea: el comportamiento nuevo llega en **clases nuevas**, no editando las que ya funcionan.
- **[AÑADIDO]** "Cerrado" no significa que el código nunca se toque: corregir un error sí lo modifica. Lo que se evita es tener que modificarlo **cada vez que aparece una variante nueva**.
- Se relaciona con la **extensibilidad** de T01.

### T06 — O: abierto/cerrado en la práctica
- Imagen de los apuntes: **mal**, al robot que sabía cortar le cambian la herramienta y ahora solo pinta (se modificó lo que ya funcionaba); **bien**, al robot se le añade una herramienta y ahora corta **y** pinta (se extendió).
- **[AÑADIDO]** Ejemplo que viola OCP: `CalculadoraDescuentos` con una cadena `if/elif` por tipo de cliente (estudiante, mayorista…). Cada descuento nuevo obliga a **editar** esa clase ya probada.
- **[AÑADIDO]** Corrección: una interfaz `Descuento` con el método `aplicar()`; cada tipo es una clase (`DescuentoEstudiante`, `DescuentoMayorista`). La calculadora llama a `aplicar()` sin saber de qué tipo es.
- **[AÑADIDO]** Para añadir un descuento se crea **una clase nueva**; la calculadora no se toca.
- **[AÑADIDO]** Síntoma típico de violación: una cadena de `if/elif` (o `switch`) por tipo que crece con cada caso nuevo.
- **[AÑADIDO]** Se apoya en el polimorfismo: cada clase responde a `aplicar()` a su manera.

### T07 — L: sustitución de Liskov (definición)
- **LSP**: las clases derivadas deben **comportarse de manera consistente con las expectativas establecidas por la clase base**, de modo que el código que usa la clase base **funcione correctamente con cualquiera de sus subclases**.
- **[AÑADIDO]** Dicho corto: donde se espera un objeto de la clase base se debe poder poner uno de cualquier subclase **sin que el programa deje de funcionar bien**.
- La dirección importa: **la subclase sustituye a la base**, no al revés.
- **[AÑADIDO]** Una subclase viola LSP cuando: **desactiva** un comportamiento heredado (por ejemplo, un método que ahora lanza un error de "no soportado"), **exige más** que la base para funcionar, o **entrega menos** de lo que la base promete.
- **[AÑADIDO]** No basta con que la herencia compile ni con que "A es un B" suene lógico: lo que cuenta es el **comportamiento**.

### T08 — L: sustitución de Liskov en la práctica
- Ejemplo de los apuntes: `Square` hereda de `Rectangle`. Aunque un cuadrado es matemáticamente un tipo de rectángulo, la herencia **viola LSP** porque el cuadrado no se comporta como un rectángulo.
- **[AÑADIDO]** Por qué (los apuntes no lo explican): en `Rectangle` el ancho y el alto se cambian **por separado**. `Square` debe mantener sus lados iguales, así que al cambiar uno cambia el otro. Un código que pone ancho 5 y alto 4 y espera área 20 obtiene **16** con un `Square`.
- Corrección: no heredar. Crear una clase base `Shape` que define una interfaz común para las figuras (por ejemplo `area()`); `Rectangle` y `Square` son **clases independientes** que la implementan.
- Imagen de los apuntes: el robot Sam hace café; Eden es su hijo. **Mal**: cuando piden café a Eden, entrega agua. **Bien**: Eden entrega un capuchino (sigue cumpliendo "hacer café", incluso con algo más específico).
- **[AÑADIDO]** Otro ejemplo: `Pinguino` hereda de `Ave`, que tiene `volar()`; como no vuela, su `volar()` lanza un error. El código que hace volar a cualquier `Ave` falla: viola LSP.

### T09 — I: segregación de interfaces (definición)
- **ISP**: los clientes **no deberían estar obligados a depender de interfaces que no utilizan**.
- En otras palabras: es preferible **dividir interfaces grandes en interfaces más pequeñas y específicas**, para que cada clase solo implemente los métodos que realmente necesita.
- Beneficios: **reduce la complejidad**, **mejora la cohesión** y hace el código más mantenible.
- **[AÑADIDO]** Aquí "cliente" es la clase que implementa o usa la interfaz.
- **[AÑADIDO]** ISP no exige que toda interfaz tenga exactamente un método: pide interfaces **pequeñas y cohesivas** (métodos que siempre van juntos pueden compartir interfaz).
- **[AÑADIDO]** Una clase puede **implementar varias interfaces pequeñas** si de verdad hace varias cosas.
- **[AÑADIDO]** Relación con SRP: SRP habla de las responsabilidades de una **clase**; ISP habla del tamaño de una **interfaz**.

### T10 — I: segregación de interfaces en la práctica
- Ejemplo de los apuntes: una interfaz `Worker` con métodos para **programar, diseñar y testear**. No todos los trabajadores hacen todo: un programador no necesariamente diseña.
- Problema: una clase `Programmer` que implementa `Worker` queda obligada a tener métodos de diseñar y testear que no usa.
- Solución: dividir `Worker` en tres interfaces: `Coder`, `Designer` y `Tester`. En el ejemplo, cada una tiene un solo método abstracto.
- Ahora `Programmer` implementa solo `Coder`; `GraphicDesigner` solo `Designer`; `QualityAnalyst` solo `Tester`.
- Imagen de los apuntes: **mal**, un solo pizarrón de ejercicios (girar, rotar brazos, mover antenas) para todos los robots, y uno no tiene antenas; **bien**, listas separadas según lo que cada robot puede hacer.
- **[AÑADIDO]** Síntoma de violación: métodos **vacíos** o que solo lanzan un error de "no implementado" porque la interfaz los exige.

### T11 — D: inversión de dependencias (definición)
- **DIP**: los **módulos de alto nivel no deberían depender de módulos de bajo nivel**. **Ambos deberían depender de abstracciones** (interfaces).
- **[AÑADIDO]** Segunda parte del principio: las **abstracciones no deben depender de los detalles**; los **detalles deben depender de las abstracciones**.
- **[AÑADIDO]** **Alto nivel** = la lógica principal del negocio (qué hace el sistema). **Bajo nivel** = los detalles técnicos (base de datos, archivos, red, una librería concreta).
- **[AÑADIDO]** Por qué "inversión": lo habitual es que el alto nivel dependa directamente del bajo nivel. Con DIP, el bajo nivel pasa a depender de una interfaz definida para el alto nivel: la dirección de la dependencia se invierte.
- **[AÑADIDO]** Resultado: **bajo acoplamiento**. Se puede cambiar un detalle (por ejemplo la base de datos) sin tocar la lógica principal.

### T12 — D: inversión de dependencias en la práctica
- Imagen de los apuntes: **mal**, un robot que corta pizza "con mi brazo cortador" integrado; **bien**, un robot que corta pizza "con cualquier herramienta que me den".
- **[AÑADIDO]** Ejemplo que viola DIP: `ServicioPedidos` (alto nivel) crea por dentro un `RepositorioMySQL` (bajo nivel). Queda atado a MySQL y no se puede probar sin una base de datos real.
- **[AÑADIDO]** Corrección: una interfaz `RepositorioPedidos`. `ServicioPedidos` depende solo de esa interfaz; `RepositorioMySQL` la implementa. En las pruebas se usa `RepositorioEnMemoria`, que también la implementa.
- **[CORREGIDO]** Los apuntes dicen que se usa "cuando hay problemas para hacer pruebas unitarias". Eso es un **síntoma** de que falta, no el único caso: se aplica siempre que la lógica principal depende directamente de un detalle concreto que puede cambiar.
- **[AÑADIDO]** **Inyección de dependencias** no es lo mismo que inversión de dependencias: la inyección es una **técnica** (pasar la dependencia desde fuera, por ejemplo en el constructor) para aplicar el **principio** de inversión.

### T13 — Reconocer qué principio se viola
- **SRP**: una clase hace demasiadas cosas (varias razones para cambiar).
- **OCP**: para añadir una variante hay que **editar** código que ya funcionaba (cadena de `if/elif` que crece).
- **LSP**: una **subclase** no puede usarse en lugar de su clase base sin romper algo.
- **ISP**: una clase está obligada a implementar métodos de una **interfaz** que no necesita.
- **DIP**: la lógica principal crea o usa directamente una **clase concreta** de bajo nivel en lugar de una abstracción.
- Confusiones frecuentes: **SRP frente a ISP** (clase con demasiadas responsabilidades frente a interfaz con demasiados métodos); **OCP frente a DIP** (OCP: añadir sin modificar; DIP: de quién depende el código; aplicar DIP suele ayudar a cumplir OCP); **LSP frente a ISP** (LSP: una subclase rompe lo que promete la base; ISP: el problema nace de una interfaz demasiado grande).
- Con los robots de los apuntes: robot con cuatro oficios → SRP; robot al que le cambian la herramienta y pierde lo que sabía → OCP; robot hijo que entrega agua en vez de café → LSP; pizarrón único con ejercicios que un robot no puede hacer → ISP; robot que solo corta con su brazo integrado → DIP.

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 54 | 4 por tema y 6 en T01; al menos 1 de dificultad 3 por tema |
| `tf` | 39 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 17 y 22 verdaderas) |
| `scenario` | 17 | Los 17 de B3 |
| `error` | 18 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`, si la tiene). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción. En T02 pregunta qué significa cada letra y cada sigla. En T13 incluye preguntas con los robots y con las confusiones frecuentes.

## B3. Escenarios (respuesta correcta entre corchetes)

Donde la respuesta es un principio, las cuatro opciones son principios SOLID (con su sigla). Donde es una cualidad, las opciones son cualidades de T01.

1. (T01) Uno de los tres servidores de un servicio de pagos se cae y el sistema sigue atendiendo con los otros dos. ¿Qué cualidad muestra? → [Tolerancia a fallos]
2. (T01) Para añadir un método de envío nuevo no hizo falta modificar nada del código existente. ¿Qué cualidad muestra? → [Extensibilidad]
3. (T01) El módulo de autenticación de un sistema se usa tal cual en otros tres sistemas de la empresa. ¿Qué cualidad muestra? → [Reusabilidad]
4. (T04) La clase `Factura` calcula el total, imprime la factura y la guarda en la base de datos; tres equipos distintos la modifican por motivos distintos. ¿Qué principio viola? → [SRP]
5. (T04) ¿Cómo se corrige esa clase `Factura`? → [Separarla: `Factura` calcula, `ImpresorFactura` imprime y `RepositorioFactura` guarda] (opciones en texto)
6. (T06) Cada vez que aparece un tipo de descuento hay que añadir otro `elif` dentro de `CalculadoraDescuentos`, que ya estaba probada. ¿Qué principio viola? → [OCP]
7. (T06) ¿Cómo se corrige esa `CalculadoraDescuentos`? → [Crear la interfaz `Descuento` con `aplicar()` y una clase por tipo de descuento] (opciones en texto)
8. (T08) `Square` hereda de `Rectangle`. Una función pone ancho 5 y alto 4, espera área 20 y con un `Square` obtiene 16. ¿Qué principio viola? → [LSP]
9. (T08) `Pinguino` hereda de `Ave` y su método `volar()` lanza un error; el código que hace volar a todas las aves falla. ¿Qué principio viola? → [LSP]
10. (T08) ¿Cómo se corrige la jerarquía de `Rectangle` y `Square`? → [Crear una base `Shape` con una interfaz común y que `Rectangle` y `Square` sean clases independientes que la implementan] (opciones en texto)
11. (T10) `Programmer` implementa la interfaz `Worker` y deja vacíos los métodos de diseñar y testear porque no los usa. ¿Qué principio viola? → [ISP]
12. (T10) ¿Cómo se corrige esa interfaz `Worker`? → [Dividirla en `Coder`, `Designer` y `Tester`, y que cada clase implemente solo la que necesita] (opciones en texto)
13. (T12) `ServicioPedidos` crea por dentro un `RepositorioMySQL` y no se puede probar sin una base de datos real. ¿Qué principio viola? → [DIP]
14. (T12) ¿Cómo se corrige ese `ServicioPedidos`? → [Que dependa de la interfaz `RepositorioPedidos` y reciba desde fuera la implementación concreta] (opciones en texto)
15. (T13) Un robot hijo sustituye a su padre, que hacía café; cuando le piden café, entrega agua. ¿Qué principio ilustra? → [LSP]
16. (T13) Un robot corta pizza solo con su brazo cortador integrado y no puede usar ninguna otra herramienta. ¿Qué principio ilustra? → [DIP]
17. (T02) Un compañero aplica los cinco principios a un script de 30 líneas que no va a crecer y crea doce interfaces. ¿Qué respondes? → [Que es sobreingeniería: SOLID son guías que se aplican cuando el código va a crecer o cambiar] (opciones en texto)

Reparte la dificultad de los escenarios entre 2 y 3.

## B4. Caza el error (fragmento con error → corrección)

1. "La tolerancia a fallos consiste en que un error sea identificable." → Consiste en que el sistema siga funcionando cuando una de sus partes falla. (T01)
2. "La extensibilidad es la capacidad de reutilizar el software en otros sistemas." → Eso es reusabilidad; la extensibilidad es añadir funciones sin modificar lo existente. (T01)
3. "SOLID es un conjunto de siete principios de diseño de software." → Son cinco. (T02)
4. "En SOLID, la I significa Inversión de dependencias y la D significa Diseño de interfaces." → La I es Interface Segregation y la D es Dependency Inversion. (T02)
5. "Según SRP, una clase debe tener un solo método." → Debe tener una sola razón para cambiar; puede tener varios métodos si sirven a la misma responsabilidad. (T03)
6. "Para cumplir SRP conviene que la clase Factura calcule, imprima y guarde, así todo está en un solo lugar." → Eso son tres responsabilidades; SRP pide separarlas en clases distintas. (T04)
7. "Según OCP, el software debe estar abierto a la modificación y cerrado a la extensión." → Es al revés: abierto a la extensión y cerrado a la modificación. (T05)
8. "Para cumplir OCP, cada descuento nuevo se añade con otro elif dentro de la calculadora." → Eso modifica código ya probado; se añade una clase nueva que implementa `Descuento`. (T06)
9. "Según LSP, la clase base debe poder sustituir a cualquiera de sus subclases." → Es al revés: cualquier subclase debe poder sustituir a la clase base. (T07)
10. "Como un cuadrado es un rectángulo, hacer que Square herede de Rectangle cumple LSP." → Lo viola: el cuadrado no se comporta como un rectángulo (ancho y alto no cambian por separado). (T08)
11. "Para corregir el problema de Square y Rectangle, basta con que Rectangle herede de Square." → Se crea una base `Shape` y las dos son clases independientes que la implementan. (T08)
12. "Según ISP, es preferible una sola interfaz grande con todos los métodos posibles." → Es preferible dividirla en interfaces pequeñas y específicas. (T09)
13. "ISP exige que toda interfaz tenga exactamente un método." → Pide interfaces pequeñas y cohesivas, no necesariamente de un solo método. (T09)
14. "Después de aplicar ISP, Programmer implementa Coder, Designer y Tester." → `Programmer` implementa solo `Coder`. (T10)
15. "Según DIP, los módulos de alto nivel deben depender directamente de los módulos de bajo nivel." → No deben; ambos dependen de abstracciones. (T11)
16. "DIP solo se aplica cuando hay problemas para hacer pruebas unitarias." → Ese es un síntoma; se aplica siempre que la lógica principal depende de un detalle concreto que puede cambiar. (T12)
17. "Inversión de dependencias e inyección de dependencias son exactamente lo mismo." → La inversión es el principio; la inyección es una técnica para aplicarlo. (T12)
18. "Una clase con demasiadas responsabilidades viola el principio de segregación de interfaces." → Viola SRP; ISP trata de interfaces demasiado grandes. (T13)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 a M06 son idénticos a los de `published_v7.html`; `engine.html` no cambió.
- [ ] M07 cumple el esquema: IDs únicos con prefijo `M07-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 13 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 17 y 22 `tf` verdaderas.
- [ ] Los 17 escenarios de B3 y los 18 errores de B4 están presentes.
- [ ] Ningún `prompt` de M07 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra siete módulos; M07 abre su mapa con 13 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M07 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs` y `m03.cjs` a `m07.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
