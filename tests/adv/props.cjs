// Propiedades de registro de respuestas (M08:T04, ronda completa) sobre estados VÁLIDOS aleatorios.
// Cada ejecución juega una ronda entera con aciertos/fallos/poderes/teclado al azar y verifica las 5 reglas
// después de CADA respuesta (y la de XP de resultados al final).
// Uso: node tests/adv/props.cjs [RUNS=240] [SEED=777]
const { isMainThread, parentPort } = require('worker_threads');
const L = require('./lib.cjs');

const RULES = ['P1 historial <= 10', 'P2 S.xp nunca baja', 'P3 fallo => q===true', 'P4 a >= c', 'P5 #xpc == aumento de S.xp'];

function run({ seed, ids }) {
  const { validState } = require('./gen.cjs');
  const r = L.rng(seed);
  const st = validState(r, ids);
  const viol = [], checks = [0, 0, 0, 0, 0];
  const env = L.boot(JSON.stringify(st));
  const { w, d } = env;
  try {
    L.openQuiz(w, d);
    let prevXp = st.xp, guard = 0;
    while (d.querySelector('.prompt') && guard++ < 30) {
      if (r.bool(0.25)) { const pws = [...d.querySelectorAll('.pw:not([disabled])')]; if (pws.length) { L.click(w, r.pick(pws)); if (!d.querySelector('.prompt')) break; } }
      const q = L.findQ(w, d); if (!q) throw new Error('pregunta no encontrada');
      const mode = r.bool() ? 'right' : 'wrong';
      const ct = L.norm(L.correctText(q));
      const opts = [...d.querySelectorAll('.opt:not([disabled])')];
      const target = mode === 'right' ? opts.find((b) => L.norm(b.querySelector('span:last-child').textContent) === ct) : opts.find((b) => L.norm(b.querySelector('span:last-child').textContent) !== ct);
      if (!target) throw new Error('sin opción ' + mode);
      if (r.bool(0.3)) L.key(w, String(parseInt(target.dataset.k, 10) + 1)); else L.click(w, target);
      const rn = L.btn(d, 'regenno'); if (rn) L.click(w, rn);
      const s = L.parsed(w).v;
      const h = s.topics[L.HK] || [];
      checks[0]++; if (h.length > 10) viol.push([0, 'historial de ' + h.length]);
      checks[1]++; if (!(s.xp >= prevXp)) viol.push([1, 'xp ' + prevXp + ' -> ' + s.xp]);
      prevXp = s.xp;
      const rec = s.qs[q.id];
      if (mode === 'wrong') { checks[2]++; if (!rec || rec.q !== true) viol.push([2, q.id + ' ' + JSON.stringify(rec)]); }
      Object.keys(s.qs).forEach((id) => { checks[3]++; const x = s.qs[id]; if (!(x.a >= x.c)) viol.push([3, id + ' ' + JSON.stringify(x)]); });
      if (r.bool(0.3)) L.key(w, 'Enter'); else L.nextQ(w, d);
    }
    const xpc = d.querySelector('#xpc');
    if (!xpc) throw new Error('no se llegó a resultados');
    const s = L.parsed(w).v;
    checks[4]++;
    if (Number(xpc.dataset.xp) !== s.xp - st.xp) viol.push([4, 'data-xp=' + xpc.dataset.xp + ' aumento=' + (s.xp - st.xp)]);
  } catch (e) { viol.push([-1, 'excepción: ' + e.message]); }
  if (env.errors.length) viol.push([-1, env.errors[0]]);
  w.close();
  return { viol, checks, st };
}

if (!isMainThread) {
  parentPort.on('message', ({ i, c }) => parentPort.postMessage({ i, res: run(c) }));
} else {
  (async () => {
    const RUNS = parseInt(process.argv[2] || '240', 10), SEED = parseInt(process.argv[3] || '777', 10);
    const probe = L.boot(null); const ids = L.quizQs(probe.w).map((q) => q.id); probe.w.close();
    const cases = Array.from({ length: RUNS }, (_, i) => ({ seed: SEED + i, ids }));
    const t0 = Date.now();
    const res = await require('./runner.cjs').runPool(__filename, cases, { caseTimeout: 30000 });
    const tot = [0, 0, 0, 0, 0], bad = [[], [], [], [], []], other = [];
    res.forEach((x, i) => {
      if (!x || x.hang) { other.push('CUELGUE semilla ' + cases[i].seed); return; }
      x.checks.forEach((n, k) => { tot[k] += n; });
      x.viol.forEach(([k, msg]) => { if (k < 0) other.push('semilla ' + cases[i].seed + ': ' + msg); else bad[k].push({ seed: cases[i].seed, msg, st: x.st }); });
    });
    console.log(`PROPIEDADES: ${RUNS} ejecuciones (rondas completas), semilla base ${SEED}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    RULES.forEach((n, k) => {
      const runsWith = new Set(bad[k].map((b) => b.seed)).size;
      console.log(`${bad[k].length ? 'FALLA' : 'PASA '} ${n}: ${tot[k]} comprobaciones en ${RUNS} ejecuciones, ${runsWith} ejecuciones con violación`);
      if (bad[k].length) { const m = bad[k].sort((a, b) => JSON.stringify(a.st).length - JSON.stringify(b.st).length)[0]; console.log('   contraejemplo semilla=' + m.seed + ': ' + m.msg + '\n   estado: ' + JSON.stringify(m.st)); }
    });
    if (other.length) console.log('OTROS (' + other.length + '):\n  ' + [...new Set(other)].slice(0, 10).join('\n  '));
    process.exitCode = bad.some((b) => b.length) || other.length ? 1 : 0;
  })();
}
