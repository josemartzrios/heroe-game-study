// Fuzzing del viaje 3D dentro del motor (jsdom): sesiones de 20-60 eventos aleatorios con import/create/goTo
// controlables (resolución o rechazo tardío), clics en cualquier [data-act] visible, teclas, resize,
// visibilitychange, webglcontextlost (canvas actual o viejo) y entrar/salir repetidamente.
// Cada sesión corre en un worker con perro guardián (tests/adv/runner.cjs). Invariantes tras CADA evento.
// Uso: node tests/adv/trip_fuzz.cjs [SESIONES=150] [SEED=4242]      (regresión: node tests/adv/trip_fuzz.cjs 1 <seed>)
const { isMainThread, parentPort } = require('worker_threads');
const L = require('./lib.cjs');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const KEY = 'estudio_isw_v1';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];

function boot(cfg, r) {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 3).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { imports: 0, imp: [], cre: [], creates: 0, delivered: 0, disposed: 0, canvases: [], goTo: [], afterDispose: [], hidden: false };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.confirm = () => false; w.alert = () => {};
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); if (k === 'getImageData' || k === 'createImageData') return () => ({ data: new Uint8ClampedArray(4) }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => st.hidden });
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      if (cfg.rm) w.matchMedia = () => ({ matches: true });
      w.__TRIP_IMPORT__ = () => {
        st.imports++;
        const m = r.pick(cfg.imp);
        if (m === 'ok') return Promise.resolve({ THREE_FAKE: true });
        if (m === 'reject') return Promise.reject(new Error('import falso'));
        return new Promise((res, rej) => st.imp.push({ res: () => res({ THREE_FAKE: true }), rej: () => rej(new Error('import tardío')) }));
      };
      w.__TRIP_SCENE__ = {
        create(THREE, canvas) {
          st.creates++; st.canvases.push(canvas);
          let dead = false; const myGo = [];
          const live = (n) => { if (dead) st.afterDispose.push(n); };
          const api = {
            goTo: (i) => { live('goTo'); myGo.splice(0).forEach((x) => x()); if (dead || cfg.goTo === 'now') return Promise.resolve(); return new Promise((res) => { const f = () => { const k = st.goTo.indexOf(f); if (k >= 0) st.goTo.splice(k, 1); res(); }; myGo.push(f); st.goTo.push(f); }); },
            setLayers: () => live('setLayers'), lost: () => live('lost'), look: () => live('look'), resize: () => live('resize'), setPaused: () => live('setPaused'),
            dispose: () => { if (dead) return; dead = true; st.disposed++; myGo.splice(0).forEach((x) => x()); if (r.bool(0.5)) canvas.dispatchEvent(new w.Event('webglcontextlost')); },
          };
          const m = r.pick(cfg.create);
          if (m === 'ok') { st.delivered++; return Promise.resolve(api); }
          if (m === 'throw') throw new Error('create síncrono falla');
          return new Promise((res, rej) => st.cre.push({ res: () => { st.delivered++; res(api); }, rej: () => rej(new Error('create tardío')) }));
        },
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const tick = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
function visible(el) { for (let x = el; x; x = x.parentElement) if (x.hidden) return false; return true; }
function attempts(w) { try { const s = JSON.parse(w.localStorage.getItem(KEY) || '{"qs":{}}'); return Object.values(s.qs || {}).reduce((a, q) => a + (q.a || 0), 0); } catch (e) { return -1; } }

async function session(seed) {
  const r = L.rng(seed);
  const cfg = { rm: r.bool(0.3), imp: r.pick([['ok'], ['pending'], ['reject'], ['ok', 'pending', 'reject']]), create: r.pick([['ok'], ['pending'], ['ok', 'pending', 'throw']]), goTo: r.pick(['now', 'pending']), deep: r.bool(0.4) };
  const e = boot(cfg, r), { w, d, st } = e;
  const trace = [], viol = []; let maxSt = 0, sawSum = false;
  // V no es global (IIFE): render() pone body.trip-on si y solo si V.name === 'trip'
  const V = () => d.body.classList.contains('trip-on') ? 'trip' : 'otra';
  const goHome = () => { for (let k = 0; k < 6; k++) { const b = L.btn(d, 'home') || L.btn(d, 'quit') || L.btn(d, 'back') || L.btn(d, 'resetno') || L.btn(d, 'regenno'); if (V() === 'trip') { const q = d.querySelector('#trip-root [data-act="tripquit"],#trip-root [data-act="tripback"]'); if (q) L.click(w, q); const c = L.btn(d, 'tripconfirm'); if (c) L.click(w, c); continue; } if (L.modBtn(d, 'M08') || L.btn(d, 'trip')) return; if (!b) return; L.click(w, b); } };
  const enterTrip = () => { goHome(); for (let k = 0; k < 4 && V() !== 'trip'; k++) { const t = L.btn(d, 'trip'); if (t) { L.click(w, t); break; } const m = L.modBtn(d, 'M08'); if (m) L.click(w, m); else break; } };
  try {
    enterTrip();
    const n = cfg.deep ? r.int(45, 60) : r.int(20, 60);
    for (let i = 0; i < n && !viol.length; i++) {
      const p = r(); let ev;
      const confirmOpen = (() => { const c = d.getElementById('trip-confirm'); return !!c && !c.hidden && V() === 'trip'; })();
      const a0 = attempts(w), fb0 = d.querySelectorAll('.fb').length;
      if (cfg.deep && r.bool(0.85)) {   // macro: avanza el viaje (resuelve lo pendiente y pulsa el botón de progreso)
        ev = 'avanzar';
        for (let k = 0; k < 3; k++) {
          const x = st.imp.shift() || st.cre.shift(); if (x) x.res(); if (st.goTo[0]) st.goTo[0]();
          await tick(1);
          const opts = [...d.querySelectorAll('#trip-sheet .opt:not([disabled])')];
          const b = opts.length ? r.pick(opts) : (L.btn(d, 'tripask') || L.btn(d, 'tripnext'));
          if (b && visible(b)) { ev += ' ' + b.dataset.act + (b.dataset.k ? '#' + b.dataset.k : ''); if (r.bool(0.2) && b.dataset.k) L.key(w, String(+b.dataset.k + 1)); else L.click(w, b); }
        }
      } else if (p < 0.38) {
        const acts = [...d.querySelectorAll('#trip-root [data-act], #app [data-act]')].filter(visible);
        const pref = acts.filter((b) => /^trip/.test(b.dataset.act));
        const pool = pref.length && r.bool(0.8) ? pref : acts;
        if (pool.length) { const b = r.pick(pool); ev = 'click ' + b.dataset.act + (b.dataset.k ? '#' + b.dataset.k : ''); L.click(w, b); } else ev = 'click (nada)';
      } else if (p < 0.6) { const k = r.pick(KEYS); ev = 'key ' + k; if (r.bool()) L.key(w, k); else d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
      else if (p < 0.64) { ev = 'resize'; w.dispatchEvent(new w.Event('resize')); }
      else if (p < 0.68) { st.hidden = !st.hidden; ev = 'visibilitychange hidden=' + st.hidden; d.dispatchEvent(new w.Event('visibilitychange')); }
      else if (p < 0.71) { const c = d.getElementById('trip-cv'); ev = 'contextlost actual' + (c ? '' : ' (sin canvas)'); if (c) c.dispatchEvent(new w.Event('webglcontextlost')); }
      else if (p < 0.73) { ev = 'contextlost viejo'; if (st.canvases.length) r.pick(st.canvases).dispatchEvent(new w.Event('webglcontextlost')); }
      else if (p < 0.79) { const x = st.imp.shift(); const ok = r.bool(0.7); ev = (ok ? 'resolver' : 'rechazar') + ' import' + (x ? '' : ' (no hay)'); if (x) (ok ? x.res : x.rej)(); }
      else if (p < 0.85) { const x = st.cre.shift(); const ok = r.bool(0.7); ev = (ok ? 'resolver' : 'rechazar') + ' create' + (x ? '' : ' (no hay)'); if (x) (ok ? x.res : x.rej)(); }
      else if (p < 0.91) { const x = st.goTo[0]; ev = 'resolver goTo' + (x ? '' : ' (no hay)'); if (x) x(); }
      else if (p < 0.97) { ev = V() === 'trip' ? 'salir (Escape)' : 'entrar'; if (V() === 'trip') L.key(w, 'Escape'); else enterTrip(); }
      else { ev = 'entrar/salir x' + 3; for (let k = 0; k < 3; k++) { enterTrip(); const q = d.querySelector('#trip-root [data-act="tripquit"]'); if (q) L.click(w, q); } enterTrip(); }
      await tick(r.int(1, 3));
      trace.push(ev);
      { const pl = d.getElementById('trip-pill'); const m = pl && /Estación (\d+)/.exec(pl.textContent); if (m) maxSt = Math.max(maxSt, +m[1]); if (L.btn(d, 'tripend')) sawSum = true; }
      // ---- invariantes ----
      const at = '#' + i + ' tras «' + ev + '»';
      if (e.errors.length) viol.push('I1 error de consola ' + at + ': ' + e.errors[0]);
      const v = V(), root = d.getElementById('trip-root');
      if (v !== 'trip' && (!root.hidden || root.innerHTML !== '')) viol.push('I2 V=' + v + ' y #trip-root visible/no vacío ' + at);
      if (st.delivered - st.disposed > 1) viol.push('I3 escenas vivas=' + (st.delivered - st.disposed) + ' ' + at);
      const raw = w.localStorage.getItem(KEY);
      if (raw !== null) { let o = null; try { o = JSON.parse(raw); } catch (x) { viol.push('I4 localStorage no es JSON ' + at); } if (o && typeof o.xp !== 'number') viol.push('I4 xp no numérico ' + at + ': ' + JSON.stringify(o.xp)); if (o && typeof o.xp === 'number' && !Number.isFinite(o.xp)) viol.push('I4 xp no finito ' + at); }
      if (d.querySelectorAll('.fb').length > 1) viol.push('I5 .fb duplicado (' + d.querySelectorAll('.fb').length + ') ' + at);
      if (confirmOpen && /^key [1-9]$/.test(ev) && (attempts(w) !== a0 || d.querySelectorAll('.fb').length > fb0)) viol.push('I6 tecla con confirmación abierta registró respuesta ' + at);
      if (st.afterDispose.length) viol.push('I7 el motor llamó ' + st.afterDispose[0] + '() en una escena ya liberada ' + at);
      if (v === 'trip' && d.querySelectorAll('#trip-root canvas').length > 1) viol.push('I8 más de un canvas en #trip-root ' + at);
    }
    // cierre: salir siempre debe dejar todo limpio
    if (!viol.length) {
      goHome(); st.imp.splice(0).forEach((x) => x.res()); st.cre.splice(0).forEach((x) => x.res()); await tick(3);
      if (st.delivered - st.disposed !== 0) viol.push('I3 al salir quedan ' + (st.delivered - st.disposed) + ' escenas sin dispose');
      if (e.errors.length) viol.push('I1 error de consola al cerrar: ' + e.errors[0]);
    }
  } catch (x) { viol.push('I0 excepción del harness/motor: ' + (x && x.message) + ' tras ' + trace.slice(-1)); }
  const out = { seed, cfg, n: trace.length, att: attempts(w), sum: sawSum, maxSt, viol, trace: viol.length ? trace : [] };
  try { w.close(); } catch (x) {}
  return out;
}

if (!isMainThread) {
  parentPort.on('message', async (m) => { const res = await session(m.c); parentPort.postMessage({ i: m.i, res }); });
} else {
  const { runPool } = require('./runner.cjs');
  const N = parseInt(process.argv[2] || '150', 10), SEED = parseInt(process.argv[3] || '4242', 10);
  const cases = N === 1 ? [SEED] : Array.from({ length: N }, (_, i) => (SEED * 7919 + i * 104729) >>> 0);
  const t0 = Date.now();
  runPool(__filename, cases, { workers: 5, caseTimeout: 30000 }).then((res) => {
    let events = 0, broken = 0, att = 0, withAns = 0, sums = 0; const stHist = {}; const byRule = {};
    res.forEach((x, i) => {
      if (!x) { broken++; console.log('SIN RESULTADO seed=' + cases[i]); return; }
      if (x.hang || x.crash) { broken++; console.log((x.hang ? 'CUELGUE' : 'CRASH') + ' seed=' + cases[i] + ' ' + x.errors.join(' ')); return; }
      events += x.n; att += Math.max(0, x.att); if (x.att > 0) withAns++; if (x.sum) sums++; stHist[x.maxSt] = (stHist[x.maxSt] || 0) + 1;
      if (x.viol.length) { broken++; const rule = x.viol[0].split(' ')[0]; (byRule[rule] = byRule[rule] || []).push(x); }
    });
    Object.keys(byRule).forEach((rule) => {
      const l = byRule[rule].sort((a, b) => a.trace.length - b.trace.length), m = l[0];
      console.log('FAIL ' + rule + ' en ' + l.length + ' sesiones. Más corta: seed=' + m.seed + ' cfg=' + JSON.stringify(m.cfg) + '\n  ' + m.viol[0] + '\n  traza: ' + m.trace.join(' → '));
    });
    console.log('\n' + N + ' sesiones, ' + events + ' eventos, ' + broken + ' sesiones con fallo; respuestas registradas=' + att + ' en ' + withAns + ' sesiones, ' + sums + ' llegaron al resumen; estación máx.→sesiones ' + JSON.stringify(stHist) + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
    process.exit(broken ? 1 : 0);
  });
}
