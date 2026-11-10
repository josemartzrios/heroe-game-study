# CONTRATO DE EJECUCIÓN — Módulo M06 "Programación orientada a objetos"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01 a M05 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M06.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 a M05, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues conceptos, nombres de clases, sintaxis ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los nombres de clases y métodos se escriben como aparecen en la Parte B (`Carro`, `Animal`, `hacer_sonido()`, `__init__`…).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego", "delego" o "colegio"; usa "escuela"). Si el validador marca una palabra, cambia la redacción de M06; no toques esa lista.
5. **Ningún enunciado (`prompt`) de M06 puede ser idéntico a uno de M01 a M05.** M04 ya pregunta "¿Qué es una clase en POO?", "¿Qué es una instancia?", "¿Qué es un método?", "¿Qué permite la herencia?" y "¿Qué hace el encapsulamiento?"; M05 ya pregunta por composición sobre herencia. Redacta distinto (por ejemplo, con los ejemplos `Carro` y `Animal` de la Parte B). El validador debe comprobarlo.
6. En este módulo los distractores deben ser **las otras relaciones entre clases** (herencia, implementación, asociación, agregación, composición, dependencia) o el concepto vecino (clase frente a objeto, atributo frente a método). Esa es la dificultad real del tema.
7. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v6.html`. Sirve para comprobar que M01 a M05 no cambian.
- `content.mjs` (M01) y `content_m02.mjs` a `content_m05.mjs` están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m06.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m06.mjs`, llama `expand('M06', 'Programación orientada a objetos', c6)` y emite su bloque después de `// === MODULE:M05 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01 a M06 en ese orden; marcadores de M06 presentes; bloques M01 a M05 idénticos a `published_v6.html`; M06 validado con `checkModule` y los mínimos de B2; ningún `prompt` de M06 repetido en otro módulo; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs`, `m04.cjs`, `m05.cjs`). Deben seguir pasando; si alguna cuenta módulos, actualiza solo ese número (de 5 a 6). Copia `m05.cjs` como `m06.cjs`, cambia `M05` por `M06`, `MODULES[4]` por `MODULES[5]` y el número de temas (de 22 a 14), y ejecútala al menos 10 veces (las rondas son aleatorias).
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "6 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M05 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // ... M02 a M05 sin cambios ...
  // === MODULE:M06 START ===
  { id: "M06", title: "Programación orientada a objetos", topics: [...], questions: [...] },
  // === MODULE:M06 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M06",
  title: "Programación orientada a objetos",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M06-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M06-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M06-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M06-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo. Las preguntas no llevan bloques de código de varias líneas: si citas código, que sea una sola línea corta entre acentos graves.

---

# PARTE B — Módulo M06: Programación orientada a objetos

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta. Las marcadas **[AÑADIDO]** no estaban en los apuntes y completan el tema.

## B1. Base de hechos por tema

### T01 — Qué es la POO
- La **Programación Orientada a Objetos (POO)** es un **paradigma de programación**: los programas se estructuran en torno a **objetos**.
- En lugar de ver el código como una serie de instrucciones, se organiza en **entidades** que tienen **características** (datos) y **comportamientos** (acciones).
- **[CORREGIDO]** Los objetos modelan cosas del mundo real (un carro, un animal), pero también **conceptos** que no son físicos (un curso, una sesión, un pedido). Los apuntes solo mencionan el mundo real.
- Las piezas básicas: **clases**, **objetos**, **atributos**, **métodos** y las **relaciones entre clases**.
- Las relaciones definen **cómo interactúan las clases entre sí**. Este módulo cubre seis: herencia, implementación, asociación, agregación, composición y dependencia.

### T02 — Clases y objetos
- **Clase**: la **plantilla o molde** que define los atributos y los métodos que tendrán sus objetos. Ejemplo: `Carro`.
- **Objeto**: una **instancia** de una clase; una entidad concreta creada a partir de la plantilla. Ejemplo: `mi_carro_rojo` es un objeto de la clase `Carro`, con sus propios valores.
- "Objeto" e "instancia" significan lo mismo.
- Otro ejemplo: la clase `Animal` define `nombre`, `edad`, `hacer_sonido()` y `dormir()`. Un objeto concreto es un gato con `nombre = "Tom"` y `edad = 5`.
- La clase se escribe **una vez**; de ella se crean **muchos objetos**, cada uno con sus propios valores.
- **[AÑADIDO]** En Python un objeto se crea llamando a la clase como si fuera una función: `mi_carro_rojo = Carro("rojo", "Nissan")`.

