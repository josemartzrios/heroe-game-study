# CONTRATO DE EJECUCIÓN — Módulo M04 "Historia de la programación"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01, M02 y M03 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M04.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01, M02 y M03, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues datos, fechas, nombres ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los términos técnicos se quedan en inglés cuando así aparecen en la Parte B (bytecode, deadlock, lambda, GO TO...).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego" o "colegio"). Si el validador marca una palabra, cambia la redacción de M04; no toques esa lista.
5. **Ningún enunciado (`prompt`) de M04 puede ser idéntico a uno de M01, M02 o M03.** M04 toca temas vecinos (JavaScript, bytecode, compilación JIT): redacta las preguntas de forma distinta. El validador debe comprobarlo.
6. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v4.html`. Sirve para comprobar que M01, M02 y M03 no cambian.
- `content.mjs` (M01), `content_m02.mjs` (M02) y `content_m03.mjs` (M03) están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m04.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m04.mjs`, llama `expand('M04', 'Historia de la programación', c4)` y emite su bloque después de `// === MODULE:M03 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01, M02, M03 y M04 en ese orden; marcadores de M04 presentes; bloques M01, M02 y M03 idénticos a `published_v4.html`; M04 validado con `checkModule` y los mínimos de B2; ningún `prompt` de M04 repetido en otro módulo; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs`). Deben seguir pasando; si alguna cuenta módulos, actualiza solo ese número. Copia `m03.cjs` como `m04.cjs`, cambia `M03` por `M04`, `MODULES[2]` por `MODULES[3]` y el número de temas, y ejecútala al menos 10 veces (las rondas son aleatorias).
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "4 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M03 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // === MODULE:M02 START ===  ...sin cambios...  // === MODULE:M02 END ===
  // === MODULE:M03 START ===  ...sin cambios...  // === MODULE:M03 END ===
  // === MODULE:M04 START ===
  { id: "M04", title: "Historia de la programación", topics: [...], questions: [...] },
  // === MODULE:M04 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M04",
  title: "Historia de la programación",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M04-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M04-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M04-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M04-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; distractores plausibles tomados del mismo tema (otro paradigma, otro lenguaje, otro pilar, otra fecha de B1; nada absurdo); la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo.

---

# PARTE B — Módulo M04: Historia de la programación

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta.

## B1. Base de hechos por tema

### T01 — Lenguajes y paradigmas
- **[CORREGIDO]** Un **lenguaje de programación** es un **lenguaje formal** (artificial, con reglas estrictas de sintaxis y significado) que permite expresar algoritmos de modo que una computadora pueda ejecutarlos. No es "una comunicación artificial".
- Un **paradigma** es un estilo o enfoque para resolver problemas con código: define cómo se organiza y se piensa un programa.
- Hay dos grandes familias. **Imperativa**: le dices a la computadora **cómo** hacer las cosas, paso a paso (incluye la procedural y la orientada a objetos). **Declarativa**: describes **qué** resultado quieres y el sistema decide los pasos (incluye la funcional y la lógica).
- Un lenguaje **multiparadigma** permite programar en varios estilos. Ejemplos: C++, Java, JavaScript, PHP, Python y Ruby.
- Un paradigma no es un lenguaje: el mismo lenguaje puede usarse con estilos distintos.

### T02 — Programación imperativa y procedural
- **Imperativa**: una secuencia de instrucciones que la máquina sigue en orden y que van cambiando su **estado** (el valor de las variables). El foco está en el proceso. Analogía: dar órdenes a un robot paso a paso ("mueve el pie derecho", "mueve el pie izquierdo").
- **Procedural**: es programación imperativa **más organizada**. Agrupa las instrucciones en bloques reutilizables llamados **procedimientos** o **funciones**. Analogía: en vez de dictar cada paso, creas una "rutina de caminar" y le pides al robot que la ejecute.
- La procedural ayuda a dividir un problema grande en partes pequeñas y a no repetir código.
- Toda programación procedural es imperativa, pero no al revés.
- Lenguajes típicos: **C, Fortran, Pascal y COBOL**.

