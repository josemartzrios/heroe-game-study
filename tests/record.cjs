// Caracterización del registro de respuestas (finalize) en rondas de M08.
// Fija el comportamiento actual de: touch()/sesión, historial S.topics (últimos 10, 0.5 si es asistido),
// cola S.qs (a/c/q/g/gs y graduación por sesión), XP (racha, constancia, humildad) y save().
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem('estudio_isw_v1', JSON.stringify(opts.seed));
      w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: () => () => {}, set: () => true }); };   // iconos del héroe
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const norm = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
function allQs(w) { return w.eval('MODULES').flatMap((m) => m.questions); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act, extra) { return [...d.querySelectorAll(`[data-act="${act}"]`)].find((b) => !extra || extra(b)); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
function correctText(q) { return q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]; }
function optBtn(d, text) { return [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) === norm(text)); }

const KEY = 'estudio_isw_v1';
const TID = 'T04'; // único tema de M08 con quiz de 8 preguntas (4 mcq + 3 escenario + 2 error)
const HK = 'M08:' + TID;
const load = (w) => JSON.parse(w.localStorage.getItem(KEY));
const fresh = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'Zed' } }, o);
const dayStr = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');

// Abre el quiz del tema M08:T04 (preguntas mcq/escenario/error, sin bono de tiempo).
function openQuiz(w, d) {
  click(w, modBtn(d, 'M08'));
  click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === TID));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
}
// Responde la pregunta en pantalla (sin pulsar "Siguiente"). Devuelve la pregunta.
function answerOne(w, d, mode) {
  const q = findQ(w, d);
  if (!q) throw new Error('pregunta no encontrada: ' + d.querySelector('.prompt').textContent);
  const ct = norm(correctText(q));
  const target = mode === 'right' ? optBtn(d, correctText(q))
    : [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) !== ct);
  click(w, target);
  return q;
}
function nextQ(w, d) { click(w, d.querySelector('#nextbtn')); }
// Preguntas que puede traer el quiz de M08:T04.
function quizQs(w) { return allQs(w).filter((q) => q.id.startsWith('M08-') && q.topic === TID && q.type !== 'tf'); }
// Semilla de cola: todas las preguntas del quiz con el mismo registro.
function seedQs(ids, rec) { const o = {}; ids.forEach((id) => { o[id] = Object.assign({}, rec); }); return o; }

