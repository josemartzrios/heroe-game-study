// Ataque a lo nuevo de Ciudad Núcleo 2D: input real, CityWorld2D, movimiento a 14 m/s, batalla/virtudes y migrate hostil.
// Uso: node tests/adv/review_attack.cjs [SEED=20261112] [SCALE=1]   (sale con 1 si algo falla). SCALE multiplica fuzz y rondas.
// Cientos de ventanas jsdom en un solo proceso agotan los 2 GB por defecto de V8: se relanza con más heap.
if (!process.env.RA_CHILD) {
  const r = require('child_process').spawnSync(process.execPath, ['--max-old-space-size=6144', __filename, ...process.argv.slice(2)], { stdio: 'inherit', env: Object.assign({}, process.env, { RA_CHILD: '1' }) });
  process.exit(r.status === null ? 134 : r.status);
}
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const L = require('./lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const SEED = parseInt(process.argv[2] || '20261112', 10), SCALE = parseFloat(process.argv[3] || '1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

const R = { adv: 0, advBroken: 0, props: [], fuzz: [], broken: [] };
function note(kind, name, msg) { R.broken.push(kind + ' ' + name + ' :: ' + String(msg).slice(0, 400)); console.log('  ROTURA [' + kind + '] ' + name + ' :: ' + String(msg).slice(0, 400)); }
// ATAQUE puntual: fn devuelve null/undefined si resiste o un string con el problema (lanzar también cuenta)
async function attack(name, fn) {
  R.adv++;
  let msg = null;
  try { msg = await fn(); } catch (e) { msg = 'excepción: ' + (e && e.stack ? String(e.stack).split('\n').slice(0, 3).join(' | ') : e); }
  if (msg) { R.advBroken++; note('ADV', name, msg); } else console.log('  ok  ' + name);
}
// Propiedad fast-check con semilla registrada
function prop(name, arb, pred, runs) {
  runs = Math.max(1, Math.round((runs || 1000) * SCALE));
  const out = fc.check(fc.property(arb, pred), { numRuns: runs, seed: SEED, verbose: 0 });
  R.props.push({ name, runs, failed: out.failed });
  if (out.failed) note('PROP', name, 'seed=' + SEED + ' contraejemplo mínimo=' + JSON.stringify(out.counterexample, (k, v) => (typeof v === 'number' && !isFinite(v)) || Object.is(v, -0) ? String(v) : v) + ' → ' + (out.error && out.error.message || out.error));
  else console.log('  ok  [' + runs + '] ' + name);
}
async function propAsync(name, arb, pred, runs) {
  runs = Math.max(1, Math.round((runs || 1000) * SCALE));
  const out = await fc.check(fc.asyncProperty(arb, pred), { numRuns: runs, seed: SEED, verbose: 0 });
  R.props.push({ name, runs, failed: out.failed });
  if (out.failed) note('PROP', name, 'seed=' + SEED + ' contraejemplo mínimo=' + JSON.stringify(out.counterexample, (k, v) => (typeof v === 'number' && !isFinite(v)) || Object.is(v, -0) ? String(v) : v) + ' → ' + (out.error && out.error.message || out.error));
  else console.log('  ok  [' + runs + '] ' + name);
}
const msgOf = (e) => (e && e.message) || String(e);

// =====================================================================================================
// 1. INPUT hostil
// =====================================================================================================
const CI = require('../../city/input.js');
let SHARED = null;   // un solo JSDOM para las propiedades (miles de ejecuciones): cada ejecución crea y destruye su propio CityInput
function inputSetup(over = {}) {
  const dom = over.shared && SHARED ? SHARED : new JSDOM('<!doctype html><body><div id="root"><button id="hud" data-hud>HUD</button></div><input id="inp"></body>', { pretendToBeVisual: true });
  if (over.shared) SHARED = dom;
  const w = dom.window, d = w.document, root = d.getElementById('root');
  root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844, x: 0, y: 0 });
  w.Element.prototype.setPointerCapture = function () {}; w.Element.prototype.releasePointerCapture = function () {};
  const clock = { t: 0 }, act = { v: true };
  const inp = CI.create(root, { safe: () => over.safe || { left: 0, bottom: 0 }, isFree: (el) => !(el.closest && el.closest('[data-hud]')), now: () => clock.t, isActive: () => act.v });
  // evento genérico con propiedades forzadas: así llegan NaN/Infinity que PointerEvent/WheelEvent coaccionarían
  const raw = (type, target, props) => { const ev = new w.Event(type, { bubbles: true, cancelable: true }); for (const k in props) Object.defineProperty(ev, k, { value: props[k], configurable: true }); target.dispatchEvent(ev); return ev; };
  return { w, d, root, inp, clock, act, raw, hud: d.getElementById('hud'), inpEl: d.getElementById('inp') };
}
const NUMS = [0, -0, 1, 5, 17, 50, 100, 150, 200, 389, 390, 700, 843, 844, -1e3, 1e3, 1e308, -1e308, NaN, Infinity, -Infinity, 5e-324];
const numA = fc.oneof({ weight: 6, arbitrary: fc.integer({ min: -50, max: 450 }) }, { weight: 2, arbitrary: fc.constantFrom(...NUMS) });
const yA = fc.oneof({ weight: 6, arbitrary: fc.integer({ min: -50, max: 900 }) }, { weight: 2, arbitrary: fc.constantFrom(...NUMS) });
const idA = fc.constantFrom(0, 1, 2, 3, 4, -1, NaN, 99);
const KEYS = ['w', 'a', 's', 'd', 'W', 'A', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Shift', 'e', 'E', 'Enter', 'Escape', '+', '=', '-', '_', 'Control', 'Tab', '', 'Dead', '😀', '\u0000'];
const evA = fc.oneof(
  fc.record({ t: fc.constant('pd'), id: idA, x: numA, y: yA, on: fc.constantFrom('root', 'root', 'hud', 'inp') }),
  fc.record({ t: fc.constant('pm'), id: idA, x: numA, y: yA }),
  fc.record({ t: fc.constant('pu'), id: idA, win: fc.boolean() }),
  fc.record({ t: fc.constant('pc'), id: idA, win: fc.boolean() }),
  fc.record({ t: fc.constant('wh'), dy: fc.constantFrom(...NUMS, 120, -120, 3, -3), mode: fc.constantFrom(0, 1, 2, 99, NaN), adv: fc.integer({ min: 0, max: 400 }) }),
  fc.record({ t: fc.constant('kd'), k: fc.constantFrom(...KEYS), ctrl: fc.boolean(), rep: fc.boolean() }),
  fc.record({ t: fc.constant('ku'), k: fc.constantFrom(...KEYS) }),
  fc.record({ t: fc.constant('focus'), on: fc.boolean() }),
  fc.record({ t: fc.constant('act'), v: fc.boolean() }),
  fc.record({ t: fc.constant('eat') }),
  fc.record({ t: fc.constant('dispose') })
);
function applyEv(T, ev) {
  const { w, root } = T;
  switch (ev.t) {
    case 'pd': T.raw('pointerdown', ev.on === 'root' ? root : ev.on === 'hud' ? T.hud : T.inpEl, { pointerId: ev.id, clientX: ev.x, clientY: ev.y }); break;
    case 'pm': T.raw('pointermove', root, { pointerId: ev.id, clientX: ev.x, clientY: ev.y }); break;
    case 'pu': T.raw('pointerup', ev.win ? w : root, { pointerId: ev.id, clientX: 0, clientY: 0 }); break;
    case 'pc': T.raw('pointercancel', ev.win ? w : root, { pointerId: ev.id, clientX: 0, clientY: 0 }); break;
    case 'wh': T.clock.t += ev.adv; T.raw('wheel', root, { deltaY: ev.dy, deltaMode: ev.mode, deltaX: 0 }); break;
    case 'kd': w.dispatchEvent(new w.KeyboardEvent('keydown', { key: ev.k, ctrlKey: ev.ctrl, repeat: ev.rep, bubbles: true })); break;
    case 'ku': w.dispatchEvent(new w.KeyboardEvent('keyup', { key: ev.k, bubbles: true })); break;
    case 'focus': if (ev.on) T.inpEl.focus(); else T.inpEl.blur(); break;
    case 'act': T.act.v = ev.v; break;
    case 'eat': T.inp.consumeZoom(); T.inp.consumeAction(); T.inp.consumePause(); break;
    case 'dispose': T.inp.dispose(); T.disposed = true; break;
  }
}
const fin = Number.isFinite;
function inputInvariants(T) {
  const i = T.inp.intent(), j = T.inp.joy();
  if (![i.mx, i.mz, i.mag].every(fin)) return 'intent no finito ' + JSON.stringify(i);
  if (i.mag > 1 + 1e-9 || Math.abs(i.mx) > 1 + 1e-9 || Math.abs(i.mz) > 1 + 1e-9) return 'intent mag>1 ' + JSON.stringify(i);
  if (typeof i.run !== 'boolean') return 'run no booleano';
  if (![j.x, j.y, j.kx, j.ky].every(fin)) return 'joy() no finito ' + JSON.stringify(j);
  if (Math.hypot(j.kx, j.ky) > 56 + 1e-6) return 'botón de joy fuera del radio ' + JSON.stringify(j);
  if (T.disposed && (i.mag !== 0 || j.on)) return 'dispuesto pero activo ' + JSON.stringify(i);
  return null;
}
let zoomPicked = 0;
function runInputSeq(seq, release) {
  const T = inputSetup({ shared: true }); T.inpEl.blur();
  try {
    let n = 0;
    for (const ev of seq) {
      applyEv(T, ev); n++;
      const bad = inputInvariants(T); if (bad) throw new Error('tras ' + JSON.stringify(ev) + ' (#' + n + '): ' + bad);
      if (ev.t === 'eat' || n % 7 === 0) {
        const z = T.inp.consumeZoom();
        if (!fin(z.factor) || !(z.factor > 0)) throw new Error('consumeZoom().factor=' + z.factor + ' tras ' + JSON.stringify(ev));
        if (!fin(z.steps) || Math.abs(z.steps) > seq.length) throw new Error('consumeZoom().steps=' + z.steps);
        zoomPicked++;
      }
    }
    if (release) {
      for (const id of [0, 1, 2, 3, 4, -1, NaN, 99]) { applyEv(T, { t: 'pu', id, win: true }); applyEv(T, { t: 'pc', id, win: true }); }
      for (const k of KEYS) applyEv(T, { t: 'ku', k });
      T.inpEl.blur();
      const i = T.inp.intent(), j = T.inp.joy();
      if (!T.disposed && (i.mag !== 0 || i.run || j.on)) throw new Error('quedó pegado tras soltar todo: ' + JSON.stringify(i) + ' joy.on=' + j.on);
      // tras soltar, un toque nuevo debe volver a funcionar
      if (!T.disposed) { applyEv(T, { t: 'pd', id: 7, x: 100, y: 700, on: 'root' }); applyEv(T, { t: 'pm', id: 7, x: 156, y: 700 }); if (T.inp.intent().mag < 0.99) throw new Error('la palanca no revive tras soltar todo: ' + JSON.stringify(T.inp.intent())); }
    }
  } finally { try { T.inp.dispose(); } catch (e) {} }
}

// =====================================================================================================
// 2. CityWorld2D con canvas falso
// =====================================================================================================
function worldFakes(over = {}) {
  const f = { pend: new Map(), nextId: 1, rafCalls: 0, listeners: {}, draws: [], rects: [], maps: [], threw: [], bad: [] };
  f.raf = (cb) => { f.rafCalls++; const id = f.nextId++; f.pend.set(id, cb); return id; };
  f.caf = (id) => { f.pend.delete(id); };
  f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); };
  const mkCtx = (cv) => new Proxy({ canvas: cv, fillStyle: '#000' }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'drawImage') return (img, ...a) => { f.draws.push({ cv, img, a }); };
      if (k === 'fillRect') return (x, y, w, h) => { f.rects.push({ cv, x, y, w, h, c: t.fillStyle }); };
      return () => {};
    },
    set(t, k, v) { if (k === 'shadowBlur' || k === 'filter' || (k === 'globalCompositeOperation' && v !== 'source-over')) f.bad.push(k); t[k] = v; return true; },
  });
  const mkCanvas = (isMap) => { const cv = { width: 0, height: 0, getContext() { return cv.__c || (cv.__c = mkCtx(cv)); } }; if (isMap) f.maps.push(cv); return cv; };
  f.doc = { createElement: () => mkCanvas(true) };
  f.canvas = Object.assign(mkCanvas(false), { clientWidth: 390, clientHeight: 844, parentNode: null, addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; } });
  f.state = { hero: { x: 0, z: 8, face: 'up', speed: 0 }, zoom: 1, flags: { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: false, lit: 0 } };
  f.opts = Object.assign({ doc: f.doc, raf: f.raf, caf: f.caf, pixelRatio: 3, search: '', reducedMotion: false, tick: () => {}, state: () => f.state }, over.opts || {});
  return f;
}
function pumpWorld(f, n, t0) { let ts = t0 || 1000; for (let i = 0; i < n && f.pend.size; i++) { ts += 16; try { f.run(ts); } catch (e) { f.threw.push(msgOf(e)); return false; } } return true; }
const mapPx = (f) => f.maps.reduce((m, c) => Math.max(m, c.width * c.height), 0);

