// Caracterización complementaria de finalize() antes de extraer recordAnswer() (spec v3 §4).
// Cubre lo que record.cjs no fija: R.xp (resultados) = S.xp guardado en rondas con ayudas, escudo,
// integridad, Relámpago, jefe y batalla; orden touch() -> gain (constancia ganada en la misma respuesta);
// orden recordAnswer -> checkVirtues -> save (virtud ganada por la cola se guarda en la misma respuesta);
// y el registro de respuestas dentro de una batalla (R.battle) y del jefe final.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'juego_estudio.html'), 'utf8');
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
      w.scrollTo = () => {};
      // Reloj congelado: en Relámpago el tiempo restante es siempre el total (bono de rapidez = 5).
      if (opts.frozenClock) w.performance.now = () => 1000;
      // El mundo (batallas) dibuja en canvas y anima con requestAnimationFrame.
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.requestAnimationFrame = () => 1;
      w.cancelAnimationFrame = () => {};
      // Ciudad 3D con mundo falso (las batallas empiezan desde la ciudad).
      w.__CITY_TEST__ = true;
      w.__CITY_WORLD__ = { create(canvas, D, sceneId, o) { return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, encounter() { return Promise.resolve(); }, dispose() {} }); } };
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
const TID = 'T04';
const HK = 'M08:' + TID;
const load = (w) => JSON.parse(w.localStorage.getItem(KEY));
const fresh = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'Zed' } }, o);
const dayStr = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const daysAgo = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return dayStr(x); };

function openQuiz(w, d) {
  click(w, modBtn(d, 'M08'));
  click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === TID));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
}
// Responde la pregunta en pantalla. Devuelve la pregunta (identificada ANTES del clic).
function answerOne(w, d, mode) {
  const q = findQ(w, d);
  if (!q) throw new Error('pregunta no encontrada: ' + d.querySelector('.prompt').textContent);
  const ct = norm(correctText(q));
  const target = mode === 'right' ? optBtn(d, correctText(q))
    : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && norm(b.querySelector('span:last-child').textContent) !== ct);
  click(w, target);
  return q;
}
function nextQ(w, d) { click(w, d.querySelector('#nextbtn')); }
const shownXp = (d) => Number(d.querySelector('#xpc').dataset.xp);
function quizQs(w) { return allQs(w).filter((q) => q.id.startsWith('M08-') && q.topic === TID && q.type !== 'tf'); }
function seedQs(ids, rec) { const o = {}; ids.forEach((id) => { o[id] = Object.assign({}, rec); }); return o; }
const modOf = (w, q) => w.eval('MODULES').find((m) => m.questions.some((x) => x.id === q.id)).id;
const histLen = (s, keys) => keys.reduce((n, k) => n + (s.topics[k] || []).length, 0);

