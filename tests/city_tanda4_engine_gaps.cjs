// Huecos de la Tanda 4 en el motor completo (jsdom con el mundo 2D sustituido, como city_scenes). No repite review_tanda3_gaps (que restaura el 9.º y el 10.º en orden de
// registro y mira el HUD al cargar con 0 / 50 / 93 %) ni city_scenes (que entra por el portal de M08):
//  1. Entrar a M05 y a M09 por el portal de la plaza: botón "Entrar a …" con "M05 · 22 temas · 0 % restaurado", se guarda la escena y la entrada, el aviso dice
//     "Objetivo: Habla con Adela/Anselmo" (el objetivo guiado empieza en T01) y el HUD "<distrito> 0 %"; pisar la salida vuelve a la plaza al punto de regreso del portal.
//  2. Restaurar enseñando al 7.º aprendiz DENTRO del distrito (otro camino que ganar el jefe): hoja "¡Distrito restaurado!" con el texto del distrito y la línea de rango
//     literal ("Llevas 9 de 10" / "Llevas 10 de 10"), HUD 100 %, rango Arquitecto y guardado; sin el jefe aprobado el 7.º aprendiz solo da la hoja de "Enseñar" y 50 %.
//  3. Restaurar FUERA de orden en el motor completo: M09 antes que M05 (el texto sale del recuento, no de la posición: M05 como 10.º dice "10 de 10"), M09 como 8.º
//     ("Subes a Arquitecto."), los dos a la vez cruzando de 5 a 7 ("Subes a Senior."), M09 como 7.º ("te falta 1 distrito para Arquitecto") y M05 o M09 como primero ("Subes a Junior.").
//  4. El tope de need en el HUD: con los 10 aprendices enseñados y el jefe aprobado el HUD dice 100 % (no 121 %), y sin jefe 50 %.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const L = require('./adv/lib.cjs');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await sleep(0); };
const FADE = 250, SETTLE = 2 * FADE + 140;

