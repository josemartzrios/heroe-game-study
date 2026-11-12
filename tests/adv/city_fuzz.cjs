// Fuzzing de Ciudad Núcleo dentro del motor (jsdom): sesiones de 20-60 eventos aleatorios con import/create controlables,
// movimiento y teclas, teleport a interactuables, hojas, rondas respondidas al azar, Pausa, salir y entrar, resize,
// visibilitychange, webglcontextlost (canvas actual o viejo) y aviso de girar. Cada sesión corre en un worker con perro guardián.
// Uso: node tests/adv/city_fuzz.cjs [SESIONES=150] [SEED=20261111]    (regresión: node tests/adv/city_fuzz.cjs 1 <seed>)
const { isMainThread, parentPort } = require('worker_threads');
const L = require('./lib.cjs');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const KEY = 'estudio_isw_v1';
const KEYS = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'q', 'z', 'e', 'Enter', 'Escape', 'Shift', '1', '2', '3', ' '];

function boot(cfg, r, seedState) {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 3).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { imp: [], cre: [], creates: 0, delivered: 0, disposed: 0, canvases: [], afterDispose: [], hidden: false, rotate: false, opts: null, alive: null };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.confirm = () => false; w.alert = () => {};
      w.__CITY_TEST__ = true;
      if (seedState) w.localStorage.setItem(KEY, JSON.stringify(seedState));
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => st.hidden });
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.matchMedia = () => ({ matches: st.rotate });
      w.__TRIP_IMPORT__ = () => {
        const m = r.pick(cfg.imp);
        if (m === 'ok') return Promise.resolve({ THREE_FAKE: true });
        if (m === 'reject') return Promise.reject(new Error('import falso'));
        return new Promise((res, rej) => st.imp.push({ res: () => res({ THREE_FAKE: true }), rej: () => rej(new Error('import tardío')) }));
      };
      w.__CITY_WORLD__ = {
        create(THREE, canvas, D, o) {
          st.creates++; st.canvases.push(canvas); let dead = false;
          const live = (n) => { if (dead) st.afterDispose.push(n); };
          const api = {
            resize: () => live('resize'), setPaused: () => live('setPaused'), dissolve: () => live('dissolve'), setLook: () => live('setLook'),
            encounter: () => { live('encounter'); return r.bool(0.3) ? new Promise((res) => st.cre.push({ res, rej: res })) : Promise.resolve(); },
            dispose: () => { if (dead) return; dead = true; st.disposed++; if (r.bool(0.5)) canvas.dispatchEvent(new w.Event('webglcontextlost')); },
          };
          const m = r.pick(cfg.create);
          const deliver = () => { st.delivered++; st.opts = o; return api; };
          if (m === 'ok') return Promise.resolve(deliver());
          if (m === 'throw') throw new Error('create síncrono falla');
          return new Promise((res, rej) => st.cre.push({ res: () => res(deliver()), rej: () => rej(new Error('create tardío')) }));
        },
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const tick = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
function visible(el) { for (let x = el; x; x = x.parentElement) if (x.hidden) return false; return true; }

let D = null;
async function session(seed) {
  if (!D) D = (await import('../../city/districts.mjs')).city;
  const r = L.rng(seed);
  const cfg = { imp: r.pick([['ok'], ['pending'], ['reject'], ['ok', 'pending', 'reject']]), create: r.pick([['ok'], ['pending'], ['ok', 'pending', 'throw']]), deep: r.bool(0.3) };
  const M = D.districts.M02;
  const spots = [D.plaza.director, D.plaza.mirror].concat(M.mentors, M.repairs, M.apprentices, M.creatures.map((c) => ({ x: c.area.x, z: c.area.z })), [{ x: M.tower.x, z: M.tower.z + 5.2 }, { x: M.bridge.x, z: M.bridge.z + 6.2 }]);
  const six = {}; for (let i = 1; i <= 23; i++) six['M02:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1];
  const seedState = r.bool(0.5) ? { v: 1, xp: r.pick([0, 450, 1000, 2500]), days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: r.bool() ? six : {}, qs: {}, boss: r.bool(0.2) ? { M02: { best: 20, passed: true } } : {}, hero: { name: 'Zed', look: { skin: 1, suit: 1, head: 1, eyes: 1, emblem: 1, cape: 0, hand: 0 }, welcomed: true }, city: { prologue: r.bool(0.7) } } : null;
  const e = boot(cfg, r, seedState), { w, d, st } = e;
  const trace = [], viol = [];
  const cityOn = () => d.body.classList.contains('city-on');
  const inRound = () => !!d.querySelector('.prompt') || !!d.querySelector('#xpc');
  const leaveCity = () => {   // la ciudad se abandona por Pausa → "Salir al inicio" (o por Salir durante la carga o el aviso de error)
    const pb = d.getElementById('city-pausebox'), pz = d.getElementById('city-pause');
    const sc = d.querySelector('#city-sheet [data-c="sheetclose"], #city-sheet [data-c="pro-skip"], #city-sheet [data-c="pro-end"]'); if (sc && visible(sc)) L.click(w, sc);
    if (pb && pb.hidden && pz && visible(pz)) L.click(w, pz);
    const pm = d.querySelector('#city-pausebox [data-c="pausemain"]'); if (pm && visible(pm)) L.click(w, pm);
    const h = d.querySelector('#city-root [data-c="p-home"]') || d.querySelector('#city-root [data-c="quit"]') || d.querySelector('#city-root [data-c="home"]');
    if (h && visible(h)) L.click(w, h);
  };
  const goHome = () => { for (let k = 0; k < 6; k++) { if (cityOn()) { leaveCity(); continue; } const b = L.btn(d, 'home') || L.btn(d, 'quit') || L.btn(d, 'back') || L.btn(d, 'regenno'); if (b && visible(b)) L.click(w, b); else break; } };
  const enter = () => { for (let k = 0; k < 4 && !cityOn(); k++) { const c = L.btn(d, 'city'); if (c && visible(c)) { L.click(w, c); break; } goHome(); } };
  try {
    enter();
    const n = cfg.deep ? r.int(45, 60) : r.int(20, 60);
    for (let i = 0; i < n && !viol.length; i++) {
      const p = r(); let ev;
      if (p < 0.2) { const k = r.pick(KEYS); ev = 'key ' + k; w.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); if (r.bool(0.5)) w.dispatchEvent(new w.KeyboardEvent('keyup', { key: k, bubbles: true })); }
      else if (p < 0.3) { ev = 'tick'; if (st.opts) { try { st.opts.tick(r.int(0, 80)); st.opts.state(); } catch (x) { viol.push('I9 tick/state lanzó: ' + x.message); } } else ev = 'tick (sin mundo)'; }
      else if (p < 0.4) { const s = r.pick(spots); ev = 'teleport ' + s.x + ',' + s.z; if (w.__CITY_TEST_API__) w.__CITY_TEST_API__.teleport(s.x + r.pick([0, 0.5, 1.5]), s.z + r.pick([0, 1])); }
      else if (p < 0.62) {
        const acts = [...d.querySelectorAll('#city-root [data-act], #app [data-act], #city-act')].filter((b) => visible(b) && !b.disabled);
        if (acts.length) { const b = r.pick(acts); ev = 'click ' + (b.dataset.act || b.id) + (b.dataset.c ? ':' + b.dataset.c : ''); L.click(w, b); } else ev = 'click (nada)';
      }
      else if (p < 0.7) { const opts = [...d.querySelectorAll('.opt:not([disabled])')]; const nb = d.querySelector('#nextbtn'); ev = 'responder'; if (opts.length && !d.querySelector('.fb')) L.click(w, r.pick(opts)); else if (nb) L.click(w, nb); }
      else if (p < 0.74) { ev = 'resize'; w.dispatchEvent(new w.Event('resize')); }
      else if (p < 0.78) { st.hidden = !st.hidden; ev = 'visibilitychange hidden=' + st.hidden; d.dispatchEvent(new w.Event('visibilitychange')); }
      else if (p < 0.81) { st.rotate = !st.rotate; ev = 'rotate=' + st.rotate; w.dispatchEvent(new w.Event('resize')); }
      else if (p < 0.85) { const c = d.getElementById('city-cv'); ev = 'contextlost actual' + (c ? '' : ' (sin canvas)'); if (c) c.dispatchEvent(new w.Event('webglcontextlost')); }
      else if (p < 0.87) { ev = 'contextlost viejo'; if (st.canvases.length) r.pick(st.canvases).dispatchEvent(new w.Event('webglcontextlost')); }
      else if (p < 0.91) { const x = st.imp.shift(); const ok = r.bool(0.7); ev = (ok ? 'resolver' : 'rechazar') + ' import' + (x ? '' : ' (no hay)'); if (x) (ok ? x.res : x.rej)(); }
      else if (p < 0.95) { const x = st.cre.shift(); const ok = r.bool(0.7); ev = (ok ? 'resolver' : 'rechazar') + ' create/encounter' + (x ? '' : ' (no hay)'); if (x) (ok ? x.res : x.rej)(); }
      else if (p < 0.98) { ev = cityOn() ? 'salir' : 'entrar'; if (cityOn()) goHome(); else enter(); }
      else { ev = 'entrar/salir x3'; for (let k = 0; k < 3; k++) { enter(); goHome(); } enter(); }
      await tick(r.int(1, 3));
      trace.push(ev);
      const at = '#' + i + ' tras «' + ev + '»';
      if (e.errors.length) viol.push('I1 error de consola ' + at + ': ' + e.errors[0]);
      const root = d.getElementById('city-root');
      if (!cityOn() && !root.hidden) viol.push('I2 sin vista city y #city-root visible ' + at);
      if (!cityOn() && !inRound() && root.innerHTML !== '') viol.push('I2 fuera de la ciudad y de sus rondas #city-root no está vacío ' + at);
      if (st.delivered - st.disposed > 1) viol.push('I3 mundos vivos=' + (st.delivered - st.disposed) + ' ' + at);
      const raw = w.localStorage.getItem(KEY);
      if (raw !== null) {
        let o = null; try { o = JSON.parse(raw); } catch (x) { viol.push('I4 localStorage no es JSON ' + at); }
        if (o && o.city) {
          const c = o.city, B = D.bounds, rad = D.radius;
          if (c.at !== undefined && !(c.at && Number.isFinite(c.at.x) && Number.isFinite(c.at.z) && c.at.x >= B.minX + rad - 1e-6 && c.at.x <= B.maxX - rad + 1e-6 && c.at.z >= B.minZ + rad - 1e-6 && c.at.z <= B.maxZ - rad + 1e-6)) viol.push('I5 S.city.at fuera de bounds ' + JSON.stringify(c.at) + ' ' + at);
          const valid = M.apprentices.filter((a) => c.taught && c.taught[a.id] === true).length;
          if (c.restored && c.restored.M02 && !(o.boss && o.boss.M02 && o.boss.M02.passed === true && valid >= 8)) viol.push('I6 restored.M02 sin jefe aprobado y 8 enseñados ' + at);
        }
      }
      if (st.afterDispose.length) viol.push('I7 el motor llamó ' + st.afterDispose[0] + '() en un mundo ya liberado ' + at);
      if (cityOn() && d.querySelectorAll('#city-root canvas').length > 1) viol.push('I8 más de un canvas en #city-root ' + at);
    }
    if (!viol.length) {
      goHome(); st.imp.splice(0).forEach((x) => x.res()); st.cre.splice(0).forEach((x) => x.res()); await tick(4);
      goHome(); await tick(2);
      if (st.delivered - st.disposed !== 0) viol.push('I3 al salir quedan ' + (st.delivered - st.disposed) + ' mundos sin dispose (city-on=' + cityOn() + ' root=' + d.getElementById('city-root').innerHTML.slice(0, 150).replace(/<[^>]+>/g, ' ') + ' pend imp=' + st.imp.length + ' cre=' + st.cre.length + ')');
      if (e.errors.length) viol.push('I1 error de consola al cerrar: ' + e.errors[0]);
    }
  } catch (x) { viol.push('I0 excepción del harness/motor: ' + (x && x.message) + ' tras ' + trace.slice(-1)); }
  const out = { seed, cfg, n: trace.length, viol, trace: viol.length ? trace : [] };
  try { w.close(); } catch (x) {}
  return out;
}

if (!isMainThread) {
  parentPort.on('message', async (m) => { const res = await session(m.c); parentPort.postMessage({ i: m.i, res }); });
} else {
  const { runPool } = require('./runner.cjs');
  const N = parseInt(process.argv[2] || '150', 10), SEED = parseInt(process.argv[3] || '20261111', 10);
  const cases = N === 1 ? [SEED] : Array.from({ length: N }, (_, i) => (SEED * 7919 + i * 104729) >>> 0);
  const t0 = Date.now();
  runPool(__filename, cases, { workers: 5, caseTimeout: 30000 }).then((res) => {
    let events = 0, broken = 0; const byRule = {};
    res.forEach((x, i) => {
      if (!x) { broken++; console.log('SIN RESULTADO seed=' + cases[i]); return; }
      if (x.hang || x.crash) { broken++; console.log((x.hang ? 'CUELGUE' : 'CRASH') + ' seed=' + cases[i] + ' ' + (x.errors || []).join(' ')); return; }
      events += x.n;
      if (x.viol.length) { broken++; const rule = x.viol[0].split(' ')[0]; (byRule[rule] = byRule[rule] || []).push(x); }
    });
    Object.keys(byRule).forEach((rule) => {
      const l = byRule[rule].sort((a, b) => a.trace.length - b.trace.length), m = l[0];
      console.log('FAIL ' + rule + ' en ' + l.length + ' sesiones. Más corta: seed=' + m.seed + ' cfg=' + JSON.stringify(m.cfg) + '\n  ' + m.viol[0] + '\n  traza: ' + m.trace.join(' → '));
    });
    console.log('\n' + N + ' sesiones, ' + events + ' eventos, ' + broken + ' sesiones con fallo, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
    process.exit(broken ? 1 : 0);
  });
}
