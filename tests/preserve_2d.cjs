// Caracterización de lo que el spec 2026-11-12 (Ciudad Núcleo 2D, §2 "Qué se conserva") promete mantener:
// estrellas (≥ 6 respuestas y umbrales), jefe (20 preguntas, 80 %, best/passed/bossFailed), repaso,
// bonos de virtudes (Constancia, Curiosidad, Humildad, Integridad, Resiliencia, tope +20 %), condiciones de
// Valentía/Enfoque/Liderazgo, rondas que vuelven a la ciudad y migración de S.city.
// Fija el comportamiento ACTUAL; no depende del render (3D o 2D) ni del editor de aspecto.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

// Mundo falso compatible con el contrato 3D (create(THREE, canvas, D, opts)) y el 2D (create(canvas, D, opts)).
function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed != null) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
      w.__TRIP_IMPORT__ = () => Promise.resolve({ THREE_FAKE: true });
      w.__CITY_WORLD__ = { create() { return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, setLook() {}, encounter: () => Promise.resolve(), dispose() {} }); } };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const fresh = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H', welcomed: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const pad = (n) => (n < 10 ? '0' : '') + n;
const dstr = (x) => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
const TODAY = dstr(new Date());
const YEST = dstr(new Date(Date.now() - 86400000));
const TOMORROW = dstr(new Date(Date.now() + 86400000));
const click = L.click;
const mods = (w) => w.eval('MODULES');
const M01 = (w) => mods(w).find((m) => m.id === 'M01');
const allTopics = (w, v) => { const t = {}; M01(w).topics.forEach((x) => { t['M01:' + x.id] = v.slice(); }); return t; };
function openModule(e, mid) { click(e.w, L.modBtn(e.d, mid)); }
function openTopic(e, mid, tid) { openModule(e, mid); click(e.w, [...e.d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === tid)); }
function startQuiz(e, mid, tid) { openTopic(e, mid, tid); click(e.w, L.btn(e.d, 'start', (b) => b.dataset.kind === 'quiz')); }
function startBoss(e, mid) { openModule(e, mid); click(e.w, L.btn(e.d, 'start', (b) => b.dataset.kind === 'boss')); }
function topicStars(e, tid) { const n = [...e.d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === tid); const s = n && n.querySelector('.stars'); return s ? Number(s.getAttribute('aria-label').match(/^(\d)/)[1]) : null; }
// Responde la pregunta en pantalla (right: bool) y devuelve la pregunta. Si hay botón Siguiente lo pulsa.
function answer(e, right) {
  const q = L.findQ(e.w, e.d), ct = L.correctText(q);
  const t = right ? L.optBtn(e.d, ct) : [...e.d.querySelectorAll('.opt')].find((b) => !b.disabled && L.norm(b.querySelector('span:last-child').textContent) !== L.norm(ct));
  click(e.w, t);
  const n = e.d.querySelector('#nextbtn'); if (n) click(e.w, n);
  return q;
}
// Juega toda la ronda; plan(i) -> bool. Devuelve las preguntas respondidas en orden con su resultado.
function play(e, plan) { const log = []; let i = 0; while (e.d.querySelector('.prompt') && i < 40) { const r = plan(i); log.push({ q: answer(e, r), ok: r }); i++; } return log; }
const mainText = (e) => { const m = e.d.querySelector('main'); return m ? m.textContent : ''; };
const big = (e) => { const b = e.d.querySelector('.big'); return b ? b.textContent : ''; };
const gtitle = (e) => { const g = e.d.querySelector('.gtitle'); return g ? g.textContent : ''; };
// XP base de una ronda sin ayuda: 10 × dificultad, +5 desde el 3.er acierto seguido.
function baseList(log) { let c = 0; return log.map((l) => { if (!l.ok) { c = 0; return 0; } c++; return 10 * l.q.difficulty + (c >= 3 ? 5 : 0); }); }

