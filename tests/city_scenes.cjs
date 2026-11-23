// Escenas de la ciudad en la vista (jsdom + mundo falso por escena): portales, fundido, llegada, error al crear, salir durante el cambio,
// fugas, HUD, "Ir al distrito" y recorrido solo con teclado. Los textos se comparan con igualdad exacta (spec §2).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await sleep(0); };
const FADE = 250, SETTLE = 2 * FADE + 140;

// Copia del HTML sin el distrito de M09: el JSON de CITY_DATA se reescribe con el mismo escape de "<" que build.mjs. Con los 10 distritos registrados ya no queda
// ningún muro con módulo, y (p), (p2), (p3) y (v3) necesitan uno ("Ver módulo", "Ir al módulo", página de módulo sin "Ir al distrito"). Se localiza con
// indexOf/slice (no con una expresión regular ni con replace con texto: un ";" o un "$&" en los datos los rompería).
const CD_PREFIX = 'var CITY_DATA = ', CD_START = html.indexOf(CD_PREFIX) + CD_PREFIX.length, CD_END = html.indexOf(';\n', CD_START);
const htmlWith = (data) => html.slice(0, CD_START) + JSON.stringify(data).replace(/</g, '\\u003c') + html.slice(CD_END);
const DATA_REAL = JSON.parse(html.slice(CD_START, CD_END)), DATA_NO_M09 = JSON.parse(html.slice(CD_START, CD_END));
delete DATA_NO_M09.districts.M09;
const HTML_NO_M09 = htmlWith(DATA_NO_M09);

