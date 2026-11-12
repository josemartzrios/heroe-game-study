// Propiedades adversariales de trip/flow.js (require directo) y trip/scene.js (Three r169 real, renderer/raf/canvas falsos).
// Cada regla se prueba con muchas entradas generadas por un PRNG con semilla; si una falla se reduce (shrink) la
// secuencia de llamadas hasta la mínima que sigue fallando y se imprime para reproducirla.
// Uso: node tests/adv/trip_props.cjs [RUNS=1000] [SEED=20261111]
const path = require('path');
const { pathToFileURL } = require('url');
const { rng } = require('./lib.cjs');
const TripFlow = require('../../trip/flow.js');
const TripScene = require('../../trip/scene.js');

const RUNS = parseInt(process.argv[2] || '1000', 10);
const SEED = parseInt(process.argv[3] || '20261111', 10);
const EXPECT_LAYERS = [0, 1, 2, 3, 4, 4, 4, 4, 1, 1];
const report = [];   // [regla, ejecuciones, fallos, contraejemplo]
const ok = (name, cond, extra) => report.push([name, 1, cond ? 0 : 1, cond ? '' : (extra || '')]);

// ---------------- flow ----------------
function bank(r, stations) {
  const by = {};
  stations.forEach((s) => s.topics.forEach((t) => { if (!by[t]) { const n = r.int(1, 5); by[t] = []; for (let k = 0; k < n; k++) by[t].push({ id: t + '-' + k, topic: t }); } }));
  return by;
}
// Ejecuta una secuencia de operaciones sobre un flow nuevo y devuelve la lista de violaciones (o la excepción).
function runFlow(stations, seed, ops) {
  const r = rng(seed), rq = rng(seed ^ 0x9e3779b9);
  const by = bank(r, stations);
  const log = { station: [], layer: [], summary: [], rets: [], answersAt: {}, asks: 0 };
  const viol = [];
  let f;
  try {
    f = TripFlow.create({
      stations, questionsByTopic: by, rnd: rq,
      prep: (q) => { const n = 2 + (q.id.charCodeAt(q.id.length - 1) % 3); return { q, labels: Array.from({ length: n }, (_, i) => 'L' + i), correct: q.id.length % n }; },
      onStation: (i) => log.station.push(i),
      onAsk: () => { log.asks++; },
      onResult: (res) => { const v = res.ok ? 10 + (res.consec >= 3 ? 5 : 0) : 0; log.rets.push(v); return v; },
      onLayer: (n) => log.layer.push(n),
      onSummary: (s) => log.summary.push(s),
    });
    for (const op of ops) {
      if (op.o === 'answer') {
        const st = f.state(), key = st.station + ':' + st.decision, before = log.rets.length;
        f.answer(op.k === 'right' ? (st.item ? st.item.correct : 0) : op.k);
        if (log.rets.length > before) log.answersAt[key] = (log.answersAt[key] || 0) + 1;
      } else f[op.o]();
    }
  } catch (e) { return { viol: ['R1 lanza: ' + e.message], log }; }
  const st = f.state();
  const sum = log.rets.reduce((a, b) => a + b, 0);
  if (st.xp !== sum) viol.push('R3 xp=' + st.xp + ' != suma onResult=' + sum);
  const ids = st.fails.map((q) => q.id);
  if (new Set(ids).size !== ids.length) viol.push('R4 fails duplicados ' + JSON.stringify(ids));
  log.summary.forEach((s) => { s.perStation.forEach((p, i) => { if (!(p.total >= p.ok)) viol.push('R5 perStation[' + i + '] total<ok'); });
    if (new Set(s.fails.map((q) => q.id)).size !== s.fails.length) viol.push('R4 fails duplicados en resumen'); });
  for (let i = 0; i < log.station.length; i++) if (log.station[i] !== i) { viol.push('R6 onStation no estrictamente creciente 0..9: ' + JSON.stringify(log.station)); break; }
  Object.keys(log.answersAt).forEach((k) => { if (log.answersAt[k] > 2) viol.push('R7 ' + log.answersAt[k] + ' intentos en la decisión ' + k); });
  if (JSON.stringify(log.layer) !== JSON.stringify(EXPECT_LAYERS.slice(0, log.layer.length)) || log.layer.length > 10) viol.push('R8 onLayer=' + JSON.stringify(log.layer));
  if (log.summary.length > 1) viol.push('R9 onSummary llamado ' + log.summary.length + ' veces');
  return { viol, log, st };
}
// Política válida: siempre la acción que corresponde a la fase.
function validOps(r) {
  const ops = [{ o: 'start' }];
  for (let i = 0; i < 200; i++) ops.push({ o: 'ask' }, { o: 'answer', k: r.bool(0.55) ? 'right' : r.int(-1, 4) }, { o: 'next' });
  return ops;
}
// Política caótica: llamadas fuera de orden. withStart: start() puede repetirse en cualquier momento.
function chaosOps(r, withStart) {
  const ops = [{ o: 'start' }], n = r.int(20, 400);
  const K = [0, 1, 2, 3, -1, 99, NaN, Infinity, -0, '0', '1', null, undefined, {}, 'right', 'right', 'right'];
  for (let i = 0; i < n; i++) {
    const p = r();
    if (withStart && p < 0.05) ops.push({ o: 'start' });
    else if (p < 0.3) ops.push({ o: 'ask' });
    else if (p < 0.6) ops.push({ o: 'answer', k: r.pick(K) });
    else if (p < 0.95) ops.push({ o: 'next' });
    else ops.push({ o: 'state' });
  }
  return ops;
}
function shrink(stations, seed, ops, rule) {
  const fails = (o) => runFlow(stations, seed, o).viol.some((v) => v.startsWith(rule));
  let cur = ops.slice(), chunk = Math.max(1, cur.length >> 1);
  while (chunk >= 1) {
    let changed = false;
    for (let i = 0; i + chunk <= cur.length;) { const t = cur.slice(0, i).concat(cur.slice(i + chunk)); if (t.length && fails(t)) { cur = t; changed = true; } else i += chunk; }
    if (!changed) chunk >>= 1;
  }
  return cur;
}
const fmtOps = (ops) => ops.map((o) => o.o === 'answer' ? 'answer(' + (o.k === 'right' ? 'correcta' : (typeof o.k === 'object' && o.k ? '{}' : String(o.k))) + ')' : o.o + '()').join(', ');