### T03 — Programación estructurada y el GO TO
- La instrucción **GO TO** salta de una línea del programa a cualquier otra. Usada en exceso produce **código espagueti**: un flujo enredado, difícil de leer y de corregir.
- **[CORREGIDO]** La relación correcta es esta: en **1968**, **Edsger Dijkstra** publicó la carta "Go To Statement Considered Harmful" (la instrucción GO TO considerada dañina). Esa advertencia impulsó la **programación estructurada**, que propone dejar el GO TO y usar estructuras de control.
- La programación estructurada usa solo **tres estructuras de control**: **secuencia** (una instrucción tras otra), **selección** (`if/else`) e **iteración** (ciclos como `while` y `for`).
- Cualquier programa puede escribirse combinando solo esas tres estructuras (teorema de Böhm y Jacopini, 1966).
- **[CORREGIDO]** Los ciclos no "nacieron" con esa advertencia: ya existían; lo que cambió fue que se volvieron la forma recomendada de controlar el flujo en lugar del GO TO.

### T04 — POO: clases, instancias, propiedades y métodos
- La **Programación Orientada a Objetos (POO)** modela un problema con **objetos** que combinan **datos** (lo que saben) y **comportamiento** (lo que pueden hacer). El foco está en las entidades y sus interacciones.
- **Clase**: molde o plantilla que define qué datos y qué comportamiento tendrán sus objetos. Ejemplo: la clase `Persona`. Puede representar cosas físicas o conceptos (una `Factura`, una `Cuenta`).
- **[CORREGIDO]** **Instancia** (u objeto): un ejemplar concreto creado a partir de una **clase**. Una persona llamada Héctor es una instancia de la **clase `Persona`** (no "del objeto Humano").
- **Propiedad** o **atributo**: un dato de la instancia, como `altura` o `nombre`. Cada instancia tiene sus propios valores.
- **Método**: una función que pertenece a la clase y define algo que el objeto puede hacer, como `caminar()` o `hablar()`.
- De una misma clase se pueden crear muchas instancias, cada una con valores distintos.
- Lenguajes típicos: Java, Python, C++, C# y Ruby.

### T05 — Los cuatro pilares de la POO
- **[CORREGIDO]** **Abstracción**: quedarse con las características **esenciales** de algo para el problema y **ocultar los detalles** que no importan. No es lo mismo que modularizar. Ejemplo: para manejar un auto usas volante y pedales sin conocer el motor.
- **[CORREGIDO]** **Herencia**: una **subclase** (hija) **hereda** los atributos y métodos de una **superclase** (madre) y puede añadir o modificar los suyos. Sirve para reutilizar código. Ejemplo: `Perro` y `Gato` heredan de `Animal`.
- **[CORREGIDO]** **Encapsulamiento**: agrupar los datos con los métodos que los usan y **restringir el acceso directo** al estado interno del objeto. Los datos se marcan como privados y solo se cambian mediante métodos públicos, que pueden validar. Ejemplo: el saldo de una cuenta solo cambia con `depositar()` y `retirar()`.
- **Polimorfismo**: objetos de clases distintas responden **al mismo mensaje cada uno a su manera**, aunque se usen a través de un mismo tipo (superclase o interfaz). Ejemplo: llamar `area()` en una lista de figuras; el círculo y el cuadrado calculan cada uno la suya.

### T06 — Programación funcional
- Trata el cómputo como la **evaluación de funciones matemáticas**. Se enfoca en **qué** calcular (transformaciones de datos), no en cómo hacerlo paso a paso. Es un paradigma declarativo.
- **Función pura**: con los mismos argumentos devuelve **siempre el mismo resultado** y **no tiene efectos secundarios** (no modifica nada fuera de ella ni depende de datos externos que cambian). Analogía: una calculadora que no recuerda cálculos anteriores.
- **Inmutabilidad**: los datos no se modifican; para "cambiar" algo se crea un valor nuevo.
- Ventaja: código más predecible y más fácil de probar.
- Una función que lee o modifica una variable global no es pura.
- Lenguajes: **Haskell, Lisp y Scheme**; **Scala** combina funcional y POO; JavaScript y Python permiten programar con estilo funcional.

### T07 — Funciones de primera clase, orden superior y lambdas
- Que las funciones sean **ciudadanas de primera clase** significa que se tratan como cualquier otro valor: se pueden **guardar en una variable, pasar como argumento y devolver** como resultado.
- Una **función de orden superior** es la que **recibe** otra función como parámetro **o devuelve** una función.
- **Lisp** (1958) fue el lenguaje que introdujo esta forma de programar.
- Una **función lambda** es una **función anónima** (sin nombre), escrita de forma concisa para una tarea puntual. Ejemplos: en Python `lambda x: x * 2`; en JavaScript `x => x * 2`.
- El nombre viene del **cálculo lambda**, un sistema matemático de Alonzo Church (década de 1930).
- Lenguajes con lambdas: Python, JavaScript y **Java desde la versión 8**.
- Uso típico: pasar una lambda a una función de orden superior, por ejemplo el criterio para ordenar o filtrar una lista.

