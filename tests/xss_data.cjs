// XSS por los datos de la ciudad: se reescriben en el HTML compilado los nombres, etiquetas, nombres de estación y el texto de la celebración de CITY_DATA
// con `<img src=x onerror=alert(1)>…</script>` y se abre cada tipo de hoja (director, mentor, reparación, aprendiz, estación, celebración, batalla).
// Un texto de datos solo puede llegar al DOM como texto: 0 elementos img, 0 atributos onerror, 0 alert y 0 errores. Además cada superficie
// debe mostrar la carga como texto (así se sabe que la prueba sí llegó hasta ahí y no abrió "otra cosa").
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html0 = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await sleep(0); };
const PAY = (tag) => '<img src=x onerror=alert(1)>' + tag + '</script>';

// ---- el HTML con los datos reescritos (misma inyección que build.mjs: JSON con "<" escapado) ----
const cs = html0.indexOf('var CITY_DATA = '), ce = html0.indexOf(';\n', cs);
const DATA = JSON.parse(html0.slice(cs + 'var CITY_DATA = '.length, ce));
const orig = JSON.parse(JSON.stringify(DATA));
DATA.plaza.name = PAY('plaza');
DATA.plaza.director.name = PAY('director');
DATA.plaza.mirror.name = PAY('espejo');
DATA.ranks = DATA.ranks.map((r) => [r[0], PAY('rango' + r[0])]);
for (const mid of Object.keys(DATA.districts)) {
  const d = DATA.districts[mid];
  d.name = PAY('distrito' + mid);
  d.mentors.forEach((m) => { m.name = PAY('mentor-' + m.id); });
  d.creatures.forEach((c) => { c.name = PAY('criatura-' + c.id); });
  d.repairs.forEach((r) => { r.label = PAY('reparacion-' + r.id); });
  d.apprentices.forEach((a) => { a.name = PAY('aprendiz-' + a.id); });
  d.celebrate.text = PAY('celebracion' + mid);
  if (d.route) d.route.stations.forEach((s) => { s.name = PAY('estacion-' + s.id); });
}
const html = html0.slice(0, cs) + 'var CITY_DATA = ' + JSON.stringify(DATA).replace(/</g, '\\u003c') + html0.slice(ce);

