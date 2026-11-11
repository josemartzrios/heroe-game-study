# Diseño: "Viaja como paquete" — piloto 3D de M08 Redes

Fecha: 2026-11-11 · Estado: borrador para revisión

## 1. Propósito y alcance

**Objetivo:** que el espacio 3D *enseñe* el concepto (no que decore). El jugador es un paquete que viaja de su teléfono a un servidor web y vive la encapsulación, el router, la red y los puertos.

**Alcance del piloto:** solo M08 "Redes informáticas". Los demás módulos, el mundo 2D, la región 2D de Redes, el modo héroe y el jefe no cambian de comportamiento.

**Restricciones:**
- Mobile first, en navegador; también funciona en escritorio.
- Sigue siendo un **solo HTML** autocontenido (`juego_estudio.html`), apto para WhatsApp y Netlify.
- La clave de `localStorage` `estudio_isw_v1` y los IDs existentes no cambian; el progreso guardado sigue siendo válido.
- **Sin contenido nuevo de redes:** todo texto educativo del viaje sale de los `keyPoints`/preguntas existentes de M08 (regla de la Parte B del contrato M08).
- **Los exámenes se respetan:** el viaje no sustituye rondas, repaso ni jefe; no desbloquea el jefe por sí solo; no se usan poderes.

**Criterios de éxito:**
- Completar el viaje en un teléfono de gama media a ≥ 30 fps sin tirones, pestaña ≤ ~300 MB.
- Abrir el juego sin entrar al viaje no aumenta la RAM respecto a hoy.
- Las respuestas del viaje afectan estrellas, dominio, repaso y XP exactamente como en una ronda.
- Todas las pruebas existentes siguen pasando.

## 2. El viaje y sus estaciones

Recorrido sobre rieles: la cámara avanza sola por una curva; el jugador puede girar la cámara arrastrando el dedo (o el mouse). En cada estación el avance se detiene para una decisión.

| # | Estación | Qué se ve | Temas |
|---|---|---|---|
| 0 | Prólogo: la red | Vista aérea de dispositivos autónomos conectados | T01 |
| 1 | Aplicación (tu teléfono) | Nace el mensaje del navegador | T05, T11 |
| 2 | Transporte | Elegir TCP o UDP; se agrega el número de puerto | T09, T10, T12 |
| 3 | Red | Se estampan IP origen y destino | T07 |
| 4 | Enlace y física | Envoltura en trama; el paquete se vuelve señal | T08, T02 |
| 5 | El medio | Wifi y luego cable; latencia y ancho de banda | T02, T14 |
| 6 | Router de casa | Salida de la LAN a la WAN | T04 |
| 7 | Internet | Red de redes; envío unicast; latencia | T03, T04, T14 |
| 8 | Servidor | Desencapsulación en orden inverso; entrada al puerto | T05, T12, T11 |
| 9 | Epílogo | Comparación OSI frente a TCP/IP; reto "reconoce la capa" | T06, T13, T15 |

Los 15 temas de M08 quedan cubiertos al menos una vez.

**Encapsulación visible:** el paquete es un objeto que gana anillos/cajas de color con etiqueta (datos → puerto → IP → trama) al bajar, y los pierde en orden inverso en el servidor.

**Duración:** ~8–12 min; 1–2 decisiones por estación (entre 10 y 20 preguntas por viaje).

## 3. Mecánica de decisiones

Ciclo por estación:
1. **Ver:** animación de la estación + texto breve en pantalla tomado de un `keyPoint` del tema (referenciado por índice, no copiado a mano).
2. **Decidir:** se pausa el avance y se muestra una pregunta del banco de M08 del tema de la estación (mcq, tf, scenario o error), sin repetir pregunta dentro del mismo viaje. Las preguntas `tf` en el viaje **no** tienen temporizador.
3. **Consecuencia:**
   - Acierto: el paquete avanza y, si aplica, gana su capa.
   - Error: animación de "paquete perdido", se muestra la explicación y se presenta otra pregunta del mismo tema ("retransmisión").
   - Dos errores seguidos en la misma decisión: el viaje continúa de todos modos; el tema ya queda en repaso por el registro normal.
   - Si un tema se quedó sin preguntas no usadas, se permite reutilizar una ya vista en el viaje.

**Resumen final:** camino recorrido con el paquete completo, aciertos por estación, XP ganada y botón "Repasar lo que fallé" que abre el repaso normal (`kind: 'review'`).