### T08 — Programación lógica
- El programa describe el problema con **hechos** y **reglas** (si pasa A y B, entonces C). Luego se hacen **consultas** y el sistema **deduce** las respuestas.
- Analogía: un detective al que le das pistas y reglas y luego le haces una pregunta.
- El foco está en **qué es verdad** y qué se puede inferir, no en la secuencia de pasos para llegar a la respuesta. Es un paradigma declarativo.
- Lenguaje representativo: **Prolog** (1972).
- Ejemplo: con los hechos "Ana es madre de Luis" y "Luis es padre de Sara" y la regla de qué es un abuelo, el sistema responde quién es abuela de Sara.

### T09 — Programación reactiva
- Se centra en **flujos de datos** y en la **propagación automática de los cambios**: cuando un dato cambia, todo lo que depende de él se actualiza solo.
- Analogía: una hoja de cálculo; cambias una celda y se recalculan las que dependen de ella.
- Es muy útil para interfaces de usuario y manejo de eventos.
- Herramientas: la familia **ReactiveX**, con **RxJava** (Java) y **RxJS** (JavaScript).
- **[CORREGIDO]** **React** (la librería de interfaces para JavaScript) **no es una librería de programación reactiva** en sentido estricto: es una librería para construir interfaces que vuelve a dibujar la pantalla cuando cambia el estado. La librería reactiva para JavaScript es RxJS.

### T10 — Primeras computadoras y código máquina (1GL)
- **[CORREGIDO]** La **EDSAC** (1949, Universidad de Cambridge) **no fue la primera computadora**: fue una de las primeras computadoras de **programa almacenado** (guardan el programa en la memoria, junto con los datos). Antes existió la **ENIAC** (1945), que se programaba recableándola a mano con cables e interruptores.
- Las primeras computadoras se programaban directamente en **código máquina**: instrucciones en binario (0 y 1).
- Al código máquina se le llama **lenguaje de primera generación (1GL)**.
- Programar en código máquina es lento, propenso a errores y exclusivo de cada modelo de computadora.

### T11 — Ensamblador (2GL) y portabilidad
- Los **lenguajes ensambladores** (finales de los años 40) son representaciones **simbólicas** del código máquina: usan abreviaturas legibles (mnemónicos, como `ADD` o `MOV`) en lugar de números binarios.
- Un programa llamado **ensamblador** traduce esas instrucciones a código máquina.
- Son los **lenguajes de segunda generación (2GL)**.
- Cada tipo de procesador tiene su propio ensamblador: la **portabilidad es nula**. Un programa escrito para una máquina hay que reescribirlo para otra.
- **Portabilidad**: capacidad de un programa de ejecutarse en distintas plataformas de hardware y software sin modificarlo de forma significativa.

### T12 — Lenguajes de alto nivel (3GL): Fortran, Lisp y COBOL
- En los años 50 aparecieron los **lenguajes de alto nivel** o de **tercera generación (3GL)**.
- **[CORREGIDO]** No "ignoran las limitaciones del hardware": **abstraen los detalles** del hardware. Se escriben con palabras y fórmulas cercanas al lenguaje humano, y un traductor genera el código máquina de cada computadora. Por eso son **portables**.
- **[CORREGIDO]** **Fortran** (1957, John Backus, IBM; de "FORmula TRANslation") fue el **primer lenguaje de alto nivel de uso amplio**, pensado para cálculo científico. No fue "el primer lenguaje imperativo": el código máquina y el ensamblador ya eran imperativos.
- **Lisp** (1958, John McCarthy): pionero de la programación funcional.
- **COBOL** (1959, Common Business-Oriented Language): creado para los negocios, con una sintaxis lo más cercana posible al inglés. Sigue en uso en bancos.
- **Grace Hopper** desarrolló en **1952** el **A-0**, considerado el **primer compilador**. Su trabajo posterior fue la base de COBOL.
- **[CORREGIDO]** Un compilador no traduce "instrucciones escritas en códigos que las computadoras leen directamente": traduce **código fuente** (legible para personas) **a código máquina** (lo que la computadora ejecuta).