// =====================================================================================================
// 3. Movimiento
// =====================================================================================================
// (se carga en main: necesita import() dinámico)

// =====================================================================================================
// 4/5. Páginas reales (batalla, virtudes, migrate, vista)
// =====================================================================================================
function boot(raw, opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { creates: 0, disposed: 0, lastOpts: null, resolve: null, perfNow: 0 };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (raw != null) w.localStorage.setItem(KEY, raw);
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      if (opts.rnd) { let s = opts.rnd; w.Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const q = []; w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; w.cancelAnimationFrame = () => { q.length = 0; };
      if (opts.world) w.__CITY_WORLD__ = { create(canvas, D, sceneId, o) { st.creates++; st.lastOpts = o; return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, encounter: () => Promise.resolve(), dispose() { st.disposed++; } }); } };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const saved = (w) => { try { return JSON.parse(w.localStorage.getItem(KEY)); } catch (e) { return undefined; } };
const nums = (s) => (s || '').match(/\d+/g).map(Number);
const hud = (d, sel) => { const e = d.querySelector(sel); return e ? e.getAttribute('aria-label') : null; };
const hp = (d) => nums(hud(d, '.hpbar'))[0];
const enNow = (d) => nums(hud(d, '.hearts'))[0];
const enMax = (d) => nums(hud(d, '.hearts'))[1];
const gtitle = (d) => { const g = d.querySelector('.gtitle'); return g ? g.textContent.trim() : null; };
const bigXp = (d) => { const e = d.querySelector('#xpc'); return e ? Number(e.dataset.xp) : NaN; };

