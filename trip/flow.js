/* Máquina de estados del viaje "Viaja como paquete". Sin DOM ni Three.js: se puede probar con require. */
var TripFlow = (function () {
  function create(deps) {
    var stations = deps.stations, byTopic = deps.questionsByTopic, rnd = deps.rnd || Math.random;
    var s = { phase: 'idle', station: 0, decision: 0, attempt: 0, item: null, lastOk: null, consec: 0, xp: 0, fails: [] };
    var used = {}, perStation = [], i;
    for (i = 0; i < stations.length; i++) perStation.push({ ok: 0, total: 0 });

    function idx(n) { return Math.min(n - 1, Math.floor(rnd() * n)); }   // rnd() = 1 no se sale del arreglo
    function pick(topic, avoidId) {
      var all = byTopic[topic] || [];
      if (!all.length) {   // tema sin preguntas: otro tema de la estación y, si no, cualquiera del banco
        var alt = stations[s.station].topics.concat(Object.keys(byTopic)), k;
        for (k = 0; k < alt.length && !all.length; k++) all = byTopic[alt[k]] || [];
      }
      if (!all.length) return null;
      var fresh = all.filter(function (q) { return !used[q.id] && q.id !== avoidId; });
      var pool = fresh.length ? fresh : all.filter(function (q) { return q.id !== avoidId; });
      if (!pool.length) pool = all;
      return pool[idx(pool.length)];
    }
    function present(topic, avoidId) {
      var q = pick(topic, avoidId);
      if (!q) { s.item = null; s.lastOk = true; s.phase = 'result'; next(); return; }   // sin preguntas: la decisión se omite
      used[q.id] = true;
      s.item = deps.prep(q);
      s.phase = 'ask';
      deps.onAsk(s.item);
    }
    function nextTopic() {
      var t = stations[s.station].topics;
      return t[idx(t.length)];
    }
    function start() {
      if (s.phase !== 'idle') return;
      s.phase = 'arrive';
      deps.onStation(s.station);
    }
    function ask() {
      if (s.phase !== 'arrive') return;
      present(nextTopic(), null);
    }
    function answer(k) {
      if (s.phase !== 'ask') return;
      var q = s.item.q, ok = k === s.item.correct;
      s.consec = ok ? s.consec + 1 : 0;
      s.lastOk = ok;
      if (!ok && !s.fails.some(function (f) { return f.id === q.id; })) s.fails.push(q);
      var ps = perStation[s.station]; ps.total++; if (ok) ps.ok++;
      s.phase = 'result';
      var g = Number(deps.onResult({ q: q, ok: ok, consec: s.consec }));
      s.xp += isFinite(g) ? g : 0;
    }
    function next() {
      if (s.phase !== 'result') return;
      if (!s.lastOk && s.attempt === 0) { s.attempt = 1; present(s.item.q.topic, s.item.q.id); return; }
      s.attempt = 0; s.decision++;
      if (s.decision < stations[s.station].ask) { present(nextTopic(), null); return; }
      deps.onLayer(stations[s.station].layers);
      s.decision = 0;
      if (s.station === stations.length - 1) {
        s.phase = 'summary';
        deps.onSummary({ xp: s.xp, fails: s.fails.slice(), perStation: perStation.map(function (p) { return { ok: p.ok, total: p.total }; }) });
        return;
      }
      s.station++; s.phase = 'arrive';
      deps.onStation(s.station);
    }
    function state() {
      return { phase: s.phase, station: s.station, decision: s.decision, attempt: s.attempt, item: s.item ? { q: s.item.q, labels: s.item.labels.slice(), correct: s.item.correct } : null, lastOk: s.lastOk, consec: s.consec, xp: s.xp, fails: s.fails.slice() };
    }
    return { start: start, ask: ask, answer: answer, next: next, state: state };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TripFlow;
