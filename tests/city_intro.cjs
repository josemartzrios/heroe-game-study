// Introducción de Ciudad Núcleo: texto e íconos de inicio, prólogo de Iris en 4 paneles (se abre solo la primera vez), pistas en el momento
// (una a la vez, 6 s de visibilidad real, una sola vez cada una), "¿Cómo se juega?" y controles según el puntero. Textos exactos (spec §3).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await sleep(0); };

// opts: seed, media { coarse, fine, reduced }
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail || er.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { calls: [], scenes: [], lastOpts: null };
  const m = Object.assign({ coarse: false, fine: false, reduced: true }, opts.media || {});
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      w.matchMedia = (q) => ({ matches: /any-pointer: coarse/.test(q) ? m.coarse : /any-pointer: fine/.test(q) ? m.fine : /prefers-reduced-motion/.test(q) ? m.reduced : false, addEventListener() {}, removeEventListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = { create(canvas, D, sceneId, o) { st.scenes.push(sceneId); st.lastOpts = o; return Promise.resolve({ resize() {}, setPaused: (r, on) => st.calls.push(['setPaused', r, on]), dissolve() {}, encounter: () => Promise.resolve(), setRoute() {}, dispose() { st.calls.push(['dispose']); } }); } };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const cx = (e, c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
const api = (e) => e.w.__CITY_TEST_API__;
const tickW = (e, ms = 16) => e.st.lastOpts.tick(ms);
const hero = (e) => e.st.lastOpts.state().hero;
const tip = (e) => $(e, '#city-tip').textContent;
const btns = (e, scope = '#city-sheet') => [...e.d.querySelectorAll(scope + ' button')].map((b) => b.textContent);
async function enterCity(e) { click(e.w, $(e, '[data-act="city"]')); await tick(); }
const six = (mid, n) => { const o = {}; for (let i = 1; i <= n; i++) o[mid + ':T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1]; return o; };
const TIP = { talk: 'Toca «Hablar con…» o pulsa E para aprender su tema.', creature: 'Las criaturas mezclan varios temas: aprende antes de enfrentarlas.', repair: 'Repara la ciudad respondiendo sin ayudas.',
  tower: 'La torre está abierta: es el examen final del distrito.', portals: 'Hay más distritos detrás de los portales.', star: 'Con 1 estrella ya puedes enseñar ese tema a un aprendiz.' };

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const M2 = D.districts.M02, P = D.plaza;
  const m2city = (o = {}) => Object.assign({ prologue: true, scene: 'M02', at: { x: M2.entry.x, z: M2.entry.z, yaw: Math.PI } }, o);
  let e;
  try {
    // ---- inicio ----
    e = boot({ seed: base() });
    ok('(a) el inicio dice qué es el juego, con el texto exacto', $(e, '.intro .lead').textContent === 'Estudia Ingeniería de Software recorriendo una ciudad: cada distrito es un módulo y cada vecino te enseña un tema.', $(e, '.intro .lead').textContent);
    const trio = [...e.d.querySelectorAll('.trio li')];
    ok('(a2) tres elementos con canvas data-spr aria-hidden y etiquetas "Aprende", "Ponte a prueba" y "Enseña"', trio.length === 3 && trio.map((li) => li.querySelector('canvas').dataset.spr).join() === 'mentor,creature,apprentice' && trio.every((li) => li.querySelector('canvas').getAttribute('aria-hidden') === 'true') && trio.map((li) => li.querySelector('span').textContent).join('|') === 'Aprende|Ponte a prueba|Enseña');
    e.w.close();

    // ---- prólogo ----
    e = boot({ seed: base({ city: { prologue: false } }) }); await enterCity(e);
    ok('(b) sin prólogo visto la hoja de Iris se abre sola con "Prólogo 1 de 4" y el foco en "Siguiente"', !$(e, '#city-sheet').hidden && $(e, '#city-sheet .chip').textContent === 'Prólogo 1 de 4' && $(e, '#city-sheet .prompt').textContent === 'Ciudad Núcleo' && e.d.activeElement.textContent === 'Siguiente', btns(e).join('|'));
    ok('(b2) panel 1: "Siguiente" y "Saltar"', btns(e).join('|') === 'Siguiente|Saltar');
    click(e.w, cx(e, 'pro-next'));
    ok('(b3) panel 2 "La Maraña"', $(e, '#city-sheet .prompt').textContent === 'La Maraña' && $(e, '#city-sheet .chip').textContent === 'Prólogo 2 de 4' && btns(e).join('|') === 'Siguiente|Saltar');
    click(e.w, cx(e, 'pro-next'));
    ok('(b4) panel 3 "Tu papel" con el texto exacto', $(e, '#city-sheet .prompt').textContent === 'Tu papel' && $(e, '#city-sheet p').textContent === 'Llegas como Becario. Cada distrito es un módulo del temario: restáuralo y subirás de rango hasta Tech Lead. Cada portal abierto de la plaza lleva a un distrito; los demás llegarán pronto.' && btns(e).join('|') === 'Siguiente|Saltar');
    click(e.w, cx(e, 'pro-next'));
    const how = [...e.d.querySelectorAll('#city-sheet .how li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    ok('(b5) panel 4 "Cómo se juega": sin "Saltar", con los 5 pasos (ícono aria-hidden) y los controles', $(e, '#city-sheet .prompt').textContent === 'Cómo se juega' && $(e, '#city-sheet .chip').textContent === 'Prólogo 4 de 4' && btns(e).join('|') === 'Cerrar' && how.length >= 7 && how.some((t) => /Mentor: Habla con él y lee la lección de su tema\./.test(t)) && how.some((t) => /Torre: El examen final del módulo restaura el distrito\./.test(t)) && [...e.d.querySelectorAll('#city-sheet .how li span[aria-hidden="true"]')].length === 5, how.join(' || '));
    click(e.w, cx(e, 'pro-end'));
    ok('(b6) cerrar marca prologue, cierra la hoja y el foco va a #city-pause', saved(e.w).city.prologue === true && $(e, '#city-sheet').hidden && e.d.activeElement === $(e, '#city-pause'), String(e.d.activeElement && e.d.activeElement.id));
    e.w.close();
    e = boot({ seed: base({ city: { prologue: false } }) }); await enterCity(e);
    click(e.w, cx(e, 'pro-skip'));
    ok('(b7) "Saltar" lo marca como visto y cierra', saved(e.w).city.prologue === true && $(e, '#city-sheet').hidden);
    e.w.close();
    e = boot({ seed: base({ city: { prologue: true } }) }); await enterCity(e);
    ok('(b8) con el prólogo ya visto no se abre sola', $(e, '#city-sheet').hidden);
    api(e).teleport(-6, -2.5); click(e.w, $(e, '#city-act'));
    const sh = $(e, '#city-sheet');
    ok('(b9) hablar con Iris después: título "Iris", el panel "Cómo se juega" y el objetivo en negrita', sh.querySelector('.prompt').textContent === 'Iris' && !/Directora/.test(sh.textContent) && sh.querySelector('b') && sh.querySelector('p b').textContent === 'Entra a Taller Comunal' && /Cómo se juega/.test(sh.textContent) && sh.querySelectorAll('.how li').length >= 7, sh.textContent.slice(0, 160));
    e.w.close();

    // ---- pistas ----
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    const t0 = $(e, '#city-tip');
    ok('(c) #city-tip existe vacío al crear la vista, con role=status y fuera de #city-ui-main', !!t0 && t0.textContent === '' && t0.getAttribute('role') === 'status' && !$(e, '#city-ui-main').contains(t0));
    const m1 = M2.mentors[0]; api(e).teleport(m1.x, m1.z + 1);
    ok('(c2) junto al primer mentor sale "talk" con el texto exacto y se guarda', tip(e) === TIP.talk && saved(e.w).city.tips.talk === true, tip(e));
    ok('(c3) la pista no pausa el mundo', !e.st.calls.some((c) => c[0] === 'setPaused'));
    click(e.w, $(e, '#city-tip'));
    ok('(c4) tocarla la cierra', tip(e) === '');
    api(e).teleport(m1.x + 30, m1.z); api(e).teleport(m1.x, m1.z + 1); for (let i = 0; i < 300; i++) tickW(e, 16);
    ok('(c5) no se repite aunque vuelvas a acercarte ni en 300 cuadros', tip(e) === '');
    e.w.close();
    e = boot({ seed: base({ topics: six('M02', 23), city: m2city() }) }); await enterCity(e);
    ok('(d) con todas las estrellas la torre queda abierta y sale "tower"', tip(e) === TIP.tower, tip(e));
    api(e).teleport(m1.x, m1.z + 1);
    ok('(d2) una segunda pista espera en cola mientras la primera sigue en pantalla', tip(e) === TIP.tower);
    click(e.w, $(e, '#city-tip'));
    ok('(d3) al cerrar la primera sale la siguiente en orden ("talk")', tip(e) === TIP.talk, tip(e));
    // el puntero y el foco sobre la pista no cuentan como "pulsar" el mundo: pointerdown sobre la pista no arranca la palanca
    const hy0 = JSON.stringify(hero(e)), tipEl = $(e, '#city-tip');
    const ptr = (type, target, props) => { const ev = new e.w.Event(type, { bubbles: true, cancelable: true }); for (const k in props) Object.defineProperty(ev, k, { value: props[k] }); target.dispatchEvent(ev); };
    ptr('pointerdown', tipEl, { pointerId: 1, clientX: 40, clientY: 700, button: 0, pointerType: 'touch', isPrimary: true }); ptr('pointermove', tipEl, { pointerId: 1, clientX: 100, clientY: 700, pointerType: 'touch' });
    for (let i = 0; i < 6; i++) tickW(e, 16); ptr('pointerup', tipEl, { pointerId: 1, clientX: 100, clientY: 700, pointerType: 'touch' });
    ok('(d4) pointerdown sobre la pista no mueve al héroe ni arranca la palanca', JSON.stringify(hero(e)) === hy0 && !$(e, '#city-joy').classList.contains('on'), JSON.stringify(hero(e)));
    e.w.close();
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(M2.creatures[0].area.x, M2.creatures[0].area.z);
    ok('(e) junto a una criatura sale "creature"', tip(e) === TIP.creature, tip(e));
    e.w.close();
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    const r1 = M2.repairs[0]; api(e).teleport(r1.x, r1.z + 1);
    ok('(e2) junto a una reparación sale "repair"', tip(e) === TIP.repair, tip(e));
    e.w.close();
    e = boot({ seed: base({ boss: { M02: { best: 20, passed: true } }, city: { prologue: true, scene: 'plaza', d: { M02: { taught: Object.fromEntries(M2.apprentices.slice(0, 8).map((a) => [a.id, true])) } } } }) }); await enterCity(e);
    ok('(e3) en la plaza con un distrito restaurado sale "portals"', tip(e) === TIP.portals, tip(e));
    e.w.close();
    e = boot({ seed: base({ city: { prologue: true, scene: 'plaza' } }) }); await enterCity(e);
    ok('(e4) en la plaza sin distritos restaurados no sale "portals"', tip(e) === '');
    e.w.close();

    // ---- star: al volver de una ronda que dio la primera estrella ----
    e = boot({ seed: base({ topics: { 'M02:T01': [1, 1, 1, 1] }, city: m2city() }) }); await enterCity(e);   // 4 aciertos de historial + los 4 de la ronda = 8 (>= 6) con precisión 1: primera estrella
    const qs = e.w.eval('MODULES').find((m) => m.id === 'M02').questions.filter((q) => q.topic === 'T01' && q.type === 'mcq').slice(0, 6);
    const L = require('./adv/lib.cjs');
    e.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'city' }, city: { kind: 'practice', id: 'm01', mid: 'M02' } }, qs);
    for (let i = 0; i < 12 && $(e, '.prompt'); i++) { const q = L.findQ(e.w, e.d), b = L.optBtn(e.d, L.correctText(q)); click(e.w, b); const n = $(e, '#nextbtn'); if (n) click(e.w, n); }
    click(e.w, $(e, '[data-act="back"]')); await tick();
    ok('(f) al volver de una ronda con la primera estrella sale "star"', tip(e) === TIP.star, tip(e));
    e.w.close();

    // ---- la cuenta de 6 s solo avanza con la vista libre ----
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1);
    tickW(e, 5900); ok('(g) a los 5,9 s la pista sigue', tip(e) === TIP.talk);
    tickW(e, 200); ok('(g2) a los 6 s se va sola', tip(e) === '');
    e.w.close();
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1); click(e.w, $(e, '#city-act'));   // abre la lección: hoja abierta
    tickW(e, 10000); tickW(e, 10000);
    ok('(g3) con la hoja abierta la cuenta no avanza', tip(e) === TIP.talk && !$(e, '#city-sheet').hidden);
    click(e.w, cx(e, 'sheetclose')); tickW(e, 5900); ok('(g4) cerrada la hoja, a los 5,9 s sigue', tip(e) === TIP.talk); tickW(e, 200); ok('(g5) y a los 6 s se va', tip(e) === '');
    e.w.close();
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1); click(e.w, $(e, '#city-pause')); tickW(e, 10000);
    ok('(g6) con la pausa abierta la cuenta no avanza', tip(e) === TIP.talk && !$(e, '#city-pausebox').hidden);
    click(e.w, cx(e, 'pauseclose')); tickW(e, 6100); ok('(g7) al cerrar la pausa la cuenta sigue y se va a los 6 s', tip(e) === '');
    e.w.close();
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1); const te = $(e, '#city-tip'); te.dispatchEvent(new e.w.Event('mouseenter')); tickW(e, 10000);
    ok('(g8) con el puntero encima la cuenta no avanza', tip(e) === TIP.talk);
    te.dispatchEvent(new e.w.Event('mouseleave')); tickW(e, 6100); ok('(g9) al quitar el puntero se va a los 6 s', tip(e) === '');
    e.w.close();
    // con la pista en pantalla se cruza un portal: durante el fundido la cuenta no avanza y al terminar sigue
    const restoredSeed = base({ boss: { M02: { best: 20, passed: true } }, city: { prologue: true, scene: 'plaza', d: { M02: { taught: Object.fromEntries(M2.apprentices.slice(0, 8).map((a) => [a.id, true])) } } } });
    e = boot({ seed: restoredSeed, media: { reduced: false } }); await enterCity(e);
    const pm = P.portals.find((q) => q.dist === 'M08');
    const shown = tip(e) === TIP.portals;
    api(e).teleport(pm.x, pm.z); tickW(e, 16);   // empieza el fundido con la pista en pantalla
    tickW(e, 10000); tickW(e, 10000);
    ok('(g10) durante el fundido la cuenta de la pista no avanza', shown && tip(e) === TIP.portals, tip(e));
    await sleep(700);
    ok('(g11) terminado el cambio de escena la pista sigue y se va 6 s después', e.st.scenes.join() === 'plaza,M08' && tip(e) === TIP.portals && (tickW(e, 5900), tip(e) === TIP.portals) && (tickW(e, 200), tip(e) === '') && e.errors.length === 0, e.st.scenes.join() + ' ' + e.errors.join('|'));
    e.w.close();

    // ---- pausa: ¿Cómo se juega? ----
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1);
    click(e.w, $(e, '#city-pause'));
    ok('(h) la pausa tiene "¿Cómo se juega?"', btns(e, '#city-pausebox').includes('¿Cómo se juega?'));
    click(e.w, cx(e, 'p-how'));
    const hs = $(e, '#city-sheet');
    ok('(h2) la hoja "¿Cómo se juega?" muestra los pasos, los controles y las pistas vistas', hs.querySelector('.prompt').textContent === '¿Cómo se juega?' && hs.querySelectorAll('.how li').length >= 7 && /Pistas vistas/.test(hs.textContent) && [...hs.querySelectorAll('ul.kp li')].some((li) => li.textContent === TIP.talk) && $(e, '#city-pausebox').hidden, hs.textContent.slice(0, 120));
    e.w.close();

    // ---- controles según el puntero ----
    for (const [name, media, wantTouch, wantKb] of [['solo táctil', { coarse: true, fine: false }, true, false], ['solo puntero fino', { coarse: false, fine: true }, false, true], ['híbrido', { coarse: true, fine: true }, true, true], ['sin información', { coarse: false, fine: false }, false, true]]) {
      e = boot({ seed: base({ city: { prologue: false } }), media }); await enterCity(e);
      for (let i = 0; i < 3; i++) click(e.w, cx(e, 'pro-next'));
      const touch = $(e, '#city-sheet .ctl-touch'), kb = $(e, '#city-sheet .ctl-kb'), run = $(e, '#city-sheet .ctl-run');
      ok('(i) controles ' + name, !!touch === wantTouch && !!kb === wantKb && !!run && run.textContent === 'Desde el nivel 5 puedes correr (botón Correr o Shift).' && (!touch || touch.textContent === 'Arrastra en la parte izquierda de la pantalla para caminar. Pellizca para acercar o alejar.') && (!kb || kb.textContent === 'WASD o flechas para caminar. E o Enter para hablar. Rueda o +/− para el zoom. Esc para pausa.'));
      e.w.close();
    }

    // ---- salir con una pista visible ----
    e = boot({ seed: base({ city: m2city() }) }); await enterCity(e);
    api(e).teleport(m1.x, m1.z + 1);
    e.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, [e.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.type === 'mcq')]);
    await sleep(30);
    ok('(j) salir de la ciudad con una pista visible: sin errores y la raíz vacía', e.errors.length === 0 && $(e, '#city-root').innerHTML === '', e.errors.join('|'));
    e.w.close();
  } catch (err) { console.error('EXCEPCIÓN', err && err.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_INTRO OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})();
