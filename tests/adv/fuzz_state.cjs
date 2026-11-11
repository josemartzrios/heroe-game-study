// Fuzzing del estado guardado estudio_isw_v1: N estados aleatorios/mal formados → arrancar, abrir M08, responder 3 preguntas.
// Uso: node tests/adv/fuzz_state.cjs [N=320] [SEED=20261111]
const { isMainThread, parentPort } = require('worker_threads');
const L = require('./lib.cjs');

function checkSaved(w, answered) {
  const bad = [];
  const p = L.parsed(w);
  if (!p.ok) return ['estado guardado NO es JSON válido: ' + p.err];
  const s = p.v;
  if (!s || typeof s !== 'object') return ['estado guardado no es objeto'];
  if (typeof s.xp !== 'number' || !isFinite(s.xp) || s.xp < 0) bad.push('xp corrupto: ' + JSON.stringify(s.xp));
  if (typeof s.session !== 'number' || !isFinite(s.session)) bad.push('session corrupto: ' + JSON.stringify(s.session));
  if (!s.days || typeof s.days.count !== 'number' || !isFinite(s.days.count)) bad.push('days.count corrupto: ' + JSON.stringify(s.days && s.days.count));
  const h = s.topics && s.topics[L.HK];
  if (answered.length) {
    if (!Array.isArray(h)) bad.push('historial M08:T04 perdido o no arreglo: ' + JSON.stringify(h));
    else if (h.length > 10 || h.some((x) => typeof x !== 'number' || x < 0 || x > 1)) bad.push('historial inválido: ' + JSON.stringify(h).slice(0, 80));
    answered.forEach(([id, ok]) => {
      const r = s.qs && s.qs[id];
      if (!r || typeof r !== 'object') { bad.push('registro de ' + id + ' perdido: ' + JSON.stringify(r)); return; }
      if (typeof r.a !== 'number' || typeof r.c !== 'number' || !(r.a >= r.c)) bad.push('registro a/c corrupto: ' + JSON.stringify(r));
      if (!ok && r.q !== true) bad.push('fallo sin q=true: ' + JSON.stringify(r));
    });
  }
  return bad;
}

function runCase(c) {
  let env;
  const out = { errors: [], exception: null, corrupt: [] };
  const t0 = Date.now();
  try {
    env = L.boot(c.raw);
    const { w, d } = env;
    L.openQuiz(w, d);
    const answered = [];
    for (let k = 0; k < 3; k++) {
      const mode = (c.seed >> k) & 1 ? 'right' : 'wrong';
      const q = L.answerOne(w, d, mode);
      answered.push([q.id, mode === 'right']);
      if (k < 2) L.nextQ(w, d);
    }
    out.corrupt = checkSaved(w, answered);
  } catch (e) { out.exception = String(e && e.message || e); }
  if (env) { out.errors = env.errors.slice(0, 3); if (!out.exception && !L.parsed(env.w).ok) out.corrupt.push('JSON inválido'); try { env.w.close(); } catch (e) {} }
  out.ms = Date.now() - t0;
  return out;
}

if (!isMainThread) {
  parentPort.on('message', ({ i, c }) => parentPort.postMessage({ i, res: runCase(c) }));
} else {
  (async () => {
    const N = parseInt(process.argv[2] || '320', 10), SEED = parseInt(process.argv[3] || '20261111', 10);
    const { genCase } = require('./gen.cjs');
    const { runPool } = require('./runner.cjs');
    const probe = L.boot(null); const ids = L.quizQs(probe.w).map((q) => q.id); probe.w.close();
    const cases = []; for (let i = 0; i < N; i++) { const g = genCase(SEED + i, ids); cases.push({ seed: SEED + i, raw: g.raw, paths: g.paths }); }
    const t0 = Date.now();
    const res = await runPool(__filename, cases, { caseTimeout: 30000 });
    const sig = new Map(); let fails = 0, hangs = 0;
    res.forEach((r, i) => {
      const probs = [].concat(r.hang ? ['CUELGUE'] : [], r.exception ? ['excepción: ' + r.exception] : [], r.errors || [], r.corrupt || []);
      if (!probs.length) return;
      fails++; if (r.hang) hangs++;
      const key = cases[i].paths.join('+') + ' :: ' + probs[0].replace(/M08-[\w-]+/g, 'ID').replace(/\d{3,}/g, 'N').slice(0, 140);
      const prev = sig.get(key);
      if (!prev || cases[i].raw.length < prev.raw.length) sig.set(key, { raw: cases[i].raw, seed: cases[i].seed, probs, n: (prev ? prev.n : 0) + 1 }); else prev.n++;
    });
    const slow = res.map((r, i) => [r && r.ms || 0, i]).sort((a, b) => b[0] - a[0]).slice(0, 3);
    console.log(`FUZZ estado: ${N} entradas, semilla ${SEED}, ${((Date.now() - t0) / 1000).toFixed(1)} s, fallos ${fails}, cuelgues ${hangs}`);
    console.log('Casos más lentos (ms):', slow.map(([ms, i]) => ms + ' [' + cases[i].paths.join('+') + ']').join(', '));
    [...sig.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => {
      console.log(`\n[x${v.n}] ${k}\n  semilla=${v.seed}\n  problemas: ${v.probs.slice(0, 3).join(' | ').slice(0, 400)}\n  entrada mínima (${v.raw.length} car.): ${v.raw.length > 600 ? v.raw.slice(0, 600) + '…' : v.raw}`);
    });
    process.exitCode = fails ? 1 : 0;
  })();
}
