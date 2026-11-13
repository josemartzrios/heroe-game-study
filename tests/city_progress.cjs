// Progreso por distrito en el motor (engine.html): cfg.city lleva el distrito, las rondas escriben en S.city.d[mid], el espejo plano de M02,
// la migración con bossPassedIn (migrate corre antes de que exista S), la restauración por distrito y una pestaña con el código anterior.
// La celebración y beatenToday de la vista se comprueban en tests/city_scenes.cjs (Task 5b).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed != null) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {};
      w.__CITY_TEST__ = true;
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const q = [];
      w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
      w.cancelAnimationFrame = () => { q.length = 0; };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const todayStr = (w) => { const x = new w.Date(), p = (n) => (n < 10 ? '0' : '') + n; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); };
const R = (w) => w.__CITY_ROUND__;
const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
function answerOne(w, d, right) {
  const q = L.findQ(w, d), ct = L.correctText(q);
  const t = right ? L.optBtn(d, ct) : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && L.norm(b.querySelector('span:last-child').textContent) !== L.norm(ct));
  L.click(w, t); return q;
}
const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };
const keys = (o) => JSON.stringify(Object.keys(o || {}).sort());

(async () => {
  try {
    const D = (await import('../city/districts.mjs')).city;
    const M2 = D.districts.M02, M8 = D.districts.M08;
    const ruido = M8.creatures.find((c) => c.id === 'ruido');
    const repairM8 = (e, tid, id, mid = 'M08') => R(e.w).startRound({ kind: 'repair', title: 'Reparación', mid: 'M08', back: { name: 'city' }, city: { kind: 'repair', id, mid } }, R(e.w).repairItems('M08', tid));
    const quick = (e, tid = 'T02', id = 'r01') => { repairM8(e, tid, id); answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d); };   // una ronda cualquiera para forzar save()
    const teachM8 = (e, aid, topic = 'T01') => {
      const q = e.w.eval('MODULES').find((m) => m.id === 'M08').questions.find((x) => x.topic === topic && x.type === 'mcq');
      R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid: 'M08', back: { name: 'city' }, city: { kind: 'teach', id: aid, mid: 'M08' } }, [q]);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d);
    };

    // 1. migrate corre antes de que exista S: una partida con M02 restaurada (formato plano) arranca sin lanzar y sin respaldo
    { const s0 = M2.mentors[0], seed = base({ boss: { M02: { best: 18, passed: true } }, city: { prologue: true, bridgeSeen: true, taught: set(M2.apprentices.slice(0, 8).map((a) => a.id)), beaten: { bit: '2026-11-10' }, at: { x: s0.x, z: s0.z, yaw: 0 } } });
      const e = boot(seed);
      ok('migrate con bossPassedIn: arranca sin errores y sin respaldo _bak', e.errors.length === 0 && e.w.localStorage.getItem(KEY + '_bak') === null, e.errors.join(' | '));
      quick(e);
      const s = saved(e.w).city;
      ok('partida vieja con M02 restaurado: sigue restaurada (restored y planos), en M02 con su posición y sin bridgeSeen', s.restored.M02 === true && s.powers.planos === true && s.scene === 'M02' && s.at.x === s0.x && s.at.z === s0.z && !('bridgeSeen' in s) && Object.keys(s.d.M02.taught).length === 8 && s.d.M02.beaten.bit === '2026-11-10', JSON.stringify(s));
      ok('esa partida: M08 sigue vacío y sin restaurar', keys(s.d.M08.taught) === '[]' && !s.restored.M08 && s.d.M08.route.done === 0);
      e.w.close(); }

    // 2. cityResolve escribe en el distrito de la ronda (los ids r01, a01 existen en M02 y en M08)
    { const e = boot(base({ city: { prologue: true } }));
      R(e.w).startRound({ kind: 'battle', title: 'Batalla', mid: 'M08', back: { name: 'city' }, villain: { id: 'ruido', name: 'Ruido Blanco', mod: 'M08', topics: ruido.topics }, city: { kind: 'battle', id: 'ruido', mid: 'M08' } }, R(e.w).battleItems({ mod: 'M08', topics: ruido.topics, n: 8 }));
      for (let i = 0; i < 4; i++) { answerOne(e.w, e.d, true); nextQ(e.w, e.d); }
      let s = saved(e.w).city;
      ok('batalla ganada en M08: d.M08.beaten.ruido = hoy; M02 y los planos intactos', s.d.M08.beaten.ruido === todayStr(e.w) && keys(s.d.M02.beaten) === '[]' && keys(s.beaten) === '[]', JSON.stringify(s.d));
      repairM8(e, 'T02', 'r01'); answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      s = saved(e.w).city;
      ok('reparación r01 en M08: d.M08.repairs.r01; d.M02.repairs y el espejo siguen vacíos', s.d.M08.repairs.r01 === true && keys(s.d.M02.repairs) === '[]' && keys(s.repairs) === '[]', JSON.stringify(s.d));
      teachM8(e, 'a01');
      s = saved(e.w).city;
      ok('enseñar a01 en M08: d.M08.taught.a01; d.M02.taught y el espejo siguen vacíos', s.d.M08.taught.a01 === true && keys(s.d.M02.taught) === '[]' && keys(s.taught) === '[]', JSON.stringify(s.d));
      e.w.close(); }
    { const e = boot(base({ city: { prologue: true } }));
      const q2 = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.topic === 'T01' && x.type === 'mcq');
      R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid: 'M02', back: { name: 'city' }, city: { kind: 'teach', id: 'a01', mid: 'M02' } }, [q2]);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const s = saved(e.w).city;
      ok('enseñar a01 en M02: d.M02.taught.a01 y el espejo plano lo copia; M08 intacto', s.d.M02.taught.a01 === true && s.taught.a01 === true && keys(s.d.M08.taught) === '[]', JSON.stringify(s));
      e.w.close(); }

    // 3. cfg.city con un distrito inválido o ausente no escribe en ningún lado ni lanza
    for (const mid of ['M99', '__proto__', 'constructor', 'toString', 5, null, undefined]) {
      const e = boot(base({ city: { prologue: true } }));
      const before = JSON.stringify(saved(e.w) || {});
      R(e.w).startRound({ kind: 'repair', title: 'Reparación', mid: 'M08', back: { name: 'city' }, city: { kind: 'repair', id: 'r01', mid } }, R(e.w).repairItems('M08', 'T02'));
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const s = saved(e.w).city;
      ok('ronda con cfg.city.mid ' + String(mid) + ': no escribe progreso de ciudad ni lanza', keys(s.d.M02.repairs) === '[]' && keys(s.d.M08.repairs) === '[]' && e.errors.length === 0 && ({}).r01 === undefined, e.errors.join(' | '));
      e.w.close();
    }

    // 4. espejo: tras cualquier save() los campos planos son una copia de d.M02 (y d gana sobre los planos al cargar)
    { const seed = base({ city: { prologue: true, taught: set(['a01', 'a02']), beaten: { bit: '2026-11-10' }, d: { M02: { taught: set(['a03']), beaten: { eco: '2026-11-09' }, repairs: set(['r02']) } } } });
      const e = boot(seed); quick(e);
      const s = saved(e.w).city;
      ok('d gana sobre los planos al cargar y tras save() los planos son el espejo de d.M02', keys(s.d.M02.taught) === '["a03"]' && JSON.stringify(s.taught) === JSON.stringify(s.d.M02.taught) && JSON.stringify(s.beaten) === JSON.stringify(s.d.M02.beaten) && JSON.stringify(s.repairs) === JSON.stringify(s.d.M02.repairs) && s.beaten.eco === '2026-11-09', JSON.stringify(s));
      e.w.close(); }

    // 5. una pestaña con el código anterior guarda encima: M02 se conserva por el espejo; M08 vuelve a cero (límite documentado)
    { const e = boot(base({ city: { prologue: true, taught: set(['a01', 'a02', 'a03']) } }));
      teachM8(e, 'a02'); quick(e, 'T04', 'r03');
      const raw = saved(e.w); e.w.close();
      const hasNew = raw.city.d.M08.taught.a02 === true && raw.city.d.M08.repairs.r03 === true && raw.city.d.M02.taught.a03 === true;
      const OLD = require('./fixtures/old_city/story.js'), Dold = (await import('./fixtures/old_city/districts.mjs')).city;
      const oldCity = OLD.normalizeCity(raw.city, Dold, false, todayStr(new JSDOM('').window));   // lo que guardaría la pestaña vieja
      const e2 = boot(Object.assign({}, raw, { city: oldCity }));
      quick(e2, 'T04', 'r04');
      const s = saved(e2.w).city;
      ok('pestaña vieja: el progreso de M02 sobrevive (espejo) y el de M08 vuelve a cero', hasNew && keys(s.d.M02.taught) === '["a01","a02","a03"]' && keys(s.d.M08.taught) === '[]' && keys(s.d.M08.repairs) === '["r04"]' && s.d.M08.route.done === 0, JSON.stringify(s.d));
      e2.w.close(); }

    // 6. restauración por distrito al terminar una ronda (jefe aprobado de ese módulo + need aprendices)
    { const six = M8.apprentices.slice(0, 6).map((a) => a.id), seed = base({ boss: { M08: { best: 18, passed: true } }, city: { prologue: true, d: { M08: { taught: set(six.slice(0, 5)) } } } });
      const e = boot(seed);
      const s0 = saved(e.w); ok('antes de la sexta enseñanza M08 no está restaurado (el guardado semilla aún no trae restored)', !s0.city.restored || !s0.city.restored.M08);
      teachM8(e, six[5], 'T13');
      const s = saved(e.w).city;
      ok('al enseñar al sexto aprendiz con el jefe aprobado, M08 queda restaurado sin dar poder y M02 no', s.restored.M08 === true && !s.restored.M02 && keys(s.powers) === '[]', JSON.stringify([s.restored, s.powers]));
      e.w.close(); }
    { const seed = base({ boss: { M02: { best: 18, passed: true } }, city: { prologue: true, d: { M02: { taught: set(M2.apprentices.slice(0, 7).map((a) => a.id)) } } } });
      const e = boot(seed);
      const q2 = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.topic === 'T20' && x.type === 'mcq');
      R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid: 'M02', back: { name: 'city' }, city: { kind: 'teach', id: M2.apprentices[7].id, mid: 'M02' } }, [q2]);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d);
      const s = saved(e.w).city;
      ok('al enseñar al octavo aprendiz de M02 con el jefe aprobado: restaurado y con el poder Planos', s.restored.M02 === true && s.powers.planos === true && !s.restored.M08, JSON.stringify([s.restored, s.powers]));
      e.w.close(); }

    // 7. partida nueva: plaza, M08 con route.done 0, sin respaldo
    { const e = boot(null);
      quick(e);
      const s = saved(e.w).city;
      ok('partida nueva: escena plaza en la entrada, d.M08.route.done = 0 y sin respaldo', s.scene === 'plaza' && s.at.x === D.plaza.entry.x && s.at.z === D.plaza.entry.z && s.d.M08.route.done === 0 && !('route' in s.d.M02) && e.w.localStorage.getItem(KEY + '_bak') === null && e.errors.length === 0, JSON.stringify(s));
      e.w.close(); }
  } catch (err) { console.error('EXCEPCIÓN', err && err.stack); process.exit(2); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_PROGRESS OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})();
