// Propiedades adversariales de city/route.js (CityRoute, require directo): cada regla se prueba con muchas entradas generadas por un PRNG con semilla;
// si una falla se reduce (shrink) la secuencia de llamadas hasta la mínima que sigue fallando y se imprime para reproducirla. Incluye deps.from.
// Uso: node tests/adv/route_props.cjs [RUNS=1000] [SEED=20261111]
const path = require('path');
const { pathToFileURL } = require('url');
const { rng } = require('./lib.cjs');
const CityRoute = require('../../city/route.js');

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
    f = CityRoute.create({
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


(async () => {
  const t0 = Date.now();
  const { stations } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'city', 'districts', 'm08_route.mjs')).href);
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
  const mk = (over) => CityRoute.create(Object.assign({ stations, questionsByTopic: bank(rng(1), stations), prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }), onStation() {}, onAsk() {}, onResult: () => 10, onLayer() {}, onSummary() {} }, over));
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

  // ---- deps.from: reanudar desde cualquier estación ----
  for (let from = 0; from < stations.length; from++) {
    const sts = []; const f = CityRoute.create({ stations, questionsByTopic: bank(rng(from + 1), stations), prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }), from, onStation: (i) => sts.push(i), onAsk() {}, onResult: () => 1, onLayer() {}, onSummary() {} });
    f.start(); for (let i = 0; i < 200 && f.state().phase !== 'summary'; i++) { const s = f.state(); if (s.phase === 'arrive') f.ask(); else if (s.phase === 'ask') f.answer(s.item.correct); else if (s.phase === 'result') f.next(); else break; }
    ok('adv route from=' + from + ': recorre de la estación ' + from + ' a la 9 y termina en summary', f.state().phase === 'summary' && JSON.stringify(sts) === JSON.stringify(Array.from({ length: stations.length - from }, (_, k) => from + k)), 'estaciones=' + JSON.stringify(sts) + ' fase=' + f.state().phase);
  }
  { const bad = [];
    for (const v of [-1, NaN, 3.5, '3', Infinity, -Infinity, 10, 99, null, undefined, {}, [], true, false, 1e308]) { const sts = []; const f = CityRoute.create({ stations, questionsByTopic: bank(rng(1), stations), prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }), from: v, onStation: (i) => sts.push(i), onAsk() {}, onResult: () => 1, onLayer() {}, onSummary() {} }); f.start(); if (sts.join() !== '0') bad.push(String(v) + '→' + sts.join()); }
    ok('adv route from inválido (-1, NaN, 3.5, "3", Infinity, 10, null, objetos…) empieza en 0', bad.length === 0, bad.join(' | ')); }

  // ---- informe ----
  let bad = 0;
  report.forEach(([n, runs, fails, cx]) => { if (fails) bad++; console.log((fails ? 'FAIL' : 'PASS') + ' | ' + n + ' | ' + runs + ' ejec. | ' + fails + ' fallos' + (cx ? ' | ' + cx : '')); });
  const totalRuns = report.reduce((a, r) => a + r[1], 0);
  console.log('\n' + report.length + ' reglas, ' + totalRuns + ' ejecuciones, ' + bad + ' fallan (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); process.exit(2); });