function propFlow(stations, name, gen, extraCheck) {
  const r = rng(SEED ^ name.length * 7919);
  const byRule = {};
  for (let i = 0; i < RUNS; i++) {
    const seed = (SEED + i * 101) >>> 0, ops = gen(r);
    const res = runFlow(stations, seed, ops);
    const v = res.viol.slice();
    if (extraCheck) extraCheck(res, v);
    v.forEach((x) => { const rule = x.split(' ')[0]; if (!byRule[rule]) byRule[rule] = { n: 0, seed, ops, msg: x }; byRule[rule].n++; });
  }
  const rules = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
  rules.forEach((rule) => {
    const b = byRule[rule];
    let cx = '';
    if (b) { const m = rule === 'R2' ? b.ops : shrink(stations, b.seed, b.ops, rule); const mv = runFlow(stations, b.seed, m).viol.find((x) => x.startsWith(rule)) || b.msg; cx = 'seed=' + b.seed + ' mínimo: [' + fmtOps(m) + '] → ' + mv; }
    report.push([name + ' ' + rule, RUNS, b ? b.n : 0, cx]);
  });
}

// ---------------- scene ----------------
function fakes(reduced) {
  const f = { pend: new Map(), nextId: 1, maxPend: 0, disposed: false, afterDispose: [], listeners: {}, cams: [] };
  const mark = (what) => { if (f.disposed) f.afterDispose.push(what); };
  f.raf = (cb) => { mark('raf'); const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
  f.caf = (id) => { f.pend.delete(id); };
  f.run = (ts) => { if (!f.pend.size) return false; const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); return true; };
  f.canvas = { clientWidth: 400, clientHeight: 800, parentNode: null, addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; }, setPointerCapture() {} };
  f.rend = { info: { render: { calls: 0 } }, setPixelRatio() {}, setSize() { mark('setSize'); }, render(sc, cam) { mark('render'); f.cams.push(cam.position.toArray()); }, dispose() {}, forceContextLoss() {}, setClearColor() {}, compileAsync() { return Promise.resolve(); } };
  f.opts = { reducedMotion: reduced, renderer: f.rend, raf: f.raf, caf: f.caf, pixelRatio: 1, search: '' };
  return f;
}
const flush = async (n = 3) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
async function runScene(THREE, stations, seed, ops) {
  const r = rng(seed), f = fakes(ops.reduced);
  const api = await TripScene.create(THREE, f.canvas, stations, f.opts);
  const gotos = []; let ts = 1000, threw = null;
  const viol = [];
  try {
    for (const op of ops.list) {
      if (op.o === 'goTo') { const p = { done: false }; api.goTo(op.i).then(() => { p.done = true; }); gotos.push(p); }
      else if (op.o === 'setLayers') api.setLayers(op.n);
      else if (op.o === 'lost') api.lost();
      else if (op.o === 'look') api.look(op.dx, op.dy);
      else if (op.o === 'resize') api.resize();
      else if (op.o === 'setPaused') api.setPaused(op.r, op.on);
      else if (op.o === 'dispose') { api.dispose(); f.disposed = true; }
      else if (op.o === 'frames') for (let k = 0; k < op.n; k++) { ts += 16; f.run(ts); }
      await flush(1);
      if (f.maxPend > 1) { viol.push('S1 más de 1 rAF pendiente (' + f.maxPend + ')'); break; }
    }
  } catch (e) { threw = e; }
  if (threw) viol.push('S0 lanza: ' + threw.message);
  // drenar: quitar pausas conocidas y correr cuadros
  try { if (!f.disposed) { ['sheet', 'hidden', 'x'].forEach((k) => api.setPaused(k, false)); for (let k = 0; k < 400 && f.pend.size; k++) { ts += 16; f.run(ts); await flush(1); } } } catch (e) { viol.push('S0 lanza en un cuadro: ' + e.message); }
  await flush(3);
  if (!f.disposed && gotos.some((p) => !p.done)) viol.push('S3 goTo sin resolver con la escena corriendo tras 400 cuadros');
  api.dispose(); f.disposed = true; await flush(3);
  if (gotos.some((p) => !p.done)) viol.push('S3 goTo sin resolver tras dispose');
  // tras dispose: martillar la API
  const realST = global.setTimeout; global.setTimeout = function () { f.afterDispose.push('setTimeout'); return realST.apply(this, arguments); };
  try { api.setLayers(3); api.lost(); api.look(5, 5); api.resize(); api.setPaused('z', true); api.setPaused('z', false); api.goTo(2); } catch (e) { viol.push('S0 lanza tras dispose: ' + e.message); } finally { global.setTimeout = realST; }
  await flush(3);
  if (f.afterDispose.length) viol.push('S2 actividad tras dispose: ' + [...new Set(f.afterDispose)].join(','));
  if (f.maxPend > 1) viol.push('S1 más de 1 rAF pendiente (' + f.maxPend + ')');
  if (f.cams.some((c) => c.some((x) => !Number.isFinite(x)))) viol.push('S4 cámara con NaN/Infinity');
  return viol;
}
function sceneOps(r, hostile) {
  const list = [], n = r.int(5, 40);
  const I = hostile ? [0, 1, 2, 5, 9, -1, 10, NaN, 2.5, '3', undefined] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const N = hostile ? [0, 1, 2, 3, 4, 5, -1, NaN, 1e9] : [0, 1, 2, 3, 4];
  const D = hostile ? [10, -10, 0, 1e6, -1e6, NaN, Infinity] : [10, -10, 0, 0.25, -3];
  for (let i = 0; i < n; i++) {
    const p = r();
    if (p < 0.2) list.push({ o: 'goTo', i: r.pick(I) });
    else if (p < 0.32) list.push({ o: 'setLayers', n: r.pick(N) });
    else if (p < 0.4) list.push({ o: 'lost' });
    else if (p < 0.5) list.push({ o: 'look', dx: r.pick(D), dy: r.pick(D) });
    else if (p < 0.56) list.push({ o: 'resize' });
    else if (p < 0.7) list.push({ o: 'setPaused', r: r.pick(['sheet', 'hidden', 'x']), on: r.bool() });
    else if (p < 0.72) list.push({ o: 'dispose' });
    else list.push({ o: 'frames', n: r.int(1, 60) });
  }
  return { reduced: r.bool(0.3), list };
}
function shrinkScene(THREE, stations, seed, ops, rule) {
  return (async () => {
    let cur = ops.list.slice();
    for (let i = 0; i < cur.length;) { const t = cur.slice(0, i).concat(cur.slice(i + 1)); const v = await runScene(THREE, stations, seed, { reduced: ops.reduced, list: t }); if (v.some((x) => x.startsWith(rule))) cur = t; else i++; }
    return cur;
  })();
}
const fmtS = (l) => l.map((o) => o.o + '(' + Object.keys(o).filter((k) => k !== 'o').map((k) => String(o[k])).join(',') + ')').join(', ');
async function propScene(THREE, stations, name, hostile, runs) {
  const r = rng(SEED ^ (hostile ? 0xabc : 0xdef)), byRule = {};
  for (let i = 0; i < runs; i++) {
    const seed = (SEED + i) >>> 0, ops = sceneOps(r, hostile);
    const v = await runScene(THREE, stations, seed, ops);
    v.forEach((x) => { const rule = x.split(' ')[0]; if (!byRule[rule]) byRule[rule] = { n: 0, seed, ops, msg: x }; byRule[rule].n++; });
  }
  for (const rule of ['S0', 'S1', 'S2', 'S3', 'S4']) {
    const b = byRule[rule]; let cx = '';
    if (b) { const m = await shrinkScene(THREE, stations, b.seed, b.ops, rule); cx = 'reduced=' + b.ops.reduced + ' mínimo: [' + fmtS(m) + '] → ' + b.msg; }
    report.push([name + ' ' + rule, runs, b ? b.n : 0, cx]);
  }
}