### T13 — Simula, C y C++
- **Simula** (Noruega, años 60; Ole-Johan Dahl y Kristen Nygaard) fue el **primer lenguaje orientado a objetos**: introdujo las clases y los objetos.
- **C** (1972, Dennis Ritchie, Bell Labs) se creó para escribir el sistema operativo Unix. Es procedural, rápido y cercano al hardware.
- **C++** (Bjarne Stroustrup) deriva de C: empezó en 1979 como "C con clases" y se llamó C++ desde 1983. Añadió a C las clases de Simula y **popularizó la POO** en los años 80.
- C++ no inventó las clases: las tomó de Simula.
- C++ es multiparadigma: permite programar de forma procedural y orientada a objetos.

### T14 — Compiladores e intérpretes
- Un **compilador** traduce **todo** el código fuente a código máquina **antes** de ejecutarlo y genera un **archivo ejecutable** independiente. Ejemplos de lenguajes compilados: C y C++.
- Un **intérprete** lee el código fuente y lo **ejecuta directamente, instrucción por instrucción**, sin generar un ejecutable independiente. Para ejecutar el programa siempre hace falta el intérprete.
- Con un **compilador**, los errores de sintaxis (y de tipos) se detectan **durante la compilación**, antes de que el programa pueda ejecutarse.
- Con un **intérprete**, los errores aparecen **a medida que se ejecuta**: un error en una línea solo se descubre cuando el programa llega a esa línea.
- **[CORREGIDO]** Compilar no elimina todos los errores: los **errores en tiempo de ejecución** (por ejemplo, dividir entre cero) también ocurren en programas compilados.
- En general, el programa compilado se ejecuta más rápido; el interpretado es más cómodo para probar cambios al momento.

### T15 — Código intermedio: Pascal, Java y la JVM
- El **código intermedio** (o **bytecode**) es una representación del programa a medio camino entre el código fuente y el código máquina. No es de ningún procesador real: lo ejecuta una **máquina virtual**.
- **[CORREGIDO]** **Pascal** (1970, Niklaus Wirth) no "introdujo el término": **popularizó la técnica** con su **p-code** en los años 70. El compilador generaba p-code y una máquina virtual lo ejecutaba en cada computadora.
- **[CORREGIDO]** **Java** (James Gosling, Sun Microsystems) se empezó a diseñar en **1991** para aparatos electrónicos de consumo con recursos limitados y se publicó en **1995**, cuando la Web se popularizaba. Internet no "nació en los 90": ya existía.
- En Java, el código fuente se **compila a bytecode**, y la **Java Virtual Machine (JVM)** lo ejecuta traduciéndolo al código máquina de cada equipo.
- Lema de Java: "**write once, run anywhere**" (escríbelo una vez, ejecútalo en cualquier lugar). El mismo bytecode corre en Windows, Linux o macOS si hay una JVM instalada. Eso es portabilidad.
- Java combina las dos técnicas: se compila (a bytecode) y luego una máquina virtual lo ejecuta.

### T16 — Python y JavaScript
- **Python**: creado por **Guido van Rossum**, publicado en **1991**. Es de alto nivel, de propósito general, **interpretado** y multiparadigma. Destaca en inteligencia artificial, ciencia de datos y desarrollo web.
- **JavaScript**: de alto nivel, multiparadigma (imperativo, funcional y orientado a objetos), con **tipado dinámico y débil**, y **basado en prototipos** (los objetos heredan de otros objetos, no de clases).
- **Tipado dinámico**: el tipo de una variable se decide al ejecutar y puede cambiar. **Tipado débil**: el lenguaje convierte tipos automáticamente (en JavaScript, `"5" + 1` da `"51"`).
- Los motores modernos ejecutan JavaScript con **compilación justo a tiempo (JIT)**: compilan el código a código máquina mientras el programa corre.
- **[CORREGIDO]** JavaScript no "se volvió estándar en 2012": está estandarizado desde **1997** con el nombre **ECMAScript**. Su mayor actualización fue **ES6, en 2015**.