**Salir a medias:** botón "Salir" siempre visible. Lo respondido ya se guardó; el siguiente viaje empieza desde el principio (sin estado de viaje persistido).

## 4. Conexión con el progreso

Se extrae de `answer()` (`engine.html`, bloque de registro de historial/cola/XP) una función:

```
recordAnswer(q, ok, opts) -> { gain }
```

que actualiza `S.topics` (historial del tema, últimos 10), `S.qs` (cola de repaso) y `S.xp` con la misma fórmula base que una ronda **sin poderes ni bono de tiempo**, y llama a `checkVirtues()` y `save()`. `answer()` la usa sin cambiar su comportamiento observable. El viaje la usa para cada respuesta.

El viaje **no** escribe en `S.boss` ni modifica `bossUnlocked()`; el jefe solo se desbloquea por estrellas, como hoy (las estrellas sí pueden subir por respuestas del viaje, igual que con cualquier ronda).

## 5. Arquitectura e integración

Archivos nuevos:
- `vendor/three.module.min.js` — Three.js con versión fija (p. ej. `0.169.0`), copiado al repo una vez; licencia MIT (se conserva el encabezado).
- `trip/stations.mjs` — solo datos: id de estación, temas, índices de `keyPoints`, elementos visuales. Sin lógica.
- `trip/flow.js` — máquina de estados del viaje sin dependencia de Three.js: `intro → station(i).show → ask → (ok → advance | fail → retransmit) → … → summary`. Recibe el banco de preguntas y `recordAnswer` por inyección; emite eventos a la escena. Selección aleatoria con semilla inyectable para pruebas.
- `trip/scene.js` — Three.js: geometría low-poly generada por código, riel (`CatmullRomCurve3`), cámara con giro táctil limitado, anillos de encapsulación, creación/destrucción de estaciones (solo actual + siguiente en memoria), `dispose()` completo.

Cambios en archivos existentes:
- `engine.html`: `recordAnswer()` extraído; vista nueva `trip` en `render()`; botón "Viaja como paquete" en la pantalla de M08; capa HTML de preguntas sobre el canvas que reutiliza los estilos de tarjeta de pregunta existentes.
- `build.mjs`: incrusta `trip/*.js` en el script del motor y Three.js como `<script type="text/plain" id="three-src">` (texto inerte).
- `validate.mjs`: validaciones del viaje (sección 7).

**Carga diferida:** al entrar a la vista `trip`, se crea un Blob URL desde `#three-src`, se hace `import()` y se construye la escena. Al salir: `dispose()` de geometrías, materiales y renderer, `forceContextLoss()`, cancelar el bucle de animación y revocar el Blob URL.

**Sin WebGL o si la carga falla:** aviso en pantalla con botón para una ronda normal de M08 y otro para volver; el resto del juego sigue funcionando.

## 6. Presupuesto de rendimiento

- ≥ 30 fps en gama media; ≤ ~30k triángulos en escena.
- Sin sombras en tiempo real ni texturas; colores planos, 1 luz direccional + 1 ambiental.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- El bucle de render se pausa con una pregunta en pantalla y con `document.hidden`.
- Medidor de fps opcional con `?fps=1`.
- Tamaño del HTML: ~0.9 MB hoy → ~1.6 MB estimado.

## 7. Pruebas

- `tests/trip.cjs` (jsdom, sin WebGL): recorre las estaciones con `flow.js`; acierto avanza; error retransmite con otra pregunta del mismo tema; dos errores continúan; salir a medias conserva lo respondido; no se repiten preguntas mientras haya disponibles. Se ejecuta al menos 10 veces (aleatoriedad).
- Prueba de `recordAnswer`: una ronda normal produce el mismo `S.topics`, `S.qs` y `S.xp` que antes del refactor (comparación con una ronda grabada con semilla).
- Prueba de carga diferida: con WebGL ausente en jsdom, la vista `trip` muestra el aviso de respaldo sin lanzar errores.
- `validate.mjs`: cada estación referencia temas existentes de M08; los 15 temas cubiertos; los índices de `keyPoints` existen.
- Las pruebas existentes (`smoke`, `hero`, `world`, `battle`, `m03`–`m10`) siguen pasando.
- Verificación manual en teléfono: fluidez, giro de cámara, fps con `?fps=1`, memoria antes/después de salir.

## 8. Fuera de alcance

- Escenas 3D para otros módulos.
- Reemplazar la región 2D de Redes.
- Persistir el progreso dentro de un viaje.
- Audio, modelos o texturas externas.
- Despliegue a Netlify (tarea separada).
