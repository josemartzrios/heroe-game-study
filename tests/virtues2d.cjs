// Virtudes con recompensas nuevas (spec §4.1): Enfoque +10 XP, Liderazgo +5 al enseñar, Sabiduría → Memoria fotográfica ×2, textos sin piezas y tope de +20 %.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {}; w.__CITY_TEST__ = true;
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
    },
  });
  return { w: dom.window, d: dom.window.document, errors };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const NOW = 1700000000000;
function m02(w) { return w.eval('MODULES').find((m) => m.id === 'M02'); }
function perfectRound(seed, n) {
  const e = boot(seed), qs = m02(e.w).questions.filter((x) => x.type === 'mcq').slice(0, n);
  e.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, qs);
  const xp0 = saved(e.w) ? saved(e.w).xp : seed.xp || 0;
  let g = 0;
  while (e.d.querySelector('.prompt') && g++ < 30) { const q = L.findQ(e.w, e.d); L.click(e.w, L.optBtn(e.d, L.correctText(q))); const nb = e.d.querySelector('#nextbtn'); if (nb) L.click(e.w, nb); }
  const s = saved(e.w), shown = Number(e.d.querySelector('#xpc').dataset.xp);
  const out = { gained: s.xp - xp0, shown, main: e.d.querySelector('main').textContent, s, e };
  return out;
}

// Enfoque: con la virtud ya ganada una ronda perfecta de 8 da +10 XP (R.xp = S.xp); la ronda que la gana no lo cobra.
{ const no = perfectRound(base({ virtues: {} }), 8), has = perfectRound(base({ virtues: { enfoque: NOW } }), 8);
  ok('Enfoque: la ronda que gana la virtud no cobra el bono', !/Bono de Enfoque/.test(no.main) && !!no.s.virtues.enfoque, no.main.slice(0, 80));
  ok('Enfoque ya ganado: +10 XP exactos sobre la misma ronda sin la virtud', has.gained - no.gained === 10, has.gained + ' vs ' + no.gained);
  ok('Enfoque: XP mostrado = XP guardado y aparece "Bono de Enfoque: +10 XP"', has.shown === has.gained && /Bono de Enfoque: \+10 XP/.test(has.main));
  const seven = perfectRound(base({ virtues: { enfoque: NOW } }), 7);
  ok('Enfoque: una ronda de 7 no cobra el bono', !/Bono de Enfoque/.test(seven.main));
  [no, has, seven].forEach((x) => x.e.w.close()); }

// Tope de +20 %: los bonos fijos van fuera del tope (Constancia + Integridad + Enfoque)
{ const mk = (extra) => base({ days: { last: (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })(), count: 3 }, virtues: Object.assign({ constancia: NOW, integridad: NOW }, extra) });
  const a = perfectRound(mk({}), 8), b = perfectRound(mk({ enfoque: NOW }), 8);
  ok('Tope: con Constancia + Integridad el +10 de Enfoque se suma aparte (diferencia exacta de 10)', b.gained - a.gained === 10 && /Bono de Integridad/.test(a.main), b.gained + ' vs ' + a.gained);
  a.e.w.close(); b.e.w.close(); }

// Sabiduría: Memoria fotográfica con 2 usos por ronda
for (const [vir, uses] of [[{}, '×1'], [{ sabiduria: NOW }, '×2']]) {
  const e = boot(base({ xp: 7600, virtues: vir })), qs = m02(e.w).questions.filter((x) => x.type === 'mcq').slice(0, 3);
  e.w.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'home' } }, qs);
  const b = e.d.querySelector('[data-pw="photo"]');
  ok('Sabiduría ' + (vir.sabiduria ? 'ganada' : 'no ganada') + ': Memoria fotográfica ' + uses, !!b && b.textContent.includes(uses), b && b.textContent);
  e.w.close();
}

// Textos de recompensa: 9 virtudes y ningún nombre de pieza
{ const e = boot(base({ xp: 100 }));
  L.click(e.w, e.d.querySelector('[data-act="hero"]'));
  const txt = e.d.querySelector('main').textContent, rewards = [...txt.matchAll(/Recompensa: ([^]*?)(?=Recompensa:|Los bonos de XP|$)/g)].map((m) => m[1]);
  ok('"Tu héroe" muestra las 9 recompensas', rewards.length === 9, String(rewards.length));
  ok('ninguna recompensa nombra una pieza (Emblema, Gafas, Capa, Visor, Reloj, Banda, Etiqueta)', !/Emblema|Gafas|Capa|Visor|Reloj|Banda|Etiqueta/.test(rewards.join(' ')), rewards.join(' | ').slice(0, 200));
  ok('Valentía, Enfoque, Liderazgo y Sabiduría nombran su bono nuevo', /Energía máxima 4/.test(txt) && /\+10 XP/.test(txt) && /\+5 XP al enseñar/.test(txt) && /Memoria fotográfica con 2 usos/.test(txt));
  e.w.close(); }

results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? fails + ' FALLOS' : 'VIRTUES2D OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