(async () => {
  const D = (await import('../../city/districts.mjs')).city;
  const CM = require('../../city/move.js');
  const SP = require('../../city/sprites2d.js');
  const W2 = require('../../city/world2d.js');
  const CS = require('../../city/story.js');
  const t00 = Date.now();
  console.log('review_attack seed=' + SEED + ' scale=' + SCALE);

  // ---------------------------------------------------------------- 1. input
  console.log('[1] input hostil');
  await attack('wheel: deltaY NaN/Infinity/1e308/-1e308/0/deltaMode raro no lanza ni deja pasos fuera de ±1 por golpe', () => {
    const T = inputSetup();
    for (const dy of [NaN, Infinity, -Infinity, 1e308, -1e308, 0, -0, 5e-324, '5', null, undefined, {}, [3]]) for (const mode of [0, 1, 2, 77, NaN]) { T.clock.t += 500; T.raw('wheel', T.root, { deltaY: dy, deltaMode: mode }); }
    const z = T.inp.consumeZoom();
    T.w.close();
    return (!fin(z.steps) || Math.abs(z.steps) > 13 || !fin(z.factor)) ? 'steps/factor=' + JSON.stringify(z) : null;
  });
  await attack('wheel: ráfaga en el mismo ms solo cuenta 1 paso (anti-spam), con reloj que retrocede no cuelga', () => {
    const T = inputSetup(); T.clock.t = 1e6;
    for (let i = 0; i < 1000; i++) T.raw('wheel', T.root, { deltaY: -1 });
    T.clock.t = -5; T.raw('wheel', T.root, { deltaY: -1 }); T.clock.t = NaN; T.raw('wheel', T.root, { deltaY: -1 }); T.clock.t = 1e6 + 500; T.raw('wheel', T.root, { deltaY: -1 });
    const z = T.inp.consumeZoom(); T.w.close();
    return z.steps > 3 ? 'steps=' + z.steps + ' (esperado ≤ 3)' : null;
  });
  await attack('pointerId repetido: segundo pointerdown con el mismo id no crea 2 palancas ni mueve el origen', () => {
    const T = inputSetup();
    T.raw('pointerdown', T.root, { pointerId: 1, clientX: 100, clientY: 700 }); T.raw('pointerdown', T.root, { pointerId: 1, clientX: 20, clientY: 400 });
    T.raw('pointermove', T.root, { pointerId: 1, clientX: 156, clientY: 700 });
    const i = T.inp.intent(); T.w.close();
    return Math.abs(i.mx - 1) > 1e-6 ? 'intent=' + JSON.stringify(i) : null;
  });
  await attack('3 dedos libres: pellizco con a,b y un tercer dedo no deja zoom NaN y soltar uno limpia el pellizco', () => {
    const T = inputSetup();
    T.raw('pointerdown', T.root, { pointerId: 1, clientX: 300, clientY: 100 }); T.raw('pointerdown', T.root, { pointerId: 2, clientX: 350, clientY: 100 }); T.raw('pointerdown', T.root, { pointerId: 3, clientX: 320, clientY: 200 });
    T.raw('pointermove', T.root, { pointerId: 3, clientX: 0, clientY: 0 }); T.raw('pointermove', T.root, { pointerId: 2, clientX: 390, clientY: 100 });
    T.raw('pointerup', T.root, { pointerId: 1 });
    T.raw('pointermove', T.root, { pointerId: 2, clientX: 10, clientY: 100 });
    const z = T.inp.consumeZoom(); T.w.close();
    return (!fin(z.factor) || z.factor <= 0) ? 'factor=' + z.factor : null;
  });
  await attack('pellizco con coordenadas NaN/Infinity: el factor sigue finito y >0', () => {
    for (const bad of [NaN, Infinity, -Infinity, 1e308]) {
      const T = inputSetup();
      T.raw('pointerdown', T.root, { pointerId: 1, clientX: 300, clientY: 100 }); T.raw('pointerdown', T.root, { pointerId: 2, clientX: 350, clientY: 100 });
      T.raw('pointermove', T.root, { pointerId: 2, clientX: bad, clientY: 100 }); T.raw('pointermove', T.root, { pointerId: 2, clientX: 360, clientY: 100 });
      const z = T.inp.consumeZoom(); T.w.close();
      if (!fin(z.factor) || z.factor <= 0) return 'clientX=' + bad + ' → factor=' + z.factor;
    }
  });
  await attack('pellizco infinito sin consumir: 2000 movimientos no desbordan el factor acumulado', () => {
    const T = inputSetup();
    T.raw('pointerdown', T.root, { pointerId: 1, clientX: 300, clientY: 100 }); T.raw('pointerdown', T.root, { pointerId: 2, clientX: 301, clientY: 100 });
    for (let i = 0; i < 2000; i++) T.raw('pointermove', T.root, { pointerId: 2, clientX: i % 2 ? 301 : 390, clientY: 100 });
    const z = T.inp.consumeZoom(); T.w.close();
    return (!fin(z.factor) || z.factor <= 0 || z.factor > 1e6) ? 'factor acumulado=' + z.factor : null;
  });
  await attack('teclas pegadas: keydown w + blur de ventana → la palanca de teclado debe soltarse', () => {
    const T = inputSetup(); T.w.dispatchEvent(new T.w.KeyboardEvent('keydown', { key: 'w', bubbles: true })); T.w.dispatchEvent(new T.w.KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
    T.w.dispatchEvent(new T.w.Event('blur')); T.d.dispatchEvent(new T.w.Event('visibilitychange'));
    const i = T.inp.intent(); T.w.close();
    return i.mag !== 0 ? 'tras blur el héroe sigue caminando solo: ' + JSON.stringify(i) : null;
  });
  await attack('tecla pegada por Ctrl: keydown w, luego ctrl+keyup(w) y teclas con mayúsculas (W/Shift cambia key)', () => {
    const T = inputSetup(); const kd = (k, o) => T.w.dispatchEvent(new T.w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o)));
    const ku = (k) => T.w.dispatchEvent(new T.w.KeyboardEvent('keyup', { key: k, bubbles: true }));
    kd('w'); kd('Shift'); kd('W', { shiftKey: true }); ku('Shift'); ku('w'); ku('W');   // con Shift sostenido, 'w' sale como 'W'
    const i = T.inp.intent(); T.w.close();
    return i.mag !== 0 ? 'quedó caminando: ' + JSON.stringify(i) : null;
  });
  await attack('Shift sostenido y soltado antes de la letra (keyup(w) llega como W) no deja tecla pegada', () => {
    const T = inputSetup(); const kd = (k, o) => T.w.dispatchEvent(new T.w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o)));
    const ku = (k) => T.w.dispatchEvent(new T.w.KeyboardEvent('keyup', { key: k, bubbles: true }));
    kd('Shift'); kd('W', { shiftKey: true }); ku('Shift'); ku('w');
    const i = T.inp.intent(); T.w.close();
    return i.mag !== 0 ? 'keydown W / keyup w: ' + JSON.stringify(i) : null;
  });
  await attack('Escape con ctrl/meta, repetición y teclado en <input> enfocado', () => {
    const T = inputSetup(); const kd = (k, o) => T.w.dispatchEvent(new T.w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, o)));
    kd('Escape', { ctrlKey: true }); if (T.inp.consumePause()) return 'Ctrl+Esc pausó';
    for (let i = 0; i < 50; i++) kd('Escape', { repeat: true }); if (T.inp.consumePause()) return 'Esc repetido pausó';
    T.inpEl.focus(); kd('w'); kd('+'); kd('e'); if (T.inp.intent().mag !== 0 || T.inp.consumeZoom().steps !== 0 || T.inp.consumeAction()) return 'escribir en un input movió/zoomeó/actuó';
    T.w.close();
  });
  await attack('eventos tras dispose: nada se acumula y los listeners de ventana ya no existen', () => {
    const T = inputSetup(); T.inp.dispose(); T.inp.dispose();
    for (const ev of [{ t: 'pd', id: 1, x: 100, y: 700, on: 'root' }, { t: 'pm', id: 1, x: 156, y: 700 }, { t: 'wh', dy: -1, mode: 0, adv: 999 }, { t: 'kd', k: 'w', ctrl: false, rep: false }, { t: 'kd', k: 'Escape', ctrl: false, rep: false }, { t: 'kd', k: 'e', ctrl: false, rep: false }, { t: 'kd', k: '+', ctrl: false, rep: false }]) applyEv(T, ev);
    const z = T.inp.consumeZoom(), i = T.inp.intent(); T.disposed = true;
    const bad = inputInvariants(T); T.w.close();
    return (bad || i.mag || z.steps || z.factor !== 1 || T.inp.consumeAction() || T.inp.consumePause() || T.inp.joy().on) ? 'tras dispose: ' + bad + JSON.stringify([i, z]) : null;
  });
  await attack('wheel con isActive=false no hace preventDefault (no secuestra el scroll de la página)', () => {
    const T = inputSetup(); T.act.v = false; const ev = T.raw('wheel', T.root, { deltaY: -100 }); T.w.close();
    return ev.defaultPrevented ? 'preventDefault con la vista inactiva' : null;
  });
  await attack('toque en el margen del sistema y safe hostil (NaN/negativo/string) no crea palanca ni lanza', () => {
    for (const safe of [{ left: NaN, bottom: NaN }, { left: -1e9, bottom: -1e9 }, { left: '30', bottom: '30' }, { left: Infinity, bottom: 0 }, {}]) {
      const T = inputSetup({ safe });
      T.raw('pointerdown', T.root, { pointerId: 1, clientX: 100, clientY: 700 }); T.raw('pointermove', T.root, { pointerId: 1, clientX: 156, clientY: 700 });
      const bad = inputInvariants(T); T.w.close();
      if (bad) return 'safe=' + JSON.stringify(safe) + ': ' + bad;
    }
  });
  prop('input: secuencias aleatorias hostiles mantienen intent finito, mag ≤ 1, joy dentro del radio y consumeZoom finito', fc.array(evA, { minLength: 1, maxLength: 80 }), (seq) => { runInputSeq(seq, false); }, 1500);
  prop('input: tras soltar todos los dedos y teclas nada queda pegado y la palanca revive', fc.array(evA.filter((e) => e.t !== 'dispose' && e.t !== 'act'), { minLength: 1, maxLength: 60 }), (seq) => { runInputSeq(seq, true); }, 1500);

  // vía la vista real: zoom en [1,1.75], hero en bounds, sin cajas, velocidad ≤ 14
  console.log('[1b] input → vista real');
  {
    const e = boot(JSON.stringify({ v: 1, xp: 5000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, city: { run: true, prologue: true, scene: 'M02', at: { x: D.districts.M02.entry.x, z: D.districts.M02.entry.z, yaw: Math.PI } } }), { world: true });   // los eventos hostiles corren dentro de M02: sus cajas y límites son los de la comprobación
    const clk = { t: 1000 }; try { e.w.performance.now = () => clk.t; } catch (x) {}
    e.d.querySelector('[data-act="city"]').dispatchEvent(new e.w.MouseEvent('click', { bubbles: true })); await tick();
    const root = e.d.getElementById('city-root');
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844, x: 0, y: 0 });
    e.w.Element.prototype.setPointerCapture = function () {}; e.w.Element.prototype.releasePointerCapture = function () {};
    const T = { w: e.w, root, clock: clk, hud: root, inpEl: e.d.body, act: { v: true }, raw: (type, target, props) => { const ev = new e.w.Event(type, { bubbles: true, cancelable: true }); for (const k in props) Object.defineProperty(ev, k, { value: props[k], configurable: true }); target.dispatchEvent(ev); return ev; }, inp: { consumeZoom() {}, consumeAction() {}, consumePause() {}, dispose() {} } };
    const boxes = CM.boxesFor(D, 'M02'), r = D.radius;
    let viewBad = null, hs = 0, runs = 0;
    const seqA = fc.array(evA.filter((x) => ['pd', 'pm', 'pu', 'pc', 'wh', 'kd', 'ku'].includes(x.t) && !(x.t === 'kd' && x.k === 'Escape') && !(x.t === 'kd' && x.k === 'e') && !(x.t === 'kd' && x.k === 'E') && !(x.t === 'kd' && x.k === 'Enter')), { minLength: 5, maxLength: 60 });
    prop('vista: tras eventos hostiles zoom∈[1,1.75] finito, héroe en bounds fuera de cajas y velocidad ≤ 14', seqA, (seq) => {
      runs++;
      if (!e.st.lastOpts) throw new Error('mundo no creado');
      const s0 = e.st.lastOpts.state();
      for (const ev of seq) {
        if (ev.t === 'wh') T.clock.t += ev.adv;
        applyEv(T, ev);
        clk.t += 3;
        e.st.lastOpts.tick(16);
        const s = e.st.lastOpts.state();
        if (!fin(s.zoom) || s.zoom < 1 || s.zoom > 1.75) throw new Error('zoom=' + s.zoom + ' tras ' + JSON.stringify(ev));
        const h = s.hero;
        if (![h.x, h.z, h.speed].every(fin)) throw new Error('héroe no finito ' + JSON.stringify(h));
        if (h.speed > 14 + 1e-9) throw new Error('velocidad ' + h.speed);
        if (h.x < D.districts.M02.bounds.minX + r - 1e-6 || h.x > D.districts.M02.bounds.maxX - r + 1e-6 || h.z < D.districts.M02.bounds.minZ + r - 1e-6 || h.z > D.districts.M02.bounds.maxZ - r + 1e-6) throw new Error('fuera de bounds ' + JSON.stringify(h));
        if (['up', 'down', 'left', 'right'].indexOf(h.face) < 0) throw new Error('face=' + h.face);
        for (const b of boxes) { const cx = Math.min(b.maxX, Math.max(b.minX, h.x)), cz = Math.min(b.maxZ, Math.max(b.minZ, h.z)); if (Math.hypot(h.x - cx, h.z - cz) < r - 1e-5) throw new Error('héroe dentro de caja ' + JSON.stringify(h)); }
      }
      // soltar todo
      for (const id of [0, 1, 2, 3, 4, -1, NaN, 99]) { applyEv(T, { t: 'pu', id, win: true }); applyEv(T, { t: 'pc', id, win: true }); }
      for (const k of KEYS) applyEv(T, { t: 'ku', k });
      if (e.errors.length) throw new Error('error de consola: ' + e.errors[0]);
    }, 300);
    await attack('vista: la página no registró errores de consola durante los ataques de input', () => e.errors.length ? e.errors[0] : null);
    e.w.close();
  }

  // ---------------------------------------------------------------- 2. CityWorld2D
  console.log('[2] CityWorld2D');
  const HOST = [NaN, Infinity, -Infinity, 1e308, -1e308, -0, 0, '12', '', 'x'.repeat(10000), null, undefined, {}, [], true, -5, 5e-324, { __proto__: null }, JSON.parse('{"__proto__":{"x":1}}'), 'up', '__proto__', 1e5];
  const hostFlags = [null, undefined, 5, 'str', [], JSON.parse('{"__proto__":{"restored":true}}'), JSON.parse('{"repairs":null,"stars":null,"beatenToday":null,"apprenticesVisible":null,"lit":null}'),
    { restored: 1, lit: 1e308, stars: JSON.parse('{"__proto__":{"m01":9}}'), repairs: 'r01', beatenToday: 'bit', apprenticesVisible: [] }, { lit: NaN, stars: { m01: NaN, m02: -5, m03: 'x', m04: 1e308 } }, { stars: 7, repairs: 7 }];
  await attack('state() hostil: hero con NaN/Infinity/strings/objetos y zoom raro no lanza, 1 rAF máx, ≤200 partículas', async () => {
    for (const zoom of [NaN, 1e308, -1e308, -3, 0, Infinity, '2', null, undefined, {}, 1.75, 1]) for (const hv of HOST) {
      const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
      f.state = { hero: { x: hv, z: hv, face: hv, speed: hv }, zoom, flags: hostFlags[Math.abs(HOST.indexOf(hv)) % hostFlags.length] };
      api.dissolve('bit'); if (!pumpWorld(f, 5)) return 'lanzó con hero=' + (() => { try { return String(hv).slice(0, 20); } catch (e) { return typeof hv; } })() + ' zoom=' + String(zoom) + ': ' + f.threw[0];
      if (f.pend.size > 1 || api.stats().part > 200) return 'rAF pendientes/partículas fuera de rango';
      api.dispose();
    }
  });
  await attack('state() hostil: flags nulos / __proto__ / tipos erróneos no lanza', async () => {
    for (let i = 0; i < hostFlags.length; i++) {
      for (const restored of [false, true]) {
        const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
        f.state = { hero: { x: D.districts.M02.entry.x, z: D.districts.M02.mentors[0].z, face: 'up', speed: 1 }, zoom: 1.5, flags: hostFlags[i] };
        if (!pumpWorld(f, 3)) return 'flags #' + i + ' lanzó: ' + f.threw[0];
        if (hostFlags[i] && typeof hostFlags[i] === 'object') f.state.flags = Object.assign(hostFlags[i], { restored });
        if (!pumpWorld(f, 3)) return 'flags #' + i + ' (restored ' + restored + ') lanzó: ' + f.threw[0];
        api.dispose();
      }
    }
  });
  await attack('state() devuelve null/undefined/sin hero/hero primitivo: el bucle sigue vivo sin lanzar', async () => {
    for (const s of [null, undefined, {}, { hero: null }, { hero: 5 }, { hero: 'abc' }, { hero: [] }, { zoom: 1 }]) {
      const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts); f.state = s;
      if (!pumpWorld(f, 4)) return 'lanzó con state=' + JSON.stringify(s) + ': ' + f.threw[0];
      if (f.pend.size !== 1) return 'sin state válido el bucle murió (rAF pend=' + f.pend.size + ') con ' + JSON.stringify(s);
      api.dispose();
    }
  });
  await attack('opts.state lanza una vez: el bucle debe sobrevivir o al menos no dejar rAF colgado/estado corrupto', async () => {
    const f = worldFakes(); SP.init(f.doc); let n = 0; f.opts.state = () => { if (n++ === 2) throw new Error('boom'); return f.state; };
    const api = await W2.create(f.canvas, D, 'M02', f.opts); const ok1 = pumpWorld(f, 6);
    if (!ok1 && f.pend.size === 0) return 'tras una excepción en el cuadro (state() lanzó) el mundo queda congelado: sin rAF pendiente hasta que algo llame a resize/setPaused (falta try/catch en loop)';
    api.dispose();
  });
  await attack('resize extremo: 1×1, 100000×1, 1×100000, 0, NaN, negativos y 1e9: canvas del mapa ≤ 4 Mpx y canvas principal dentro de límites de navegador', async () => {
    const sizes = [[1, 1], [100000, 1], [1, 100000], [0, 0], [0, 5], [5, 0], [NaN, NaN], [-5, -5], [1e9, 1e9], [Infinity, 10], [390, 844], [0.4, 0.4]];
    for (const [w, h] of sizes) {
      const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
      f.canvas.clientWidth = w; f.canvas.clientHeight = h; api.resize(); if (!pumpWorld(f, 3)) return 'resize ' + w + '×' + h + ' lanzó: ' + f.threw[0];
      if (mapPx(f) > 4e6) return 'canvas del mapa ' + mapPx(f) + ' px';
      const cw = f.canvas.width, ch = f.canvas.height;
      if (!(cw >= 0 && ch >= 0) || cw > 32767 || ch > 32767 || cw * ch > 268435456 || !fin(cw) || !fin(ch)) return 'tamaño pedido ' + w + '×' + h + ' → canvas principal ' + cw + '×' + ch + ' (fuera de lo que soporta un navegador: se queda en blanco)';
      api.dispose();
    }
  });
  await attack('dispose en mitad de encounter: la promesa resuelve, el timer se limpia y no se agenda nada más', async () => {
    const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
    let res = 0; const p = api.encounter('bit').then(() => { res++; }); api.encounter('kernel').then(() => { res++; }); pumpWorld(f, 3);
    api.dispose(); await p; await tick(2);
    const r1 = f.rafCalls; api.encounter('bit').then(() => { res++; }); api.dissolve('bit'); api.resize(); api.setPaused('a', true); api.setPaused('a', false); await tick(2);
    if (res !== 3) return 'promesas resueltas=' + res + ' (esperado 3)';
    if (f.rafCalls !== r1 || f.pend.size) return 'agendó cuadros tras dispose';
    await sleep(1700);
    if (f.rafCalls !== r1) return 'el timer del encounter agendó cuadros tras dispose';
  });
  await attack('dispose en mitad de dissolve y con cuadros pendientes: cb stale no dibuja ni agenda', async () => {
    const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts); api.dissolve('bit'); pumpWorld(f, 3);
    const stale = [...f.pend.values()][0]; api.dispose(); const d0 = f.draws.length, r0 = f.rafCalls;
    if (stale) stale(99999);
    if (f.draws.length !== d0 || f.rafCalls !== r0) return 'cb stale tras dispose dibujó/agendó';
  });
  await attack('onLost durante encounter + dispose reentrante desde onLost no lanza ni deja el listener', async () => {
    const f = worldFakes(); SP.init(f.doc); let api; f.opts.onLost = () => { api.dispose(); api.dispose(); };
    api = await W2.create(f.canvas, D, 'M02', f.opts); const p = api.encounter('bit'); f.listeners.contextlost && f.listeners.contextlost({}); await p;
    if (f.listeners.contextlost) return 'listener contextlost sigue';
  });
  await attack('dispose reentrante: opts.tick llama a dispose dentro del cuadro y el cuadro no sigue dibujando', async () => {
    const f = worldFakes(); SP.init(f.doc); let api; f.opts.tick = () => { api.dispose(); }; api = await W2.create(f.canvas, D, 'M02', f.opts);
    const d0 = f.draws.length; if (!pumpWorld(f, 2)) return 'lanzó ' + f.threw[0];
    if (f.draws.length !== d0 || f.pend.size) return 'dibujó o agendó tras dispose desde tick';
  });
  await attack('ids hostiles en encounter/dissolve (__proto__, constructor, toString) no rompen la cámara ni las partículas', async () => {
    for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '', undefined, null, 5, {}]) {
      const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts); pumpWorld(f, 2);
      api.dissolve(id); api.encounter(id); f.draws.length = 0; f.rects.length = 0;
      if (!pumpWorld(f, 3)) return 'id=' + String(id) + ' lanzó: ' + f.threw[0];
      const nanDraw = f.draws.some((d) => d.a.some((v) => typeof v === 'number' && !fin(v))) || f.rects.some((r) => ![r.x, r.y, r.w, r.h].every(fin));
      if (nanDraw) return 'encounter/dissolve(' + JSON.stringify(id) + ') con héroe válido dibuja con NaN (cámara/partículas corruptas por buscar en un {} sin hasOwnProperty)';
      api.dispose();
    }
  });
  await attack('timestamps rAF hostiles (NaN, retroceso, Infinity) no corrompen el reloj ni agotan las partículas', async () => {
    const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
    for (const ts of [100, 116, NaN, 150, 140, Infinity, 200, 216, -5, 300, 316, 332]) { api.dissolve('bit'); if (!f.pend.size) break; try { f.run(ts); } catch (e) { return 'lanzó con ts=' + ts + ': ' + msgOf(e); } }
    const s0 = api.stats(); f.opts.reducedMotion = true; api.resize();   // se apaga el ambiente (chispas de muros y retos) para contar solo las de disolución
    // si el reloj quedó NaN, las partículas ya no mueren: tras 200 cuadros normales deben haber muerto todas
    let ts = 1000; for (let i = 0; i < 200 && f.pend.size; i++) { ts += 16; f.run(ts); }
    if (api.stats().part > 0 && !f.pend.size) return 'sin cuadros';
    if (api.stats().part > 0) return 'tras un ts NaN/Infinity hay ' + api.stats().part + ' partículas inmortales (life=NaN) que bloquean el pool de 200; stats antes=' + JSON.stringify(s0);
    api.dispose();
  });
  await attack('dissolve ×5000 + cuadros: nunca >200 partículas ni contador negativo; pool se recupera', async () => {
    const f = worldFakes(); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts); let mx = 0, mn = 0, ts = 0;
    for (let i = 0; i < 5000; i++) { api.dissolve(D.districts.M02.creatures[i % 6].id); if (f.pend.size) { ts += 16 + (i % 40); f.run(ts); } const p = api.stats().part; mx = Math.max(mx, p); mn = Math.min(mn, p); }
    for (let i = 0; i < 100 && f.pend.size; i++) { ts += 50; f.run(ts); }
    if (mx > 200 || mn < 0) return 'part max=' + mx + ' min=' + mn;
    if (api.stats().part > 12) return 'quedaron ' + api.stats().part + ' partículas (las chispas de muros/retos son ≤ 12)';
    api.dispose();
  });
  await attack('create dos veces con el mismo canvas y dispose cruzado: sin fuga de listeners ni mapas > 4 Mpx', async () => {
    const f = worldFakes(); SP.init(f.doc); const a = await W2.create(f.canvas, D, 'M02', f.opts); const b = await W2.create(f.canvas, D, 'M02', f.opts);
    a.dispose(); const had = !!f.listeners.contextlost; b.dispose();
    if (mapPx(f) > 4e6 && f.maps.some((m) => m.width * m.height > 4e6)) return 'mapa > 4 Mpx';
    if (f.listeners.contextlost) return 'listener contextlost fugado tras dispose de ambos (had=' + had + ')';
  });
  await attack('pixelRatio hostil (NaN, Infinity, 0, negativo, string, 1e9) se limita a [1,1.5]', async () => {
    for (const pr of [NaN, Infinity, -Infinity, 0, -3, '2', 1e9, 0.01, null]) {
      const f = worldFakes({ opts: { pixelRatio: pr } }); SP.init(f.doc); const api = await W2.create(f.canvas, D, 'M02', f.opts);
      if (f.canvas.width > 585 + 1 || f.canvas.height > 1266 + 1 || f.canvas.width < 390 - 1) return 'pixelRatio=' + pr + ' → canvas ' + f.canvas.width + '×' + f.canvas.height;
      api.dispose();
    }
  });
  await propAsync('world2d: state/zoom/tamaños/ts aleatorios nunca lanzan, ≤1 rAF, ≤200 partículas, mapa ≤ 4 Mpx', fc.record({
    hero: fc.record({ x: fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -100, max: 100 })), z: fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -250, max: 80 })), face: fc.constantFrom('up', 'down', 'left', 'right', 'x', undefined, null), speed: fc.oneof(fc.double({ noNaN: false }), fc.constant(0)) }),
    zoom: fc.oneof(fc.double({ noNaN: false }), fc.constant(1.75)),
    cw: fc.oneof(fc.integer({ min: 0, max: 2000 }), fc.constantFrom(1, 100000, NaN, 0)), ch: fc.oneof(fc.integer({ min: 0, max: 3000 }), fc.constantFrom(1, 100000, NaN, 0)),
    restored: fc.boolean(), ops: fc.array(fc.constantFrom('dis', 'enc', 'res', 'pause', 'resume', 'frame', 'frame', 'frame'), { maxLength: 25 }), reduced: fc.boolean()
  }), (c) => {
    const f = worldFakes({ opts: { reducedMotion: c.reduced } }); SP.init(f.doc); let api; let err = null;
    return W2.create(f.canvas, D, 'M02', f.opts).then((a) => {
      api = a; f.state = { hero: c.hero, zoom: c.zoom, flags: { restored: c.restored, lit: 3, stars: {}, repairs: {}, beatenToday: {}, apprenticesVisible: {} } };
      f.canvas.clientWidth = c.cw; f.canvas.clientHeight = c.ch; let ts = 1000;
      for (const op of c.ops) {
        if (op === 'dis') api.dissolve('bit'); else if (op === 'enc') api.encounter('eco'); else if (op === 'res') api.resize(); else if (op === 'pause') api.setPaused('s', true); else if (op === 'resume') api.setPaused('s', false);
        else if (f.pend.size) { ts += 16; try { f.run(ts); } catch (e) { err = msgOf(e); break; } }
        if (f.pend.size > 1) err = 'más de 1 rAF'; if (api.stats().part > 200 || api.stats().part < 0) err = 'part=' + api.stats().part; if (mapPx(f) > 4e6) err = 'mapa ' + mapPx(f);
        if (err) break;
      }
      api.dispose(); if (f.pend.size) err = err || 'rAF tras dispose';
      if (err) throw new Error(err);
    });
  }, 400);

  // ---------------------------------------------------------------- 3. movimiento
  console.log('[3] movimiento a 14 m/s');
  const r = D.radius, B = D.districts.M02.bounds, FUZZ_STEPS = Math.round(400000 * SCALE);
  const rng = L.rng(SEED);
  const boxesBy = { false: CM.boxesFor(D, 'M02'), true: CM.boxesFor(D, 'M02') };   // M02 ya no tiene puente: las cajas no dependen de la restauración
  const clearOf = (x, z, boxes, m) => boxes.every((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return Math.hypot(x - cx, z - cz) >= r + (m || 0); });
  const DTS = [0.05, 0.05, 0.05, 0.016, 0.033, 1e-9, 0, -0, 0.05000001, 0.1, 1, 1e6, 1e308, Infinity, -Infinity, NaN, -1, 5e-324, 0.0001, 0.049999];
  const dtOf = () => { const u = rng(); return u < 0.55 ? 0.05 * rng() : u < 0.8 ? 0.05 : DTS[rng.int(0, DTS.length - 1)]; };
  const ICH = [NaN, Infinity, -Infinity, 1e308, '1', null, undefined, {}, 2, -2, 0, -0, 1, -1];
  let steps = 0, viol = null, hostileLog = [];
  const t0m = Date.now();
  walker: for (let wk = 0; steps < FUZZ_STEPS; wk++) {
    const restored = wk % 2 === 0, boxes = boxesBy[restored];
    let x, z, g = 0; do { x = B.minX + r + rng() * (B.maxX - B.minX - 2 * r); z = B.minZ + r + rng() * (B.maxZ - B.minZ - 2 * r); g++; } while (!clearOf(x, z, boxes, 1e-3) && g < 1000);
    if (wk % 7 === 3) { const bx = boxes[rng.int(0, boxes.length - 1)]; x = bx.minX - r - 1e-4; z = (bx.minZ + bx.maxZ) / 2 + (rng() - 0.5) * 6; x = Math.min(Math.max(x, B.minX + r), B.maxX - r); z = Math.min(Math.max(z, B.minZ + r), B.maxZ - r); if (!clearOf(x, z, boxes, 1e-6)) continue; }
    let s = { x, z, yaw: 0, vx: wk % 5 === 0 ? (rng() - 0.5) * 60 : 0, vz: wk % 5 === 0 ? (rng() - 0.5) * 60 : 0, speed: 0 };
    let ang = rng() * Math.PI * 2, hold = 0, mag = 1, run = true;
    for (let i = 0; i < 8000 && steps < FUZZ_STEPS; i++, steps++) {
      if (hold-- <= 0) { hold = rng.int(1, 120); ang = rng() < 0.3 ? Math.round(ang / (Math.PI / 2)) * Math.PI / 2 + (rng() - 0.5) * 0.02 : rng() * Math.PI * 2; mag = rng() < 0.7 ? 1 : rng(); run = rng() < 0.75; }
      let it = { mx: Math.cos(ang) * mag, mz: Math.sin(ang) * mag, run };
      if (rng() < 0.002) it = { mx: ICH[rng.int(0, ICH.length - 1)], mz: ICH[rng.int(0, ICH.length - 1)], run: rng() < 0.5 };
      if (rng() < 0.01) it = { mx: rng() * 4 - 2, mz: rng() * 4 - 2, run: true };   // vector fuera de la unidad
      const dt = dtOf(), canRun = rng() < 0.9;
      const ns = CM.step(s, it, dt, boxes, { canRun, radius: r, safe: { x: s.x, z: s.z, yaw: s.yaw } });
      const fault = (m) => { viol = { m, wk, i, restored, s, it, dt, ns }; };
      if (![ns.x, ns.z, ns.yaw, ns.vx, ns.vz, ns.speed].every(fin)) { fault('salida no finita'); break walker; }
      if (ns.x < B.minX + r - 2e-6 || ns.x > B.maxX - r + 2e-6 || ns.z < B.minZ + r - 2e-6 || ns.z > B.maxZ - r + 2e-6)   /* 2e-6 ≈ EPS de move.js */ { fault('fuera de bounds'); break walker; }
      if (!clearOf(ns.x, ns.z, boxes, -1e-6)) { fault('dentro de una caja'); break walker; }
      if (ns.speed > CM.RUN + 1e-9) { fault('velocidad > RUN'); break walker; }
      if (Math.hypot(ns.x - s.x, ns.z - s.z) > CM.RUN * 0.05 + 1e-6) { fault('salto > 0.7 m en un paso'); break walker; }
      if (typeof dt === 'number' && dt >= 0 && fin(dt) === false && 0) break;
      s = ns;
    }
  }
  R.fuzz.push({ name: 'CityMove.step', n: steps, bad: viol ? 1 : 0, ms: Date.now() - t0m });
  if (viol) note('FUZZ', 'CityMove.step', JSON.stringify(viol, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : v));
  else console.log('  ok  CityMove.step: ' + steps + ' pasos, héroe nunca sale de bounds ni entra en cajas (' + (Date.now() - t0m) + ' ms)');

  await attack('muros de 2 m (portales sin distrito), torres y sede: empujar 3 s a 14 m/s desde cada lado y 8 direcciones no atraviesa', () => {
    const targets = [], bx = (o) => ({ minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 });
    D.plaza.portals.filter((q) => !D.districts[q.dist]).forEach((q) => targets.push({ n: 'muro ' + q.dist, sc: 'plaza', b: bx(q) }));
    targets.push({ n: 'sede', sc: 'plaza', b: bx(D.plaza.hq) });
    Object.keys(D.districts).forEach((k) => targets.push({ n: 'torre ' + k, sc: k, b: bx(D.districts[k].tower) }));
    for (const t of targets) {
      const boxes = CM.boxesFor(D, t.sc), SB = CM.scene(D, t.sc).bounds;
      for (let k = 0; k < 16; k++) for (const dt of [0.05, 0.0166, 0.0333, 0.049999]) {
        const a = k * Math.PI / 8, cxm = (t.b.minX + t.b.maxX) / 2, czm = (t.b.minZ + t.b.maxZ) / 2;
        // arranca a 3 m del centro en dirección a, apunta al centro con pequeño sesgo (también a 14 m/s con inercia)
        let x = cxm + Math.cos(a) * ((t.b.maxX - t.b.minX) / 2 + 3), z = czm + Math.sin(a) * ((t.b.maxZ - t.b.minZ) / 2 + 3);
        x = Math.min(Math.max(x, SB.minX + r), SB.maxX - r); z = Math.min(Math.max(z, SB.minZ + r), SB.maxZ - r);
        if (!clearOf(x, z, boxes, 1e-6)) continue;
        let s = { x, z, yaw: 0, vx: 0, vz: 0, speed: 0 };
        for (let i = 0; i < 400; i++) {
          const dx = cxm - s.x, dz = czm - s.z, m = Math.hypot(dx, dz) || 1;
          s = CM.step(s, { mx: dx / m, mz: dz / m, run: true }, dt, boxes, { canRun: true, radius: r, safe: s });
          if (!clearOf(s.x, s.z, boxes, -1e-6)) return t.n + ' atravesado/invadido: ángulo ' + k + ' dt=' + dt + ' pos=' + s.x + ',' + s.z;
        }
      }
    }
  });
  await attack('portal abierto: correr 8 s desde la plaza contra un portal de un distrito que existe no queda atascado ni sale del mundo', () => {
    const boxes = CM.boxesFor(D, 'plaza'), SB = D.plaza.bounds, p = D.plaza.portals.find((q) => D.districts[q.dist]);
    let s = { x: p.back.x, z: p.back.z, yaw: 0, vx: 0, vz: 0, speed: 0 };
    for (let i = 0; i < 160; i++) { const dx = p.x - s.x, dz = p.z - s.z, m = Math.hypot(dx, dz) || 1; s = CM.step(s, { mx: dx / m, mz: dz / m, run: true }, 0.05, boxes, { canRun: true, radius: r, safe: s }); if (s.x < SB.minX || s.x > SB.maxX || s.z < SB.minZ || s.z > SB.maxZ) return 'salió del mundo: ' + s.x + ',' + s.z; }
    return CM.portalAt(D, 'plaza', s.x, s.z) === p.dist ? null : 'no llegó a la boca del portal ' + p.dist + ' (pos=' + s.x + ',' + s.z + ')';
  });
  await attack('héroe dentro de la caja de la torre (guardado inválido) no sale atravesándola', () => {
    const tw = D.districts.M02.tower, boxes = boxesBy.false;
    let s = { x: tw.x, z: tw.z, yaw: 0, vx: 0, vz: 0, speed: 0 };   // aparece dentro de la torre
    for (let i = 0; i < 200; i++) s = CM.step(s, { mx: 0, mz: 1, run: true }, 0.05, boxes, { canRun: true, radius: r, safe: s });
    return clearOf(s.x, s.z, boxes, -1e-6) ? null : 'un héroe que arranca dentro de una caja sale caminando a través de ella y puede acabar fuera/dentro (pos=' + s.x + ',' + s.z + ')';
  });
  await attack('CityStory.normalizeCity: at dentro de una caja (torre, muro, boca de portal) o NaN/string nunca queda dentro de una caja ni de un portal', () => {
    const tw = D.districts.M02.tower, wl = D.plaza.portals.find((q) => !D.districts[q.dist]), pm = D.plaza.portals.find((q) => D.districts[q.dist]);
    for (const at of [{ x: tw.x, z: tw.z }, { x: wl.x, z: wl.z }, { x: pm.x, z: pm.z }, { x: 1e308, z: -1e308 }, { x: '5', z: '5' }, { x: NaN, z: 1 }, { x: -70, z: 40 }, { x: 0, z: 40, yaw: Infinity }, { x: D.districts.M02.bounds.minX, z: D.districts.M02.bounds.minZ, yaw: 'a' }]) {
      const C = CS.normalizeCity({ at }, D, () => false, '2026-11-12');
      const bx = CM.boxesFor(D, C.scene);
      if (!fin(C.at.x) || !fin(C.at.z) || !fin(C.at.yaw) || !clearOf(C.at.x, C.at.z, bx, -1e-6) || CM.portalAt(D, C.scene, C.at.x, C.at.z) !== null) return 'at=' + JSON.stringify(at) + ' → ' + C.scene + ' ' + JSON.stringify(C.at);
    }
  });
  prop('CityMove.faceOf: siempre una de 4 caras y coherente con el eje dominante (empate → vertical) para cualquier yaw', fc.oneof(fc.double({ noNaN: false }), fc.constantFrom(0, -0, Math.PI, -Math.PI, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, 1e308, -1e308, 2 * Math.PI, 5e-324), fc.double({ min: -50, max: 50 })), (yaw) => {
    const f = CM.faceOf(yaw);
    if (['up', 'down', 'left', 'right'].indexOf(f) < 0) throw new Error('cara inválida ' + f);
    if (!fin(yaw)) { if (f !== 'up') throw new Error('no finito → up'); return; }
    const a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), s = Math.sin(a), c = Math.cos(a);
    if (Math.abs(Math.abs(c) - Math.abs(s)) < 1e-6) return;   // empate: cualquier criterio estable
    const exp = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'up' : 'down') : (s > 0 ? 'left' : 'right');
    if (f !== exp) throw new Error('esperado ' + exp + ' obtuvo ' + f);
  }, 5000);
  prop('CityMove.faceOf ∘ yaw de step: la cara coincide con la dirección real de movimiento', fc.record({ vx: fc.double({ min: -14, max: 14, noNaN: true }), vz: fc.double({ min: -14, max: 14, noNaN: true }) }), (v) => {
    if (Math.hypot(v.vx, v.vz) < 0.2) return;
    const yaw = Math.atan2(-v.vx, -v.vz), f = CM.faceOf(yaw);
    if (Math.abs(Math.abs(v.vx) - Math.abs(v.vz)) < 1e-6) return;
    const exp = Math.abs(v.vz) > Math.abs(v.vx) ? (v.vz < 0 ? 'up' : 'down') : (v.vx > 0 ? 'right' : 'left');
    if (f !== exp) throw new Error('v=' + JSON.stringify(v) + ' cara=' + f + ' esperada=' + exp);
  }, 5000);
  prop('CityMove.step: un solo paso con estado/intent/dt arbitrarios nunca lanza ni devuelve valores no finitos', fc.record({
    s: fc.oneof(fc.record({ x: fc.double(), z: fc.double(), yaw: fc.double(), vx: fc.double(), vz: fc.double(), speed: fc.double() }), fc.constantFrom(null, undefined, {}, 5, 'x')), it: fc.oneof(fc.record({ mx: fc.double(), mz: fc.double(), run: fc.anything() }), fc.constantFrom(null, undefined, 5, 'x')), dt: fc.double(), cr: fc.boolean(), rad: fc.oneof(fc.double({ min: 0, max: 5 }), fc.constantFrom(NaN, undefined, -1, 1e308))
  }), (c) => {
    const o = CM.step(c.s, c.it, c.dt, boxesBy.false, { canRun: c.cr, radius: c.rad, safe: { x: 0, z: 8, yaw: 0 } });
    if (![o.x, o.z, o.yaw, o.vx, o.vz, o.speed].every(fin)) throw new Error('no finito ' + JSON.stringify(o));
  }, 3000);

  // ---------------------------------------------------------------- 4. batalla / virtudes
  console.log('[4] batalla y virtudes');
  const baseSave = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, virtues: {}, stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: {} } }, o);
  const VNAMES = ['valentia', 'enfoque', 'liderazgo', 'integridad', 'constancia', 'humildad', 'sabiduria', 'curiosidad', 'resiliencia'];
  const VIL = { bit: ['T01', 'T02', 'T03'], silicio: ['T04', 'T05', 'T10'], kernel: ['T06', 'T07', 'T08', 'T09'], eco: ['T12', 'T13', 'T14', 'T15', 'T16'], huerfano: ['T11', 'T17', 'T18', 'T19', 'T20'], alucina: ['T21', 'T22', 'T23'] };
  const ROUNDS = Math.round(300 * SCALE);
  const rr = L.rng(SEED ^ 0x5bd1e995);
  let rounds = 0, roundViol = [], battles = 0, ties = 0, wins = 0, losses = 0, perfects = 0, teaches = 0;
  const answerOne = (w, d, right, rnd) => {
    const q = L.findQ(w, d); if (!q) throw new Error('pregunta no encontrada');
    const ct = L.correctText(q);
    // poderes al azar antes de contestar
    if (rnd.bool(0.25)) { const pw = [...d.querySelectorAll('[data-act="power"]:not([disabled])')]; if (pw.length) L.click(w, rnd.pick(pw)); }
    const opts = [...d.querySelectorAll('.opt:not([disabled])')];
    const t = right ? L.optBtn(d, ct) : opts.find((b) => L.norm(b.querySelector('span:last-child').textContent) !== L.norm(ct));
    if (!t || t.disabled) return false;
    L.click(w, t);
    const rn = L.btn(d, 'regenno'); if (rn) L.click(w, rn);
    const rg = L.btn(d, 'regen'); if (rg && rnd.bool(0.3)) L.click(w, rg);
    return true;
  };
  for (let pg = 0; pg < Math.ceil(ROUNDS / 10); pg++) {
    const rnd = L.rng(SEED + pg * 7919);
    const virt = {}; VNAMES.forEach((v) => { if (rnd.bool(0.4)) virt[v] = 1700000000000; });
    if (pg % 4 === 0) { virt.valentia = 1; virt.enfoque = 1; virt.liderazgo = 1; }
    const boss = pg % 5 === 1 ? { M01: { best: 3, passed: true } } : pg % 5 === 2 ? { M01: { best: 1, passed: false } } : {};
    const xp0 = [0, 5, 120, 1000, 5000, 20000][pg % 6];
    const e = boot(JSON.stringify(baseSave({ xp: xp0, virtues: virt, boss, days: pg % 3 === 0 ? { last: null, count: 0 } : { last: null, count: 9 }, city: { prologue: true, scene: 'M02', at: { x: D.districts.M02.entry.x, z: D.districts.M02.entry.z, yaw: 0 } } })), { rnd: SEED + pg });
    const w = e.w, d = e.d, RH = w.__CITY_ROUND__;
    if (!RH) { note('ROUND', 'pagina ' + pg, 'sin gancho __CITY_ROUND__'); w.close(); continue; }
    for (let k = 0; k < 10 && rounds < ROUNDS; k++, rounds++) {
      const s0 = saved(w), kind = rnd.pick(['battle', 'battle', 'battle', 'tie', 'perfect', 'teach', 'quiz']);
      const vA = (s0 && s0.virtues) || {}, xpA = (s0 && s0.xp) || 0, hadVal = !!vA.valentia, hadFocus = !!vA.enfoque, hadLead = !!vA.liderazgo;
      const vid = rnd.pick(Object.keys(VIL)), probRight = rnd.pick([0, 0.2, 0.5, 0.8, 1]);
      if (kind === 'teach') {   // enseñar ya no es una ronda: se enseña en la hoja de la ciudad y el gancho ejecuta cityTeachDone
        const tv = (m) => roundViol.push('round ' + rounds + ' pg' + pg + ' teach lead=' + hadLead + ' ' + m);
        const root = () => d.querySelector('#city-root');
        if (root().hidden) {   // desde los resultados de la ronda anterior o desde Inicio
          let b = [...d.querySelectorAll('[data-act="back"]')].find((x) => /ciudad/i.test(x.textContent));
          if (!b) { const h = d.querySelector('[data-act="back"]'); if (h) { L.click(w, h); await tick(); } b = d.querySelector('[data-act="city"]'); }
          if (b) { L.click(w, b); await tick(20); }
        }
        if (root().hidden) { continue; }   // la ronda anterior quedó a medias: sin vista desde la que entrar
        w.__CITY_TEST_API__.teach('a01'); teaches++;
        const s1 = saved(w), hoja = (d.querySelector('#city-sheet') || {}).textContent || '', gained = (s1 ? s1.xp : 0) - xpA, want = 15 + (hadLead ? 5 : 0);
        if (gained !== want) tv('XP ganado ' + gained + ' en vez de ' + want);
        if (!((((s1 || {}).city || {}).d || {}).M02 || {}).taught || !s1.city.d.M02.taught.a01) tv('a01 sin marcar enseñado');
        if (hadLead && !/\(incluye \+5 de Liderazgo\)/.test(hoja)) tv('enseñar con Liderazgo sin «(incluye +5 de Liderazgo)»: ' + hoja.slice(0, 80));
        if (!hadLead && /Liderazgo/.test(hoja)) tv('Liderazgo en la hoja sin la virtud previa');
        L.click(w, d.querySelector('#city-pause')); const hm = [...d.querySelectorAll('[data-c="p-home"]')][0]; if (hm) L.click(w, hm); await tick();   // fuera de la ciudad para la siguiente ronda
        if (e.errors.length) { tv('error de consola: ' + e.errors[0]); e.errors.length = 0; }
        continue;
      }
      let items, cfg, expectTotal = 0;
      try {
        if (kind === 'battle' || kind === 'tie') {
          cfg = { kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: vid, name: vid }, city: { kind: 'battle', id: vid, mid: 'M02' } };
          items = RH.battleItems({ mod: 'M02', topics: VIL[vid], n: kind === 'tie' ? 3 : 8 });
          if (kind === 'tie') { items.pool = []; items = items.slice(0, 3); items.pool = []; }
          expectTotal = items.length + (items.pool ? items.pool.length : 0);
        } else if (kind === 'perfect') {
          const qs = w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.type === 'mcq').slice(0, 8 + rnd.int(0, 2));
          cfg = { kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }; items = qs;
        } else {
          const qs = w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.type === 'mcq');
          cfg = { kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }; items = rnd.pick([qs.slice(0, 3), qs.slice(0, 12)]);
        }
        RH.startRound(cfg, items);
      } catch (x) { roundViol.push('round ' + rounds + ' (' + kind + ') lanzó al iniciar: ' + msgOf(x)); continue; }
      const isBattle = !!cfg.villain, vi = (m) => roundViol.push('round ' + rounds + ' pg' + pg + ' ' + kind + ' vil=' + vid + ' p=' + probRight + ' ' + m);
      let answered = 0, guard = 0, lastHp = 4, lastEn = null, maxSeen = null, bad = false, perfectRun = true;
      const nItems0 = items.length;
      if (isBattle) {
        maxSeen = enMax(d);
        if (maxSeen !== (hadVal ? 4 : 3)) { vi('max=' + maxSeen + ' con valentia=' + hadVal); bad = true; }
        if (hp(d) !== 4 || enNow(d) !== maxSeen) { vi('estado inicial hp=' + hp(d) + ' en=' + enNow(d)); bad = true; }
      }
      try {
        while (!gtitle(d) && d.querySelector('.prompt') && guard++ < 60 && !bad) {
          const right = kind === 'perfect' ? true : rnd.bool(probRight);
          if (!right) perfectRun = false;
          if (!answerOne(w, d, right, kind === 'perfect' ? { bool: () => false, pick: (a) => a[0] } : rnd)) { /* sin opción: sigue */ }
          answered++;
          if (isBattle) {
            const h = hp(d), en = enNow(d), mx = enMax(d);
            if (en < 0 || en > mx) { vi('energía ' + en + ' fuera de [0,' + mx + ']'); bad = true; }
            if (mx !== maxSeen) { vi('max cambió a mitad de ronda ' + maxSeen + '→' + mx); bad = true; }
            if (mx !== 3 && mx !== 4) { vi('max=' + mx); bad = true; }
            if (h < 0 || h > 4 || h > lastHp) { vi('vida ' + h + ' (antes ' + lastHp + ')'); bad = true; }
            if (lastEn !== null && en > lastEn + 1) { vi('energía subió >1: ' + lastEn + '→' + en); bad = true; }
            lastHp = h; lastEn = en;
          }
          const nb = d.querySelector('#nextbtn'); if (nb) L.click(w, nb);
        }
      } catch (x) { vi('lanzó en juego: ' + msgOf(x)); bad = true; }
      if (e.errors.length) { vi('error de consola: ' + e.errors[0]); bad = true; e.errors.length = 0; }
      if (bad) continue;
      const title = gtitle(d), s1 = saved(w);
      if (!title) { vi('la ronda no terminó tras ' + answered + ' respuestas'); continue; }
      const gained = (s1 ? s1.xp : 0) - xpA, shown = bigXp(d);
      if (isBattle) {
        battles++;
        const won = /Victoria/.test(title), tie = /Empate/.test(title), lose = /Derrota/.test(title);
        if (won + tie + lose !== 1) vi('título ambiguo «' + title + '»');
        if (won !== (lastHp === 0)) vi('victoria=' + won + ' pero vida=' + lastHp);
        if (won && ((s1.city || {}).beaten || {})[vid] === undefined) vi('victoria sin beaten.' + vid);
        if (!won && ((s1.city || {}).beaten || {})[vid] !== undefined && !((s0.city || {}).beaten || {})[vid]) vi('beaten.' + vid + ' sin victoria');
        if (tie) { ties++; const total = answered; if (!(lastHp > 0 && lastEn > 0)) vi('Empate con vida ' + lastHp + ' energía ' + lastEn); if (total < expectTotal) vi('Empate antes de agotar preguntas: ' + total + ' de ' + expectTotal); }
        if (lose && lastEn !== 0) vi('Derrota con energía ' + lastEn);
        if (!won && !tie && !lose) vi('sin resultado');
        won ? wins++ : tie ? ties : losses++;
        if (lastEn === 0 && tie) vi('Empate con energía 0');
        if (!won && !tie && answered < 4 && lastEn !== 0) vi('terminó sin ganar ni agotar energía en ' + answered);
      }
      // R.xp = S.xp (con bonos de Enfoque / Liderazgo / Integridad)
      if (shown !== gained) vi('XP mostrado ' + shown + ' ≠ XP guardado ganado ' + gained + ' (hadFocus=' + hadFocus + ' hadLead=' + hadLead + ' kind=' + kind + ')');
      if (!(shown >= 0)) vi('XP mostrado negativo/NaN ' + shown);
      const txt = d.querySelector('main').textContent;
      if (kind === 'perfect' && items.length >= 8 && perfectRun) { perfects++; if (hadFocus && !/Bono de Enfoque: \+10 XP/.test(txt)) vi('ronda perfecta ' + items.length + ' con Enfoque previo sin bono +10'); if (!hadFocus && /Bono de Enfoque/.test(txt)) vi('bono de Enfoque sin tener la virtud antes de la ronda'); }
      if (kind !== 'perfect' && /Bono de Enfoque/.test(txt) && !(perfectRun && answered >= 8 && !isBattle)) vi('bono de Enfoque en una ronda no perfecta/<8 (respuestas ' + answered + ', todas bien=' + perfectRun + ')');
      if (/Bono de Liderazgo/.test(txt)) vi('«Bono de Liderazgo» en los resultados de una ronda (el bono ya solo existe al enseñar, en la hoja)');
      if (!s1 || !fin(s1.xp) || s1.xp < xpA) vi('S.xp no finito o bajó: ' + (s1 && s1.xp) + ' < ' + xpA);
      // volver a Inicio para la siguiente
    }
    w.close();
  }
  R.props.push({ name: 'batalla/virtudes: energía∈[0,max], max∈{3,4}=Valentía previa, victoria⇔vida 0, Empate solo sin preguntas, R.xp=ΔS.xp con bonos', runs: rounds, failed: roundViol.length > 0 });
  console.log('  rondas=' + rounds + ' batallas=' + battles + ' (victorias ' + wins + ', empates ' + ties + ', derrotas ' + losses + ') perfectas≥8=' + perfects + ' enseñar=' + teaches);
  roundViol.slice(0, 12).forEach((m) => note('ROUND', 'ronda', m));
  if (roundViol.length > 12) console.log('  … ' + (roundViol.length - 12) + ' violaciones más');

  await attack('batalla con jefe aprobado a mitad (Valentía/Liderazgo ganadas durante la ronda): max no cambia a mitad', () => {
    const e = boot(JSON.stringify(baseSave({ xp: 1000, boss: { M01: { best: 3, passed: true } } })), { rnd: 5 }); const w = e.w, d = e.d, RH = w.__CITY_ROUND__;
    const s = saved(w);
    RH.startRound({ kind: 'battle', title: 'B', mid: 'M02', back: { name: 'city' }, villain: { id: 'bit', name: 'bit' }, city: { kind: 'battle', id: 'bit', mid: 'M02' } }, RH.battleItems({ mod: 'M02', topics: VIL.bit, n: 8 }));
    const m0 = enMax(d); answerOne(w, d, false, { bool: () => false, pick: (a) => a[0] }); const m1 = enMax(d); w.close();
    return (m0 !== 3 || m1 !== 3) ? 'max ' + m0 + '→' + m1 + ' (valentia previa=' + !!(s && s.virtues && s.virtues.valentia) + ')' : null;
  });
  await attack('startRound con items vacíos / pool enorme / villano sin nombre / cfg hostil no lanza ni deja la vista muerta', () => {
    const e = boot(JSON.stringify(baseSave()), { rnd: 9 }); const w = e.w, d = e.d, RH = w.__CITY_ROUND__;
    const qs = RH.battleItems({ mod: 'M02', topics: VIL.bit, n: 8 });
    RH.startRound({ kind: 'battle', mid: 'M02', back: { name: 'city' }, villain: { id: 'bit', name: '<img src=x onerror=alert(1)>' } }, []);   // vacío: ignorado
    RH.startRound({ kind: 'battle', mid: 'M02', back: { name: 'home' }, villain: { id: 'bit', name: '<img src=x onerror=alert(1)>' }, city: { kind: 'battle', id: '__proto__', mid: 'M02' } }, qs);
    const inj = d.querySelector('img[src="x"]');
    for (let i = 0; i < 12 && !gtitle(d); i++) { answerOne(w, d, true, { bool: () => false, pick: (a) => a[0] }); const nb = d.querySelector('#nextbtn'); if (nb) L.click(w, nb); }
    const polluted = w.eval('({}).bit !== undefined || Object.prototype.hasOwnProperty.call(Object.prototype, "bit")');
    const err = e.errors[0]; w.close();
    return inj ? 'nombre de villano inyectó HTML' : polluted ? 'city.id __proto__ contaminó Object.prototype' : err ? 'error de consola ' + err : null;
  });

  // ---------------------------------------------------------------- 5. migrate hostil
  console.log('[5] migrate con guardados hostiles');
  const PROTO = '{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted2":"yes"}}}';
  const hostileCity = [
    'null', '5', '"x"', '[]', '[1,2,3]', '{}', PROTO,
    '{"at":{"x":"NaN","z":null,"yaw":"a"}}', '{"at":{"x":1e999,"z":-1e999,"yaw":1e999}}', '{"at":[]}', '{"at":{"__proto__":{"x":0}}}', '{"at":{"x":-0,"z":-0}}',
    '{"at":{"x":0,"z":-162,"yaw":0}}', '{"at":{"x":0,"z":-178}}', '{"at":{"x":1e308,"z":-1e308,"yaw":1e308}}',
    '{"restored":{"M02":true,"__proto__":{"M02":true}},"powers":{"planos":true},"run":"yes","prologue":1,"bridgeSeen":[]}',
    '{"beaten":{"bit":"9999-12-31","silicio":"2026-02-30","kernel":"2026-11-12T00:00:00Z","eco":5,"huerfano":null,"alucina":"0000-00-00","__proto__":{"bit":"2020-01-01"},"constructor":"2020-01-01"}}',
    '{"repairs":{"r01":"true","r02":true,"__proto__":true,"toString":true},"taught":{"a01":1,"a02":true,"hasOwnProperty":true}}',
    '{"beaten":[],"repairs":"abc","taught":5,"restored":[],"powers":"x"}',
    '{"taught":{"a01":true,"a02":true,"a03":true,"a04":true,"a05":true,"a06":true,"a07":true,"a08":true,"a09":true,"a10":true,"a11":true,"a12":true},"restored":{"M02":true}}',
    JSON.stringify({ at: { x: 5, z: 5 }, junk: 'x'.repeat(2e5), deep: JSON.parse('['.repeat(500) + ']'.repeat(500)) }),
  ];
  const hostileHero = [
    'null', '5', '"Eve"', '[]', '{}', '{"name":null}', '{"name":5}', '{"name":["a"]}', '{"name":{"toString":1}}', '{"name":"' + 'x'.repeat(1e6) + '"}', '{"name":"<img src=x onerror=alert(1)>"}', '{"name":"<script>alert(1)</script>"}',
    '{"name":"\\u0000\\u202e\\u200b' + '\\ud83d\\udc68\\u200d\\ud83d\\udc69\\u200d\\ud83d\\udc67'.repeat(30) + '"}', '{"name":"   "}', '{"name":"","extra":{"a":1},"body":"x","hat":"y"}', '{"__proto__":{"name":"pwn"}}', '{"name":"Zed","__proto__":{"polluted3":1},"constructor":{"prototype":{"polluted4":1}}}',
    '{"name":"' + '\\ud83d\\ude00'.repeat(15) + '"}', '{"name":"a","length":99}', '{"hasOwnProperty":1,"name":"h"}',
  ];
  const checkSaved = (w, d, label, e) => {
    const s = saved(w);
    if (!s || typeof s !== 'object') return label + ': sin guardado válido tras arrancar y jugar';
    if (!s.hero || typeof s.hero !== 'object' || Array.isArray(s.hero) || Object.keys(s.hero).join() !== 'name' || typeof s.hero.name !== 'string') return label + ': hero mal formado ' + JSON.stringify(s.hero).slice(0, 80);
    if (s.hero.name.length > 20) return label + ': nombre de ' + s.hero.name.length + ' > 20';
    const pol = w.eval('["polluted","polluted2","polluted3","polluted4","name","at","restored","x","beaten"].filter(function(k){return ({})[k]!==undefined || Object.prototype.hasOwnProperty.call(Object.prototype,k)})');
    if (pol.length) return label + ': contaminación de prototipo ' + pol.join();
    const c = s.city, B = (c && c.scene === 'plaza') ? D.plaza.bounds : (D.districts[c && c.scene] || D.districts.M02).bounds;
    if (!c || typeof c !== 'object') return label + ': city ausente';
    if (!(fin(c.at && c.at.x) && fin(c.at.z) && fin(c.at.yaw)) || c.at.x < B.minX + r - 1e-6 || c.at.x > B.maxX - r + 1e-6 || c.at.z < B.minZ + r - 1e-6 || c.at.z > B.maxZ - r + 1e-6) return label + ': city.at inválido ' + JSON.stringify(c.at);
    const bx = boxesBy[c.restored && c.restored.M02 === true];
    if (!clearOf(c.at.x, c.at.z, bx, -1e-6)) return label + ': city.at dentro de una caja ' + JSON.stringify(c.at);
    if (c.restored && c.restored.M02 && !(s.boss && s.boss.M02 && s.boss.M02.passed === true)) return label + ': restored.M02 sin jefe aprobado (se confió en el guardado)';
    for (const k of ['beaten', 'repairs', 'taught', 'restored', 'powers']) if (!c[k] || typeof c[k] !== 'object' || Array.isArray(c[k]) || Object.getPrototypeOf(c[k]) !== w.Object.prototype && Object.getPrototypeOf(c[k]) !== Object.prototype) return label + ': city.' + k + ' no es objeto plano';
    for (const k in c.beaten) if (!/^\d{4}-\d{2}-\d{2}$/.test(c.beaten[k]) || !D.districts.M02.creatures.some((x) => x.id === k)) return label + ': beaten sucio ' + k + '=' + c.beaten[k];
    for (const k of ['run', 'prologue']) if (typeof c[k] !== 'boolean') return label + ': city.' + k + ' no booleano';
    if (e.errors.length) return label + ': error de consola ' + e.errors[0];
    if (d.querySelector('img[src="x"]') || d.querySelector('script:not([src]):not([type])') && /alert\(1\)/.test(d.body.innerHTML.replace(/&lt;[^]*?&gt;/g, ''))) return label + ': HTML inyectado desde el nombre';
    return null;
  };
  const playOne = (e) => {   // fuerza un guardado real: una pregunta de quiz
    const w = e.w, RH = w.__CITY_ROUND__;
    RH.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((x) => x.type === 'mcq').slice(0, 2));
    answerOne(w, e.d, true, { bool: () => false, pick: (a) => a[0] });
  };
  const MIG_N = Math.round(300 * SCALE);
  let migRuns = 0, migBad = [];
  const rm = L.rng(SEED ^ 0x1234567);
  const rawSave = (cityJ, heroJ, extra) => '{"v":1,"xp":' + (extra && extra.xp !== undefined ? extra.xp : 100) + ',"days":{"last":null,"count":0},"session":1,"lastActive":0,"topics":{},"qs":{},"boss":' + ((extra && extra.boss) || '{}') + ',"hero":' + heroJ + ',"city":' + cityJ + ',"virtues":' + ((extra && extra.virtues) || '{}') + ((extra && extra.more) || '') + '}';
  const combos = [];
  hostileCity.forEach((c, i) => combos.push([c, '{"name":"Ok"}', 'city#' + i]));
  hostileHero.forEach((h, i) => combos.push(['{}', h, 'hero#' + i]));
  while (combos.length < MIG_N) combos.push([rm.pick(hostileCity), rm.pick(hostileHero), 'mix' + combos.length]);
  for (const [cj, hj, label] of combos.slice(0, MIG_N)) {
    migRuns++;
    let e;
    try { e = boot(rawSave(cj, hj, rm.bool(0.3) ? { boss: '{"M02":{"best":9,"passed":true}}' } : undefined), { rnd: 3 }); playOne(e); }
    catch (x) { migBad.push(label + ': lanzó al arrancar/jugar: ' + msgOf(x) + ' | city=' + cj.slice(0, 80) + ' hero=' + hj.slice(0, 60)); try { e.w.close(); } catch (y) {} continue; }
    const m = checkSaved(e.w, e.d, label + ' city=' + cj.slice(0, 60) + ' hero=' + hj.slice(0, 50), e);
    if (m) migBad.push(m);
    e.w.close();
  }
  // formas raras de la raíz y de otros campos
  const rootShapes = ['null', '[]', '5', '"x"', 'true', '{}', '{"v":1}', '{"hero":{"name":"A"},"city":{"at":{"x":1,"z":1}},"world":{"hero":{"name":"Z","hat":1},"__proto__":{"q":1}}}', '{"v":"1","xp":"900","hero":"Eve","city":"lol","virtues":[],"stats":5,"boss":"x","days":5,"topics":[],"qs":"a"}', '{"xp":-5,"session":-1,"hero":{"name":"A"},"virtues":{"__proto__":{"valentia":1}},"stats":{"cleared":"9","bossFailed":{"M99":true,"M01":"no","__proto__":{"M01":true}}}}'];
  for (const rs of rootShapes) {
    migRuns++;
    let e; try { e = boot(rs, { rnd: 3 }); playOne(e); } catch (x) { migBad.push('raíz ' + rs.slice(0, 50) + ': lanzó ' + msgOf(x)); try { e.w.close(); } catch (y) {} continue; }
    const m = checkSaved(e.w, e.d, 'raíz ' + rs.slice(0, 50), e); if (m) migBad.push(m); e.w.close();
  }
  R.props.push({ name: 'migrate hostil: arranca, nombre ≤20, hero solo {name}, city normalizada, sin contaminación de prototipo', runs: migRuns, failed: migBad.length > 0 });
  console.log('  migrate: ' + migRuns + ' guardados hostiles, ' + migBad.length + ' violaciones');
  migBad.slice(0, 12).forEach((m) => note('MIGRATE', 'guardado', m));

  // ---------------------------------------------------------------- resumen
  const advBroken = R.advBroken, pf = R.props.filter((p) => p.failed).length, pt = R.props.reduce((a, p) => a + p.runs, 0);
  const fuzzN = R.fuzz.reduce((a, f) => a + f.n, 0) + zoomPicked * 0;
  console.log('\n=== RESUMEN review_attack (seed ' + SEED + ', ' + ((Date.now() - t00) / 1000).toFixed(0) + ' s) ===');
  console.log('Adversariales: ' + R.adv + ' escritas, ' + advBroken + ' rompieron');
  console.log('Propiedades: ' + R.props.length + ' reglas × ' + pt + ' ejecuciones — ' + (R.props.length - pf) + ' pasan / ' + pf + ' fallan');
  console.log('Fuzzing: ' + R.fuzz.map((f) => f.name + ' ' + f.n + ' entradas ' + f.bad + ' fallos').join('; ') + ' (total ' + fuzzN + ')');
  console.log('Roturas (' + R.broken.length + '):'); R.broken.forEach((b) => console.log(' - ' + b.slice(0, 300)));
  process.exit(R.broken.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS', e); process.exit(2); });
