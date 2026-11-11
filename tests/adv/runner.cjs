// Pool de workers con perro guardián: cada caso tiene un límite de tiempo; un cuelgue mata al worker y se registra.
const { Worker } = require('worker_threads');
const os = require('os');

function runPool(file, cases, { workers = Math.min(4, os.cpus().length), caseTimeout = 20000, workerData = {} } = {}) {
  return new Promise((resolve) => {
    const results = new Array(cases.length);
    let nextIdx = 0, active = 0;
    const spawn = () => {
      if (nextIdx >= cases.length) { if (active === 0) resolve(results); return; }
      active++;
      const w = new Worker(file, { workerData });
      let cur = -1, timer = null;
      const feed = () => {
        if (nextIdx >= cases.length) { clearTimeout(timer); w.terminate(); return; }
        cur = nextIdx++;
        clearTimeout(timer);
        timer = setTimeout(() => { results[cur] = { hang: true, errors: ['CUELGUE: > ' + caseTimeout + ' ms'] }; w.terminate(); }, caseTimeout);
        w.postMessage({ i: cur, c: cases[cur] });
      };
      w.on('message', (m) => { results[m.i] = m.res; feed(); });
      w.on('error', (e) => { if (cur >= 0 && !results[cur]) results[cur] = { crash: true, errors: ['worker error: ' + e.message] }; });
      w.on('exit', () => { clearTimeout(timer); active--; spawn(); if (nextIdx >= cases.length && active === 0) resolve(results); });
      w.once('online', feed);
    };
    const n = Math.min(workers, cases.length);
    for (let k = 0; k < n; k++) spawn();
  });
}
module.exports = { runPool };