### T03 — Atributos y métodos
- **Atributos**: las **variables** que definen las características de un objeto. Ejemplos: `color`, `marca`.
- **Métodos**: las **funciones** que definen el comportamiento de un objeto. Ejemplos: `acelerar()`, `frenar()`.
- Los valores de los atributos de un objeto en un momento dado forman su **estado**.
- **[AÑADIDO]** En Python, el primer parámetro de un método es `self`: una **referencia al propio objeto**. Con `self.color` el método lee o cambia el atributo de ese objeto. Al llamar `mi_carro_rojo.acelerar()` no se pasa `self`: Python lo pasa solo.
- **[AÑADIDO]** **Atributo de instancia**: se crea con `self.algo = ...` y cada objeto tiene su propio valor. **Atributo de clase**: se escribe directamente en el cuerpo de la clase y lo **comparten todos los objetos** (por ejemplo `ruedas = 4` en `Carro`).

### T04 — Constructor y `__init__`
- **Constructor**: un método especial que **se ejecuta automáticamente al crear un objeto**. Su función es **inicializar los atributos** con sus valores iniciales.
- No se llama a mano: al escribir `Carro("rojo", "Nissan")`, Python ejecuta `__init__` y le pasa esos valores.
- En Python, el método especial `__init__` cumple el papel de constructor.
- **[CORREGIDO]** Precisión: `__init__` **no crea** el objeto; lo **inicializa**. Cuando `__init__` empieza, el objeto ya existe (lo creó `__new__`) y llega en `self`. Por eso es correcto decir que `__init__` "actúa como" constructor.
- `__init__` **solo es necesario** cuando quieres que los objetos tengan un **estado inicial**. Si la clase no necesita inicializar ningún atributo, **se puede omitir**.
- **[AÑADIDO]** `__init__` no devuelve ningún valor.

### T05 — Herencia
- Es una relación de **"es un"**: un `Perro` **es un** `Animal`.
- Permite crear una clase nueva (**subclase**) a partir de una existente (**superclase**); la subclase **hereda sus atributos y métodos**.
- **Superclase** o clase padre: la clase **de la que se hereda**. **Subclase** o clase hija: la clase **que hereda**.
- Promueve la **reutilización de código**: lo común se escribe una sola vez, en la superclase.
- Permite modelar una **jerarquía de clases**. Ejemplo: `Animal` tiene `nombre`, `edad`, `hacer_sonido()` y `dormir()`; `Perro` hereda todo eso y añade `hacer_truco()`.
- **[AÑADIDO]** En Python se escribe `class Perro(Animal):`.
- **[AÑADIDO]** Prueba rápida: si la frase "A es un B" no tiene sentido (un `Carro` no "es un" `Motor`), no corresponde herencia.

### T06 — Qué puede hacer una subclase
- **[CORREGIDO]** Los apuntes dicen que una subclase "solamente" puede extender. En realidad puede hacer **dos** cosas: **extender** (añadir métodos o atributos nuevos, como `hacer_truco()`) y **sobrescribir** (dar su propia versión de un método heredado, como `hacer_sonido()` en `Perro`).
- Lo que **no puede** hacer es **eliminar** un método expuesto en la interfaz de la superclase.
- **[AÑADIDO]** Razón: un objeto de la subclase debe poder usarse **en cualquier lugar donde se espere uno de la superclase**. Si a `Perro` le faltara `dormir()`, el código que funciona con cualquier `Animal` fallaría.
- **[AÑADIDO]** **Sobrescribir** conserva el nombre del método y cambia lo que hace.
- **[AÑADIDO]** Si la subclase define su propio `__init__`, debe llamar a `super().__init__(...)` para que también se inicialicen los atributos de la superclase. Si no lo hace, atributos como `nombre` y `edad` no se crean.
- **[AÑADIDO]** Si la subclase no define `__init__`, usa el de la superclase.

### T07 — Implementación (interfaces)
- Piensa en un **contrato**: no dice **cómo** hacer algo, solo dice **qué** se debe hacer. Ejemplo: "el objeto debe poder `iniciar_sesion()` y `cerrar_sesion()`".
- **[AÑADIDO]** Ese contrato se llama **interfaz**.
- Una clase que **implementa** el contrato se compromete a cumplirlo: se obliga a **tener esos métodos** y además a **proporcionar el código** para que funcionen.
- La interfaz no contiene el código de los métodos; el código lo pone cada clase que la implementa.
- **[AÑADIDO]** Diferencia con la herencia: en la herencia la subclase **recibe código ya hecho**; en la implementación la clase **recibe una obligación** y escribe el código ella misma.
- **[AÑADIDO]** Clases sin ningún parentesco pueden implementar la misma interfaz, y así se pueden usar de la misma manera.
- **[AÑADIDO]** En Python un contrato se escribe normalmente como **clase abstracta** (con `ABC` y `@abstractmethod`). Una clase que no implementa todos los métodos abstractos **no se puede instanciar**.