(async () => {
  const t0 = Date.now();
  const { stations } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'trip', 'stations.mjs')).href);
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', '..', 'vendor', 'three.module.min.js')).href);
  console.log('semilla=' + SEED + ' runs=' + RUNS);

  // R2: con la política válida siempre termina en summary, con onStation 0..9 y onLayer exacto.
  propFlow(stations, 'flow-válida', validOps, (res, v) => {
    if (res.viol.some((x) => x.startsWith('R1'))) return;
    if (res.st.phase !== 'summary' || res.log.summary.length !== 1) v.push('R2 no terminó en summary (fase ' + res.st.phase + ')');
    if (JSON.stringify(res.log.station) !== JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])) v.push('R2 onStation=' + JSON.stringify(res.log.station));
    if (JSON.stringify(res.log.layer) !== JSON.stringify(EXPECT_LAYERS)) v.push('R2 onLayer=' + JSON.stringify(res.log.layer));
  });
  propFlow(stations, 'flow-caos(sin start repetido)', (r) => chaosOps(r, false));
  propFlow(stations, 'flow-caos(start fuera de orden)', (r) => chaosOps(r, true));

  // ---- adversariales sueltos de flow ----
  const mk = (over) => TripFlow.create(Object.assign({ stations, questionsByTopic: bank(rng(1), stations), prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }), onStation() {}, onAsk() {}, onResult: () => 10, onLayer() {}, onSummary() {} }, over));
  // ATAQUE: start() repetido tras el resumen reabre el viaje y emite un segundo onSummary
  { let sums = 0; const f = mk({ onSummary: () => sums++ }); f.start();
    for (let i = 0; i < 100 && f.state().phase !== 'summary'; i++) { f.ask(); f.answer(0); f.next(); }
    f.start(); for (let i = 0; i < 5; i++) { f.ask(); f.answer(0); f.next(); }
    ok('adv flow start() tras summary no reabre el viaje', sums === 1 && f.state().phase === 'summary', 'onSummary x' + sums + ', fase=' + f.state().phase); }
  // ATAQUE: start() en mitad de una pregunta descarta la pregunta y vuelve a emitir onStation de la misma estación
  { const st = []; const f = mk({ onStation: (i) => st.push(i) }); f.start(); f.ask(); f.start();
    ok('adv flow start() durante ask no re-emite onStation', JSON.stringify(st) === '[0]' && f.state().phase === 'ask', 'onStation=' + JSON.stringify(st) + ' fase=' + f.state().phase); }
  // ATAQUE: onResult que devuelve un string concatena en vez de sumar
  { const f = mk({ onResult: () => '5' }); f.start(); f.ask(); f.answer(0); f.next(); f.ask(); f.answer(0);
    ok('adv flow xp sigue siendo número si onResult devuelve "5"', typeof f.state().xp === 'number', 'xp=' + JSON.stringify(f.state().xp)); }
  // ATAQUE: rnd() que devuelve exactamente 1 (aleatoriedad extrema, fuera de [0,1))
  { let err = null; try { const f = mk({ rnd: () => 1 }); f.start(); f.ask(); } catch (e) { err = e.message; }
    ok('adv flow rnd()=1 no lanza', !err, err); }
  // ATAQUE: tema sin preguntas (banco incompleto)
  { let err = null; try { const f = mk({ questionsByTopic: {} }); f.start(); f.ask(); } catch (e) { err = e.message; }
    ok('adv flow tema sin preguntas no lanza', !err, err); }
  // ATAQUE: tema con 1 sola pregunta: la retransmisión no puede evitar repetirla (no debe lanzar ni duplicar fails)
  { let err = null, f; try { const by = {}; stations.forEach((s) => s.topics.forEach((t) => { by[t] = [{ id: t, topic: t }]; })); f = mk({ questionsByTopic: by, prep: (q) => ({ q, labels: ['a', 'b'], correct: 1 }) }); f.start(); for (let i = 0; i < 200 && f.state().phase !== 'summary'; i++) { f.ask(); f.answer(0); f.next(); } } catch (e) { err = e.message; }
    ok('adv flow banco de 1 pregunta por tema: termina sin lanzar y fails únicos', !err && f.state().phase === 'summary' && new Set(f.state().fails.map((q) => q.id)).size === f.state().fails.length, err || f.state().phase); }
  // ATAQUE: state() devuelve item por referencia: mutarlo desde fuera cambia la respuesta correcta
  { const f = mk({}); f.start(); f.ask(); f.state().item.correct = 1; f.answer(0);
    ok('adv flow state().item no permite mutar el estado interno', f.state().lastOk === true, 'lastOk=' + f.state().lastOk); }

  // ---- scene ----
  const SR = Math.max(150, Math.floor(RUNS / 4));
  await propScene(THREE, stations, 'scene-válida', false, SR);
  await propScene(THREE, stations, 'scene-hostil', true, Math.floor(SR / 2));
  // ATAQUE: goTo(10) (estación inexistente) deja camT en NaN para siempre
  { const f = fakes(true); const api = await TripScene.create(THREE, f.canvas, stations, f.opts);
    let err = null; try { await api.goTo(10); await api.goTo(3); f.run(2000); } catch (e) { err = e.message; }
    const c = f.cams[f.cams.length - 1];
    ok('adv scene goTo(10) (reducedMotion) no lanza y luego goTo(3) deja la cámara finita', !err && c && c.every(Number.isFinite), err || JSON.stringify(c)); api.dispose(); }
  // ATAQUE: goTo(10) animado: travel hacia undefined → camT NaN y el siguiente cuadro lanza dentro de rAF
  { const f = fakes(false); const api = await TripScene.create(THREE, f.canvas, stations, f.opts);
    let err = null; try { api.goTo(10); for (let t = 1000; t < 4000 && f.pend.size; t += 16) f.run(t); api.goTo(3); for (let t = 4000; t < 8000 && f.pend.size; t += 16) f.run(t); } catch (e) { err = e.message; }
    const c = f.cams[f.cams.length - 1];
    ok('adv scene goTo(10) animado no lanza en el bucle y la cámara queda finita', !err && c && c.every(Number.isFinite), err || JSON.stringify(c)); api.dispose(); }
  // ATAQUE: look(NaN) envenena yaw/pitch
  { const f = fakes(true); const api = await TripScene.create(THREE, f.canvas, stations, f.opts); f.run(1000);
    let err = null; try { api.look(NaN, 0); api.look(5, 0); f.run(1016); } catch (e) { err = e.message; } const c = f.cams[f.cams.length - 1];
    ok('adv scene look(NaN) seguido de look(5): cámara finita', !err && c.every(Number.isFinite), err || JSON.stringify(c)); api.dispose(); }
  // ATAQUE: resize() y lost() después de dispose tocan el renderer liberado / agendan timers
  { const f = fakes(true); const api = await TripScene.create(THREE, f.canvas, stations, f.opts); api.dispose(); f.disposed = true; api.resize();
    ok('adv scene resize() tras dispose no llama a renderer.setSize', !f.afterDispose.includes('setSize'), f.afterDispose.join(',')); }

  // ---- informe ----
  let bad = 0;
  report.forEach(([n, runs, fails, cx]) => { if (fails) bad++; console.log((fails ? 'FAIL' : 'PASS') + ' | ' + n + ' | ' + runs + ' ejec. | ' + fails + ' fallos' + (cx ? ' | ' + cx : '')); });
  const totalRuns = report.reduce((a, r) => a + r[1], 0);
  console.log('\n' + report.length + ' reglas, ' + totalRuns + ' ejecuciones, ' + bad + ' fallan (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); process.exit(2); });