### T17 — Concurrencia, paralelismo y deadlock
- **Concurrencia**: capacidad de un programa de manejar **varias tareas a la vez** de modo que parezcan ocurrir al mismo tiempo, aunque en realidad pueda estar **alternando muy rápido** entre ellas.
- **Paralelismo**: las tareas se ejecutan **realmente al mismo tiempo**, en distintos núcleos del procesador.
- Analogía: concurrencia es un cocinero que alterna entre dos platillos; paralelismo son dos cocineros, cada uno con un platillo.
- Un **hilo** (thread) es una secuencia de ejecución dentro de un programa; un programa puede tener varios.
- **[CORREGIDO]** Un **deadlock** (bloqueo mutuo o punto muerto) ocurre cuando **dos o más hilos se esperan entre sí**: cada uno tiene un recurso que el otro necesita y ninguno lo suelta, así que **ninguno puede avanzar, para siempre**. No es simplemente "un hilo que espera un recurso".
- Ejemplo: el hilo A tiene el recurso 1 y espera el 2; el hilo B tiene el recurso 2 y espera el 1.
- Un solo hilo que espera mucho tiempo porque otros siempre se le adelantan no está en deadlock: eso se llama **inanición** (starvation).

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 68 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 51 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 23 y 28 verdaderas) |
| `scenario` | 15 | Los 15 de B3 |
| `error` | 22 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción.

## B3. Escenarios (respuesta correcta entre corchetes)

1. (T01) Un compañero dice que "Python es un paradigma". ¿Cómo lo corriges? → [Python es un lenguaje multiparadigma; un paradigma es un estilo de programar, y un mismo lenguaje puede usarse con varios]
2. (T02) Tienes el mismo bloque de 10 instrucciones copiado en cinco partes del programa. → [Agruparlo en un procedimiento o función y llamarlo desde los cinco lugares: programación procedural]
3. (T03) Heredas un programa lleno de saltos GO TO y nadie logra seguir su flujo. → [Reescribirlo con secuencia, selección e iteración: programación estructurada]
4. (T04) Vas a modelar una tienda donde cada producto tiene nombre y precio, y puede aplicar un descuento. → [Una clase Producto con propiedades nombre y precio y un método para el descuento; cada producto es una instancia]
5. (T05) El saldo de una cuenta bancaria no debe poder cambiarse directamente desde cualquier parte del programa. → [Encapsulamiento: saldo privado, modificable solo con métodos como depositar y retirar]
6. (T05) Las clases Perro y Gato repiten los mismos atributos nombre y edad. → [Herencia: crear la superclase Animal con esos atributos y que Perro y Gato hereden de ella]
7. (T05) Recorres una lista de figuras distintas y llamas `area()` en cada una, sin preguntar de qué tipo es. → [Polimorfismo: cada clase responde al mismo método a su manera]
8. (T06) Una función devuelve resultados distintos con los mismos argumentos porque lee una variable global que otros modifican. → [Convertirla en función pura: que dependa solo de sus argumentos y no modifique nada externo]
9. (T07) Necesitas pasar a una función de ordenamiento un criterio breve que solo usarás una vez. → [Una función lambda pasada como argumento]
10. (T08) Tienes una base de parentescos y reglas familiares, y quieres preguntar "¿quién es abuelo de quién?" sin programar los pasos de búsqueda. → [Programación lógica, por ejemplo con Prolog: hechos, reglas y consultas]
11. (T09) Una pantalla debe actualizarse sola cada vez que llegan datos nuevos de varios sensores. → [Programación reactiva: flujos de datos y propagación automática de cambios]
12. (T11) Un programa escrito en ensamblador para un procesador debe funcionar en otro procesador distinto. → [Hay que reescribirlo: el ensamblador no es portable; un lenguaje de alto nivel lo evitaría]
13. (T14) Quieres que los errores de sintaxis se detecten todos antes de entregar el programa, y entregar un solo archivo ejecutable. → [Usar un lenguaje compilado]
14. (T15) Quieres distribuir una misma aplicación para Windows, Linux y macOS sin generar una versión para cada uno. → [Java: se compila una vez a bytecode y la JVM de cada sistema lo ejecuta]
15. (T17) El hilo A tiene el recurso 1 y espera el recurso 2; el hilo B tiene el recurso 2 y espera el 1. El programa se congela. → [Deadlock: los dos hilos se esperan entre sí y ninguno puede avanzar]

Reparte la dificultad de los escenarios entre 2 y 3. Los distractores deben ser alternativas del mismo tema (otro pilar, otro paradigma, intérprete en vez de compilador, inanición en vez de deadlock, etc.).

## B4. Caza el error (fragmento con error → corrección)