### T08 — Asociación
- Es una relación general de **"se relaciona con"** o **"conoce a"**: las clases se conocen entre sí, pero **pueden existir de forma independiente**.
- Ejemplo: un `Estudiante` está asociado con un `Curso`. Si el curso se cancela, el estudiante sigue existiendo, y al revés.
- **[CORREGIDO]** Los apuntes la describen como "usa", igual que la dependencia. La diferencia: en la asociación la relación es **duradera**; un objeto **guarda una referencia** al otro como atributo (por ejemplo `self.curso`). En la dependencia no se guarda nada.
- Ninguna de las dos clases es "dueña" de la otra ni "parte" de la otra.

### T09 — Agregación
- **[AÑADIDO]** Los apuntes no la mencionan, pero es la pareja de la composición.
- **[AÑADIDO]** Es una relación **"tiene un"** de **todo-parte** en la que **la parte puede existir sin el todo**.
- **[AÑADIDO]** Ejemplo: un `Equipo` tiene `Jugador`es. Si el equipo se disuelve, los jugadores siguen existiendo y pueden irse a otro equipo.
- **[AÑADIDO]** Es una asociación más específica: además de conocerse, una clase es el **todo** y la otra es la **parte**.
- **[AÑADIDO]** En el código, las partes normalmente se crean **fuera** del todo y se le **pasan** ya hechas (por ejemplo, `Equipo(lista_de_jugadores)`).

### T10 — Composición
- Es una relación de **"es parte de"** (todo-parte) en la que **la parte no puede existir sin el todo**. Hay una **dependencia de vida**: si el todo se destruye, sus partes también.
- **[AÑADIDO]** Ejemplo claro: una `Casa` y sus `Habitacion`es. Si la casa se demuele, sus habitaciones dejan de existir; una habitación no se muda a otra casa.
- Ejemplo de los apuntes: un `Automovil` tiene un `Motor`; si el automóvil se destruye, el motor deja de existir en ese contexto.
- **[CORREGIDO]** Ese ejemplo es composición **solo si el automóvil crea su propio motor y nadie más lo usa**. Si el motor se fabrica aparte, se le pasa al automóvil y puede sobrevivirlo o cambiarse a otro, sería **agregación**. Lo que decide es el **ciclo de vida**, no las clases.
- **[AÑADIDO]** En el código, el todo normalmente **crea sus partes por dentro** (por ejemplo `self.motor = Motor()` dentro del `__init__` de `Automovil`).
- Es la forma **más fuerte** de "tiene un".

### T11 — Dependencia
- Es la relación **más débil**: **"usa temporalmente"**.
- Ocurre cuando una clase utiliza a otra **solo en un momento específico**, por ejemplo **como parámetro de un método**.
- **No se mantiene una referencia** a largo plazo: no se guarda como atributo.
- Ejemplo: `Calculadora` tiene un método que recibe un objeto `Numero` como parámetro para hacer una operación. La `Calculadora` no "tiene" un `Numero`; solo lo "usa" para esa tarea.
- **[AÑADIDO]** Aun siendo débil, es una relación real: si `Numero` cambia, puede ser necesario cambiar `Calculadora`.

### T12 — Comparar las relaciones
- Frases clave: **herencia** = "es un"; **implementación** = "cumple un contrato"; **asociación** = "conoce a / se relaciona con"; **agregación** = "tiene un" (la parte sobrevive); **composición** = "es parte de" (la parte no sobrevive); **dependencia** = "usa temporalmente".
- **[AÑADIDO]** De más débil a más fuerte entre objetos: **dependencia → asociación → agregación → composición**.
- **[AÑADIDO]** Preguntas para distinguirlas: ¿se guarda una referencia como atributo? Si no, es **dependencia**. ¿Hay un todo y una parte? Si no, es **asociación**. ¿La parte puede existir sin el todo? Si sí, **agregación**; si no, **composición**.
- **[AÑADIDO]** Herencia e implementación son relaciones entre **clases** (se fijan al escribir el código); asociación, agregación, composición y dependencia describen cómo se relacionan los **objetos** al usarse.
- **[AÑADIDO]** Error típico: usar herencia donde va "tiene un". Un `Automovil` no hereda de `Motor`: **tiene** un motor.