// opts: html (otro HTML; por defecto el real), seed, reduced (movimiento reducido), reject (Set de escenas que rechazan), pending (Set de escenas cuyo create queda pendiente), real (mundo real con raf inyectado)
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail || er.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { scenes: [], calls: [], worlds: [], disposed: 0, lastOpts: null, resolvers: {}, reject: opts.reject || new Set(), pending: opts.pending || new Set(), net: {}, rafPend: new Map(), rafN: 0 };
  const dom = new JSDOM(opts.html || html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      w.matchMedia = (q) => ({ matches: !!(opts.reduced && /prefers-reduced-motion/.test(q)), addEventListener() {}, removeEventListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const aE = w.addEventListener.bind(w), rE = w.removeEventListener.bind(w);
      w.addEventListener = (t, f, o) => { st.net[t] = (st.net[t] || 0) + 1; return aE(t, f, o); };
      w.removeEventListener = (t, f, o) => { st.net[t] = (st.net[t] || 0) - 1; return rE(t, f, o); };
      st.raf = (cb) => { const id = ++st.rafN; st.rafPend.set(id, cb); return id; };
      st.caf = (id) => { st.rafPend.delete(id); };
      w.__CITY_WORLD__ = {
        create(canvas, D, sceneId, o) {
          st.scenes.push(sceneId); st.lastOpts = o;
          if (st.reject.has(sceneId)) return Promise.reject(new Error('create falló: ' + sceneId));
          let api;
          if (opts.real) {
            const CW = require('../city/world2d.js');
            const made = CW.create(canvas, D, sceneId, Object.assign({}, o, { doc: w.document, raf: st.raf, caf: st.caf, pixelRatio: 1 }));
            return made.then((rw) => { const d0 = rw.dispose; rw.dispose = () => { st.disposed++; d0(); }; st.worlds.push(rw); return rw; });
          }
          api = {
            resize: () => st.calls.push(['resize']),
            setPaused: (r, on) => st.calls.push(['setPaused', r, on, sceneId]),
            dissolve: (id) => st.calls.push(['dissolve', id]),
            encounter: () => Promise.resolve(),
            setRoute: () => {},
            dispose: () => { st.disposed++; st.calls.push(['dispose', sceneId]); }
          };
          st.worlds.push(api);
          if (st.pending.has(sceneId)) return new Promise((res) => { st.resolvers[sceneId] = () => res(api); });
          return Promise.resolve(api);
        }
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, city: { prologue: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const key = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const keyUp = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keyup', { key: k, bubbles: true }));
const cx = (e, c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
const api = (e) => e.w.__CITY_TEST_API__;
const tickW = (e, ms = 16) => e.st.lastOpts.tick(ms);
const hero = (e) => e.st.lastOpts.state().hero;
const act = (e) => ({ main: ($(e, '#city-act .act-main') || {}).textContent, sub: ($(e, '#city-act .act-sub') || {}).textContent, hidden: $(e, '#city-act').hidden });
const live = (e) => $(e, '#city-live').textContent;
async function enterCity(e) { click(e.w, $(e, '[data-act="city"]')); await tick(); }

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const M2 = D.districts.M02, M8 = D.districts.M08, P = D.plaza;
  const OPEN = Object.keys(D.districts).length, SIN = DATA_NO_M09.order.find((m) => !Object.prototype.hasOwnProperty.call(DATA_NO_M09.districts, m));   // el primer muro con módulo de la copia sin M09
  ok('la copia del HTML sin M09 deja 9 distritos y su primer muro con módulo es M09; reescribir sin borrar nada reproduce el HTML real byte a byte', SIN === 'M09' && Object.keys(DATA_NO_M09.districts).length === OPEN - 1 && htmlWith(DATA_REAL) === html, SIN + ' ' + OPEN);
  const portal = (m) => P.portals.find((p) => p.dist === m);
  const near = (p) => ({ x: p.x, z: p.z + 2.5 });   // junto al portal, fuera de su caja y a menos de 4 m
  const goNear = (e, m) => { const q = near(portal(m)); api(e).teleport(q.x, q.z); };
  let e;
  try {
    // ---- entrada por botón: textos, fundido, orden de pausa y dispose, guardado ----
    e = boot({ seed: base() }); await enterCity(e);
    ok('(a) la ciudad arranca en la plaza y el HUD dice "Distritos 0 de N" con N = distritos de los datos', e.st.scenes.join() === 'plaza' && $(e, '#city-rest').textContent === 'Distritos 0 de ' + OPEN, $(e, '#city-rest').textContent);
    goNear(e, 'M08');
    ok('(b) junto al portal M08 el botón dice "Entrar a Nodo Enlace" y su texto secundario "M08 · 15 temas · 0 % restaurado"', act(e).main === 'Entrar a Nodo Enlace' && act(e).sub === 'M08 · 15 temas · 0 % restaurado' && !act(e).hidden, JSON.stringify(act(e)));
    click(e.w, $(e, '#city-act'));
    ok('(c) al entrar la vista se bloquea: #city-ui-main con inert y el mundo viejo en pausa "fade"', $(e, '#city-ui-main').hasAttribute('inert') && e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'fade' && c[2] === true));
    click(e.w, $(e, '#city-act')); key(e, 'e'); key(e, 'ArrowDown');
    await sleep(SETTLE);
    ok('(d) tras el fundido hay un solo create nuevo (M08), el viejo se liberó después de pausarse y el doble clic no abrió otra escena', e.st.scenes.join() === 'plaza,M08' && e.st.disposed === 1 && e.st.calls.findIndex((c) => c[0] === 'setPaused' && c[1] === 'fade') < e.st.calls.findIndex((c) => c[0] === 'dispose'), e.st.scenes.join());
    const s1 = saved(e.w).city;
    ok('(e) se guarda scene M08 y la entrada de M08', s1.scene === 'M08' && s1.at.x === M8.entry.x && s1.at.z === M8.entry.z, JSON.stringify(s1.at));
    ok('(f) llegada: #city-live dice "Entraste a Nodo Enlace. Objetivo: Habla con Alma." y el HUD "Nodo Enlace 0 %"', live(e) === 'Entraste a Nodo Enlace. Objetivo: Habla con Alma.' && $(e, '#city-rest').textContent === 'Nodo Enlace 0 %', live(e) + ' | ' + $(e, '#city-rest').textContent);
    ok('(g) terminado el fundido se quita inert y el foco queda en un nodo de la interfaz (#city-pause)', !$(e, '#city-ui-main').hasAttribute('inert') && e.d.activeElement === $(e, '#city-pause'), String(e.d.activeElement && e.d.activeElement.id));
    ok('(h) sin errores de consola', e.errors.length === 0, e.errors.join('|'));
    e.w.close();

    // ---- pisar la caja del portal entra; pisar la salida vuelve a la plaza (a "back" del portal) ----
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    api(e).teleport(portal('M08').x, portal('M08').z); tickW(e); await sleep(140);
    ok('(i) pisar la caja del portal M08 entra a M08 (sin fundido animado con movimiento reducido)', e.st.scenes.join() === 'plaza,M08' && saved(e.w).city.scene === 'M08', e.st.scenes.join());
    api(e).teleport(M8.exit.x, M8.exit.z); tickW(e); await sleep(140);
    const b8 = portal('M08').back, s2 = saved(e.w).city;
    ok('(j) pisar la salida de M08 vuelve a la plaza en el punto de regreso del portal M08', e.st.scenes.join() === 'plaza,M08,plaza' && s2.scene === 'plaza' && s2.at.x === b8.x && s2.at.z === b8.z && s2.at.yaw === b8.yaw, JSON.stringify(s2.at));
    e.w.close();
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    api(e).teleport(portal('M02').x, portal('M02').z); tickW(e); await sleep(140);
    api(e).teleport(M2.exit.x, M2.exit.z - 2.5);
    ok('(k) junto a la salida de M02 el botón dice "Volver a la plaza"', act(e).main === 'Volver a la plaza' && !act(e).hidden, JSON.stringify(act(e)));
    click(e.w, $(e, '#city-act')); await sleep(140);
    ok('(k2) el botón "Volver a la plaza" también cambia de escena', e.st.scenes.join() === 'plaza,M02,plaza' && saved(e.w).city.scene === 'plaza');
    e.w.close();

    // ---- durante el fundido nada responde; una tecla sostenida desde antes de cruzar no sigue activa al llegar ----
    e = boot({ seed: base() }); await enterCity(e);
    key(e, 'ArrowDown');   // se sostiene hacia la salida de M08 (a 5 m de la entrada) desde antes de cruzar el portal
    api(e).teleport(portal('M08').x, portal('M08').z); tickW(e);
    ok('(l2) durante el fundido #city-live queda fuera del subárbol inert (si no, el lector no anuncia la llegada)', $(e, '#city-ui-main').hasAttribute('inert') && !$(e, '#city-live').closest('[inert]'), 'live dentro de inert=' + !!$(e, '#city-live').closest('[inert]'));
    const h0 = JSON.stringify(hero(e)); key(e, 'ArrowRight'); tickW(e); tickW(e);
    ok('(l) durante el fundido el héroe no se mueve ni se abre nada', JSON.stringify(hero(e)) === h0 && $(e, '#city-sheet').hidden, JSON.stringify(hero(e)));
    keyUp(e, 'ArrowRight');
    await sleep(SETTLE);
    for (let i = 0; i < 60; i++) tickW(e, 16);
    ok('(m) con la tecla aún sostenida al llegar, durante 1 s el héroe no avanza ni cruza la salida (el input se libera al llegar)', e.st.scenes.join() === 'plaza,M08' && hero(e).z === M8.entry.z, 'z=' + hero(e).z + ' escenas=' + e.st.scenes.join());
    keyUp(e, 'ArrowDown'); key(e, 'ArrowDown'); for (let i = 0; i < 6; i++) tickW(e, 16);
    ok('(m2) soltar y volver a pulsar sí mueve al héroe (el input sigue vivo)', hero(e).z > M8.entry.z, 'z=' + hero(e).z);
    e.w.close();

    // ---- foco: un nodo válido se conserva ----
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    goNear(e, 'M08'); const runBtn = $(e, '#city-run'); runBtn.focus();
    click(e.w, $(e, '#city-act')); await sleep(80);
    ok('(n) un foco que sigue en un nodo válido se conserva al llegar', !!runBtn && e.d.activeElement === $(e, '#city-run'), String(e.d.activeElement && e.d.activeElement.id));
    e.w.close();

    // ---- la autorrepetición del teclado (keydown con repeat) no reactiva una tecla que se liberó al llegar ----
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    key(e, 'ArrowDown');
    api(e).teleport(portal('M08').x, portal('M08').z); tickW(e); await sleep(SETTLE);
    for (let i = 0; i < 40; i++) { e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true, bubbles: true, cancelable: true })); tickW(e, 16); }
    ok('(m2) con la repetición automática de la tecla sostenida el héroe no avanza ni cruza la salida', e.st.scenes.join() === 'plaza,M08' && hero(e).z === M8.entry.z, 'z=' + hero(e).z + ' escenas=' + e.st.scenes.join());
    keyUp(e, 'ArrowDown'); key(e, 'ArrowDown'); for (let i = 0; i < 6; i++) tickW(e, 16);
    ok('(m3) soltar y volver a pulsar sí mueve al héroe', hero(e).z > M8.entry.z, 'z=' + hero(e).z);
    e.w.close();

    // ---- creación lenta: "Abriendo Nodo Enlace…" ----
    e = boot({ seed: base(), pending: new Set(['M08']), reduced: true }); await enterCity(e);
    goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(400);
    ok('(o) si la escena tarda más de 250 ms aparece "Abriendo Nodo Enlace…"', ($(e, '#city-load') || {}).textContent === 'Abriendo Nodo Enlace…', ($(e, '#city-load') || {}).textContent);
    ok('(o3) el aviso no queda dentro de un subárbol inert (se oye) y trae "Salir" (si la escena se cuelga hay salida)', !!$(e, '#city-loadbox') && !$(e, '#city-loadbox').closest('[inert]') && !!$(e, '#city-loadbox [data-c="quit"]'), 'inert=' + !!($(e, '#city-loadbox') && $(e, '#city-loadbox').closest('[inert]')));
    e.st.resolvers.M08(); for (let i = 0; i < 100 && ($(e, '#city-loadbox') || !e.d.body.classList.contains('city-on')); i++) await sleep(20);   // espera la condición, no un tiempo fijo
    ok('(o2) al resolver desaparece el aviso y la vista queda en M08', !$(e, '#city-loadbox') && saved(e.w).city.scene === 'M08' && !$(e, '#city-ui-main').hasAttribute('inert'));
    e.w.close();

    // ---- Próximamente ----
    e = boot({ html: HTML_NO_M09, seed: base() }); await enterCity(e);
    const SINT = e.w.eval('MODULES').find((m) => m.id === SIN).title;
    goNear(e, SIN);
    ok('(p) junto a un muro sin distrito el botón dice "Ver <módulo>" con "<módulo> · Próximamente"', act(e).main === 'Ver ' + SIN && act(e).sub === SIN + ' · Próximamente', JSON.stringify(act(e)));
    click(e.w, $(e, '#city-act'));
    const sheet = $(e, '#city-sheet'), btns = [...sheet.querySelectorAll('button')].map((b) => b.textContent);
    ok('(p2) la hoja dice "<módulo> · <título>", el texto exacto y los botones "Ir al módulo" y "Cerrar"', sheet.querySelector('.prompt').textContent === SIN + ' · ' + SINT && sheet.querySelector('p').textContent === 'Este distrito llegará pronto. Mientras, puedes estudiarlo desde Módulos.' && btns.join('|') === 'Ir al módulo|Cerrar', btns.join('|'));
    click(e.w, cx(e, 'go-module')); await tick();
    ok('(p3) "Ir al módulo" abre la página del módulo sin distrito', !!$(e, '[data-act="home"]') && $(e, '.head h1').textContent === SINT, ($(e, '.head h1') || {}).textContent);
    e.w.close();
    e = boot({ seed: base() }); await enterCity(e);
    goNear(e, 'M11'); click(e.w, $(e, '#city-act'));
    const sh11 = $(e, '#city-sheet');
    ok('(p4) M11 (sin módulo todavía): hoja "M11 · Próximamente", sin "Ir al módulo", solo "Cerrar"', sh11.querySelector('.prompt').textContent === 'M11 · Próximamente' && !cx(e, 'go-module') && [...sh11.querySelectorAll('button')].map((b) => b.textContent).join('|') === 'Cerrar' && sh11.querySelector('p').textContent === 'Este distrito llegará pronto.');
    e.w.close();

    // ---- error al crear M08 ----
    e = boot({ seed: base(), reject: new Set(['M08']), reduced: true }); await enterCity(e);
    goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(120);
    const err = $(e, '#city-err'), rb = cx(e, 'err-retry');
    ok('(q) M08 no se pudo crear: se vuelve a la plaza y el aviso dice "No se pudo abrir Nodo Enlace." con role=alert, fuera de #city-ui-main y con el foco en "Reintentar"', e.st.scenes.join() === 'plaza,M08,plaza' && !err.hidden && !$(e, '#city-ui-main').contains(err) && err.querySelector('[role="alert"]') && err.querySelector('p').textContent === 'No se pudo abrir Nodo Enlace.' && e.d.activeElement === rb, e.st.scenes.join());
    ok('(q2) la partida queda en la plaza (scene guardada "plaza")', saved(e.w).city.scene === 'plaza');
    await sleep(600);
    ok('(q3) el aviso no se cierra solo', !$(e, '#city-err').hidden);
    e.st.reject.delete('M08'); click(e.w, rb); await sleep(120);
    ok('(q4) "Reintentar" vuelve a intentar y, si funciona, entra a M08 y quita el aviso', saved(e.w).city.scene === 'M08' && $(e, '#city-err').hidden && e.st.scenes.join() === 'plaza,M08,plaza,M08', e.st.scenes.join());
    e.w.close();
    e = boot({ seed: base(), reject: new Set(['M08']), reduced: true }); await enterCity(e);
    goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(120);
    click(e.w, cx(e, 'err-close'));
    ok('(q5) "Cerrar" quita el aviso y lleva el foco a #city-pause', $(e, '#city-err').hidden && e.d.activeElement === $(e, '#city-pause'));
    e.w.close();
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    goNear(e, 'M08'); e.st.reject.add('M08'); e.st.reject.add('plaza'); click(e.w, $(e, '#city-act')); await sleep(120);
    ok('(q6) si falla también la plaza: "No se pudo mostrar la ciudad."', /No se pudo mostrar la ciudad\./.test($(e, '#city-root').textContent), $(e, '#city-root').textContent.slice(0, 120));
    e.w.close();
    e = boot({ seed: base({ city: { prologue: true, scene: 'M08', at: { x: M8.entry.x, z: M8.entry.z, yaw: 0 } } }), reject: new Set(['M08']) }); await enterCity(e); await sleep(80);
    ok('(q7) al cargar una partida guardada en M08 que no se puede abrir: plaza con el aviso y scene guardada plaza', e.st.scenes.join() === 'M08,plaza' && !$(e, '#city-err').hidden && saved(e.w).city.scene === 'plaza', e.st.scenes.join());
    e.w.close();

    // ---- salir de la ciudad durante el cambio: con el fundido en curso y con el create pendiente ----
    const leave = (ee) => ee.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, [ee.w.eval('MODULES').find((m) => m.id === 'M02').questions.find((x) => x.type === 'mcq')]);
    e = boot({ seed: base() }); await enterCity(e);
    goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(140); leave(e); await sleep(SETTLE);
    ok('(r) salir en pleno fundido: no se crea M08, el mundo viejo se libera y no hay errores', e.st.scenes.join() === 'plaza' && e.st.disposed === 1 && e.errors.length === 0 && !$(e, '#city-err'), e.st.scenes.join() + ' ' + e.errors.join('|'));
    e.w.close();
    for (const how of ['resuelve', 'rechaza']) {
      e = boot({ seed: base(), pending: new Set(['M08']), reduced: true }); await enterCity(e);
      goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(140);   // el viejo ya se liberó y M08 está pendiente
      const d0 = e.st.disposed; leave(e); await tick();
      if (how === 'resuelve') e.st.resolvers.M08(); else { e.st.pending.clear(); e.st.resolvers.M08 = () => {}; }
      await sleep(140);
      ok('(s) salir con el create pendiente que ' + how + ': el mundo tardío se libera (resuelve) o se ignora (rechaza), sin aviso ni errores', e.errors.length === 0 && !$(e, '#city-err') && (how === 'rechaza' || e.st.disposed === d0 + 1), 'dispose ' + d0 + '→' + e.st.disposed + ' ' + e.errors.join('|'));
      e.w.close();
    }
    // mundo real con raf inyectado: tras salir no queda ningún rAF pendiente y el canvas se libera
    e = boot({ seed: base(), real: true, reduced: true }); await enterCity(e);
    goNear(e, 'M08'); click(e.w, $(e, '#city-act')); await sleep(120);
    ok('(t) con el mundo real: tras cambiar de escena hay a lo sumo 1 rAF pendiente', e.st.rafPend.size <= 1 && e.st.scenes.join() === 'plaza,M08', e.st.rafPend.size + ' ' + e.st.scenes.join());
    const cv = $(e, '#city-cv'); leave(e); await sleep(40);
    ok('(t2) con el mundo real: al salir de la ciudad no queda ningún rAF pendiente y el canvas queda en 0×0', e.st.rafPend.size === 0 && cv.width === 0 && cv.height === 0, e.st.rafPend.size + ' ' + cv.width + 'x' + cv.height);
    e.w.close();

    // ---- fugas: 20 ciclos plaza ↔ M08 con el mundo real ----
    e = boot({ seed: base(), real: true, reduced: true }); await enterCity(e);
    const cycle = async () => { api(e).teleport(portal('M08').x, portal('M08').z); tickW(e); await sleep(90); api(e).teleport(M8.exit.x, M8.exit.z); tickW(e); await sleep(90); };
    await cycle(); const net1 = JSON.stringify(e.st.net), pend1 = e.st.rafPend.size, w1 = e.st.worlds.length;
    for (let i = 0; i < 19; i++) await cycle();
    ok('(u) 20 ciclos plaza↔M08: los oyentes de window y los rAF no crecen y los mundos se liberan de a uno', JSON.stringify(e.st.net) === net1 && e.st.rafPend.size <= Math.max(1, pend1) && e.st.worlds.length === w1 + 38 && e.st.disposed === e.st.worlds.length - 1 && e.errors.length === 0, net1 + ' / ' + JSON.stringify(e.st.net) + ' raf=' + e.st.rafPend.size + ' mundos=' + e.st.worlds.length + ' dispose=' + e.st.disposed + ' ' + e.errors.join('|'));
    e.w.close();

    // ---- "Ir al distrito" desde la página del módulo ----
    e = boot({ seed: base() });
    click(e.w, [...e.d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === 'M08')); await tick();
    const ib = $(e, '[data-act="district"]');
    ok('(v) la página de M08 tiene "▶ Ir al distrito" y la de M03 no', !!ib && ib.textContent.replace(/\s+/g, ' ').trim() === '▶ Ir al distrito' && !!ib.querySelector('[aria-hidden="true"]'));
    click(e.w, ib); await tick(); await sleep(30);
    ok('(v2) "Ir al distrito" abre la ciudad en la entrada de M08', e.st.scenes.join() === 'M08' && saved(e.w).city.scene === 'M08' && saved(e.w).city.at.x === M8.entry.x && saved(e.w).city.at.z === M8.entry.z, e.st.scenes.join());
    e.w.close();
    e = boot({ html: HTML_NO_M09, seed: base() });
    click(e.w, [...e.d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === SIN)); await tick();
    ok('(v3) la página de un módulo sin distrito no tiene "Ir al distrito"', !$(e, '[data-act="district"]'));
    e.w.close();

    // ---- Enseñar: escribir no repinta la hoja ni mueve el foco del cuadro de texto ----
    { const ap = M2.apprentices.find((a) => a.mode === 'explain');
      e = boot({ seed: base({ topics: { ['M02:' + ap.topic]: [1, 1, 1, 1, 1, 1] }, city: { prologue: true, scene: 'M02', at: { x: ap.x, z: ap.z + 1 } } }), reduced: true }); await enterCity(e);
      api(e).teleport(ap.x, ap.z + 1); key(e, 'e'); tickW(e);
      const ta = $(e, '#city-sheet #city-teach-text');
      ok('(p) junto a un aprendiz con estrella se abre la hoja de Enseñar con su cuadro de texto', !!ta && !$(e, '#city-sheet').hidden);
      if (ta) { ta.focus(); ta.value = 'una dos tres'; ta.dispatchEvent(new e.w.Event('input', { bubbles: true }));
        ok('(p2) tras escribir el foco sigue en el mismo cuadro de texto (no se repinta la hoja)', e.d.activeElement === ta && $(e, '#city-teach-text') === ta, e.d.activeElement && e.d.activeElement.tagName);
        ok('(p3) el contador dice "Faltan 9 palabras de 12"', $(e, '#city-count').textContent === 'Faltan 9 palabras de 12', $(e, '#city-count').textContent); }
      e.w.close(); }

    // ---- recorrido solo con teclado: plaza → portal (E) → mentor (E) → Esc → salida → plaza, sin foco en body ----
    e = boot({ seed: base(), reduced: true }); await enterCity(e);
    const focusOk = () => e.d.activeElement && e.d.activeElement !== e.d.body;
    goNear(e, 'M08'); key(e, 'e'); tickW(e); await sleep(140);
    ok('(w) E junto al portal entra a M08 y el foco no queda en body', e.st.scenes.join() === 'plaza,M08' && focusOk(), String(e.d.activeElement && e.d.activeElement.tagName));
    const m1 = M8.mentors[0]; api(e).teleport(m1.x, m1.z + 1); key(e, 'e'); tickW(e);
    ok('(w2) E junto al primer mentor abre su lección y el foco está dentro de la hoja', !$(e, '#city-sheet').hidden && $(e, '#city-sheet').contains(e.d.activeElement), String(e.d.activeElement && e.d.activeElement.tagName));
    key(e, 'Escape');
    ok('(w3) Esc cierra la hoja y el foco no queda en body', $(e, '#city-sheet').hidden && focusOk(), String(e.d.activeElement && e.d.activeElement.tagName));
    api(e).teleport(M8.exit.x, M8.exit.z); tickW(e); await sleep(140);
    ok('(w4) pisar la salida vuelve a la plaza y el foco no queda en body', e.st.scenes.join() === 'plaza,M08,plaza' && focusOk(), e.st.scenes.join() + ' foco=' + (e.d.activeElement && (e.d.activeElement.id || e.d.activeElement.tagName)) + ' inert=' + $(e, '#city-ui-main').hasAttribute('inert'));
    e.w.close();
  } catch (err) { console.error('EXCEPCIÓN', err && err.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_SCENES OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})();
