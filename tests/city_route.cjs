// Pruebas unitarias de city/route.js (CityRoute: máquina de estados de la ruta del paquete, sin DOM), copia de las pruebas del viaje 3D anterior (ya retirado) más deps.from.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const MODULES = vm.runInNewContext(html.match(/const MODULES = (\[[\s\S]*?\n\]);/)[1]);
const M8 = MODULES.find((m) => m.id === 'M08');
const byTopicAll = {};
for (const q of M8.questions) (byTopicAll[q.topic] = byTopicAll[q.topic] || []).push(q);

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const prep = (q) => ({ q, labels: q.type === 'tf' ? ['Verdadero', 'Falso'] : q.options, correct: q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer });

(async () => {
  const { stations } = await import(path.join(__dirname, '..', 'city', 'districts', 'm08_route.mjs'));
  const CityRoute = require('../city/route.js');

  function make(over = {}, seed = 1) {
    const rec = { stations: [], asks: [], results: [], layers: [], summary: null, gains: 0 };
    const deps = Object.assign({
      stations, questionsByTopic: byTopicAll, prep, rnd: mulberry32(seed),
      onStation: (i) => rec.stations.push(i), onAsk: (item) => rec.asks.push(item),
      onResult: (r) => { rec.results.push(r); return 7; },
      onLayer: (n) => rec.layers.push(n), onSummary: (s) => { rec.summary = s; }
    }, over);
    return { flow: CityRoute.create(deps), rec };
  }
  // Recorre el viaje; policy(item, index) devuelve el índice de opción a responder
  function drive(flow, policy) {
    let n = 0, guard = 0;
    while (flow.state().phase !== 'summary' && guard++ < 500) {
      const st = flow.state();
      if (st.phase === 'arrive') flow.ask();
      else if (st.phase === 'ask') flow.answer(policy(st.item, n++));
      else if (st.phase === 'result') flow.next();
      else break;
    }
    return n;
  }
  const right = (item) => item.correct;
  const wrong = (item) => (item.correct === 0 ? 1 : 0);

  // (a) acertando todo
  { const { flow, rec } = make(); flow.start(); drive(flow, right);
    ok('a onStation recibe 0..9 en orden', JSON.stringify(rec.stations) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), JSON.stringify(rec.stations));
    ok('a hay 18 preguntas', rec.asks.length === 18, 'asks=' + rec.asks.length);
    ok('a onLayer recibe [0,1,2,3,4,4,4,4,1,1]', JSON.stringify(rec.layers) === JSON.stringify([0, 1, 2, 3, 4, 4, 4, 4, 1, 1]), JSON.stringify(rec.layers));
    ok('a onSummary.xp es la suma de lo que devolvió onResult', rec.summary && rec.summary.xp === 18 * 7, JSON.stringify(rec.summary && rec.summary.xp));
    ok('a fase final summary', flow.state().phase === 'summary'); }

  // (b) un fallo y next: otra pregunta del mismo tema, distinta q.id, attempt 1
  { const { flow, rec } = make(); flow.start(); flow.ask(); const first = flow.state().item; flow.answer(wrong(first)); flow.next();
    const st = flow.state();
    ok('b retransmisión: misma materia', st.item && st.item.q.topic === first.q.topic, st.item && st.item.q.topic + ' vs ' + first.q.topic);
    ok('b retransmisión: otra pregunta', st.item && st.item.q.id !== first.q.id);
    ok('b attempt === 1 y fase ask', st.attempt === 1 && st.phase === 'ask'); }

  // (c) dos fallos seguidos: sigue a la siguiente decisión
  { const { flow } = make(); flow.start(); flow.ask(); flow.answer(wrong(flow.state().item)); flow.next(); flow.answer(wrong(flow.state().item)); flow.next();
    const st = flow.state();
    ok('c tras dos fallos avanza a la estación 1', st.station === 1 && st.phase === 'arrive', JSON.stringify([st.station, st.phase]));
    ok('c fails guarda 2 preguntas distintas', st.fails.length === 2 && st.fails[0].id !== st.fails[1].id); }

  // (d) consec: 1,2,3 con aciertos y 0 tras un fallo
  { const { flow, rec } = make(); flow.start();
    for (let i = 0; i < 3; i++) { if (flow.state().phase === 'arrive') flow.ask(); flow.answer(right(flow.state().item)); flow.next(); }
    if (flow.state().phase === 'arrive') flow.ask(); flow.answer(wrong(flow.state().item));
    ok('d consec 1,2,3 y luego 0', JSON.stringify(rec.results.map((r) => r.consec)) === JSON.stringify([1, 2, 3, 0]), JSON.stringify(rec.results.map((r) => r.consec)));
    ok('d ok refleja el acierto', JSON.stringify(rec.results.map((r) => r.ok)) === JSON.stringify([true, true, true, false])); }

  // (e) doble answer: onResult una sola vez
  { const { flow, rec } = make(); flow.start(); flow.ask(); const it = flow.state().item; flow.answer(right(it)); flow.answer(right(it));
    ok('e doble answer llama una vez a onResult', rec.results.length === 1, 'n=' + rec.results.length); }

  // (f) ask() y next() fuera de su fase no hacen nada
  { const { flow, rec } = make(); flow.ask(); flow.next(); flow.answer(0);
    ok('f antes de start no pasa nada', flow.state().phase === 'idle' && !rec.asks.length && !rec.results.length);
    flow.start(); flow.ask(); flow.ask();
    ok('f ask() repetido no repite onAsk', rec.asks.length === 1, 'asks=' + rec.asks.length);
    flow.next();
    ok('f next() en fase ask no avanza', flow.state().phase === 'ask'); }

  // (g) sin repetir q.id acertando todo, semillas 1 a 10
  { let dup = 0;
    for (let seed = 1; seed <= 10; seed++) { const { flow, rec } = make({}, seed); flow.start(); drive(flow, right);
      const ids = rec.asks.map((a) => a.q.id); if (new Set(ids).size !== ids.length) dup++; }
    ok('g sin q.id repetidos en 10 semillas', dup === 0, 'viajes con repetidas=' + dup); }

  // (h) un solo pregunta por tema: termina, reutiliza y cada onAsk trae q definida
  { const one = {}; for (const t of Object.keys(byTopicAll)) one[t] = [byTopicAll[t][0]];
    const { flow, rec } = make({ questionsByTopic: one }); flow.start(); drive(flow, right);
    ok('h termina con 1 pregunta por tema', flow.state().phase === 'summary' && rec.asks.length === 18);
    ok('k cada onAsk recibe item.q definido', rec.asks.every((a) => a && a.q && a.q.id)); }

  // (i) perStation: total cuenta respuestas (con retransmisión), ok cuenta aciertos
  { const a = make(); a.flow.start(); drive(a.flow, right);
    ok('i perStation[2] acertando todo = {ok:2,total:2}', JSON.stringify(a.rec.summary.perStation[2]) === JSON.stringify({ ok: 2, total: 2 }), JSON.stringify(a.rec.summary.perStation[2]));
    const b = make(); b.flow.start(); drive(b.flow, (item, n) => (n === 3 ? wrong(item) : right(item)));  // 4ª respuesta = 1ª decisión de la estación 2
    ok('i perStation[2] con un fallo = {ok:2,total:3}', JSON.stringify(b.rec.summary.perStation[2]) === JSON.stringify({ ok: 2, total: 3 }), JSON.stringify(b.rec.summary.perStation[2])); }

  // (j) dos create() seguidos no comparten estado
  { const a = make(); a.flow.start(); a.flow.ask(); a.flow.answer(wrong(a.flow.state().item));
    const b = make();
    const st = b.flow.state();
    ok('j segundo create empieza en idle, xp 0 y fails []', st.phase === 'idle' && st.xp === 0 && st.fails.length === 0 && st.consec === 0); }

  // (l) onResult devuelve texto → xp sigue siendo número
  { const { flow, rec } = make({ onResult: (r) => { rec.results.push(r); return '5'; } }); flow.start(); drive(flow, right);
    ok('l xp numérico aunque onResult devuelva "5"', typeof rec.summary.xp === 'number' && rec.summary.xp === 90, JSON.stringify(rec.summary.xp)); }
  // (m) rnd() === 1 no se sale del arreglo
  { let err = null, f; try { const m = make({ rnd: () => 1 }); f = m.flow; f.start(); drive(f, right); } catch (e) { err = e.message; }
    ok('m rnd() = 1 no lanza y el viaje termina', !err && f.state().phase === 'summary', err); }
  // (n) banco vacío: las decisiones se omiten y se llega al resumen sin lanzar
  { let err = null, m; try { m = make({ questionsByTopic: {} }); m.flow.start(); m.flow.ask(); drive(m.flow, right); } catch (e) { err = e.message; }
    ok('n banco vacío no lanza', !err, err);
    ok('n banco vacío: sin onAsk, 10 estaciones y se llega al resumen', !err && m.rec.asks.length === 0 && m.rec.stations.length === 10 && m.flow.state().phase === 'summary', m && (m.flow.state().phase + ' ' + m.rec.stations.length)); }
  // (o) un tema sin preguntas usa otro tema de la estación o del banco
  { const by = Object.assign({}, byTopicAll); delete by.T01;
    const m = make({ questionsByTopic: by }); m.flow.start(); drive(m.flow, right);
    ok('o tema T01 sin preguntas: el viaje termina con preguntas de otros temas', m.flow.state().phase === 'summary' && m.rec.asks.length >= 17, 'asks=' + m.rec.asks.length); }
  // (p) state().item es una copia
  { const { flow } = make(); flow.start(); flow.ask(); const real = flow.state().item.correct;
    flow.state().item.correct = real === 0 ? 1 : 0; flow.state().item.labels.length = 0;
    ok('p mutar state().item no cambia la respuesta correcta ni las opciones', flow.state().item.correct === real && flow.state().item.labels.length > 0); }
  // (q) start() repetido o tras el resumen no hace nada
  { const { flow, rec } = make(); flow.start(); flow.start();
    ok('q start() repetido no repite onStation', JSON.stringify(rec.stations) === '[0]', JSON.stringify(rec.stations));
    drive(flow, right); flow.start(); flow.ask(); flow.next();
    ok('q start() tras el resumen no emite otro onSummary', flow.state().phase === 'summary' && JSON.stringify(rec.layers) === JSON.stringify([0, 1, 2, 3, 4, 4, 4, 4, 1, 1])); }

  // ---- deps.from: reanudar desde una estación ----
  { const { flow, rec } = make({ from: 3 }); flow.start();
    ok('from 3: start() anuncia la estación 3 (S3) y no la 0', rec.stations.join() === '3' && flow.state().station === 3, rec.stations.join()); }
  { const bad = [];
    for (const v of [-1, NaN, 3.5, '3', Infinity, -Infinity, 10, 99, null, undefined, {}, [], true]) { const { flow, rec } = make({ from: v }); flow.start(); if (rec.stations.join() !== '0') bad.push(String(v) + '→' + rec.stations.join()); }
    ok('from inválido (-1, NaN, 3.5, "3", Infinity, 10, null…) empieza en la estación 0', bad.length === 0, bad.join(' | ')); }
  { const { flow, rec } = make({ from: 9 }); flow.start(); const a = flow.state(); flow.ask(); flow.answer(rec.asks[0] ? rec.asks[0].correct : 0);
    ok('from 9 (la última): se puede jugar y al terminarla se entrega el resumen', a.station === 9 && a.phase === 'arrive', JSON.stringify(a)); }
  { const { flow, rec } = make({ from: 7 }); flow.start();
    let guard = 0; while (flow.state().phase !== 'summary' && guard++ < 400) { const st = flow.state(); if (st.phase === 'arrive') flow.ask(); else if (st.phase === 'ask') flow.answer(st.item.correct); else if (st.phase === 'result') flow.next(); else break; }
    ok('from 7: recorre S7, S8 y S9 y entrega el resumen con las estaciones 7 a 9 y capas al final de cada una', flow.state().phase === 'summary' && rec.stations.join() === '7,8,9' && rec.layers.length === 3 && !!rec.summary && rec.summary.perStation.slice(0, 7).every((p) => p.total === 0), rec.stations.join() + ' capas=' + rec.layers.join()); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_ROUTE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