function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail || er.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const st = { alerts: 0, lastOpts: null };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.alert = () => { st.alerts++; };
      w.__CITY_TEST__ = true;
      w.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), addEventListener() {}, removeEventListener() {} });
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = {
        create(canvas, D, sceneId, o) {
          st.lastOpts = o;
          return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, encounter: () => Promise.resolve(), setRoute() {}, dispose() {} });
        }
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const base = (city, extra) => Object.assign({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' }, city: Object.assign({ prologue: true }, city) }, extra);
// seis aciertos en el tema = al menos una estrella (los aprendices solo aparecen con una estrella en su tema)
const starred = (mid, topics) => Object.fromEntries(topics.map((t) => [mid + ':' + t, [1, 1, 1, 1, 1, 1]]));
const $ = (e, s) => e.d.querySelector(s);
const key = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const api = (e) => e.w.__CITY_TEST_API__;
const tickW = (e, ms = 16) => e.st.lastOpts.tick(ms);
const click = (e, el) => el.dispatchEvent(new e.w.MouseEvent('click', { bubbles: true }));
// La carga debe verse como texto (en algún punto del documento) y no haber creado nada
const asText = (e, tag) => e.d.body.textContent.includes('<img src=x onerror=alert(1)>' + tag);
const clean = (e) => e.d.querySelectorAll('img').length === 0 && e.d.querySelectorAll('[onerror]').length === 0 && !/<img/i.test(e.d.body.innerHTML.replace(/&lt;img/g, '')) && e.st.alerts === 0;
const at = (o, dz = 0) => ({ x: o.x, z: o.z + dz });
async function start(seed) {
  const e = boot(seed);
  e.d.querySelector('[data-act="city"]').dispatchEvent(new e.w.MouseEvent('click', { bubbles: true })); await tick();
  return e;
}
// Ir a un objeto y pulsar E. before = texto de la pantalla estando cerca (botón de acción, avisos); sheet = hoja de la ciudad visible;
// game = la vista cambió a una ronda o a otra pantalla (el cuerpo deja de estar en la ciudad)
async function interact(e, o, dz = 1) {
  api(e).teleport(o.x, o.z + dz);
  const before = e.d.body.textContent;
  key(e, 'e'); tickW(e); await tick();
  const sh = $(e, '#city-sheet');
  return { before, sheet: !!sh && !sh.hidden, text: sh ? sh.textContent : '', game: !e.d.body.classList.contains('city-on') };
}

(async () => {
  const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
  const M2 = DATA.districts.M02, M8 = DATA.districts.M08;
  try {
    // plaza: director, espejo y portal de un módulo sin distrito
    { const e = await start(base({}));
      ok('plaza: el nombre de la plaza o de su director llega como texto, sin crear elementos', clean(e) && e.errors.length === 0, e.errors.join(' | '));
      const dir = DATA.plaza.director, r = await interact(e, dir);
      ok('plaza: la hoja de Iris se abre y su nombre se ve como texto escapado', r.sheet && asText(e, 'director') && clean(e), JSON.stringify(r).slice(0, 160));
      key(e, 'Escape');
      const mir = DATA.plaza.mirror, r2 = await interact(e, mir);
      ok('plaza: el Espejo abre la pantalla del héroe sin elementos nuevos', r2.game && !r2.sheet && clean(e) && e.errors.length === 0, JSON.stringify([r2.game, r2.sheet]) + e.errors.join(' | '));
      e.w.close();
      const e2 = await start(base({}));
      const pend = orig.plaza.portals.find((p) => !orig.districts[p.dist]);
      const r3 = await interact(e2, pend);
      ok('plaza: el portal de un módulo sin distrito abre su hoja sin elementos nuevos', r3.sheet && clean(e2), JSON.stringify(r3).slice(0, 160));
      ok('plaza: sin errores de página', e2.errors.length === 0, e2.errors.join(' | '));
      e2.w.close(); }

    // M02: mentor, reparación y aprendiz
    { const e = await start(base({ scene: 'M02', at: at(M2.entry) }, { topics: starred('M02', M2.apprentices.map((a) => a.topic)) }));
      ok('M02: al entrar al distrito ningún texto de los datos crea elementos', clean(e) && e.errors.length === 0, e.errors.join(' | '));
      const m = M2.mentors[0], r = await interact(e, m);
      ok('M02: la hoja del mentor se abre y su nombre se ve como texto escapado', r.sheet && asText(e, 'mentor-' + m.id) && clean(e), JSON.stringify(r).slice(0, 160));
      key(e, 'Escape');
      const rp = M2.repairs[0], r2 = await interact(e, rp);
      ok('M02: junto a la reparación su etiqueta se ve como texto y al pulsar E empieza la ronda sin elementos nuevos', r2.before.includes('<img src=x onerror=alert(1)>reparacion-' + rp.id) && r2.game && !r2.sheet && clean(e), JSON.stringify([r2.before.length, r2.game, r2.sheet]));
      e.w.close();
      const e3 = await start(base({ scene: 'M02', at: at(M2.entry) }, { topics: starred('M02', M2.apprentices.map((a) => a.topic)) }));
      const ap = M2.apprentices[0], r3 = await interact(e3, ap);
      ok('M02: la hoja del aprendiz se abre y su nombre se ve como texto escapado', r3.sheet && asText(e3, 'aprendiz-' + ap.id) && clean(e3), JSON.stringify(r3).slice(0, 160));
      ok('M02: sin errores de página', e.errors.length === 0 && e3.errors.length === 0, e.errors.concat(e3.errors).join(' | '));
      e3.w.close(); }

    // M08: estación de la ruta (hoja y pill de capas) y la torre con el distrito sin restaurar
    { const e = await start(base({ scene: 'M08', at: at(M8.entry) }));
      const pad = M8.route.pads[0], st0 = M8.route.stations[0], r = await interact(e, pad, 0);
      ok('M08: la hoja de la estación se abre y su nombre se ve como texto escapado', r.sheet && asText(e, 'estacion-' + st0.id) && clean(e), JSON.stringify(r).slice(0, 160));
      const ask = [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === 'route-ask');
      if (ask) { click(e, ask); await tick(); }
      ok('M08: con la pregunta de la estación abierta no hay elementos nuevos', !!ask && clean(e), String(!!ask));
      key(e, 'Escape');
      const tw = M8.tower, r2 = await interact(e, tw, 5);
      ok('M08: la hoja de la torre se abre con el nombre del distrito como texto', r2.sheet && clean(e), JSON.stringify(r2).slice(0, 160));
      ok('M08: sin errores de página', e.errors.length === 0, e.errors.join(' | '));
      e.w.close(); }

    // criatura: la batalla muestra su nombre
    { const e = await start(base({ scene: 'M02', at: at(M2.entry) }));
      const c = M2.creatures[0];
      api(e).teleport(c.area.x, c.area.z); key(e, 'e'); tickW(e); await tick(10);
      ok('M02: al enfrentar a una criatura aparece la batalla con su nombre como texto y sin elementos nuevos', e.d.body.classList.contains('game') && asText(e, 'criatura-' + c.id) && clean(e), 'game=' + e.d.body.classList.contains('game'));
      ok('M02: sin errores de página', e.errors.length === 0, e.errors.join(' | '));
      e.w.close(); }

    // celebración: con 7 aprendices enseñados y el jefe aprobado, enseñar al octavo restaura M02 y se celebra en la hoja (con el rango nuevo)
    { const need = M2.need, ids = M2.apprentices.slice(0, need).map((a) => a.id);
      const seed = base({ scene: 'M02', at: at(M2.entry), d: { M02: { taught: set(ids.slice(0, need - 1)) } } }, { boss: { M02: { best: 18, passed: true } } });
      const e = await start(seed);
      api(e).teach(ids[need - 1]); await tick(10);
      const sh = $(e, '#city-sheet');
      ok('celebración: la hoja muestra el texto y el nombre del distrito como texto y sin elementos nuevos', !!sh && !sh.hidden && asText(e, 'celebracionM02') && asText(e, 'distritoM02') && clean(e), sh ? sh.textContent.slice(0, 200) : 'sin hoja');
      ok('celebración: el rango ("Subes a …") sale de los datos y también se ve como texto', asText(e, 'rango1'), sh ? sh.textContent.slice(0, 200) : '');
      ok('celebración: sin errores de página', e.errors.length === 0, e.errors.join(' | '));
      e.w.close(); }
  } catch (err) { console.error('EXCEPCIÓN', err && err.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); }
  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'XSS_DATA OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})();