(async () => {
  try {
    // ================= Estrellas: ≥ 6 respuestas y umbrales 0.5 / 0.75 / 0.9 =================
    const starCases = [
      ['5 aciertos (menos de 6) dan 0 estrellas', [1, 1, 1, 1, 1], 0],
      ['6 aciertos dan 3 estrellas', [1, 1, 1, 1, 1, 1], 3],
      ['promedio 0.9 exacto da 3 estrellas', [1, 1, 1, 1, 1, 1, 1, 1, 1, 0], 3],
      ['promedio 0.83 da 2 estrellas', [1, 1, 1, 1, 1, 0], 2],
      ['promedio 0.75 exacto da 2 estrellas', [1, 1, 1, 0.5, 0.5, 0.5], 2],
      ['promedio 0.58 da 1 estrella', [1, 1, 1, 0, 0, 0.5], 1],
      ['promedio 0.5 exacto da 1 estrella', [1, 1, 1, 0, 0, 0], 1],
      ['promedio 0.42 da 0 estrellas', [1, 1, 0, 0, 0, 0.5], 0],
      ['historial de 14 se recorta a los últimos 10 (4 fallos viejos + 10 aciertos = 3)', [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 3],
      ['6 respuestas asistidas (0.5) dan 1 estrella', [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 1],
    ];
    for (const [name, h, exp] of starCases) {
      const e = boot(fresh({ topics: { 'M01:T01': h } })); openModule(e, 'M01');
      const s = topicStars(e, 'T01');
      ok('Estrellas: ' + name, s === exp, 'obtuvo ' + s);
      e.w.close();
    }
    { const e = boot(fresh()); startQuiz(e, 'M01', 'T09');
      const log = play(e, () => true);
      const s = saved(e.w);
      ok('Quiz de 8 aciertos guarda 8 unos en el historial del tema', log.length === 8 && JSON.stringify(s.topics['M01:T09']) === JSON.stringify([1, 1, 1, 1, 1, 1, 1, 1]), JSON.stringify(s.topics));
      click(e.w, L.btn(e.d, 'home')); openModule(e, 'M01');
      ok('Tras el quiz perfecto el tema muestra 3 estrellas', topicStars(e, 'T09') === 3, topicStars(e, 'T09'));
      e.w.close(); }
    { const e = boot(fresh({ topics: { 'M01:T01': [1, 1, 1, 1, 1, 1] } })); openModule(e, 'M01');
      const m = M01(e.w), n = m.topics.length;
      const meta = e.d.querySelector('.head .meta').textContent;
      ok('Dominio = round(100 × estrellas / (3 × temas)) en la vista del módulo', meta.includes(Math.round(100 * 3 / (3 * n)) + ' % de dominio') && meta.includes('3 de ' + (3 * n) + ' estrellas'), meta);
      const boss = L.btn(e.d, 'start', (b) => b.dataset.kind === 'boss');
      ok('Jefe bloqueado si algún tema tiene 0 estrellas (dice cuántos faltan)', boss.disabled && boss.textContent.includes('Falta 1 estrella en ' + (n - 1) + ' temas'), boss.textContent);
      e.w.close(); }
    { const e = boot(fresh({ topics: allTopics(boot(fresh()).w, [1, 1, 1, 0, 0, 0]) })); openModule(e, 'M01');
      const boss = L.btn(e.d, 'start', (b) => b.dataset.kind === 'boss');
      ok('Jefe desbloqueado con 1 estrella en todos los temas', !boss.disabled && /20 preguntas/.test(boss.textContent) && /80 %/.test(boss.textContent), boss.textContent);
      e.w.close(); }

    // ================= Jefe: 20 preguntas, aprueba con 80 % =================
    const bossSeed = (o = {}) => { const t = boot(fresh()); const tp = allTopics(t.w, [1, 1, 1, 1, 1, 1]); t.w.close(); return fresh(Object.assign({ topics: tp }, o)); };
    { const e = boot(bossSeed()); startBoss(e, 'M01');
      ok('Jefe sin poderes', !e.d.querySelector('[data-pw]'));
      const log = play(e, (i) => i < 16);
      const s = saved(e.w);
      ok('Jefe tiene 20 preguntas sin repetir', log.length === 20 && new Set(log.map((l) => l.q.id)).size === 20, log.length);
      ok('Jefe con 16/20 (80 %): ¡Victoria! y passed', big(e) === '16/20' && /¡Victoria!/.test(gtitle(e)) && s.boss.M01.passed === true && s.boss.M01.best === 16, JSON.stringify(s.boss));
      ok('Jefe aprobado da Valentía y Liderazgo; sin fallo previo no da Resiliencia', !!s.virtues.valentia && !!s.virtues.liderazgo && !s.virtues.resiliencia, JSON.stringify(s.virtues));
      ok('Jefe aprobado sin fallo previo no marca bossFailed', !s.stats.bossFailed.M01);
      e.w.close(); }
    { const e = boot(bossSeed()); startBoss(e, 'M01');
      play(e, (i) => i < 15);
      const s = saved(e.w);
      ok('Jefe con 15/20 (75 %): Derrota, no aprobado, best 15', big(e) === '15/20' && /Derrota/.test(gtitle(e)) && s.boss.M01.passed === false && s.boss.M01.best === 15, JSON.stringify(s.boss));
      ok('Jefe reprobado avisa "necesitas 16 de 20" y marca bossFailed', /necesitas 16 de 20/.test(mainText(e)) && s.stats.bossFailed.M01 === true);
      ok('Intentar el jefe da Valentía aunque se repruebe; no da Liderazgo', !!s.virtues.valentia && !s.virtues.liderazgo, JSON.stringify(s.virtues));
      e.w.close(); }
    { const e = boot(bossSeed({ boss: { M01: { best: 18, passed: true } } })); startBoss(e, 'M01');
      play(e, (i) => i < 10);
      const s = saved(e.w);
      ok('Jefe peor que el récord: best se queda en 18 y passed sigue true', s.boss.M01.best === 18 && s.boss.M01.passed === true, JSON.stringify(s.boss));
      e.w.close(); }
    { const e = boot(bossSeed({ boss: { M01: { best: 10, passed: false } }, stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: { M01: true } } })); startBoss(e, 'M01');
      play(e, () => true);
      const s = saved(e.w);
      ok('Aprobar un jefe antes reprobado da Resiliencia', !!s.virtues.resiliencia && s.boss.M01.passed === true && s.boss.M01.best === 20, JSON.stringify(s.virtues));
      e.w.close(); }

    // ================= Repaso =================
    { const e = boot(fresh()); startQuiz(e, 'M01', 'T09');
      const log = play(e, (i) => i !== 0);
      click(e.w, L.btn(e.d, 'home') || L.btn(e.d, 'back'));
      if (!e.d.querySelector('[data-act="review"]')) click(e.w, L.btn(e.d, 'home'));
      const rv = e.d.querySelector('[data-act="review"]');
      ok('Una respuesta fallada entra al repaso (1 pregunta pendiente en Inicio)', !!rv && /1 pregunta pendiente/.test(rv.textContent) && saved(e.w).qs[log[0].q.id].q === true, rv && rv.textContent);
      click(e.w, rv);
      const q = L.findQ(e.w, e.d);
      ok('El repaso presenta la pregunta fallada', !!q && q.id === log[0].q.id);
      e.w.close(); }

    // ================= Bonos de virtudes =================
    // Constancia: +10 % de XP con racha ≥ 3
    { const e = boot(fresh({ days: { last: TODAY, count: 3 }, virtues: { constancia: 1 } })); startQuiz(e, 'M01', 'T09');
      const q = answer(e, true); const b = 10 * q.difficulty;
      ok('Constancia con racha 3: acierto = base + floor(base × 10 %)', saved(e.w).xp === b + Math.floor(b / 10), 'xp=' + saved(e.w).xp + ' base=' + b);
      e.w.close(); }
    { const e = boot(fresh({ days: { last: TODAY, count: 3 } })); startQuiz(e, 'M01', 'T09');
      const q = answer(e, true); const s = saved(e.w);
      const b = 10 * q.difficulty;
      ok('Racha 3 sin Constancia previa: la gana en esa respuesta y ese acierto ya lleva el +10 %', !!s.virtues.constancia && s.xp === b + Math.floor(b / 10), 'xp=' + s.xp);
      e.w.close(); }
    { const e = boot(fresh({ days: { last: TODAY, count: 2 }, virtues: { constancia: 1 } })); startQuiz(e, 'M01', 'T09');
      const q = answer(e, true);
      ok('Constancia con racha 2: sin bono', saved(e.w).xp === 10 * q.difficulty, 'xp=' + saved(e.w).xp);
      e.w.close(); }
    // Curiosidad: Mente detective con 2 usos
    const usesOf = (e, id) => { const p = e.d.querySelector('[data-pw="' + id + '"]'); const sm = p && p.querySelector('small'); return sm ? sm.textContent : null; };
    { const e = boot(fresh({ xp: 450, virtues: { curiosidad: 1 } })); startQuiz(e, 'M01', 'T09');
      ok('Curiosidad: Mente detective ×2', usesOf(e, 'detective') === '×2', usesOf(e, 'detective'));
      e.w.close(); }
    { const e = boot(fresh({ xp: 450 })); startQuiz(e, 'M01', 'T09');
      ok('Sin Curiosidad: Mente detective ×1', usesOf(e, 'detective') === '×1', usesOf(e, 'detective'));
      e.w.close(); }
    { const e = boot(fresh({ stats: { learnTopics: ['M01:T01', 'M01:T02', 'M01:T03', 'M01:T04', 'M01:T05', 'M01:T06', 'M01:T07', 'M01:T08', 'M01:T09'], cleared: 0, roundsNoPower: 0, bossFailed: {} } }));
      openTopic(e, 'M01', 'T10'); click(e.w, L.btn(e.d, 'learn'));
      ok('Curiosidad se gana al abrir Aprender en el 10.º tema distinto', !!saved(e.w).virtues.curiosidad, JSON.stringify(saved(e.w).stats.learnTopics.length));
      e.w.close(); }
    // Resiliencia: Escudo con 2 usos
    { const e = boot(fresh({ xp: 1000, virtues: { resiliencia: 1 } })); startQuiz(e, 'M01', 'T09');
      ok('Resiliencia: Escudo ×2', usesOf(e, 'shield') === '×2', usesOf(e, 'shield'));
      e.w.close(); }
    { const e = boot(fresh({ xp: 1000 })); startQuiz(e, 'M01', 'T09');
      ok('Sin Resiliencia: Escudo ×1', usesOf(e, 'shield') === '×1', usesOf(e, 'shield'));
      e.w.close(); }
    // Humildad: +5 por acierto en Repaso
    const pendQ = (w) => M01(w).questions.find((x) => x.type === 'mcq');
    { const t = boot(fresh()); const q0 = pendQ(t.w); t.w.close();
      const qs = { [q0.id]: { a: 1, c: 0, q: true, g: 0, gs: -1 } };
      { const e = boot(fresh({ qs, virtues: { humildad: 1 } })); click(e.w, e.d.querySelector('[data-act="review"]'));
        const q = answer(e, true);
        ok('Humildad: acierto en Repaso = 10 × dificultad + 5', q.id === q0.id && saved(e.w).xp === 10 * q.difficulty + 5, 'xp=' + saved(e.w).xp);
        e.w.close(); }
      { const e = boot(fresh({ qs })); click(e.w, e.d.querySelector('[data-act="review"]'));
        const q = answer(e, true);
        ok('Sin Humildad: acierto en Repaso = 10 × dificultad', saved(e.w).xp === 10 * q.difficulty, 'xp=' + saved(e.w).xp);
        e.w.close(); }
      { const e = boot(fresh({ qs, virtues: { humildad: 1 } })); startQuiz(e, 'M01', 'T09');
        const q = answer(e, true);
        ok('Humildad no suma fuera del Repaso', saved(e.w).xp === 10 * q.difficulty, 'xp=' + saved(e.w).xp);
        e.w.close(); } }
    // Integridad: +10 % de la base en rondas sin poderes; con Constancia el total no pasa de +20 %
    { const e = boot(fresh({ virtues: { integridad: 1 } })); startQuiz(e, 'M01', 'T09');
      const log = play(e, () => true); const sum = baseList(log).reduce((a, b) => a + b, 0), bonus = Math.floor(sum / 10);
      ok('Integridad sin poderes: XP = base + floor(base × 10 %)', saved(e.w).xp === sum + bonus, 'xp=' + saved(e.w).xp + ' base=' + sum);
      ok('Integridad: resultados muestran "Bono de Integridad: +N XP"', mainText(e).includes('Bono de Integridad: +' + bonus + ' XP.'));
      e.w.close(); }
    { const e = boot(fresh({ virtues: { integridad: 1 } })); startQuiz(e, 'M01', 'T09');
      const log = play(e, (i) => i % 2 === 0); const sum = baseList(log).reduce((a, b) => a + b, 0);
      ok('Integridad con fallos: el bono es 10 % de la base de los aciertos', saved(e.w).xp === sum + Math.floor(sum / 10), 'xp=' + saved(e.w).xp + ' base=' + sum);
      e.w.close(); }
    { const e = boot(fresh({ virtues: { integridad: 1 } })); startQuiz(e, 'M01', 'T09');
      play(e, () => false);
      ok('Integridad sin aciertos: XP 0 y sin texto de bono', saved(e.w).xp === 0 && !/Bono de Integridad/.test(mainText(e)));
      e.w.close(); }
    { const e = boot(fresh({ xp: 100, virtues: { integridad: 1 } })); startQuiz(e, 'M01', 'T09');
      click(e.w, e.d.querySelector('[data-pw="laser"]'));
      play(e, () => true);
      const s = saved(e.w);
      ok('Integridad con un poder usado: sin bono ni texto, y roundsNoPower no sube', !/Bono de Integridad/.test(mainText(e)) && s.stats.roundsNoPower === 0, 'rnp=' + s.stats.roundsNoPower);
      e.w.close(); }
    { const e = boot(fresh({ days: { last: TODAY, count: 3 }, virtues: { integridad: 1, constancia: 1 } })); startQuiz(e, 'M01', 'T09');
      const log = play(e, () => true); const bl = baseList(log), sum = bl.reduce((a, b) => a + b, 0);
      const perAnswer = bl.reduce((a, b) => a + b + Math.floor(b / 10), 0);
      const exp = perAnswer + Math.floor(sum * (Math.min(20, 10 + 10) - 10) / 100);
      ok('Tope +20 %: Constancia (10 % por acierto) + Integridad (10 % al final) = base + 20 %', saved(e.w).xp === exp, 'xp=' + saved(e.w).xp + ' esperado=' + exp);
      e.w.close(); }
    { const e = boot(fresh({ stats: { learnTopics: [], cleared: 0, roundsNoPower: 9, bossFailed: {} } })); startQuiz(e, 'M01', 'T09');
      play(e, () => false);
      ok('Integridad se gana al completar la 10.ª ronda sin poderes', !!saved(e.w).virtues.integridad && saved(e.w).stats.roundsNoPower === 10);
      e.w.close(); }
    // Enfoque (su condición se conserva para el bono nuevo)
    { const e = boot(fresh()); startQuiz(e, 'M01', 'T09'); play(e, () => true);
      ok('Enfoque: ronda perfecta de 8 sin ayuda la gana', !!saved(e.w).virtues.enfoque && /Ronda perfecta/.test(mainText(e)));
      e.w.close(); }
    { const e = boot(fresh()); startQuiz(e, 'M01', 'T09'); play(e, (i) => i !== 7);
      ok('Enfoque: 7 de 8 no la gana', !saved(e.w).virtues.enfoque);
      e.w.close(); }
    { const e = boot(fresh({ xp: 100 })); startQuiz(e, 'M01', 'T09');
      click(e.w, e.d.querySelector('[data-pw="laser"]')); play(e, () => true);
      ok('Enfoque: perfecta pero con una respuesta asistida no la gana', !saved(e.w).virtues.enfoque && big(e) === '8/8');
      e.w.close(); }
    { const t = boot(fresh()); const q0 = pendQ(t.w); t.w.close();
      const e = boot(fresh({ qs: { [q0.id]: { a: 1, c: 0, q: true, g: 0, gs: -1 } } })); click(e.w, e.d.querySelector('[data-act="review"]')); play(e, () => true);
      ok('Enfoque: ronda perfecta de menos de 8 preguntas no la gana', !saved(e.w).virtues.enfoque && big(e) === '1/1');
      e.w.close(); }

    // ================= Rondas que vuelven a la ciudad =================
    { const e = boot(fresh({ city: { prologue: true } }));
      const R = e.w.__CITY_ROUND__;
      R.startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: 'r09' } }, R.repairItems('M02', 'T15'));
      answer(e, true); answer(e, true);
      const b = [...e.d.querySelectorAll('[data-act="back"]')].find((x) => /Volver a la ciudad/.test(x.textContent));
      ok('Ronda con back city: resultados ofrecen "Volver a la ciudad"', !!b);
      click(e.w, b); await tick();
      ok('"Volver a la ciudad" abre la vista de la ciudad', e.d.body.classList.contains('city-on') && !!e.d.querySelector('#city-root') && !e.d.querySelector('.gtitle'));
      ok('La reparación quedó guardada al volver', saved(e.w).city.repairs.r09 === true);
      e.w.close(); }
    { const e = boot(fresh()); startQuiz(e, 'M01', 'T09'); play(e, () => true);
      const b = L.btn(e.d, 'back');
      ok('Ronda desde un tema: el botón dice "Volver" y regresa al tema', !!b && b.textContent === 'Volver' && (click(e.w, b), !!e.d.querySelector('[data-act="start"][data-kind="quiz"]')) && !e.d.body.classList.contains('city-on'));
      e.w.close(); }
    { const t = boot(fresh()); const q0 = pendQ(t.w); t.w.close();
      const e = boot(fresh({ qs: { [q0.id]: { a: 1, c: 0, q: true, g: 0, gs: -1 } } })); click(e.w, e.d.querySelector('[data-act="review"]')); play(e, () => true);
      const b = L.btn(e.d, 'back');
      ok('Repaso: el botón dice "Ir al inicio" y vuelve al inicio', !!b && b.textContent === 'Ir al inicio' && (click(e.w, b), !!L.modBtn(e.d, 'M01')));
      e.w.close(); }

    // ================= Migración de S.city y guardado =================
    const trigger = (e) => { openTopic(e, 'M01', 'T01'); click(e.w, L.btn(e.d, 'learn')); };   // fuerza un save()
    { const e = boot(fresh({ city: { prologue: true, run: true, bridgeSeen: true, beaten: { bit: YEST }, repairs: { r01: true }, taught: { a01: true } } }));
      trigger(e); const s = saved(e.w), c = s.city;
      ok('Guardado conserva clave estudio_isw_v1 y v: 1', s.v === 1);
      ok('S.city válido se conserva (prologue, run, bridgeSeen, beaten, repairs, taught)', c.prologue === true && c.run === true && c.bridgeSeen === true && c.beaten.bit === YEST && c.repairs.r01 === true && c.taught.a01 === true, JSON.stringify(c));
      ok('S.city sin jefe ni 8 enseñados: no restaurado', !c.restored.M02 && !c.powers.planos);
      e.w.close(); }
    { const e = boot(fresh({ city: { beaten: { bit: TOMORROW, nada: YEST, x: 1 }, repairs: { r01: 'si', zz: true }, taught: { a01: 1, a99: true }, restored: { M02: true }, powers: { planos: true }, prologue: 'true' } }));
      trigger(e); const c = saved(e.w).city;
      ok('S.city: fechas futuras, ids desconocidos y valores no true se descartan', Object.keys(c.beaten).length === 0 && Object.keys(c.repairs).length === 0 && Object.keys(c.taught).length === 0 && c.prologue === false, JSON.stringify(c));
      ok('S.city: restored/powers guardados se ignoran si no se cumple la condición', !c.restored.M02 && !c.powers.planos, JSON.stringify(c));
      e.w.close(); }
    { const t = boot(fresh()); const D = (await import('../city/districts.mjs')).city; t.w.close();
      const taught = {}; D.districts.M02.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
      const e = boot(fresh({ boss: { M02: { best: 17, passed: true } }, city: { taught } }));
      trigger(e); const c = saved(e.w).city;
      ok('S.city: jefe M02 aprobado + 8 enseñados al cargar da restored.M02 y powers.planos', c.restored.M02 === true && c.powers.planos === true, JSON.stringify(c));
      e.w.close();
      const e2 = boot(fresh({ boss: { M02: { best: 17, passed: true } }, city: { taught: Object.fromEntries(Object.keys(taught).slice(0, 7).map((k) => [k, true])) } }));
      trigger(e2); const c2 = saved(e2.w).city;
      ok('S.city: con 7 enseñados no se restaura aunque el jefe esté aprobado', !c2.restored.M02, JSON.stringify(c2));
      e2.w.close(); }
    { const e = boot(fresh({ world: { run: true, at: 'hub' } }));
      trigger(e); const s = saved(e.w);
      ok('Migración: world desaparece y city.run hereda world.run', s.world === undefined && s.city.run === true, JSON.stringify(s.city));
      e.w.close(); }
    { const e = boot(null);
      trigger(e); const s = saved(e.w);
      ok('Guardado nuevo: S.city vacío con prologue false', s.v === 1 && s.city.prologue === false && Object.keys(s.city.beaten).length === 0 && Object.keys(s.city.taught).length === 0 && !s.city.restored.M02);
      e.w.close(); }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length + ' de ' + results.length : 'PRESERVE_2D OK (' + results.length + ')');
  process.exit(fails.length ? 1 : 0);
})();