1. "Un paradigma es un lenguaje de programación especializado en un tipo de problema." → Un paradigma es un estilo o enfoque de programación; un mismo lenguaje puede usarse con varios. (T01)
2. "La programación procedural y la imperativa son paradigmas opuestos." → La procedural es programación imperativa más organizada, con procedimientos o funciones. (T02)
3. "Los ciclos nacieron después de que se advirtiera que la programación estructurada generaba código espagueti." → El código espagueti lo genera el abuso del GO TO; la programación estructurada es la solución que propone secuencia, selección e iteración. (T03)
4. "La carta contra el GO TO la publicó Grace Hopper en 1952." → La publicó Edsger Dijkstra en 1968. (T03)
5. "Héctor es una instancia del objeto Humano; la clase se crea a partir de sus instancias." → Héctor es una instancia de la clase Persona; las instancias se crean a partir de la clase. (T04)
6. "Abstracción significa dividir el programa en módulos." → Abstracción es quedarse con lo esencial y ocultar los detalles que no importan. (T05)
7. "El encapsulamiento permite que una subclase reciba los atributos y métodos de otra clase." → Eso es la herencia; el encapsulamiento restringe el acceso directo al estado interno del objeto. (T05)
8. "Polimorfismo es ocultar las propiedades de un objeto para que no sean alteradas." → Eso es el encapsulamiento; polimorfismo es que objetos distintos respondan al mismo mensaje cada uno a su manera. (T05)
9. "Una función pura puede devolver resultados distintos con los mismos argumentos." → Una función pura devuelve siempre el mismo resultado con los mismos argumentos y no tiene efectos secundarios. (T06)
10. "Una función lambda es una función con nombre que solo existe en Java." → Es una función anónima, disponible en Python, JavaScript y Java desde la versión 8. (T07)
11. "React es la principal librería de programación reactiva de JavaScript." → React es una librería para construir interfaces; la librería reactiva de JavaScript es RxJS, de la familia ReactiveX. (T09)
12. "La EDSAC fue la primera computadora de la historia." → Fue una de las primeras computadoras de programa almacenado (1949); la ENIAC es de 1945. (T10)
13. "Los lenguajes ensambladores son portables: el mismo programa corre en cualquier procesador." → Cada tipo de procesador tiene su propio ensamblador; su portabilidad es nula. (T11)
14. "Los lenguajes de alto nivel ignoran las limitaciones del hardware." → Abstraen los detalles del hardware: un traductor genera el código máquina de cada computadora. (T12)
15. "Fortran fue el primer lenguaje de programación imperativo." → Fue el primer lenguaje de alto nivel de uso amplio; el código máquina y el ensamblador ya eran imperativos. (T12)
16. "Un compilador traduce el código máquina a un lenguaje que las personas pueden leer." → Es al revés: traduce el código fuente, legible para personas, a código máquina. (T12)
17. "C++ fue el primer lenguaje en usar clases." → El primero fue Simula; C++ tomó las clases de Simula y popularizó la POO. (T13)
18. "Un programa compilado nunca puede fallar mientras se ejecuta, porque el compilador detecta todos los errores." → El compilador detecta errores de sintaxis y de tipos; los errores en tiempo de ejecución, como dividir entre cero, siguen ocurriendo. (T14)
19. "Java nació junto con internet en los años 90 y la JVM ejecuta directamente el código fuente." → Internet ya existía; Java se publicó en 1995, y la JVM ejecuta bytecode, no código fuente. (T15)
20. "Pascal inventó el término código intermedio en 1991." → Pascal (1970) popularizó la técnica con su p-code en los años 70; 1991 es el año de Python. (T15)
21. "JavaScript se convirtió en estándar en 2012." → Está estandarizado desde 1997 como ECMAScript; ES6 llegó en 2015. (T16)
22. "Hay deadlock cuando un hilo espera un recurso durante mucho tiempo." → Deadlock es cuando dos o más hilos se esperan entre sí y ninguno puede avanzar; un solo hilo que espera mucho es inanición. (T17)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01, M02 y M03 son idénticos a los de `published_v4.html`; `engine.html` no cambió.
- [ ] M04 cumple el esquema: IDs únicos con prefijo `M04-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 17 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 23 y 28 `tf` verdaderas.
- [ ] Los 15 escenarios de B3 y los 22 errores de B4 están presentes.
- [ ] Ningún `prompt` de M04 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra cuatro módulos; M04 abre su mapa con 17 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M04 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs`, `m03.cjs` y `m04.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