(async () => {
  const probe = boot().w;
  const ids = quizQs(probe).map((q) => q.id);
  probe.close();
  let w, d, errors, q, s;

  // ===== UNITARIAS: una respuesta =====

  // U1. touch() antes de gain: la racha pasa de 2 (ayer) a 3 (hoy) en esta respuesta; touch gana constancia
  // y passivePct() ya aplica el 10 % a esta misma respuesta.
  ({ w, d, errors } = boot({ seed: fresh({ days: { last: daysAgo(1), count: 2 } }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  const b1 = 10 * q.difficulty;
  ok('U1 racha 2->3: constancia ganada y guardada en la misma respuesta', !!s.virtues.constancia && s.days.count === 3, JSON.stringify(s.virtues) + ' ' + JSON.stringify(s.days));
  ok('U1 racha 2->3: el 10 % pasivo ya aplica a esta respuesta (touch antes de gain)', s.xp === b1 + Math.floor(b1 / 10), 'xp=' + s.xp + ' dif=' + q.difficulty);
  ok('U1 retroalimentación muestra la misma ganancia que la guardada', d.querySelector('.fb .xpb').textContent === '+' + s.xp + ' XP', d.querySelector('.fb .xpb') && d.querySelector('.fb .xpb').textContent);
  ok('U1 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // U2. Racha rota (último día hace 2 días): touch reinicia a 1 y no hay 10 % aunque se tenga constancia
  ({ w, d } = boot({ seed: fresh({ days: { last: daysAgo(2), count: 9 }, virtues: { constancia: 1 } }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U2 racha rota: días = 1 y XP = base sin pasivo', s.days.count === 1 && s.xp === 10 * q.difficulty, 'xp=' + s.xp + ' days=' + JSON.stringify(s.days));
  w.close();

  // U3. Límite: ya jugó hoy con racha 2 => no sube y no hay 10 %
  ({ w, d } = boot({ seed: fresh({ days: { last: daysAgo(0), count: 2 }, virtues: { constancia: 1 } }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U3 hoy con racha 2: días sigue en 2 y XP = base', s.days.count === 2 && s.xp === 10 * q.difficulty, 'xp=' + s.xp + ' days=' + JSON.stringify(s.days));
  w.close();

  // U4. Límite: ya jugó hoy con racha 3 => 10 % sin cambiar días
  ({ w, d } = boot({ seed: fresh({ days: { last: daysAgo(0), count: 3 }, virtues: { constancia: 1 } }) }));
  openQuiz(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  const b4 = 10 * q.difficulty;
  ok('U4 hoy con racha 3: XP = base + 10 % y días sigue en 3', s.days.count === 3 && s.xp === b4 + Math.floor(b4 / 10), 'xp=' + s.xp + ' days=' + JSON.stringify(s.days));
  w.close();

  // U5. recordAnswer -> checkVirtues -> save: la 10ª graduación da humildad y queda guardada en ESA respuesta;
  // la humildad no da +5 a la respuesta que la gana (gain se calcula antes), sí a la siguiente.
  ({ w, d } = boot({ seed: fresh({ session: 5, lastActive: Date.now(), stats: { cleared: 9 }, qs: seedQs(ids, { a: 3, c: 1, q: true, g: 1, gs: 4 }) }) }));
  click(w, btn(d, 'review'));
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U5 10ª graduación: cleared = 10 guardado', s.stats.cleared === 10, 'cleared=' + s.stats.cleared);
  ok('U5 humildad ganada y guardada en la misma respuesta', !!s.virtues.humildad, JSON.stringify(s.virtues));
  ok('U5 la respuesta que gana humildad no lleva +5', s.xp === 10 * q.difficulty, 'xp=' + s.xp + ' dif=' + q.difficulty);
  const xpA = s.xp;
  nextQ(w, d);
  q = answerOne(w, d, 'right');
  s = load(w);
  ok('U5 la siguiente respuesta de repaso sí lleva +5', s.xp - xpA === 10 * q.difficulty + 5, 'gain=' + (s.xp - xpA) + ' dif=' + q.difficulty);
  w.close();

  // U6. Escudo (nivel 6): fallo protegido registra 0 en historial y entra a la cola sin XP
  ({ w, d } = boot({ seed: fresh({ xp: 1000 }) }));
  openQuiz(w, d);
  click(w, d.querySelector('[data-pw="shield"]'));
  q = answerOne(w, d, 'wrong');
  s = load(w);
  ok('U6 escudo: retroalimentación del escudo', /racha de aciertos se conserva/.test(d.querySelector('.fb').textContent));
  ok('U6 escudo: historial [0], cola q=true y XP sin cambio', JSON.stringify(s.topics[HK]) === '[0]' && JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 1, c: 0, q: true, g: 0, gs: -1 }) && s.xp === 1000,
    JSON.stringify(s.topics[HK]) + ' ' + JSON.stringify(s.qs[q.id]) + ' xp=' + s.xp);
  w.close();

  // ===== INTEGRACIÓN: rondas completas, R.xp (resultados) = S.xp guardado =====

  // I1. Ronda sin poderes con integridad: el bono final suma igual en R.xp y S.xp
  ({ w, d, errors } = boot({ seed: fresh({ virtues: { integridad: 1 } }) }));
  openQuiz(w, d);
  let xp0 = load(w) ? load(w).xp : 0, prev = xp0, sumG = 0, baseSum = 0, consec = 0, nAns = 0;
  const pat1 = ['right', 'wrong', 'right', 'right', 'right', 'right', 'wrong', 'right'];
  pat1.forEach((m) => {
    const qq = answerOne(w, d, m);
    const cur = load(w).xp; sumG += cur - prev; prev = cur; nAns++;
    if (m === 'right') { consec++; baseSum += 10 * qq.difficulty + (consec >= 3 ? 5 : 0); } else consec = 0;
    nextQ(w, d);
  });
  s = load(w);
  const integ = Math.floor(baseSum * 10 / 100);
  ok('I1 integridad: suma de ganancias por respuesta = base', sumG === baseSum, 'suma=' + sumG + ' base=' + baseSum);
  ok('I1 integridad: S.xp final = base + bono 10 %', s.xp - xp0 === baseSum + integ, 'delta=' + (s.xp - xp0) + ' esperado=' + (baseSum + integ));
  ok('I1 integridad: XP mostrado en resultados = XP guardado', shownXp(d) === s.xp - xp0, 'mostrado=' + shownXp(d) + ' guardado=' + (s.xp - xp0));
  ok('I1 roundsNoPower = 1', s.stats.roundsNoPower === 1, String(s.stats.roundsNoPower));
  ok('I1 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // I2. Ronda con Visión láser (asistida): resultados = guardado, sin bono de integridad
  ({ w, d } = boot({ seed: fresh({ xp: 100, virtues: { integridad: 1 } }) }));
  openQuiz(w, d);
  xp0 = 100; prev = 100; sumG = 0;
  for (let i = 0; i < 8; i++) {
    if (i === 0) click(w, d.querySelector('[data-pw="laser"]'));
    answerOne(w, d, i === 5 ? 'wrong' : 'right');
    const cur = load(w).xp; sumG += cur - prev; prev = cur;
    nextQ(w, d);
  }
  s = load(w);
  ok('I2 láser: termina en resultados 7/8', d.querySelector('.big') && d.querySelector('.big').textContent === '7/8');
  ok('I2 láser: XP mostrado = XP guardado = suma por respuesta (sin integridad)', shownXp(d) === s.xp - xp0 && sumG === s.xp - xp0, 'mostrado=' + shownXp(d) + ' guardado=' + (s.xp - xp0) + ' suma=' + sumG);
  ok('I2 láser: un 0.5 en el historial', s.topics[HK].filter((x) => x === 0.5).length === 1, JSON.stringify(s.topics[HK]));
  w.close();

  // I3. Escudo conserva la racha: R R Fescudo R => la 4ª lleva +5; resultados = guardado
  ({ w, d } = boot({ seed: fresh({ xp: 1000 }) }));
  openQuiz(w, d);
  xp0 = 1000; prev = 1000;
  const g3 = [], q3 = [];
  ['right', 'right', 'shield', 'right', 'wrong', 'right', 'right', 'right'].forEach((m) => {
    if (m === 'shield') click(w, d.querySelector('[data-pw="shield"]'));
    q3.push(answerOne(w, d, m === 'right' ? 'right' : 'wrong'));
    const cur = load(w).xp; g3.push(cur - prev); prev = cur;
    nextQ(w, d);
  });
  s = load(w);
  ok('I3 escudo: acierto tras fallo protegido lleva +5 (racha 3)', g3[3] === 10 * q3[3].difficulty + 5, 'gain=' + g3[3] + ' dif=' + q3[3].difficulty);
  ok('I3 escudo: fallo sin escudo reinicia la racha (sin +5 después)', g3[5] === 10 * q3[5].difficulty && g3[6] === 10 * q3[6].difficulty, g3[5] + ',' + g3[6]);
  ok('I3 escudo: XP mostrado = XP guardado', shownXp(d) === s.xp - xp0, 'mostrado=' + shownXp(d) + ' guardado=' + (s.xp - xp0));
  ok('I3 escudo: historial con dos 0 en posiciones 3 y 5', JSON.stringify(s.topics[HK]) === JSON.stringify([1, 1, 0, 1, 0, 1, 1, 1]), JSON.stringify(s.topics[HK]));
  w.close();

  // I4. Relámpago (tf) con reloj congelado: bono de rapidez 5 en cada acierto, resultados = guardado
  ({ w, d, errors } = boot({ seed: fresh(), frozenClock: true }));
  click(w, modBtn(d, 'M08'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'tf'));
  prev = 0; consec = 0;
  const g4 = [], e4 = [], keys4 = new Set();
  let n4 = 0;
  while (d.querySelector('.prompt') && n4 < 20) {
    const m = n4 === 2 ? 'wrong' : 'right';
    const qq = answerOne(w, d, m);
    keys4.add('M08:' + qq.topic);
    const cur = load(w).xp; g4.push(cur - prev); prev = cur;
    if (m === 'right') { consec++; e4.push(10 * qq.difficulty + (consec >= 3 ? 5 : 0) + 5); } else { consec = 0; e4.push(0); }
    nextQ(w, d); n4++;
  }
  s = load(w);
  ok('I4 Relámpago: 10 preguntas', n4 === 10, 'n=' + n4);
  ok('I4 Relámpago: ganancia por respuesta = base + racha + 5 de rapidez', JSON.stringify(g4) === JSON.stringify(e4), 'obtenido=' + JSON.stringify(g4) + ' esperado=' + JSON.stringify(e4));
  ok('I4 Relámpago: XP mostrado = XP guardado', shownXp(d) === s.xp, 'mostrado=' + shownXp(d) + ' guardado=' + s.xp);
  ok('I4 Relámpago: 10 entradas de historial en M08', histLen(s, [...keys4]) === 10, String(histLen(s, [...keys4])));
  ok('I4 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // I5. Jefe final de M01: cada respuesta se registra aunque no haya retroalimentación (finalize -> next)
  const topicsBoss = {};
  for (let i = 1; i <= 19; i++) topicsBoss['M01:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  ({ w, d, errors } = boot({ seed: fresh({ topics: topicsBoss }) }));
  click(w, modBtn(d, 'M01'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'boss'));
  q = answerOne(w, d, 'wrong');
  s = load(w);
  const bk = 'M01:' + q.topic;
  ok('I5 jefe: fallo guardado al instante (historial termina en 0, 10 entradas)', s.topics[bk].length === 10 && s.topics[bk][9] === 0, JSON.stringify(s.topics[bk]));
  ok('I5 jefe: pregunta fallada en cola', JSON.stringify(s.qs[q.id]) === JSON.stringify({ a: 1, c: 0, q: true, g: 0, gs: -1 }), JSON.stringify(s.qs[q.id]));
  ok('I5 jefe: pasa directo a la siguiente pregunta', !!d.querySelector('.prompt') && !d.querySelector('.fb') && /2 \/ 20/.test(d.querySelector('.playtop').textContent));
  let nB = 1;
  while (d.querySelector('.prompt') && nB < 30) { answerOne(w, d, 'right'); nB++; }
  s = load(w);
  ok('I5 jefe: 20 respuestas registradas en S.qs', Object.values(s.qs).reduce((a, r) => a + r.a, 0) === 20, String(Object.values(s.qs).reduce((a, r) => a + r.a, 0)));
  ok('I5 jefe: 19/20 aprueba y XP mostrado = XP guardado', d.querySelector('.big').textContent === '19/20' && shownXp(d) === s.xp && s.xp > 0, 'mostrado=' + shownXp(d) + ' guardado=' + s.xp);
  ok('I5 jefe: valentía y liderazgo guardados', !!s.virtues.valentia && !!s.virtues.liderazgo && s.boss.M01.passed === true, JSON.stringify(s.virtues));
  ok('I5 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // I6. Batalla (R.battle) ganada: R F R R R => villano a 0 tras 4 aciertos, termina antes de 6
  const VT = ['M02:T01', 'M02:T02', 'M02:T03'];
  const M2START = { scene: 'M02', at: { x: 0, z: -52, yaw: Math.PI } };   // las batallas de M02 empiezan dentro del distrito
  const BIT = { x: 0, z: 0 };
  { const M = (await import('../city/districts.mjs')).city.districts.M02.creatures.find((c) => c.id === 'bit').area; BIT.x = M.x; BIT.z = M.z; }
  const enterBattle = async (w, d) => {
    click(w, btn(d, 'city'));
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
    w.__CITY_TEST_API__.teleport(BIT.x, BIT.z);
    click(w, d.querySelector('#city-act'));
    for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
  };
  ({ w, d, errors } = boot({ seed: fresh({ city: M2START }) }));
  await enterBattle(w, d);
  ok('I6 pre: batalla iniciada (HUD de energía)', !!d.querySelector('.hearts'));
  prev = load(w) ? load(w).xp : 0; xp0 = prev; consec = 0;
  const g6 = [], e6 = [], q6 = [];
  const pat6 = ['right', 'wrong', 'right', 'right', 'right'];
  pat6.forEach((m, i) => {
    const qq = answerOne(w, d, m); q6.push(qq);
    const st = load(w);
    g6.push(st.xp - prev); prev = st.xp;
    if (m === 'right') { consec++; e6.push(10 * qq.difficulty + (consec >= 3 ? 5 : 0)); } else { consec = 0; e6.push(0); }
    if (i === 1) {
      ok('I6 batalla: fallo guardado al instante (0 al final del historial y en cola)', st.topics['M02:' + qq.topic].slice(-1)[0] === 0 && st.qs[qq.id].q === true, JSON.stringify(st.topics['M01:' + qq.topic]));
      ok('I6 batalla: fallo quita 1 de energía', d.querySelector('.hearts').getAttribute('aria-label') === 'Energía 2 de 3');
    }
    nextQ(w, d);
  });
  s = load(w);
  ok('I6 batalla: ganancia por respuesta sigue la racha de la ronda', JSON.stringify(g6) === JSON.stringify(e6), 'obtenido=' + JSON.stringify(g6) + ' esperado=' + JSON.stringify(e6));
  ok('I6 batalla: victoria con 4/5 (ronda recortada)', /¡Victoria!/.test(d.body.textContent) && d.querySelector('.big').textContent === '4/5', d.querySelector('.big') && d.querySelector('.big').textContent);
  ok('I6 batalla: 5 entradas de historial en los temas del villano', histLen(s, VT) === 5, String(histLen(s, VT)));
  ok('I6 batalla: 5 intentos en S.qs y solo el fallo en cola', Object.values(s.qs).reduce((a, r) => a + r.a, 0) === 5 && Object.keys(s.qs).filter((id) => s.qs[id].q).join() === q6[1].id, JSON.stringify(s.qs));
  ok('I6 batalla: XP mostrado = XP guardado', shownXp(d) === s.xp - xp0, 'mostrado=' + shownXp(d) + ' guardado=' + (s.xp - xp0));
  ok('I6 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  // I7. Batalla perdida: 3 fallos => energía 0, derrota; todo registrado y XP 0
  ({ w, d, errors } = boot({ seed: fresh({ xp: 50, city: M2START }) }));
  await enterBattle(w, d);
  let n7 = 0;
  while (d.querySelector('.prompt') && n7 < 10) { answerOne(w, d, 'wrong'); nextQ(w, d); n7++; }
  s = load(w);
  ok('I7 derrota tras 3 fallos', n7 === 3 && /Derrota/.test(d.querySelector('.gtitle').textContent), 'n=' + n7);
  ok('I7 derrota: 3 ceros en historial y 3 en cola', histLen(s, VT) === 3 && VT.every((k) => (s.topics[k] || []).every((x) => x === 0)) && Object.values(s.qs).filter((r) => r.q).length === 3, JSON.stringify(s.topics));
  ok('I7 derrota: XP sin cambio y mostrado +0', s.xp === 50 && shownXp(d) === 0, 'xp=' + s.xp + ' mostrado=' + shownXp(d));
  ok('I7 derrota: villano no marcado como vencido', !s.city.beaten.bit, JSON.stringify(s.city.beaten));
  ok('I7 sin errores de consola', errors.length === 0, errors.join(' | '));
  w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nRECORD2 OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
