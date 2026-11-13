// Ruta del paquete de Nodo Enlace en la vista (jsdom + mundo falso): pads como lugares, hoja de cada estación, XP y guardado, reanudar,
// resumen de la visita, repetir la ruta y el HUD de capas. Textos exactos (spec §5.6).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await sleep(0); };

function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail || er.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { calls: [], lastOpts: null, routes: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {}; w.__CITY_TEST__ = true;
      w.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), addEventListener() {}, removeEventListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = { create(canvas, D, sceneId, o) { st.lastOpts = o; return Promise.resolve({ resize() {}, setPaused: (r, on) => st.calls.push(['setPaused', r, on]), dissolve() {}, encounter: () => Promise.resolve(), setRoute: (n) => { st.routes.push(n); st.calls.push(['setRoute', n]); }, dispose() {} }); } };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const $ = (e, s) => e.d.querySelector(s);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const cx = (e, c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
const api = (e) => e.w.__CITY_TEST_API__;
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const doneOf = (e) => saved(e.w).city.d.M08.route.done;
const act = (e) => ({ main: ($(e, '#city-act .act-main') || {}).textContent, sub: ($(e, '#city-act .act-sub') || {}).textContent, hidden: $(e, '#city-act').hidden });
const live = (e) => $(e, '#city-live').textContent;
const btns = (e, scope = '#city-sheet') => [...e.d.querySelectorAll(scope + ' button')].map((b) => b.textContent);
const six = (n) => { const o = {}; for (let i = 1; i <= n; i++) o['M08:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1]; return o; };

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const M8 = D.districts.M08, pads = M8.route.pads, st = M8.route.stations;
  const N = st.length;
  const beatenAll = Object.fromEntries(M8.creatures.map((c) => [c.id, '2026-11-01']));
  const seedAt = (done, extra = {}) => ({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: six(15), qs: {}, boss: { M08: { best: 20, passed: true } }, hero: { name: 'H' },
    stats: { learnTopics: Array.from({ length: 15 }, (_, i) => 'M08:T' + String(i + 1).padStart(2, '0')), cleared: 0, roundsNoPower: 0, bossFailed: {} },
    city: { prologue: true, scene: 'M08', at: { x: M8.entry.x, z: M8.entry.z, yaw: 0 }, d: { M08: { beaten: beatenAll, route: { done } } } }, ...extra });
  const enter = async (e) => { click(e.w, $(e, '[data-act="city"]')); await tick(); };
  const near = (e, i) => api(e).teleport(pads[i].x, pads[i].z + 1);
  const ans = (e, right) => { const q = L.findQ(e.w, e.d), ct = L.correctText(q); const b = right ? L.optBtn(e.d, ct) : [...e.d.querySelectorAll('.opt')].find((x) => !x.disabled && L.norm(x.querySelector('span:last-child').textContent) !== L.norm(ct)); click(e.w, b); return q; };
  // juega la estación abierta (hoja con "Ver pregunta") respondiendo `right(i)` a cada pregunta hasta que se complete
  const playStation = (e, right = () => true) => { let g = 0, n = 0; click(e.w, cx(e, 'route-ask')); while (!$(e, '#city-sheet').hidden && g++ < 12) { if ($(e, '.prompt') && $(e, '.opt') && !cx(e, 'route-next')) ans(e, right(n++)); const nx = cx(e, 'route-next'); if (nx) click(e.w, nx); else if (cx(e, 'route-ask')) click(e.w, cx(e, 'route-ask')); } };
  let e;
  try {
    // ---- objetivo, flecha y pads ----
    e = boot(seedAt(3)); await enter(e);
    ok('(a) el objetivo dice "Ruta del paquete · estación 4 de 10"', /^Ruta del paquete · estación 4 de 10 · \d+ m$/.test($(e, '#city-obj').textContent), $(e, '#city-obj').textContent);
    const dx = pads[3].x - M8.entry.x, dz = pads[3].z - M8.entry.z, ang = Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360);
    ok('(a2) la flecha apunta al pad activo (pads[done])', $(e, '#city-arrow').style.transform === 'rotate(' + ang + 'deg)', $(e, '#city-arrow').style.transform + ' vs ' + ang);
    ok('(a3) el mundo recibió setRoute(3) al entrar', e.st.routes.length > 0 && e.st.routes[e.st.routes.length - 1] === 3, e.st.routes.join());
    near(e, 5);
    ok('(b) tocar un pad que no es el activo no ofrece nada', act(e).hidden);
    near(e, 3);
    ok('(c) junto al pad activo: "Estación 4 de 10" con el nombre de la estación', act(e).main === 'Estación 4 de 10' && act(e).sub === st[3].name && !act(e).hidden, JSON.stringify(act(e)));
    click(e.w, $(e, '#city-act'));
    const kpTopic = st[3].kp[0].topic, kpText = e.w.eval('MODULES').find((m) => m.id === 'M08').topics.find((t) => t.id === kpTopic).keyPoints[st[3].kp[0].index];
    ok('(c2) la hoja dice "Estación 4 de 10 · <nombre>", muestra el punto clave y ofrece "Ver pregunta"', $(e, '#city-sheet .chip').textContent === 'Estación 4 de 10 · ' + st[3].name && $(e, '#city-sheet').textContent.includes(st[3].kp[0].expect) && btns(e).includes('Ver pregunta') && kpText.includes(st[3].kp[0].expect), btns(e).join('|'));
    ok('(c3) cerrar la hoja a mitad no cuenta y avisa "Retomarás en la estación 4."', (click(e.w, cx(e, 'sheetclose')), doneOf(e) === 3 && live(e) === 'Retomarás en la estación 4.'), live(e));
    e.w.close();

    // ---- jugar una estación: respuestas, XP, guardado y paquete ----
    e = boot(seedAt(3)); await enter(e); near(e, 3); click(e.w, $(e, '#city-act'));
    const xp0 = saved(e.w).xp || 100000; click(e.w, cx(e, 'route-ask'));
    const q1 = ans(e, true);
    ok('(d) la hoja de resultado dice "Correcto" y ofrece "Continuar"; la respuesta queda en el historial', /Correcto/.test($(e, '#city-sheet').textContent) && btns(e).includes('Continuar') && saved(e.w).qs[q1.id].a === 1 && saved(e.w).xp > xp0, btns(e).join('|'));
    click(e.w, cx(e, 'route-next')); ans(e, true); click(e.w, cx(e, 'route-next'));
    ok('(d2) al terminar la estación 4: done 4 guardado, setRoute(4), hoja cerrada y anuncio', doneOf(e) === 4 && e.st.routes[e.st.routes.length - 1] === 4 && $(e, '#city-sheet').hidden && /Estación 4 completada/.test(live(e)), 'done=' + doneOf(e) + ' ' + live(e) + ' rutas=' + e.st.routes.join());
    ok('(d3) el objetivo pasa a "estación 5 de 10" y el pad activo es el siguiente', /Ruta del paquete · estación 5 de 10/.test($(e, '#city-obj').textContent) && (near(e, 4), act(e).main === 'Estación 5 de 10'), $(e, '#city-obj').textContent);
    ok('(d4) el HUD muestra las capas alcanzadas (estación 4: Datos · Puerto · IP)', $(e, '#city-layers').textContent === 'Capas: Datos · Puerto · IP', $(e, '#city-layers').textContent);
    e.w.close();
    e = boot(seedAt(3)); await enter(e); near(e, 3); click(e.w, $(e, '#city-act')); click(e.w, cx(e, 'route-ask')); ans(e, false);
    ok('(d5) un fallo dice "Paquete perdido: retransmitiendo" y no avanza la ruta', /Paquete perdido: retransmitiendo/.test($(e, '#city-sheet').textContent) && doneOf(e) === 3);
    e.w.close();

    // ---- reanudar tras recargar ----
    e = boot(seedAt(4)); await enter(e); near(e, 4);
    ok('(e) con done 4 guardado el pad activo es la estación 5', act(e).main === 'Estación 5 de 10', JSON.stringify(act(e)));
    ok('(e2) las capas de la estación 4 (done 4) ya se muestran al entrar', $(e, '#city-layers').textContent === 'Capas: Datos · Puerto · IP', $(e, '#city-layers').textContent);
    e.w.close();
    e = boot(seedAt(0)); await enter(e);
    ok('(e3) con done 0 no hay capas todavía', $(e, '#city-layers').hidden || $(e, '#city-layers').textContent === '');
    e.w.close();

    // ---- terminar la ruta: resumen de la visita y repasar fallos ----
    e = boot(seedAt(9)); await enter(e); near(e, 9); click(e.w, $(e, '#city-act'));
    click(e.w, cx(e, 'route-ask')); ans(e, false); click(e.w, cx(e, 'route-next')); ans(e, true); click(e.w, cx(e, 'route-next')); ans(e, true); click(e.w, cx(e, 'route-next'));
    ok('(f) terminar la estación 10: done 10, resumen "Llegaste al servidor" con XP y "Repasar lo que fallé"', doneOf(e) === 10 && $(e, '#city-sheet .prompt').textContent === 'Llegaste al servidor' && /XP ganada: \d+/.test($(e, '#city-sheet').textContent) && btns(e).includes('Terminar') && btns(e).includes('Repasar lo que fallé'), btns(e).join('|'));
    click(e.w, cx(e, 'route-replay')); await tick();
    ok('(f2) "Repasar lo que fallé" abre una ronda de repaso con la ciudad suspendida', !!$(e, '.prompt') && $(e, '#city-root').hidden, $(e, '#city-root').hidden + '');
    e.w.close();
    // el resumen cuenta solo la visita actual: se retoma en done 8 con un fallo de una visita anterior que no se guarda
    { const a = boot(seedAt(7)); await enter(a); near(a, 7); click(a.w, $(a, '#city-act')); playStation(a, (n) => n > 0);
      const raw = saved(a.w); a.w.close();
      const b = boot(raw); await enter(b); near(b, 8); click(b.w, $(b, '#city-act')); playStation(b); near(b, 9); click(b.w, $(b, '#city-act')); playStation(b);
      ok('(f3) retomar en done 8: el resumen solo cuenta esta visita (sin el fallo de la anterior)', raw.city.d.M08.route.done === 8 && doneOf(b) === 10 && $(b, '#city-sheet .prompt').textContent === 'Llegaste al servidor' && !btns(b).includes('Repasar lo que fallé'), 'prev=' + raw.city.d.M08.route.done + ' done=' + doneOf(b) + ' ' + btns(b).join('|'));
      b.w.close(); }

    // ---- ruta completa: "Recorrer otra vez" ----
    e = boot(seedAt(N)); await enter(e);
    ok('(g) con la ruta completa el objetivo sigue con las reparaciones', /Repara/.test($(e, '#city-obj').textContent), $(e, '#city-obj').textContent);
    near(e, 0);
    ok('(g2) con done 10 el pad S0 ofrece "Recorrer otra vez"', act(e).main === 'Recorrer otra vez' && !act(e).hidden, JSON.stringify(act(e)));
    near(e, 5); ok('(g3) con done 10 los demás pads no ofrecen nada', act(e).hidden);
    near(e, 0); const s0 = saved(e.w) || {}; click(e.w, $(e, '#city-act'));
    ok('(g4) tocar el pad S0 pide confirmar y no crea ninguna estación', btns(e).join('|') === 'Recorrer otra vez|Cerrar' && !$(e, '.opt') && !cx(e, 'route-ask'), btns(e).join('|'));
    const xpB = JSON.stringify([saved(e.w).xp, saved(e.w).qs, saved(e.w).city.d.M08.beaten]);
    click(e.w, cx(e, 'route-reset'));
    ok('(g5) confirmar vuelve la ruta a 0 sin tocar XP, historial ni criaturas vencidas', doneOf(e) === 0 && e.st.routes[e.st.routes.length - 1] === 0 && JSON.stringify([saved(e.w).xp, saved(e.w).qs, saved(e.w).city.d.M08.beaten]) === xpB, 'done=' + doneOf(e));
    e.w.close();

    // ---- propiedad: acciones al azar nunca hacen retroceder la ruta salvo "Recorrer otra vez" ----
    const rnd = L.rng(20261114);
    for (const start of [0, 8, 9]) {
      e = boot(seedAt(start)); await enter(e);
      let prev = start, bad = null, resets = 0;
      for (let step = 0; step < 220 && !bad; step++) {
        const r = rnd.int(0, 9);
        const sheetOpen = !$(e, '#city-sheet').hidden;
        if (r <= 1) near(e, rnd.int(0, N - 1));
        else if (r === 2) { const d0 = doneOf(e); near(e, rnd.int(0, N - 1)); if (!$(e, '#city-act').hidden && !sheetOpen) click(e.w, $(e, '#city-act')); void d0; }
        else if (r === 3 && cx(e, 'route-ask')) click(e.w, cx(e, 'route-ask'));
        else if (r <= 6 && $(e, '.prompt') && $(e, '.opt') && !cx(e, 'route-next')) ans(e, rnd.bool(0.7));
        else if (r <= 8 && cx(e, 'route-next')) click(e.w, cx(e, 'route-next'));
        else if (cx(e, 'route-reset')) { click(e.w, cx(e, 'route-reset')); }
        else if (sheetOpen && cx(e, 'sheetclose')) click(e.w, cx(e, 'sheetclose'));
        const s = saved(e.w), d = s && s.city && s.city.d ? s.city.d.M08.route.done : prev;
        if (d === 0 && prev === N) resets++;
        else if (!(d === prev || d === prev + 1)) bad = 'paso ' + step + ': done ' + prev + ' → ' + d;
        prev = d;
        if (e.errors.length) bad = 'error de consola: ' + e.errors[0];
      }
      ok('(h) 220 acciones al azar desde done ' + start + ': done solo sube de a 1 (o vuelve a 0 al confirmar desde 10), sin errores', !bad, bad);
      e.w.close();
    }

    // ---- teardown con una estación abierta ----
    e = boot(seedAt(3)); await enter(e); near(e, 3); click(e.w, $(e, '#city-act')); click(e.w, cx(e, 'route-ask'));
    e.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, [e.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.type === 'mcq')]); await sleep(20);
    ok('(i) salir de la ciudad con una estación abierta: sin errores y done intacto', e.errors.length === 0 && saved(e.w).city.d.M08.route.done === 3, e.errors.join('|'));
    e.w.close();
  } catch (err) { console.error('EXCEPCIÓN', err && err.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_ROUTE_VIEW OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})();