(async () => {
  const probe = boot().w;
  const ids = quizQs(probe).map((q) => q.id);
  ok('Pre: M08:T04 tiene al menos 8 preguntas de quiz', ids.length >= 8, 'n=' + ids.length);
  probe.close();
  let w, d, errors, q, s;

  // ===== UNITARIAS: efecto de UNA respuesta en el estado guardado =====

  // U1. Acierto en estado nuevo
  ({ w, d, errors } = boot({ seed: fresh() }));
  openQuiz(w, d);
  const t0 = Date.now();
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U1 acierto: retroalimentación visible', !!d.querySelector('.fb'));
  ok('U1 acierto: historial del tema = [1]', JSON.stringify(s.topics[HK]) === '[1]', JSON.stringify(s.topics[HK]));
  ok('U1 acierto: registro de pregunta a=1 c=1 q=false g=0 gs=-1', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 1, c: 1, q: false, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  ok('U1 acierto: XP = 10 × dificultad', s.xp === 10 * q.difficulty, 'xp=' + s.xp + ' dif=' + q.difficulty);
  ok('U1 acierto: solo se registra la pregunta respondida', Object.keys(s.qs).length === 1 && Object.keys(s.topics).length === 1);
  ok('U1 touch: lastActive=0 abre sesión nueva (1 -> 2)', s.session === 2, 'session=' + s.session);
  ok('U1 touch: lastActive actualizado a ahora', s.lastActive >= t0 && s.lastActive <= Date.now(), String(s.lastActive));
  ok('U1 touch: días = hoy con conteo 1', s.days.last === dayStr(new Date()) && s.days.count === 1, JSON.stringify(s.days));
  ok('U1 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // U2. Fallo en estado nuevo
  ({ w, d, errors } = boot({ seed: fresh({ xp: 40 }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'wrong');
  s = load(w);
  ok('U2 fallo: retroalimentación de error', !!d.querySelector('.fb.bad'));
  ok('U2 fallo: historial del tema = [0]', JSON.stringify(s.topics[HK]) === '[0]', JSON.stringify(s.topics[HK]));
  ok('U2 fallo: pregunta entra a la cola a=1 c=0 q=true g=0 gs=-1', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 1, c: 0, q: true, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  ok('U2 fallo: XP no cambia', s.xp === 40, 'xp=' + s.xp);
  w.close();

  // U3. Historial recortado a los últimos 10 (acierto)
  const hist10 = [0, 1, 0, 1, 0, 1, 0, 1, 0, 0.5];
  ({ w, d } = boot({ seed: fresh({ topics: { [HK]: hist10.slice() } }) }));
  openQuiz(w, d);
  answerOne(w, d, 'right');
  s = load(w);
  ok('U3 historial con 10: acierto descarta el más viejo y añade 1', JSON.stringify(s.topics[HK]) === JSON.stringify([1, 0, 1, 0, 1, 0, 1, 0, 0.5, 1]), JSON.stringify(s.topics[HK]));
  w.close();

  // U4. Historial recortado a los últimos 10 (fallo) partiendo de 12 entradas heredadas
  ({ w, d } = boot({ seed: fresh({ topics: { [HK]: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5] } }) }));
  openQuiz(w, d);
  answerOne(w, d, 'wrong');
  s = load(w);
  ok('U4 historial con 12: fallo deja exactamente 10 terminando en 0', JSON.stringify(s.topics[HK]) === JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0]), JSON.stringify(s.topics[HK]));
  w.close();

  // U5. Historial de otros temas no se toca
  ({ w, d } = boot({ seed: fresh({ topics: { 'M08:T02': [1, 0], 'M01:T01': [1] } }) }));
  openQuiz(w, d);
  answerOne(w, d, 'right');
  s = load(w);
  ok('U5 historial de otros temas intacto', JSON.stringify(s.topics['M08:T02']) === '[1,0]' && JSON.stringify(s.topics['M01:T01']) === '[1]');
  w.close();

  // Cola: sesión activa fija (lastActive reciente => touch no abre sesión nueva)
  const now = () => Date.now();

  // U6. Pregunta en cola, primer acierto en la sesión: g=1, gs=sesión, sigue en cola
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: now(), qs: seedQs(ids, { a: 2, c: 0, q: true, g: 0, gs: -1 }) }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U6 sesión activa no cambia (5)', s.session === 5, 'session=' + s.session);
  ok('U6 cola: 1er acierto => g=1 gs=5 y sigue en cola', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 3, c: 1, q: true, g: 1, gs: 5 }), JSON.stringify(s.qs[q.id]));
  w.close();

  // U7. Segundo acierto en la MISMA sesión no gradúa
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: now(), qs: seedQs(ids, { a: 3, c: 1, q: true, g: 1, gs: 5 }) }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U7 cola: acierto en la misma sesión no suma g ni gradúa', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 4, c: 2, q: true, g: 1, gs: 5 }), JSON.stringify(s.qs[q.id]));
  ok('U7 cola: stats.cleared no aumenta', s.stats.cleared === 0, 'cleared=' + s.stats.cleared);
  w.close();

  // U8. Acierto en una sesión distinta (g=1 de la sesión 4, ahora sesión 5) => gradúa
  const qsG = seedQs(ids, { a: 3, c: 1, q: true, g: 1, gs: 4 });
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: now(), qs: qsG }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U8 cola: acierto en 2ª sesión distinta gradúa (q=false g=0 gs=-1)', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 4, c: 2, q: false, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  ok('U8 cola: stats.cleared = 1', s.stats.cleared === 1, 'cleared=' + s.stats.cleared);
  ok('U8 cola: el resto sigue en cola', ids.filter((id) => id !== q.id).every((id) => s.qs[id].q === true));
  w.close();

  // U9. Fallo en cola con progreso reinicia g/gs
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: now(), qs: qsG }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'wrong');
  s = load(w);
  ok('U9 cola: fallo reinicia graduación (q=true g=0 gs=-1)', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 4, c: 1, q: true, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  w.close();

  // U10. Sesión expirada (>30 min) abre sesión nueva y esa cuenta para la graduación
  const qsS = seedQs(ids, { a: 1, c: 0, q: true, g: 1, gs: 5 });
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: now() - 31 * 60 * 1000, qs: qsS }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U10 sesión expirada => sesión 6 y la pregunta gradúa', s.session === 6 && JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 2, c: 1, q: false, g: 0, gs: -1 }), 'session=' + s.session + ' ' + JSON.stringify(s.qs[q.id]));
  w.close();

  // U11. Respuesta asistida (Visión láser, nivel 2): 0.5 en historial, mitad de XP, entra a la cola
  ({ w, d } = boot({ seed: fresh({ xp: 100 }) }));
  openQuiz(w, d);
  const laser = d.querySelector('[data-pw="laser"]');
  ok('U11 pre: Visión láser disponible en nivel 2', !!laser && !laser.disabled);
  click(w, laser);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U11 asistida: historial = [0.5]', JSON.stringify(s.topics[HK]) === '[0.5]', JSON.stringify(s.topics[HK]));
  ok('U11 asistida: XP = floor(10×dif / 2)', s.xp === 100 + Math.floor(10 * q.difficulty / 2), 'xp=' + s.xp + ' dif=' + q.difficulty);
  ok('U11 asistida: acierto asistido mete a la cola (a=1 c=1 q=true)', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 1, c: 1, q: true, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  w.close();

  // U12. Constancia (racha de 3+ días) suma 10 % pasivo
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  ({ w, d } = boot({ seed: fresh({ days: { last: dayStr(yest), count: 3 }, virtues: { constancia: 1 } }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  const b12 = 10 * q.difficulty;
  ok('U12 constancia: XP = base + floor(base×10 %) y días 4', s.xp === b12 + Math.floor(b12 / 10) && s.days.count === 4, 'xp=' + s.xp + ' dif=' + q.difficulty + ' days=' + JSON.stringify(s.days));
  w.close();

  // ===== INTEGRACIÓN: rondas completas =====

  // I1. Racha: R R R F R R R R => +5 desde el 3er acierto seguido; el fallo reinicia la racha
  ({ w, d, errors } = boot({ seed: fresh() }));
  openQuiz(w, d);
  const pattern = ['right', 'right', 'right', 'wrong', 'right', 'right', 'right', 'right'];
  const gains = [], expected = [], seen = [];
  let prev = 0, consec = 0;
  pattern.forEach((m) => {
    const qq = answerOne(w, d, m);
    seen.push(qq);
    const cur = load(w).xp;
    gains.push(cur - prev); prev = cur;
    if (m === 'right') { consec++; expected.push(10 * qq.difficulty + (consec >= 3 ? 5 : 0)); } else { consec = 0; expected.push(0); }
    nextQ(w, d);
  });
  ok('I1 ronda de 8 preguntas termina en resultados', !d.querySelector('.prompt') && d.querySelector('.big').textContent === '7/8', d.querySelector('.big') && d.querySelector('.big').textContent);
  ok('I1 XP por respuesta sigue la racha (+5 desde 3 seguidos)', JSON.stringify(gains) === JSON.stringify(expected), 'obtenido=' + JSON.stringify(gains) + ' esperado=' + JSON.stringify(expected));
  ok('I1 3er acierto seguido lleva +5', gains[2] === 10 * seen[2].difficulty + 5, String(gains[2]));
  ok('I1 acierto tras fallo NO lleva +5 (racha reiniciada)', gains[4] === 10 * seen[4].difficulty && gains[5] === 10 * seen[5].difficulty, gains[4] + ',' + gains[5]);
  ok('I1 la racha vuelve a dar +5 al 3er acierto tras el fallo', gains[6] === 10 * seen[6].difficulty + 5 && gains[7] === 10 * seen[7].difficulty + 5, gains[6] + ',' + gains[7]);
  s = load(w);
  const sumXp = expected.reduce((a, b) => a + b, 0);
  ok('I1 XP total guardado = suma de ganancias', s.xp === sumXp, 'xp=' + s.xp + ' esperado=' + sumXp);
  ok('I1 resultados muestran el XP de la ronda', d.querySelector('.score').textContent.includes('+' + sumXp), d.querySelector('.score').textContent);
  ok('I1 historial del tema = patrón de la ronda', JSON.stringify(s.topics[HK]) === JSON.stringify([1, 1, 1, 0, 1, 1, 1, 1]), JSON.stringify(s.topics[HK]));
  ok('I1 8 preguntas distintas registradas con a=1', seen.every((x) => s.qs[x.id] && s.qs[x.id].a === 1) && new Set(seen.map((x) => x.id)).size === 8);
  ok('I1 solo la fallada queda en cola', Object.keys(s.qs).filter((id) => s.qs[id].q).join() === seen[3].id, JSON.stringify(s.qs));
  ok('I1 sin errores de consola', errors.length === 0, errors.join(' | '));

  // I2. Segunda ronda en el mismo tema: historial recortado a los últimos 10 de 16 respuestas
  click(w, btn(d, 'back'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
  const p2 = ['wrong', 'right', 'wrong', 'right', 'wrong', 'right', 'wrong', 'right'];
  const failed2 = [];
  p2.forEach((m) => { const qq = answerOne(w, d, m); if (m === 'wrong') failed2.push(qq.id); nextQ(w, d); });
  s = load(w);
  ok('I2 historial tras 16 respuestas = últimas 10', JSON.stringify(s.topics[HK]) === JSON.stringify([1, 1, 0, 1, 0, 1, 0, 1, 0, 1]), JSON.stringify(s.topics[HK]));
  const queued = Object.keys(s.qs).filter((id) => s.qs[id].q);
  ok('I2 fallos de la 2ª ronda en cola con g=0 gs=-1', failed2.length === 4 && failed2.every((id) => s.qs[id].q && s.qs[id].g === 0 && s.qs[id].gs === -1), JSON.stringify(failed2.map((id) => s.qs[id])));
  // la fallada de la ronda 1 sigue en cola aunque se acierte en la ronda 2 (misma sesión: solo g=1)
  const expQ = [...new Set(failed2.concat(seen[3].id))].sort();
  ok('I2 cola = fallos de ronda 2 ∪ fallo de ronda 1', JSON.stringify(queued.slice().sort()) === JSON.stringify(expQ), 'cola=' + JSON.stringify(queued) + ' esperado=' + JSON.stringify(expQ));
  ok('I2 conteo total de intentos = 16', Object.values(s.qs).reduce((a, r) => a + r.a, 0) === 16);

  // I3. Repaso desde inicio: aciertos en la misma sesión no vacían la cola; tras recargar en otra sesión, sí
  click(w, btn(d, 'home'));
  ok('I3 home muestra Repaso pendiente', !!btn(d, 'review'));
  click(w, btn(d, 'review'));
  let nrev = 0;
  while (d.querySelector('.prompt')) { answerOne(w, d, 'right'); nextQ(w, d); if (++nrev > 20) break; }
  s = load(w);
  const sess1 = s.session;
  ok('I3 repaso respondió toda la cola', nrev === queued.length, 'n=' + nrev + ' cola=' + queued.length);
  ok('I3 1ª sesión: siguen en cola con g=1 y gs=sesión actual', queued.every((id) => s.qs[id].q && s.qs[id].g === 1 && s.qs[id].gs === sess1), JSON.stringify(queued.map((id) => s.qs[id])));
  ok('I3 1ª sesión: cleared = 0', s.stats.cleared === 0);
  s.lastActive = Date.now() - 31 * 60 * 1000;
  w.close();
  ({ w, d, errors } = boot({ seed: s }));
  click(w, btn(d, 'review'));
  nrev = 0;
  while (d.querySelector('.prompt')) { answerOne(w, d, 'right'); nextQ(w, d); if (++nrev > 20) break; }
  s = load(w);
  ok('I3 2ª sesión: sesión incrementada', s.session === sess1 + 1, 'session=' + s.session);
  ok('I3 2ª sesión: cola vacía', !Object.values(s.qs).some((r) => r.q), JSON.stringify(Object.values(s.qs).filter((r) => r.q)));
  ok('I3 2ª sesión: cleared = tamaño de la cola', s.stats.cleared === queued.length, 'cleared=' + s.stats.cleared);
  ok('I3 home ya no ofrece Repaso', (() => { click(w, btn(d, 'home')); return !btn(d, 'review'); })());
  ok('I3 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // I4. Humildad: +5 XP por acierto en Repaso (no asistido)
  const qsH = seedQs(ids, { a: 1, c: 0, q: true, g: 0, gs: -1 });
  ({ w, d } = boot({ seed: fresh({ virtues: { humildad: 1 }, qs: qsH }) }));
  click(w, btn(d, 'review'));
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('I4 humildad: acierto en Repaso = 10×dif + 5', s.xp === 10 * q.difficulty + 5, 'xp=' + s.xp + ' dif=' + q.difficulty);
  w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nRECORD OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
