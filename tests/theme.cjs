// Tema neón y accesibilidad (spec §5): tokens, contraste AA, controles de 44 px, letra pixel acotada y señales no solo de color.
const fs = require('fs');
const path = require('path');
const L = require('./adv/lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function rules(sel) {   // declaraciones de todas las reglas cuyo selector es exactamente `sel` (las posteriores pisan a las anteriores)
  const out = {}; const re = /(?:^|[}\s;])([^{}@]+?)\s*\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) {
    if (m[1].split(',').map((s) => s.trim()).includes(sel)) m[2].split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim(); });
  }
  return out;
}
const tokens = rules(':root');
const resolve = (v) => { if (!v) return v; const m = /var\((--[\w-]+)\)/.exec(v); return m ? (tokens[m[1]] || v) : v; };
const hexes = (v) => ((resolve(v) || '').match(/#[0-9a-f]{6}\b/gi) || []);
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const px = (v) => { const m = /(\d+(?:\.\d+)?)px/.exec(v || ''); return m ? parseFloat(m[1]) : NaN; };

// tokens
const want = { '--bg': '#0d1230', '--surface': '#151c45', '--cyan': '#5ce1ff', '--magenta': '#ff4fd8', '--green': '#7dff8a', '--yellow': '#ffd76a', '--red': '#ff5a5f', '--ink': '#e8ecff', '--deco': '#2e3a7a' };
ok('los 9 tokens neón existen en :root con sus valores', Object.keys(want).every((k) => (tokens[k] || '').toLowerCase() === want[k]), Object.keys(want).filter((k) => (tokens[k] || '').toLowerCase() !== want[k]).join());
ok('un solo tema: sin variantes claro/oscuro en el CSS', !/prefers-color-scheme/.test(css) && !/data-theme/.test(css));

// contraste de texto (AA = 4.5)
const bg = want['--bg'], surf = want['--surface'];
ok('texto del cuerpo sobre el fondo ≥ 4.5', ratio(want['--ink'], bg) >= 4.5, ratio(want['--ink'], bg).toFixed(2));
ok('texto secundario (--ink2) sobre fondo y superficie ≥ 4.5', ratio(resolve('var(--ink2)'), bg) >= 4.5 && ratio(resolve('var(--ink2)'), surf) >= 4.5);
{ const r = rules('.btn.primary'), col = hexes(r.color)[0], stops = hexes(r.background);
  ok('.btn.primary: texto oscuro (#0d1230) sobre magenta con contraste ≥ 4.5 en todo el degradado', (col || '').toLowerCase() === bg && stops.length >= 1 && stops.every((s) => ratio(col, s) >= 4.5) && /ff4fd8/i.test(r.background || ''), JSON.stringify(r)); }
for (const sel of ['.pill', '.chip', 'body.game .chip', 'body.game .opt']) {
  const r = rules(sel), fg = hexes(r.color)[0] || want['--ink'], bgc = hexes(r.background)[0] || surf;
  ok(sel + ': contraste de texto ≥ 4.5', ratio(fg, bgc) >= 4.5, fg + ' sobre ' + bgc + ' = ' + ratio(fg, bgc).toFixed(2));
}
{ const r = rules('.btn.primary'), col = hexes(r.color)[0], stops = hexes(r.background);
  ok('.btn.primary: contraste ≥ 5.5 en todo el degradado (margen sobre AA)', stops.every((s) => ratio(col, s) >= 5.5), stops.map((s) => s + '=' + ratio(col, s).toFixed(2)).join(' ')); }
ok('bordes de controles (--line) ≥ 3:1 contra el fondo', ratio(resolve('var(--line)'), bg) >= 3, ratio(resolve('var(--line)'), bg).toFixed(2));

// controles de 44 px
for (const sel of ['.btn', '.btn.sm', '.linkbtn', '.opt', '.herobtn', '.pw']) { const r = rules(sel); ok(sel + ': min-height ≥ 44 px', px(r['min-height']) >= 44, r['min-height']); }
ok('.herobtn: min-width ≥ 44 px', px(rules('.herobtn')['min-width']) >= 44);

// letra pixel: solo títulos y textos fijos, ≥ 14 px; las chips, nombres y el objetivo usan la letra de lectura
{ const small = [], re = /([^{}@]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) { const fm = /(?:^|;)\s*font:\s*([^;]*)/.exec(m[2]); if (fm && /Press Start 2P|var\(--f-game\)/.test(fm[1])) { const sz = px((/\d+\s+([\d.]+px)/.exec(fm[1]) || [])[1]); if (!(sz >= 14)) small.push(m[1].trim().slice(0, 40) + ' ' + sz); } }
  ok('toda regla con letra pixel usa ≥ 14 px', small.length === 0, small.join(' | '));
  for (const sel of ['.chip', 'body.game .chip', '.gname', '#city-obj', '.pill']) { const r = rules(sel); ok(sel + ' no usa la letra pixel', !/Press Start|f-game/.test((r.font || '') + (r['font-family'] || '')), r.font); } }

// la hoja de la ciudad ocupa toda la pantalla (lección, enseñar, prólogo…) y su botón de acción queda siempre a la vista
{ const r = rules('#city-sheet'), full = (r.inset === '0' || (r.top === '0' && r.bottom === '0' && r.left === '0' && r.right === '0'));
  ok('#city-sheet: ocupa toda la pantalla (inset 0) y no tiene max-height de media pantalla', full && !/dvh|vh|%/.test(r['max-height'] || ''), JSON.stringify({ inset: r.inset, top: r.top, bottom: r.bottom, mh: r['max-height'] }));
  ok('#city-sheet: desplaza su propio contenido (overflow auto) y queda sobre el HUD', /auto|scroll/.test(r['overflow'] || r['overflow-y'] || '') && parseInt(r['z-index'] || '0', 10) >= 2);
  const ac = rules('#city-sheet .actions');
  ok('#city-sheet .actions: pegado abajo (sticky, sobre el teclado virtual con --kb) con fondo, para que "Practicar" y "Cerrar" no dependan del desplazamiento', ac.position === 'sticky' && ac.bottom === 'var(--kb, 0px)' && /var\(--surface\)|#/.test(ac.background || ''), JSON.stringify(ac));
  ok('ya no existe la regla de 85dvh del apaisado para la hoja', !/#city-sheet\{max-height/.test(css)); }

// pantallas
(async () => {
  const e = L.boot(JSON.stringify({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }));
  const home = e.d.querySelector('main').textContent;
  ok('Inicio: título "Ciudad Núcleo" y botón "▶ Entrar a la ciudad"', /Ciudad Núcleo/.test(e.d.querySelector('h1').textContent) && [...e.d.querySelectorAll('[data-act="city"]')].some((b) => b.textContent.trim() === '▶ Entrar a la ciudad'));
  ok('Inicio y módulo: ningún texto visible menciona "3D"', !/3D/.test(home) && (L.click(e.w, L.modBtn(e.d, 'M01')), !/3D/.test(e.d.querySelector('main').textContent)));
  e.w.close();
  // respuestas: ✓/✗ y texto oculto
  const e2 = L.boot(JSON.stringify({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }));
  L.click(e2.w, L.modBtn(e2.d, 'M01')); L.click(e2.w, L.btn(e2.d, 'topic')); L.click(e2.w, L.btn(e2.d, 'start', (b) => b.dataset.kind === 'quiz'));
  const q = L.findQ(e2.w, e2.d), ct = L.norm(L.correctText(q));
  const wrong = [...e2.d.querySelectorAll('.opt')].find((b) => L.norm(b.querySelector('span:last-child').textContent) !== ct);
  L.click(e2.w, wrong);
  const okB = e2.d.querySelector('.opt.ok'), badB = e2.d.querySelector('.opt.bad');
  ok('tras fallar: la correcta lleva ✓ y "respuesta correcta"', !!okB && !!okB.querySelector('.mark[aria-hidden="true"]') && okB.querySelector('.mark').textContent === '✓' && /respuesta correcta/.test((okB.querySelector('.sronly') || {}).textContent || ''));
  ok('tras fallar: la elegida lleva ✗ y "tu respuesta"', !!badB && !!badB.querySelector('.mark') && badB.querySelector('.mark').textContent === '✗' && /tu respuesta/.test((badB.querySelector('.sronly') || {}).textContent || ''));
  ok('las opciones atenuadas no llevan marca', [...e2.d.querySelectorAll('.opt.dim')].every((b) => !b.querySelector('.mark')));
  e2.w.close();
  // Texto largo sin espacios (identificadores como ServicioAutenticacionConLoggingYCache) en el móvil: las columnas del quiz y de la lección se encogen (minmax(0, 1fr)) y el texto se parte
// donde haga falta; sin esto la opción correcta se corta y la página se ensancha más que la pantalla (medido en Chromium a 320–430 px).
{ const flex = (sel, prop) => (rules(sel)[prop] || '').replace(/\s+/g, '');
  ok('.opts: una columna que se puede encoger (minmax(0,1fr))', flex('.opts', 'grid-template-columns') === 'minmax(0,1fr)', flex('.opts', 'grid-template-columns'));
  ok('.opt: 32px para la tecla y el texto en minmax(0,1fr)', flex('.opt', 'grid-template-columns') === '32pxminmax(0,1fr)', flex('.opt', 'grid-template-columns'));
  ok('.kp: la lista de puntos clave tiene una columna que se puede encoger', flex('.kp', 'grid-template-columns') === 'minmax(0,1fr)', flex('.kp', 'grid-template-columns'));
  for (const sel of ['.kp li', '.opt span', '.prompt', 'code', '.fb']) ok(sel + ': overflow-wrap:anywhere (parte los identificadores largos)', flex(sel, 'overflow-wrap') === 'anywhere', flex(sel, 'overflow-wrap')); }

results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'THEME OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})();