function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail || er.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { scenes: [], calls: [], lastOpts: null };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      w.matchMedia = (q) => ({ matches: !!(opts.reduced && /prefers-reduced-motion/.test(q)), addEventListener() {}, removeEventListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = {
        create(canvas, D, sceneId, o) {
          st.scenes.push(sceneId); st.lastOpts = o;
          return Promise.resolve({ resize() {}, setPaused: (r, on) => st.calls.push(['setPaused', r, on, sceneId]), dissolve() {}, encounter: () => Promise.resolve(), setRoute() {}, dispose: () => st.calls.push(['dispose', sceneId]) });
        }
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, city: { prologue: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const text = (e, s) => ($(e, s) || {}).textContent || '';
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const api = (e) => e.w.__CITY_TEST_API__;
const act = (e) => ({ main: ($(e, '#city-act .act-main') || {}).textContent, sub: ($(e, '#city-act .act-sub') || {}).textContent, hidden: $(e, '#city-act').hidden });
async function enterCity(e) { click(e.w, $(e, '[data-act="city"]')); await tick(); }
const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
const passed = (mids) => Object.fromEntries(mids.map((m) => [m, { best: 18, passed: true }]));
function answerRight(w, d) { const q = L.findQ(w, d); L.click(w, L.optBtn(d, L.correctText(q))); }
const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };
const winBoss = (e, mid) => {   // gana el jefe con la ciudad cerrada y vuelve al inicio (igual que review_tanda3_gaps)
  const qs = e.w.eval('MODULES').find((m) => m.id === mid).questions.filter((x) => x.type === 'mcq').slice(0, 20);
  e.w.__CITY_ROUND__.startRound({ kind: 'boss', title: 'Jefe', mid, back: { name: 'home' } }, qs);
  let g = 0; while (e.d.querySelector('.prompt') && g++ < 30) { answerRight(e.w, e.d); nextQ(e.w, e.d); }
  L.click(e.w, e.d.querySelector('[data-act="back"]'));
};

(async () => {
  const D = (await import(pathToFileURL(path.join(root, 'city', 'districts.mjs')).href)).city, DIST = D.districts, P = D.plaza;
  const SEQ = D.order.filter((m) => DIST[m]), TOTAL = SEQ.length;
  const firstN = (mid, n) => DIST[mid].apprentices.slice(0, n).map((a) => a.id);
  const full = (mid) => ({ taught: set(firstN(mid, DIST[mid].need)) });
  const atEntry = (m) => ({ x: DIST[m].entry.x, z: DIST[m].entry.z, yaw: 0 });
  const portal = (m) => P.portals.find((p) => p.dist === m);
  const near = (p) => ({ x: p.x, z: p.z + 2.5 });
  const TEMAS = { M05: 22, M09: 19 }, MENTOR1 = { M05: 'Adela', M09: 'Anselmo' };
  ok('los textos de esta prueba ("Llevas 10 de 10", "Ciudad al día") suponen exactamente 10 distritos registrados, M05 y M09 los dos últimos del orden de la plaza; si se registra M11 hay que actualizarlos', TOTAL === 10 && SEQ.slice(-2).join() === 'M05,M09', SEQ.join());
  let e;

  // =================== 1. entrar por el portal ===================
  for (const m of ['M05', 'M09']) {
    const M = DIST[m];
    e = boot({ seed: base() }); await enterCity(e);
    const q = near(portal(m)); api(e).teleport(q.x, q.z);
    ok(`(${m}) junto al portal el botón dice "Entrar a ${M.name}" y su texto secundario "${m} · ${TEMAS[m]} temas · 0 % restaurado"`, act(e).main === 'Entrar a ' + M.name && act(e).sub === m + ' · ' + TEMAS[m] + ' temas · 0 % restaurado' && !act(e).hidden, JSON.stringify(act(e)));
    click(e.w, $(e, '#city-act')); await sleep(SETTLE);
    const s = saved(e.w).city;
    ok(`(${m}) tras el fundido hay un solo create nuevo (${m}) y se guardan la escena y la entrada del distrito`, e.st.scenes.join() === 'plaza,' + m && s.scene === m && s.at.x === M.entry.x && s.at.z === M.entry.z, e.st.scenes.join() + ' ' + JSON.stringify(s.at));
    ok(`(${m}) llegada: "Entraste a ${M.name}. Objetivo: Habla con ${MENTOR1[m]}." y el HUD "${M.name} 0 %"`, text(e, '#city-live') === 'Entraste a ' + M.name + '. Objetivo: Habla con ' + MENTOR1[m] + '.' && text(e, '#city-rest') === M.name + ' 0 %', text(e, '#city-live') + ' | ' + text(e, '#city-rest'));
    ok(`(${m}) sin errores de consola al entrar`, e.errors.length === 0, e.errors.join('|'));
    e.w.close();
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    api(e).teleport(portal(m).x, portal(m).z); e.st.lastOpts.tick(16); await sleep(140);
    ok(`(${m}) pisar la caja del portal entra al distrito (movimiento reducido)`, e.st.scenes.join() === 'plaza,' + m && saved(e.w).city.scene === m, e.st.scenes.join());
    api(e).teleport(M.exit.x, M.exit.z); e.st.lastOpts.tick(16); await sleep(140);
    const b = portal(m).back, s2 = saved(e.w).city;
    ok(`(${m}) pisar la salida vuelve a la plaza al punto de regreso del portal ${m}`, e.st.scenes.join() === 'plaza,' + m + ',plaza' && s2.scene === 'plaza' && s2.at.x === b.x && s2.at.z === b.z && s2.at.yaw === b.yaw, JSON.stringify(s2.at));
    e.w.close();
  }

  // =================== 2. restaurar enseñando al 7.º aprendiz dentro del distrito ===================
  const teachScenario = async (m, done, bossFor, taughtBefore) => {
    const d = {}; done.forEach((x) => { d[x] = full(x); }); d[m] = { taught: set(firstN(m, taughtBefore)) };
    e = boot({ seed: base({ boss: passed(bossFor), city: { prologue: true, scene: m, at: atEntry(m), d, restored: set(done) } }) });
    await enterCity(e);
    const before = { rest: text(e, '#city-rest') };
    api(e).teach(DIST[m].apprentices[taughtBefore].id); await tick();
    const sheet = text(e, '#city-sheet'), close = [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === 'sheetclose');
    if (close) { click(e.w, close); await tick(); }   // el HUD se refresca al cerrar la hoja de "Enseñar" (la celebración ya lo refresca antes de abrirse)
    const r = { before, sheet, rest: text(e, '#city-rest'), rank: text(e, '#city-rank'), s: saved(e.w).city, errs: e.errors.slice() };
    e.w.close();
    return r;
  };
  { const done = SEQ.slice(0, 8), m = 'M05', M = DIST[m], r = await teachScenario(m, done, [...done, m], 6);
    ok('M05 con 6 de 7 enseñados y el jefe aprobado: antes dice "Mercado de Patrones 93 %"', r.before.rest === M.name + ' 93 %', r.before.rest);
    ok('enseñar al 7.º de M05 (el 9.º distrito) abre "¡Distrito restaurado!" con su texto, "¡Gracias, Toño lo entendió!" y "Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados."',
      /¡Distrito restaurado!/.test(r.sheet) && r.sheet.includes(M.celebrate.text) && r.sheet.includes('¡Gracias, Toño lo entendió!') && r.sheet.includes('Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados.'), r.sheet.slice(0, 300));
    ok('tras restaurar M05 enseñando: HUD "Mercado de Patrones 100 %", rango Arquitecto, M05 guardado como restaurado y sin errores', r.rest === M.name + ' 100 %' && r.rank === 'Arquitecto' && r.s.restored.M05 === true && Object.keys(r.s.restored).length === 9 && r.errs.length === 0, r.rest + ' | ' + r.rank + ' | ' + JSON.stringify(r.s.restored) + ' | ' + r.errs.join('|')); }
  { const done = SEQ.slice(0, 9), m = 'M09', M = DIST[m], r = await teachScenario(m, done, [...done, m], 6);
    ok('enseñar al 7.º de M09 con los 9 anteriores restaurados dice "Llevas 10 de 10 distritos restaurados." con el texto de M09 y "¡Gracias, Nacho lo entendió!"', /¡Distrito restaurado!/.test(r.sheet) && r.sheet.includes(M.celebrate.text) && r.sheet.includes('¡Gracias, Nacho lo entendió!') && r.sheet.includes('Sigues como Arquitecto. Llevas 10 de 10 distritos restaurados.'), r.sheet.slice(0, 300));
    ok('tras restaurar M09 enseñando: HUD "Laboratorio Neuronal 100 %", rango Arquitecto y 10 restaurados guardados', r.rest === M.name + ' 100 %' && r.rank === 'Arquitecto' && Object.keys(r.s.restored).length === 10, r.rest + ' | ' + r.rank + ' | ' + JSON.stringify(r.s.restored)); }
  { const done = SEQ.slice(0, 8), m = 'M09', r = await teachScenario(m, done, [...done, m], 6);
    ok('enseñar al 7.º de M09 con M05 todavía sin restaurar (M09 como 9.º) dice "Llevas 9 de 10", no "10 de 10"', r.sheet.includes('Sigues como Arquitecto. Llevas 9 de 10 distritos restaurados.') && !r.sheet.includes('10 de 10'), r.sheet.slice(0, 300)); }
  { const done = SEQ.slice(0, 8), m = 'M05', M = DIST[m], r = await teachScenario(m, done, done, 6);
    ok('enseñar al 7.º de M05 sin el jefe aprobado no celebra: hoja "Enseñar" ("Toño lo entendió"), HUD 50 % y M05 sin restaurar', !/Distrito restaurado/.test(r.sheet) && /lo entendió gracias a ti/.test(r.sheet) && r.rest === M.name + ' 50 %' && r.s.restored.M05 === undefined, r.sheet.slice(0, 200) + ' | ' + r.rest); }

  // =================== 3. restaurar fuera de orden con el motor completo ===================
  const scenario = async (done, pending) => {
    const d = {}; done.concat(pending).forEach((m) => { d[m] = full(m); });
    e = boot({ seed: base({ boss: passed(done), city: { prologue: true, d } }) });
    pending.forEach((m) => winBoss(e, m));
    await enterCity(e);
    const r = { t: text(e, '#city-sheet'), rank: text(e, '#city-rank'), rest: text(e, '#city-rest'), obj: text(e, '#city-obj'), errs: e.errors.slice() };
    e.w.close();
    return r;
  };
  const CASES = [
    ['M05 como 10.º (M09 ya restaurado)', SEQ.filter((m) => m !== 'M05'), ['M05'], 'Sigues como Arquitecto. Llevas 10 de 10 distritos restaurados.', 'Arquitecto', 'Ciudad al día', '¡Distrito restaurado!'],
    ['M09 como 8.º (cruza a Arquitecto)', SEQ.slice(0, 7), ['M09'], 'Subes a Arquitecto.', 'Arquitecto', 'Entra a ' + DIST[SEQ[7]].name, '¡Distrito restaurado!'],
    ['M09 como 7.º (Senior, falta 1 para Arquitecto)', SEQ.slice(0, 6), ['M09'], 'Sigues como Senior: te falta 1 distrito para Arquitecto.', 'Senior', 'Entra a ' + DIST[SEQ[6]].name, '¡Distrito restaurado!'],
    ['M05 y M09 a la vez de 5 a 7 (cruzan a Senior)', SEQ.slice(0, 5), ['M05', 'M09'], 'Subes a Senior.', 'Senior', 'Entra a ' + DIST[SEQ[5]].name, '¡Distritos restaurados!'],
    ['M05 como primero (Junior)', [], ['M05'], 'Subes a Junior.', 'Junior', 'Entra a ' + DIST[SEQ[0]].name, '¡Distrito restaurado!'],
    ['M09 como primero (Junior)', [], ['M09'], 'Subes a Junior.', 'Junior', 'Entra a ' + DIST[SEQ[0]].name, '¡Distrito restaurado!']
  ];
  for (const [label, done, pending, line, rank, obj, head] of CASES) {
    const r = await scenario(done, pending), n = done.length + pending.length;
    ok(`${label}: la hoja dice "${line}" (${head}) con el texto de cada distrito`, r.t.includes(head) && r.t.includes(line) && pending.every((m) => r.t.includes(DIST[m].celebrate.text) && r.t.includes(DIST[m].name)), r.t.slice(0, 300));
    ok(`${label}: HUD "Distritos ${n} de ${TOTAL}", rango ${rank}, la plaza manda a "${obj}" y sin errores`, r.rest === 'Distritos ' + n + ' de ' + TOTAL && r.rank === rank && r.obj.includes(obj) && r.errs.length === 0, [r.rest, r.rank, r.obj, r.errs.join('|')].join(' | '));
  }

  // =================== 4. tope de need en el HUD ===================
  for (const m of ['M05', 'M09']) {
    const M = DIST[m], all = { taught: set(M.apprentices.map((a) => a.id)) };
    for (const [label, boss, pct] of [['los 10 enseñados y el jefe', passed([m]), 100], ['los 10 enseñados sin jefe', {}, 50]]) {
      e = boot({ seed: base({ boss, city: { prologue: true, scene: m, at: atEntry(m), d: { [m]: all } } }) }); await enterCity(e);
      ok(`${m}: ${label} → el HUD dice "${M.name} ${pct} %" (el aporte de los aprendices se corta en need = ${M.need})`, text(e, '#city-rest') === M.name + ' ' + pct + ' %' && e.errors.length === 0, text(e, '#city-rest') + ' ' + e.errors.join('|'));
      e.w.close();
    }
  }

  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'CITY_TANDA4_ENGINE_GAPS FALLAS ' + fails.length : 'CITY_TANDA4_ENGINE_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