### T13 — Las relaciones en un diagrama de clases (UML)
- **[AÑADIDO]** Todo este tema completa los apuntes: así se dibuja cada relación en un diagrama de clases.
- **Herencia**: línea **continua** con **triángulo hueco** que apunta a la **superclase**.
- **Implementación**: línea **punteada** con **triángulo hueco** que apunta a la **interfaz**.
- **Asociación**: línea **continua** simple entre las dos clases.
- **Agregación**: línea continua con un **rombo hueco** del lado del **todo**.
- **Composición**: línea continua con un **rombo relleno** del lado del **todo**.
- **Dependencia**: **flecha punteada** que apunta a la clase **que se usa**.
- Regla para recordar: triángulo = herencia o implementación; rombo = todo-parte; punteado = la relación más ligera de su pareja (implementación frente a herencia, dependencia frente a asociación).

### T14 — Polimorfismo en la práctica
- En la imagen de los apuntes: "los objetos pueden tomar varias formas". **[CORREGIDO]** Dicho con precisión: **objetos de clases distintas responden al mismo método cada uno a su manera**.
- Ejemplo: `Perro` y `Gato` heredan de `Animal` y cada uno sobrescribe `hacer_sonido()`. Al recorrer una lista de animales y llamar `hacer_sonido()`, cada uno responde con su propia versión.
- El código que los usa **no pregunta de qué tipo es cada objeto**: no necesita `if` por cada clase.
- **[AÑADIDO]** Se consigue de dos formas: con **herencia y sobrescritura**, o con **implementación** de una misma interfaz (dos clases sin parentesco que tienen `iniciar_sesion()`).
- **[AÑADIDO]** Ventaja: se puede añadir una clase nueva (por ejemplo `Vaca`) sin modificar el código que recorre la lista.

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 56 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 42 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 19 y 23 verdaderas) |
| `scenario` | 16 | Los 16 de B3 |
| `error` | 18 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`, si la tiene). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción. En T12 incluye preguntas de "¿qué relación es?" a partir de la frase clave y del ciclo de vida. En T13 pregunta en los dos sentidos (del símbolo a la relación y de la relación al símbolo). Cuando una pregunta use `Automovil` y `Motor`, el enunciado debe decir explícitamente si el automóvil crea su motor (composición) o lo recibe de fuera (agregación); para composición sin matices usa `Casa` y `Habitacion`.

## B3. Escenarios (respuesta correcta entre corchetes)

Donde la respuesta es una relación, las cuatro opciones son nombres de relaciones de B1.

1. (T02) Un sistema escolar debe manejar 300 alumnos, todos con nombre, matrícula y promedio. → [Una clase `Alumno` y 300 objetos de esa clase] (opciones en texto: 300 clases, una clase con 300 métodos, un solo objeto con 300 atributos)
2. (T03) En la clase `Carro` hay que representar el color y la acción de frenar. → [`color` es un atributo y `frenar()` es un método] (opciones: las otras combinaciones)
3. (T04) Todos los objetos `Carro` deben nacer con su color y su marca ya asignados. → [Definir `__init__` con esos parámetros y guardarlos en `self`] (opciones en texto)
4. (T04) Una clase solo agrupa métodos de conversión de unidades y sus objetos no guardan ningún dato. → [Se puede omitir `__init__`] (opciones en texto)
5. (T05) `Camion` y `Motocicleta` repiten `placa`, `marca` y `encender()`, y los dos son vehículos. → [Herencia]
6. (T06) `Perro` hereda `hacer_sonido()` de `Animal`, pero debe responder "Guau" en lugar del sonido genérico. → [Sobrescribir el método en `Perro`] (opciones en texto: eliminar el método de `Animal`, crear un método con otro nombre, convertir a `Perro` en superclase)
7. (T06) `Perro` define su propio `__init__` para añadir `raza`, y ahora sus objetos no tienen `nombre` ni `edad`. → [Falta llamar a `super().__init__(...)`] (opciones en texto)
8. (T07) `UsuarioWeb` y `UsuarioMovil` no tienen relación de parentesco, pero las dos deben garantizar `iniciar_sesion()` y `cerrar_sesion()`, cada una con su propio código. → [Implementación]
9. (T08) Un `Estudiante` guarda a qué `Curso` está inscrito; si el curso se cancela, el estudiante sigue existiendo, y ninguno es parte del otro. → [Asociación]
10. (T09) Un `Equipo` tiene jugadores; si el equipo se disuelve, los jugadores siguen existiendo y pueden entrar a otro equipo. → [Agregación]
11. (T10) Una `Casa` tiene habitaciones que se crean con ella y dejan de existir si la casa se demuele. → [Composición]
12. (T11) `Calculadora` recibe un `Numero` como parámetro de un método, lo usa para una operación y no lo guarda. → [Dependencia]
13. (T12) Un compañero propone que `Automovil` herede de `Motor` "para reutilizar su código". → [No: un automóvil no "es un" motor; "tiene un" motor, así que va una relación todo-parte] (opciones en texto)
14. (T13) En un diagrama hay una línea con un rombo relleno pegado a la clase `Casa`. → [Composición]
15. (T13) En un diagrama hay una línea punteada con triángulo hueco que apunta a `Sesion`. → [Implementación]
16. (T14) Un programa recorre una lista con perros y gatos y llama `hacer_sonido()` en cada uno sin revisar su tipo. → [Polimorfismo] (opciones: encapsulamiento, composición, dependencia)

Reparte la dificultad de los escenarios entre 2 y 3.

## B4. Caza el error (fragmento con error → corrección)

1. "En la POO el código se organiza únicamente como una serie de instrucciones, sin entidades." → Se organiza en objetos: entidades con características y comportamientos. (T01)
2. "Carro es un objeto y mi_carro_rojo es la clase de la que se crea." → Es al revés: `Carro` es la clase (la plantilla) y `mi_carro_rojo` es un objeto (una instancia). (T02)
3. "Los atributos son las funciones de un objeto y los métodos son sus variables." → Es al revés: los atributos son variables (características) y los métodos son funciones (comportamiento). (T03)
4. "En Python, self es el nombre de la clase a la que pertenece el método." → `self` es una referencia al propio objeto. (T03)
5. "El constructor se debe llamar manualmente después de crear cada objeto." → Se ejecuta automáticamente al crear el objeto. (T04)
6. "Toda clase de Python está obligada a definir __init__." → Solo hace falta si los objetos necesitan un estado inicial; si no, se puede omitir. (T04)
7. "En Python, __init__ es el método que crea el objeto en memoria." → `__init__` inicializa un objeto que ya fue creado; por eso "actúa como" constructor. (T04)
8. "La herencia es una relación de tipo 'tiene un'." → La herencia es "es un"; "tiene un" corresponde a agregación y composición. (T05)
9. "La superclase es la clase que hereda y la subclase es la clase de la que se hereda." → Es al revés: la subclase hereda de la superclase. (T05)
10. "Una subclase solamente puede añadir métodos; no puede cambiar los que hereda." → También puede sobrescribirlos; lo que no puede es eliminarlos. (T06)
11. "Una interfaz define cómo se debe hacer cada método." → Define qué se debe hacer; el cómo (el código) lo pone la clase que la implementa. (T07)
12. "Una clase que implementa un contrato puede dejar sin código los métodos que no le sirvan." → Está obligada a tener todos los métodos del contrato y a darles código. (T07)
13. "En la asociación, una clase usa a otra solo como parámetro y no guarda ninguna referencia." → Eso es dependencia; en la asociación la relación es duradera y se guarda una referencia. (T08)
14. "En la agregación, si el todo se destruye, sus partes dejan de existir." → Eso es composición; en la agregación la parte puede existir sin el todo. (T09)
15. "En la composición, la parte puede existir sin el todo." → No puede: hay dependencia de vida; la parte que sobrevive es agregación. (T10)
16. "La dependencia es la relación más fuerte entre clases." → Es la más débil: un uso temporal, sin guardar referencia. (T11)
17. "En UML, la herencia se dibuja con un rombo relleno del lado de la superclase." → La herencia es una línea continua con triángulo hueco; el rombo relleno es composición. (T13)
18. "Para usar polimorfismo hay que comprobar con if el tipo de cada objeto antes de llamar al método." → Justo se evita eso: se llama al mismo método y cada objeto responde a su manera. (T14)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 a M05 son idénticos a los de `published_v6.html`; `engine.html` no cambió.
- [ ] M06 cumple el esquema: IDs únicos con prefijo `M06-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 14 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 19 y 23 `tf` verdaderas.
- [ ] Los 16 escenarios de B3 y los 18 errores de B4 están presentes.
- [ ] Ningún `prompt` de M06 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra seis módulos; M06 abre su mapa con 14 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M06 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs`, `m03.cjs`, `m04.cjs`, `m05.cjs` y `m06.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
