// Rondas de la ciudad en el motor: batalla hasta vida/energía 0, pool por ronda, cfg.city, reparaciones y restauración.
// Usa el gancho window.__CITY_ROUND__ (solo con window.__CITY_TEST__ === true).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function boot(seed, opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed != null) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {};
      if (opts.test !== false) w.__CITY_TEST__ = true;
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const q = [];
      w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
      w.cancelAnimationFrame = () => { q.length = 0; };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const fresh = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const hud = (d, sel) => { const e = d.querySelector(sel); return e ? e.getAttribute('aria-label') : null; };
const nums = (s) => (s || '').match(/\d+/g).map(Number);
const hp = (d) => nums(hud(d, '.hpbar'))[0];
const en = (d) => nums(hud(d, '.hearts'))[0];
const won = (d) => { const g = d.querySelector('.gtitle'); return !!g && /¡Victoria!/.test(g.textContent); };
const isResults = (d) => !!d.querySelector('.gtitle');
function answerOne(w, d, right) {
  const q = L.findQ(w, d), ct = L.correctText(q);
  const t = right ? L.optBtn(d, ct) : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && L.norm(b.querySelector('span:last-child').textContent) !== L.norm(ct));
  L.click(w, t); return q;
}
const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };
const R = (w) => w.__CITY_ROUND__;
const BIT = { kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: 'bit', name: 'Bit Errante' }, city: { kind: 'battle', id: 'bit', mid: 'M02' } };

