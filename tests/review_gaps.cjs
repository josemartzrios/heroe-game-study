// Huecos de revisión de la ciudad 2D (integración con jsdom y mundo falso): orientación al reanudar, contexto perdido en encuentro,
// dobles clics, guardado dentro de una caja, cambio de día con hoja abierta, Esc con hoja/pausa, zoom límite y razones de pausa del mundo.
// El patrón de boot se copia de tests/city_engine.cjs (no se hace require de otras suites).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const KEY = 'estudio_isw_v1';

// opts: seed, clock {ms}, media (objeto mutable { land }), encPending (encounter no resuelve hasta st.resolveEnc)
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { creates: 0, disposed: 0, calls: [], reasons: new Set(), encounters: 0, resolveEnc: null, lastOpts: null };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      if (opts.clock) { const RD = w.Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(RD.now() + opts.clock.ms); else super(...a); } static now() { return RD.now() + opts.clock.ms; } } w.Date = FD; }
      if (opts.media) w.matchMedia = (q) => ({ matches: /landscape/.test(q) ? !!opts.media.land : false, addListener() {}, removeListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = {
        create(canvas, D, o) {
          st.creates++; st.lastOpts = o;
          return Promise.resolve({
            resize: () => st.calls.push(['resize']),
            setPaused: (r, on) => { st.calls.push(['setPaused', r, on]); if (on) st.reasons.add(r); else st.reasons.delete(r); },
            dissolve: (id) => st.calls.push(['dissolve', id]),
            encounter: (id) => { st.encounters++; st.calls.push(['encounter', id]); return opts.encPending ? new Promise((res) => { st.resolveEnc = res; }) : Promise.resolve(); },
            dispose: () => { st.disposed++; st.calls.push(['dispose']); },
          });
        },
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const norm = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const allQs = (w) => w.eval('MODULES').flatMap((m) => m.questions);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
const correctText = (q) => (q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]);
function answerRight(w, d) { const q = findQ(w, d); click(w, [...d.querySelectorAll('.opt')].find((x) => norm(x.querySelector('span:last-child').textContent) === norm(correctText(q)))); const n = d.querySelector('#nextbtn'); if (n) click(w, n); }

const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, city: { prologue: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const root = (e) => $(e, '#city-root');
const key = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true }));
const keyUp = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keyup', { key: k, bubbles: true }));
const cx = (e, c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
const btnText = (e, re, scope = '#city-root') => [...e.d.querySelectorAll(scope + ' button')].find((b) => re.test(b.textContent));
const api = (e) => e.w.__CITY_TEST_API__;
const tickW = (e, ms = 16) => e.st.lastOpts.tick(ms);
const hero = (e) => e.st.lastOpts.state().hero;
const zoom = (e) => e.st.lastOpts.state().zoom;
const enter = async (e) => { click(e.w, $(e, '[data-act="city"]')); await tick(); };
const R = (e) => e.w.__CITY_ROUND__;
const startRepair = (e) => R(e).startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: 'r09' } }, R(e).repairItems('M02', 'T15'));
const back = async (e) => { for (let g = 0; g < 40 && $(e, '.prompt'); g++) answerRight(e.w, e.d); click(e.w, $(e, '[data-act="back"]')); await tick(); };
const six = (ids) => { const o = {}; ids.forEach((t) => { o['M02:' + t] = [1, 1, 1, 1, 1, 1]; }); return o; };
const todayStr = (ms = 0) => { const x = new Date(Date.now() + ms), p = (n) => (n < 10 ? '0' : '') + n; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); };
const sheetOpen = (e) => !$(e, '#city-sheet').hidden;
const pauseOpen = (e) => !$(e, '#city-pausebox').hidden;
const finite = (h) => ['x', 'z', 'speed'].every((k) => Number.isFinite(h[k]));

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const M = D.districts.M02;
  const CM = require('../city/move.js');
  const bit = M.creatures.find((c) => c.id === 'bit');
  const a01 = M.apprentices.find((a) => a.id === 'a01');
  const m01 = M.mentors.find((m) => m.id === 'm01');
  let e;
  try {
    // ---- 1. Suspender y reanudar con orientación distinta
    { const media = { land: false };
      e = boot({ seed: base(), media }); await enter(e);
      startRepair(e);
      media.land = true;   // el teléfono se gira mientras la ciudad está suspendida
      await back(e);
      ok('1a reanudar en apaisado táctil: aviso visible, ui inert y mundo en pausa "rotate"', !$(e, '#city-rotate').hidden && $(e, '#city-ui-main').hasAttribute('inert') && e.st.reasons.has('rotate') && !e.st.reasons.has('suspended'));
      const x0 = hero(e).x; key(e, 'd'); tickW(e); tickW(e); keyUp(e, 'd');
      ok('1b con el aviso de girar no se mueve el héroe', hero(e).x === x0);
      media.land = false; e.w.dispatchEvent(new e.w.Event('resize'));
      ok('1c al volver a vertical se quita el aviso, el inert y la razón rotate', $(e, '#city-rotate').hidden && !$(e, '#city-ui-main').hasAttribute('inert') && !e.st.reasons.has('rotate'));
      ok('1d sin errores de consola', e.errors.length === 0, e.errors.join('|'));
      e.w.close(); }
    { const media = { land: true };
      e = boot({ seed: base(), media }); await enter(e);
      startRepair(e); media.land = false;   // apaisado al suspender, vertical al volver
      await back(e);
      ok('1e suspender en apaisado y volver en vertical: sin aviso y sin razón rotate', $(e, '#city-rotate').hidden && !e.st.reasons.has('rotate') && !$(e, '#city-ui-main').hasAttribute('inert'), [...e.st.reasons].join());
      e.w.close(); }

    // ---- 2. Contexto perdido durante un encuentro
    { e = boot({ seed: base(), encPending: true }); await enter(e);
      api(e).teleport(bit.area.x, bit.area.z + 1);
      click(e.w, $(e, '#city-act')); await tick();
      ok('2a la acción en la criatura llama una vez a encounter', e.st.encounters === 1);
      e.st.lastOpts.onLost(); await tick();
      ok('2b contexto perdido en el encuentro: aviso "Se perdió la vista" y mundo liberado', /Se perdió la vista de la ciudad\./.test(root(e).textContent) && e.st.disposed === 1);
      e.st.resolveEnc(); await tick();
      ok('2c al resolver el encuentro tardío no empieza ninguna batalla', !$(e, '.arena') && !$(e, '.prompt') && /Se perdió la vista/.test(root(e).textContent));
      click(e.w, btnText(e, /^Reintentar$/)); await tick();
      ok('2d Reintentar tras el encuentro roto deja la ciudad usable (se puede volver a enfrentar)', e.st.creates === 2 && !$(e, '#city-pausebox').hidden === false && !sheetOpen(e));
      api(e).teleport(bit.area.x, bit.area.z + 1);
      ok('2e la acción vuelve a ofrecer a la criatura (busy no queda pegado)', /Enfrentar a/.test($(e, '#city-act').textContent) && tickW(e) === undefined && e.errors.length === 0, e.errors.join('|'));
      e.w.close(); }
    { e = boot({ seed: base(), encPending: true }); await enter(e);
      api(e).teleport(bit.area.x, bit.area.z + 1);
      click(e.w, $(e, '#city-act')); click(e.w, $(e, '#city-act')); await tick();
      ok('2f doble clic en la criatura: encounter una sola vez (busy)', e.st.encounters === 1, String(e.st.encounters));
      click(e.w, btnText(e, /^Pausa$/));
      ok('2g la pausa durante el encuentro sigue mostrándose o se ignora sin romper', e.errors.length === 0, e.errors.join('|'));
      e.st.resolveEnc(); await tick();
      ok('2h al resolver, una sola batalla en curso', e.d.querySelectorAll('.arena').length === 1 && e.st.calls.filter((c) => c[0] === 'setPaused' && c[1] === 'suspended' && c[2] === true).length === 1);
      e.w.close(); }

    // ---- 3. Dobles clics en acciones de hoja
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      const pr = cx(e, 'practice'); click(e.w, pr); click(e.w, pr); await tick();
      ok('3a doble clic en Practicar: una sola ronda (un .prompt) y la ciudad suspendida una vez', e.d.querySelectorAll('.prompt').length === 1 && e.st.calls.filter((c) => c[0] === 'setPaused' && c[1] === 'suspended' && c[2] === true).length === 1);
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      const closeBtn = cx(e, 'sheetclose'); click(e.w, closeBtn); click(e.w, closeBtn);
      ok('3b doble clic en Cerrar: la hoja queda cerrada, sin errores y sin razón sheet en el mundo', !sheetOpen(e) && !e.st.reasons.has('sheet') && e.errors.length === 0, e.errors.join('|'));
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); const act = $(e, '#city-act'); click(e.w, act); click(e.w, act);
      ok('3c doble clic en la acción: una sola hoja (no se reabre ni se duplica)', sheetOpen(e) && e.d.querySelectorAll('#city-sheet .qcard').length === 1 && e.st.calls.filter((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === true).length === 1);
      e.w.close(); }
    { e = boot({ seed: base({ topics: six(['T05']) }) }); await enter(e);
      api(e).teleport(a01.x, a01.z + 1); click(e.w, $(e, '#city-act'));
      const own = new Set(e.w.eval('MODULES').find((m) => m.id === 'M02').topics.find((t) => t.id === 'T05').keyPoints.map(norm));
      const kps = () => [...e.d.querySelectorAll('#city-sheet [data-c="kp"]')];
      for (let k = 0; k < 3; k++) click(e.w, kps().find((b) => own.has(norm(b.textContent)) && b.getAttribute('aria-pressed') === 'false'));
      const go = cx(e, 'teach-go'); const xp0 = saved(e.w).xp;
      click(e.w, go); click(e.w, go);
      ok('3d doble clic en Explicar: el XP se suma una sola vez (+15)', saved(e.w).xp - xp0 === 15 && saved(e.w).city.taught.a01 === true, String(saved(e.w).xp - xp0));
      click(e.w, cx(e, 'sheetclose'));
      api(e).teleport(a01.x, a01.z + 1);
      ok('3e enseñar a un aprendiz ya enseñado: ya no se ofrece', $(e, '#city-act').hidden);
      e.w.close(); }
    { const taught = { a01: true };
      e = boot({ seed: base({ topics: six(['T05']), city: { prologue: true, taught } }) }); await enter(e);
      api(e).teleport(a01.x, a01.z + 1);
      key(e, 'e'); tickW(e);
      ok('3f con a01 ya enseñado, pulsar E junto a él no abre nada', !sheetOpen(e) && $(e, '#city-act').hidden);
      const xp0 = saved(e.w).xp; click(e.w, $(e, '#city-act'));
      ok('3g clic en la acción oculta no hace nada ni da XP', !sheetOpen(e) && saved(e.w).xp === xp0);
      e.w.close(); }

    // ---- 4. Guardado con city.at dentro de una caja
    { const b = CM.layoutBuildings(M)[0];
      e = boot({ seed: base({ city: { prologue: true, at: { x: b.x, z: b.z, yaw: 0 } } }) }); await enter(e);
      key(e, 'w'); for (let i = 0; i < 60; i++) tickW(e); keyUp(e, 'w');
      ok('4a empezar dentro de un edificio: el héroe sigue con coordenadas finitas', finite(hero(e)), JSON.stringify(hero(e)));
      key(e, 'd'); for (let i = 0; i < 120; i++) tickW(e); keyUp(e, 'd');
      ok('4b dentro de la caja el héroe puede salir caminando (no queda atrapado)', finite(hero(e)) && Math.hypot(hero(e).x - b.x, hero(e).z - b.z) > 0.5, JSON.stringify(hero(e)));
      click(e.w, btnText(e, /^Pausa$/));
      ok('4c al pausar se guarda una posición finita', Number.isFinite(saved(e.w).city.at.x) && Number.isFinite(saved(e.w).city.at.z), JSON.stringify(saved(e.w).city.at));
      ok('4d sin errores de consola', e.errors.length === 0, e.errors.join('|'));
      e.w.close(); }
    for (const [name, at] of [['muy fuera del mundo', { x: 1e9, z: -1e9, yaw: 0 }], ['con cadenas', { x: '5', z: 'a', yaw: null }], ['NaN/Infinity en el guardado (null)', { x: null, z: null, yaw: null }]]) {
      e = boot({ seed: base({ city: { prologue: true, at } }) }); await enter(e);
      key(e, 'w'); for (let i = 0; i < 20; i++) tickW(e); keyUp(e, 'w');
      const h = hero(e), B = D.bounds;
      ok('4e guardado "' + name + '": el héroe queda finito y dentro de los límites', finite(h) && h.x >= B.minX - 1 && h.x <= B.maxX + 1 && h.z >= B.minZ - 1 && h.z <= B.maxZ + 1, JSON.stringify(h));
      e.w.close();
    }

    // ---- 5. Cambio de día con la ciudad abierta
    { const clock = { ms: 0 };
      e = boot({ seed: base({ city: { prologue: true, beaten: { bit: todayStr() } } }), clock }); await enter(e);
      api(e).teleport(bit.area.x, bit.area.z + 1);
      ok('5a vencida hoy: la criatura no se ofrece', $(e, '#city-act').hidden);
      key(e, 'e'); tickW(e);   // abre otra cosa? no: no hay nada cerca
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));   // hoja abierta
      clock.ms = 26 * 3600 * 1000;
      tickW(e);   // con la hoja abierta el tick no refresca
      click(e.w, cx(e, 'sheetclose'));   // al cerrar la hoja se recalcula con el día nuevo
      api(e).teleport(bit.area.x, bit.area.z + 1);
      ok('5b cambio de día con la hoja abierta: al cerrarla la criatura vuelve', /Enfrentar a/.test($(e, '#city-act').textContent), $(e, '#city-act').textContent);
      clock.ms = -3 * 3600 * 1000;   // el reloj retrocede
      for (let i = 0; i < 3; i++) tickW(e);
      ok('5c reloj hacia atrás: sin errores y la ciudad sigue activa', e.errors.length === 0 && finite(hero(e)), e.errors.join('|'));
      e.w.close(); }
    { const clock = { ms: 0 };
      e = boot({ seed: base({ city: { prologue: true, beaten: { bit: todayStr() } } }), clock }); await enter(e);
      click(e.w, $(e, '#city-pause'));
      clock.ms = 26 * 3600 * 1000;
      click(e.w, cx(e, 'pauseclose'));
      for (let i = 0; i < 4; i++) tickW(e, 10000);   // > 30 s de juego simulado no basta: el reloj es Date; se fuerza con ticks largos
      e.w.close(); ok('5d cambio de día con la pausa abierta no lanza errores', e.errors.length === 0, e.errors.join('|')); }

    // ---- 6. Pausa + Esc con hoja abierta
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      click(e.w, $(e, '#city-pause'));
      ok('6a el botón Pausa con la hoja abierta no abre la pausa', sheetOpen(e) && !pauseOpen(e));
      key(e, 'Escape');
      ok('6b Esc con la hoja abierta la cierra sin abrir la pausa', !sheetOpen(e) && !pauseOpen(e), 'hoja=' + sheetOpen(e) + ' pausa=' + pauseOpen(e));
      key(e, 'Escape'); tickW(e);
      ok('6c segundo Esc abre la pausa', pauseOpen(e) && !sheetOpen(e));
      key(e, 'Escape');
      ok('6d tercer Esc cierra la pausa y el mundo se reanuda', !pauseOpen(e) && !e.st.reasons.has('pause') && !e.st.reasons.has('sheet'), [...e.st.reasons].join());
      ok('6e sin errores', e.errors.length === 0, e.errors.join('|'));
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      click(e.w, $(e, '#city-pause'));
      api(e).teleport(m01.x, m01.z + 1);
      key(e, 'e'); tickW(e); key(e, 'Enter');
      ok('6f con la pausa abierta E/Enter no abren hoja', !sheetOpen(e) && pauseOpen(e));
      click(e.w, $(e, '#city-pause'));
      ok('6g Pausa dos veces alterna: cierra la pausa', !pauseOpen(e) && !e.st.reasons.has('pause'));
      e.w.close(); }
    { const media = { land: true };
      e = boot({ seed: base(), media }); await enter(e);
      key(e, 'Escape'); tickW(e);
      ok('6h con el aviso de girar Esc no abre la pausa', !pauseOpen(e));
      e.w.close(); }

    // ---- 7. Zoom con valores límite
    { e = boot({ seed: base() }); await enter(e);
      for (let i = 0; i < 40; i++) key(e, '+'); tickW(e);
      ok('7a 40 pulsaciones de + en un cuadro: tope 1.75', zoom(e) === 1.75, String(zoom(e)));
      for (let i = 0; i < 40; i++) key(e, '-'); tickW(e);
      ok('7b 40 pulsaciones de - en un cuadro: mínimo 1', zoom(e) === 1, String(zoom(e)));
      for (const dy of [NaN, Infinity, -Infinity, 0]) { const ev = new e.w.Event('wheel', { bubbles: true, cancelable: true }); ev.deltaY = dy; root(e).dispatchEvent(ev); }
      tickW(e);
      ok('7c rueda con NaN, ±Infinity y 0 se ignora', zoom(e) === 1, String(zoom(e)));
      key(e, '+', 0); keyUp(e, '+'); tickW(e);
      ok('7d una + sube exactamente 0.25', zoom(e) === 1.25, String(zoom(e)));
      e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true })); tickW(e);
      ok('7e Ctrl + no cambia el zoom del juego', zoom(e) === 1.25, String(zoom(e)));
      e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: '-', repeat: true, bubbles: true })); tickW(e);
      ok('7f una tecla - repetida (autorepetición) se ignora', zoom(e) === 1.25, String(zoom(e)));
      click(e.w, $(e, '#city-pause'));
      for (let i = 0; i < 10; i++) click(e.w, cx(e, 'zoomin'));
      ok('7g Acercar 10 veces desde la pausa: tope 1.75', zoom(e) === 1.75, String(zoom(e)));
      for (let i = 0; i < 10; i++) click(e.w, cx(e, 'zoomout'));
      ok('7h Alejar 10 veces: mínimo 1', zoom(e) === 1, String(zoom(e)));
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      click(e.w, $(e, '#city-pause'));
      root(e).dispatchEvent(new e.w.WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })); click(e.w, cx(e, 'pauseclose')); tickW(e);
      ok('7i la rueda con la pausa abierta no deja pasos pendientes que se apliquen al cerrar', zoom(e) === 1, String(zoom(e)));
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      key(e, '+'); click(e.w, cx(e, 'sheetclose')); tickW(e);
      ok('7j + pulsada con la hoja abierta no se aplica al cerrar', zoom(e) === 1, String(zoom(e)));
      e.w.close(); }

    // ---- 8. Razones de pausa del mundo tras volver de una ronda (la ciudad no debe quedar congelada)
    { e = boot({ seed: base() }); await enter(e);
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      click(e.w, cx(e, 'practice')); await tick();
      await back(e);
      ok('8a tras Practicar y volver, el mundo no conserva ninguna razón de pausa (solo así vuelve a dibujar)', e.st.reasons.size === 0, [...e.st.reasons].join());
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      click(e.w, $(e, '#city-pause'));
      startRepair(e);   // equivale a Repaso desde la pausa (cityClosePause(true) + startRound)
      await back(e);
      ok('8b tras volver con la pausa abierta al suspender: pausa cerrada y sin razón "pause" en el mundo', !pauseOpen(e) && e.st.reasons.size === 0, [...e.st.reasons].join());
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      startRepair(e); startRepair(e);
      await back(e);
      ok('8c dos rondas seguidas sin pasar por la ciudad: al volver solo hay una reanudación', e.st.creates === 1 && e.st.reasons.size === 0, e.st.creates + ' ' + [...e.st.reasons].join());
      e.w.close(); }

    // ---- 9. Revisión final: hoja como diálogo, reanudación en orden, botón de acción y zoom con feedback
    { e = boot({ seed: base({ city: { prologue: true } }) }); await enter(e);
      api(e).teleport(-6, -2.5); click(e.w, $(e, '#city-act'));
      const sh = $(e, '#city-sheet'), lab = sh.getAttribute('aria-labelledby');
      ok('9a la hoja es un diálogo modal etiquetado por su título', sh.getAttribute('role') === 'dialog' && sh.getAttribute('aria-modal') === 'true' && !!lab && !!e.d.getElementById(lab) && e.d.getElementById(lab).textContent.length > 0, String(lab));
      ok('9b con la hoja abierta el HUD queda inerte y el botón de acción se oculta (clase sheet-open)', $(e, '#city-ui-main').hasAttribute('inert') && root(e).classList.contains('sheet-open'));
      click(e.w, btnText(e, /^Cerrar$/, '#city-sheet'));
      ok('9c al cerrar la hoja el HUD vuelve a ser interactivo', !$(e, '#city-ui-main').hasAttribute('inert') && !root(e).classList.contains('sheet-open'));
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      startRepair(e); e.st.calls.length = 0; await back(e);
      const iUn = e.st.calls.findIndex((c) => c[0] === 'setPaused' && c[1] === 'suspended' && c[2] === false), iRs = e.st.calls.findIndex((c) => c[0] === 'resize');
      ok('9d al reanudar se quita la pausa "suspended" ANTES de redimensionar (si no, resize no hace nada)', iUn >= 0 && iRs >= 0 && iUn < iRs, JSON.stringify(e.st.calls.slice(0, 6)));
      e.w.close(); }
    { const D2 = D.districts.M02; const taught = {}; D2.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
      const all = {}; for (let i = 1; i <= 23; i++) all['M02:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1];
      e = boot({ seed: base({ topics: all, city: { prologue: true, taught } }) }); await enter(e);
      api(e).teleport(D2.tower.x, D2.tower.z + D2.tower.d / 2 + 1.2); click(e.w, $(e, '#city-act'));
      ok('9e la torre abre el jefe con la ciudad suspendida', !!$(e, '.prompt') && root(e).hidden);
      let g = 0; while ($(e, '.prompt') && g++ < 30) { const q = findQ(e.w, e.d); click(e.w, [...e.d.querySelectorAll('.opt')].find((x) => norm(x.querySelector('span:last-child').textContent) === norm(correctText(q)))); }
      await back(e);
      const cel = !$(e, '#city-sheet').hidden && /Planos/.test($(e, '#city-sheet').textContent); click(e.w, btnText(e, /^Cerrar$/, '#city-sheet'));
      ok('9f tras el jefe aparece la celebración y al cerrarla la ciudad queda sin razones de pausa (hoja ni pausa)', cel && e.st.reasons.size === 0, [...e.st.reasons].join());
      e.w.close(); }
    { e = boot({ seed: base() }); await enter(e);
      click(e.w, $(e, '#city-pause'));
      const zin = btnText(e, /^Acercar$/, '#city-pausebox'), zout = btnText(e, /^Alejar$/, '#city-pausebox'), live = () => $(e, '#city-zoom');
      ok('9g la pausa muestra el nivel de zoom en una región aria-live y "Alejar" está desactivado en 100 %', !!live() && live().getAttribute('aria-live') === 'polite' && /100 %/.test(live().textContent) && zout.disabled === true, live() && live().textContent);
      click(e.w, zin);
      ok('9h "Acercar" actualiza el texto (125 %) y activa "Alejar"', /125 %/.test(live().textContent) && !btnText(e, /^Alejar$/, '#city-pausebox').disabled);
      for (let i = 0; i < 4; i++) click(e.w, btnText(e, /^Acercar$/, '#city-pausebox'));
      ok('9i en 175 % "Acercar" queda desactivado', /175 %/.test(live().textContent) && btnText(e, /^Acercar$/, '#city-pausebox').disabled === true, live().textContent);
      e.w.close(); }

    // ---- 10. La lección se abre desde arriba (título visible) y no salta al último botón
    { e = boot({ seed: base() }); await enter(e);
      const scrolled = []; e.w.Element.prototype.scrollIntoView = function () { scrolled.push(this.closest && this.closest('#city-sheet') ? 'hoja' : 'otro'); };
      api(e).teleport(m01.x, m01.z + 1); click(e.w, $(e, '#city-act'));
      const sh = $(e, '#city-sheet');
      ok('10a al abrir la lección la hoja empieza arriba (scrollTop = 0) y el foco queda en "Practicar"', sh.scrollTop === 0 && e.d.activeElement && /^Practicar$/.test(e.d.activeElement.textContent), sh.scrollTop + ' ' + (e.d.activeElement && e.d.activeElement.textContent));
      ok('10b enfocar un botón de la hoja no la desplaza (no se llama a scrollIntoView dentro de la hoja)', !scrolled.includes('hoja'), scrolled.join());
      sh.scrollTop = 200; click(e.w, btnText(e, /^Cerrar$/, '#city-sheet')); click(e.w, $(e, '#city-act'));
      ok('10c al volver a abrir otra hoja empieza de nuevo arriba', $(e, '#city-sheet').scrollTop === 0);
      e.w.close(); }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length + ' de ' + results.length : 'REVIEW_GAPS OK (' + results.length + ')');
  process.exit(fails.length ? 1 : 0);
})();