(async () => {
  try {
    const D = (await import('../city/districts.mjs')).city;
    const bit = D.districts.M02.creatures.find((c) => c.id === 'bit');
    const topics = bit.topics;
    const startBattle = (w) => R(w).startRound(Object.assign({}, BIT), R(w).battleItems({ mod: 'M02', topics, n: 8 }));

    // --- gancho y battleItems
    { const e = boot(fresh());
      ok('Gancho __CITY_ROUND__ con __CITY_TEST__', !!R(e.w) && typeof R(e.w).startRound === 'function' && typeof R(e.w).battleItems === 'function' && typeof R(e.w).repairItems === 'function');
      let items, thrown = null;
      try { items = R(e.w).battleItems({ mod: 'M02', topics, n: 8 }); } catch (x) { thrown = x; }
      ok('Primera ronda de la sesión con battleItems no lanza', !thrown, String(thrown));
      const all = items.concat(items.pool || []);
      ok('battleItems: 8 preguntas y pool con el resto', items.length === 8 && Array.isArray(items.pool) && items.pool.length > 0, items.length + '+' + (items.pool && items.pool.length));
      ok('battleItems: sin repetir, solo mcq/tf de los temas', new Set(all.map((q) => q.id)).size === all.length && all.every((q) => topics.includes(q.topic) && (q.type === 'mcq' || q.type === 'tf')));
      e.w.close(); }
    { const e = boot(fresh(), { test: false });
      ok('Sin __CITY_TEST__ no hay gancho', e.w.__CITY_ROUND__ === undefined);
      e.w.close(); }

    // --- repairItems
    { const e = boot(fresh());
      const its = R(e.w).repairItems('M02', 'T15');
      ok('repairItems M02 T15: 2 preguntas scenario/error del tema', its.length === 2 && its.every((q) => q.topic === 'T15' && (q.type === 'scenario' || q.type === 'error')) && its[0].id !== its[1].id, JSON.stringify(its.map((q) => q.id)));
      e.w.close(); }

    // --- batalla: victoria solo con vida 0, termina con vida 0 o energía 0
    for (let seed = 1; seed <= 12; seed++) {
      const e = boot(fresh()); startBattle(e.w);
      const r = L.rng(seed); let n = 0, bad = '', lastHp = null, lastEn = null;
      while (d_has(e.d) && n < 60) {
        answerOne(e.w, e.d, r.bool(0.55)); n++;
        lastHp = hp(e.d); lastEn = en(e.d);
        if (!e.d.querySelector('#nextbtn')) { bad = 'sin siguiente'; break; }
        nextQ(e.w, e.d);
      }
      const fin = isResults(e.d);
      const s = saved(e.w);
      if (!fin) bad = bad || 'no terminó';
      if (fin && won(e.d) && lastHp !== 0) bad = bad || 'victoria con vida ' + lastHp;
      if (fin && !won(e.d) && lastHp === 0) bad = bad || 'derrota con vida 0';
      if (fin && !won(e.d) && lastEn !== 0) bad = bad || 'derrota con energía ' + lastEn;
      ok('Batalla azarosa #' + seed + ': termina; victoria solo con vida 0, derrota solo con energía 0', !bad && n < 60, bad + ' n=' + n);
      ok('Batalla azarosa #' + seed + ': d.M02.beaten solo si ganó', !!s.city.d.M02.beaten.bit === won(e.d));
      e.w.close();
    }

    // --- B7: escudo + 3 fallos; ya no hay victoria por puntos
    { const e = boot(fresh()); startBattle(e.w);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const sh = e.d.querySelector('[data-pw="shield"]'); L.click(e.w, sh);
      answerOne(e.w, e.d, false); nextQ(e.w, e.d); answerOne(e.w, e.d, false); nextQ(e.w, e.d);
      ok('B7 tras 5 respuestas con vida 1 la ronda sigue (pool) y no hay victoria por puntos', !isResults(e.d) && hp(e.d) === 1 && en(e.d) >= 1, 'hp=' + hp(e.d) + ' en=' + en(e.d));
      let g = 0; while (!isResults(e.d) && g++ < 6) { answerOne(e.w, e.d, false); nextQ(e.w, e.d); }
      ok('B7 sigue hasta energía 0: derrota y sin vencido', isResults(e.d) && !won(e.d) && !saved(e.w).city.d.M02.beaten.bit);
      e.w.close(); }

    // --- 8 respuestas correctas seguidas no hacen falta: con 4 aciertos gana (pool no se consume de más)
    { const e = boot(fresh()); startBattle(e.w);
      for (let i = 0; i < 4; i++) { answerOne(e.w, e.d, true); nextQ(e.w, e.d); }
      const s = saved(e.w);
      ok('4 aciertos: victoria, beaten.bit = hoy', won(e.d) && s.city.d.M02.beaten.bit === L_today(e.w) && d_big(e.d) === '4/4', d_big(e.d));
      e.w.close(); }

    // --- reparaciones: cfg.city.kind repair
    const startRepair = (e, tid, id) => R(e.w).startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id, mid: 'M02' } }, R(e.w).repairItems('M02', tid));
    { const e = boot(fresh()); startRepair(e, 'T15', 'r09');
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      ok('Reparación con 2 aciertos marca d.M02.repairs.r09', saved(e.w).city.d.M02.repairs.r09 === true, JSON.stringify(saved(e.w).city));
      e.w.close(); }
    { const e = boot(fresh()); startRepair(e, 'T15', 'r09');
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, false); nextQ(e.w, e.d);
      ok('Reparación con 1 acierto no marca', !saved(e.w).city.d.M02.repairs.r09);
      e.w.close(); }
    { const e = boot(fresh()); startRepair(e, 'T15', 'r09');
      const laser = e.d.querySelector('[data-pw="laser"]'); if (laser) L.click(e.w, laser);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      ok('Reparación con láser (asistida) no marca', !!laser && !saved(e.w).city.d.M02.repairs.r09, 'laser=' + !!laser);
      e.w.close(); }

    // --- enseñar: cfg.city.kind teach
    { const e = boot(fresh());
      const q = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.topic === 'T01' && x.type === 'mcq');
      R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid: 'M02', back: { name: 'city' }, city: { kind: 'teach', id: 'a01', mid: 'M02' } }, [q]);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      ok('Enseñar con 1 acierto marca d.M02.taught.a01', saved(e.w).city.d.M02.taught.a01 === true);
      e.w.close(); }

    // --- vResults: Volver a la ciudad
    { const e = boot(fresh());
      startRepair(e, 'T15', 'r09'); answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const b = [...e.d.querySelectorAll('[data-act="back"]')].find((x) => /Volver a la ciudad/.test(x.textContent));
      ok('Resultados con back city: botón "Volver a la ciudad"', !!b, e.d.body.textContent.slice(-200));
      e.w.close(); }

    // --- jefe M02 aprobado sin cfg.city, con 8 enseñados: restored.M02 queda guardado
    { const taught = {}; D.districts.M02.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
      const e = boot(fresh({ city: { taught } }));
      const qs = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.type === 'mcq').slice(0, 20);
      R(e.w).startRound({ kind: 'boss', title: 'Jefe', mid: 'M02', back: { name: 'home' } }, qs);
      let g = 0; while (e.d.querySelector('.prompt') && g++ < 30) answerOne(e.w, e.d, true);
      const s = saved(e.w);
      ok('Jefe M02 aprobado sin cfg.city con 8 enseñados: restored.M02 y powers.planos guardados', s.boss.M02.passed === true && s.city.restored.M02 === true && s.city.powers.planos === true, JSON.stringify(s.city));
      e.w.close(); }
    { const e = boot(fresh({ city: { taught: {} } }));
      const qs = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.type === 'mcq').slice(0, 20);
      R(e.w).startRound({ kind: 'boss', title: 'Jefe', mid: 'M02', back: { name: 'home' } }, qs);
      let g = 0; while (e.d.querySelector('.prompt') && g++ < 30) answerOne(e.w, e.d, true);
      const s = saved(e.w);
      ok('Jefe M02 aprobado sin enseñados: no restaura', s.boss.M02.passed === true && !s.city.restored.M02);
      e.w.close(); }

    // --- energía máxima por Valentía y Empate al agotar las preguntas (spec §4.1 y §4.2)
    const mcq = (w, n) => w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.topic === 'T01' && x.type === 'mcq').slice(0, n);
    const hearts = (d) => d.querySelectorAll('.hearts span').length;
    { const e = boot(fresh()); startBattle(e.w);
      ok('sin Valentía: 3 corazones y "Energía 3 de 3"', hearts(e.d) === 3 && hud(e.d, '.hearts') === 'Energía 3 de 3', hud(e.d, '.hearts'));
      e.w.close(); }
    { const e = boot(fresh({ virtues: { valentia: 1700000000000 } })); startBattle(e.w);
      ok('con Valentía: 4 corazones y "Energía 4 de 4"', hearts(e.d) === 4 && hud(e.d, '.hearts') === 'Energía 4 de 4', hud(e.d, '.hearts'));
      e.w.close(); }
    for (const [vir, max] of [[{}, 3], [{ valentia: 1700000000000 }, 4]]) {
      const e = boot(fresh({ xp: 2500, virtues: vir })); R(e.w).startRound(Object.assign({}, BIT), mcq(e.w, 3));
      answerOne(e.w, e.d, false); const b = e.d.querySelector('[data-act="regenno"]'); if (b) L.click(e.w, b); nextQ(e.w, e.d);   // 1.º fallo: pierde 1 de energía
      const afterFail = en(e.d);
      answerOne(e.w, e.d, false); const y = e.d.querySelector('[data-act="regenyes"]'); if (y) L.click(e.w, y); answerOne(e.w, e.d, true);   // 2.º: Regenerar y acierta
      ok('Regenerar recupera 1 de energía hasta el máximo (' + max + ')', afterFail === max - 1 && en(e.d) === max && hud(e.d, '.hearts') === 'Energía ' + max + ' de ' + max, afterFail + ' → ' + en(e.d));
      e.w.close(); }
    { const e = boot(fresh()); const items = mcq(e.w, 2); items.pool = [];
      R(e.w).startRound(Object.assign({}, BIT), items);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const s = saved(e.w);
      ok('sin preguntas y con vida y energía: "Empate", sin vencer y sin marcar derrota', /Empate/.test(e.d.querySelector('.gtitle').textContent) && /Se acabaron las preguntas: vuelve a intentarlo/.test(e.d.querySelector('main').textContent) && !s.city.d.M02.beaten.bit && !(s.stats.bossFailed || {}).M02, e.d.querySelector('.gtitle').textContent);
      ok('el Empate no es victoria ni derrota', !won(e.d) && !/Derrota/.test(e.d.querySelector('.gtitle').textContent));
      e.w.close(); }

    // --- fresh / migrate: S.city existe y city.run toma world.run
    { const e = boot(fresh()); startRepair(e, 'T15', 'r09'); answerOne(e.w, e.d, true);
      const c = saved(e.w).city;
      ok('Sin city en el guardado: migrate crea S.city en la plaza con prologue false y d vacío', c && c.prologue === false && c.scene === 'plaza' && Object.keys(c.d.M02.beaten).length === 0 && Object.keys(c.d.M08.beaten).length === 0 && c.run === false, JSON.stringify(c));
      e.w.close(); }
    { const e = boot(fresh({ world: { at: 'hub', pos: {}, talked: {}, beaten: {}, run: true } })); startRepair(e, 'T15', 'r09'); answerOne(e.w, e.d, true);
      ok('migrate: city.run toma world.run cuando city no trae run', saved(e.w).city.run === true, JSON.stringify(saved(e.w).city));
      e.w.close(); }
    { const e = boot(fresh({ world: { run: true }, city: { run: false } })); startRepair(e, 'T15', 'r09'); answerOne(e.w, e.d, true);
      ok('migrate: city.run propio manda sobre world.run', saved(e.w).city.run === false);
      e.w.close(); }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'CITY_ROUNDS OK (' + results.length + ')');
  process.exit(fails.length ? 1 : 0);
})();

function d_has(d) { return !!d.querySelector('.prompt'); }
function d_big(d) { const b = d.querySelector('.big'); return b && b.textContent; }
function L_today(w) { const x = new w.Date(), p = (n) => (n < 10 ? '0' : '') + n; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); }
