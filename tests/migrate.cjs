// Estado guardado: migrate() conserva los datos válidos y normaliza los inválidos, touch() con el reloj hacia atrás
// y saveWarn() cuando localStorage está lleno. Usa las utilidades de tests/adv/lib.cjs (no ejecuta pruebas al cargarse).
const L = require('./adv/lib.cjs');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const load = (w) => JSON.parse(L.rawState(w));
const DAY = 86400000;
const dstr = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const base = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'Zed', look: { skin: 1, suit: 1, head: 1, eyes: 1, emblem: 1, cape: 0, hand: 0 }, welcomed: true } }, o);

// Fuerza un save() sin cambiar datos: abre "Tu héroe" y reescribe el mismo nombre en #hero-name
function resave(e) {
  L.click(e.w, L.btn(e.d, 'hero'));
  const inp = e.d.getElementById('hero-name');
  if (!inp) throw new Error('sin #hero-name');
  inp.dispatchEvent(new e.w.Event('input', { bubbles: true }));
  return load(e.w);
}
// Comparación profunda independiente del orden de las claves
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach((k) => { o[k] = canon(x[k]); }); return o; }
  return x;
}
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function diff(a, b, p = '') {
  if (same(a, b)) return [];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [p + ': ' + JSON.stringify(a) + ' → ' + JSON.stringify(b)];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diff(a[k], b[k], p + '.' + k));
}

(() => {
  let e, s;
  const yest = dstr(new Date(Date.now() - DAY));

  // ===== M. migrate() conserva un estado completo y válido =====
  const full = {
    v: 1, xp: 1234.5, days: { last: yest, count: 4 }, session: 7, lastActive: Date.now() - 3600000,
    topics: { 'M08:T04': [1, 0.5, 0, 1], 'M01:T01': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 'M02:T03': [] },
    qs: { 'M08-001': { a: 3, c: 2, q: true, g: 1, gs: 6 }, 'M01-002': { a: 1, c: 1, q: false, g: 0, gs: -1 }, 'M02-010': { a: 0, c: 0, q: false, g: 0, gs: -1 } },
    boss: { M01: { best: 17, passed: true }, M08: { best: 9, passed: false } },
    hero: { name: 'Zoë Ñandú 🚀', look: { skin: 1, suit: 2, head: 0, eyes: 1, emblem: 0, cape: 0, hand: 0, hc: '#AABBCC', capec: '#7a52c4' }, welcomed: true },
    virtues: { constancia: 1700000000000, valentia: 1700000001000 },
    stats: { learnTopics: ['M01:T01', 'M01:T02'], cleared: 3, roundsNoPower: 2, bossFailed: { M08: true } },
    city: { prologue: true, run: true, bridgeSeen: false, beaten: { bit: yest }, repairs: { r01: true }, taught: { a01: true }, restored: {}, powers: {}, at: { x: 3, z: 5, yaw: 1 } }
  };
  e = L.boot(JSON.stringify(full)); s = resave(e);
  ok('M1 estado completo y válido: tras guardar no cambia nada', same(s, full), diff(full, s).join(' | '));
  ok('M1 sin errores de consola', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // M2: estado real producido por el juego (una ronda de M08 jugada) → recargar y guardar no pierde nada
  e = L.boot(JSON.stringify(base()));
  L.openQuiz(e.w, e.d);
  for (let k = 0; k < 4; k++) { L.answerOne(e.w, e.d, k % 2 ? 'right' : 'wrong'); L.nextQ(e.w, e.d); }
  const real = load(e.w); e.w.close();
  e = L.boot(JSON.stringify(real)); s = resave(e);
  ok('M2 estado real tras jugar: recargar y guardar lo conserva igual', same(s, real), diff(real, s).join(' | '));
  ok('M2 el estado real tiene historial y cola', Object.keys(real.qs).length >= 4 && (real.topics[L.HK] || []).length >= 4, JSON.stringify(real.topics));
  e.w.close();

  // ===== N. migrate() normaliza lo inválido (bordes) =====
  const norm1 = (over) => { const env = L.boot(JSON.stringify(base(over))); const out = resave(env); env.w.close(); return { out, errors: env.errors }; };
  { const { out } = norm1({ days: { last: '2026-1-1', count: 2.7 } });
    ok('N1 days.last con formato inválido → null y count entero', out.days.last === null && out.days.count === 2, JSON.stringify(out.days)); }
  { const { out } = norm1({ days: { last: yest, count: -3 } });
    ok('N2 days.count negativo → 0', out.days.count === 0 && out.days.last === yest, JSON.stringify(out.days)); }
  { const { out } = norm1({ xp: -5, session: 3.9, lastActive: -1 });
    ok('N3 xp negativo → 0, session 3.9 → 3, lastActive negativo → 0', out.xp === 0 && out.session === 3 && out.lastActive === 0, JSON.stringify([out.xp, out.session, out.lastActive])); }
  { const { out } = norm1({ xp: 0 });
    ok('N4 xp 0 se conserva (límite inferior válido)', out.xp === 0); }
  { const twelve = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0.5, 1];
    const { out } = norm1({ topics: { 'M08:T04': twelve } });
    ok('N5 historial de 12 → últimos 10', JSON.stringify(out.topics['M08:T04']) === JSON.stringify(twelve.slice(-10)), JSON.stringify(out.topics['M08:T04'])); }
  { const { out } = norm1({ topics: { 'M08:T04': [1, '1', null, 0.5, 2, -1, 0, true] } });
    ok('N6 historial mixto → solo números en [0,1] en orden', JSON.stringify(out.topics['M08:T04']) === JSON.stringify([1, 0.5, 0]), JSON.stringify(out.topics['M08:T04'])); }
  { const { out } = norm1({ qs: { A: { a: 2, c: 5, q: 'true', g: 1.5, gs: 'x' }, B: { a: 1, c: 0, q: true, g: 0, gs: 3 }, C: [1, 2] } });
    ok('N7 qs con c > a → c = a; q no booleano → false; g entero; gs inválido → -1', same(out.qs.A, { a: 2, c: 2, q: false, g: 1, gs: -1 }), JSON.stringify(out.qs.A));
    ok('N7 qs válido con gs = 3 se conserva', same(out.qs.B, { a: 1, c: 0, q: true, g: 0, gs: 3 }), JSON.stringify(out.qs.B));
    ok('N7 qs como arreglo se borra', !('C' in out.qs)); }
  { const { out } = norm1({ boss: { M01: { best: 3, passed: false }, M02: [1], M03: 'x' } });
    ok('N8 boss: arreglo y texto se borran, el objeto se conserva', same(out.boss, { M01: { best: 3, passed: false } }), JSON.stringify(out.boss)); }
  { const { out } = norm1({ hero: { name: 'Zed', look: { skin: -1, suit: '2', head: 1.7, eyes: 1, emblem: 1, cape: 0, hand: 0, hc: 'red', capec: '#12345G' }, welcomed: true } });
    ok('N9 look: negativos y textos → 0, decimales → entero, colores inválidos se borran', out.hero.look.skin === 0 && out.hero.look.suit === 0 && out.hero.look.head === 1 && !('hc' in out.hero.look) && !('capec' in out.hero.look), JSON.stringify(out.hero.look)); }
  { const { out } = norm1({ stats: { learnTopics: 'x', cleared: 'x', roundsNoPower: -2, bossFailed: null } });
    ok('N10 stats inválidos → valores frescos', Array.isArray(out.stats.learnTopics) && out.stats.cleared === 0 && out.stats.roundsNoPower === 0 && same(out.stats.bossFailed, {}), JSON.stringify(out.stats)); }
  { const { out, errors } = norm1({ world: { at: 5, pos: null, talked: 'x', beaten: [], run: 'yes' } });
    ok('N11 world inválido: world desaparece del guardado y city.run toma su valor', out.world === undefined && out.city.run === true && !errors.length, JSON.stringify([out.world, out.city.run])); }
  { const { out } = norm1({ boss: { M01: { best: '<img src=x onerror=alert(1)>', passed: 'yes' }, M02: [], M03: { best: 99, passed: true }, M04: { best: 7.9, passed: false } } });
    ok('N15 boss: best no numérico → 0 y passed no booleano → false', out.boss.M01 && out.boss.M01.best === 0 && out.boss.M01.passed === false, JSON.stringify(out.boss.M01));
    ok('N15 boss: arreglo descartado; best acotado a 0..20 y entero', out.boss.M02 === undefined && out.boss.M03.best === 20 && out.boss.M03.passed === true && out.boss.M04.best === 7, JSON.stringify(out.boss)); }
  { const evil = JSON.parse('{"skin":1,"cape":1,"__proto__":{"hc":"\\"/><img id=pwn src=x>","capec":"\\"/><img id=pwn2 src=x>"}}');
    const env = L.boot(JSON.stringify(base({ hero: { name: 'Zed', welcomed: true, look: evil } })));
    const out = resave(env);
    ok('N16 hero.look con __proto__: el guardado no trae capec y el prototipo queda intacto', out.hero.look.capec === undefined && out.hero.look.hc === undefined && Object.getPrototypeOf(out.hero.look) === Object.prototype, JSON.stringify(out.hero.look));
    ok('N16 al abrir "Tu héroe" no aparece #pwn ni #pwn2', !env.d.getElementById('pwn') && !env.d.getElementById('pwn2'));
    env.w.close(); }
  { const { out } = norm1({ hero: { name: 'Zed', welcomed: true, look: { skin: 2, constructor: { x: 1 }, extra: 'z' } } });
    ok('N17 hero.look: solo claves de slot y skin conservado', out.hero.look.skin === 2 && out.hero.look.extra === undefined && Object.keys(out.hero.look).every((k) => ['skin','suit','head','eyes','emblem','cape','hand','hc','capec'].includes(k)), JSON.stringify(out.hero.look)); }
  { const st = JSON.parse('{"__proto__":{"cleared":99},"cleared":3}');
    const { out } = norm1({ stats: st });
    ok('N18 stats con __proto__: cleared 3, prototipo intacto y solo claves conocidas', out.stats.cleared === 3 && Object.getPrototypeOf(out.stats) === Object.prototype && Object.keys(out.stats).every((k) => ['learnTopics','cleared','roundsNoPower','bossFailed'].includes(k)), JSON.stringify(out.stats)); }
  // Arreglos en lugar de objetos (como R10-R12 de attacks.cjs): las claves con nombre se pierden en JSON.stringify
  { const env = L.boot(JSON.stringify(base({ virtues: [], days: { last: yest, count: 2 } }))); L.openQuiz(env.w, env.d); L.answerOne(env.w, env.d, 'right');
    const out = load(env.w);
    ok('N13 virtues = []: la virtud Constancia ganada (racha 3) queda guardada', !Array.isArray(out.virtues) && !!out.virtues.constancia, 'virtues guardado=' + JSON.stringify(out.virtues) + ' days=' + JSON.stringify(out.days)); env.w.close(); }
  { const { out } = norm1({ city: { beaten: [], repairs: [], taught: [], restored: [], powers: [] }, stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: [] } });
    const arr = ['city.beaten', 'city.repairs', 'city.taught', 'city.restored', 'city.powers', 'stats.bossFailed'].filter((k) => { const v = k.split('.').reduce((o, p) => o[p], out); return Array.isArray(v) || !v || typeof v !== 'object'; });
    ok('N14 city.beaten/repairs/taught/restored/powers y stats.bossFailed como arreglo se normalizan a objeto', arr.length === 0, 'siguen mal: ' + arr.join(', ')); }
  { const env = L.boot('{no es json'); const out = resave(env);
    ok('N12 JSON inválido: arranca con estado nuevo y sin errores', out.v === 1 && out.xp === 0 && !env.errors.length, env.errors.join(' | ')); env.w.close(); }

  // ===== T. touch() con el reloj hacia atrás =====
  { const clock = { ms: 0 }, tomorrow = dstr(new Date(Date.now() + DAY)), after = dstr(new Date(Date.now() + 2 * DAY));
    e = L.boot(JSON.stringify(base({ days: { last: tomorrow, count: 5 }, session: 4, lastActive: Date.now() - 60000 })), { clock });
    L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T1 reloj un día atrás (days.last = mañana): days no cambia', s.days.last === tomorrow && s.days.count === 5, JSON.stringify(s.days));
    ok('T1 reloj atrás: sin sesión nueva y lastActive finito', s.session === 4 && Number.isFinite(s.lastActive), 'session=' + s.session);
    L.nextQ(e.w, e.d); clock.ms = DAY; L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T2 el reloj llega a "mañana": mismo día, la racha sigue en 5', s.days.last === tomorrow && s.days.count === 5, JSON.stringify(s.days));
    ok('T2 un día después: sesión nueva', s.session === 5, 'session=' + s.session);
    L.nextQ(e.w, e.d); clock.ms = 2 * DAY; L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T3 el día siguiente: la racha sube a 6', s.days.last === after && s.days.count === 6, JSON.stringify(s.days));
    ok('T sin errores de consola', !e.errors.length, e.errors.join(' | ')); e.w.close(); }
  { const today = dstr(new Date());
    e = L.boot(JSON.stringify(base({ days: { last: today, count: 3 } }))); L.openQuiz(e.w, e.d);
    L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d); L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T4 dos respuestas el mismo día no suben la racha', s.days.last === today && s.days.count === 3, JSON.stringify(s.days)); e.w.close(); }
  { const old = dstr(new Date(Date.now() - 2 * DAY));
    e = L.boot(JSON.stringify(base({ days: { last: old, count: 9 } }))); L.openQuiz(e.w, e.d);
    L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T5 último día hace 2 días: la racha vuelve a 1', s.days.last === dstr(new Date()) && s.days.count === 1, JSON.stringify(s.days)); e.w.close(); }
  { const far = dstr(new Date(Date.now() + 400 * DAY));
    e = L.boot(JSON.stringify(base({ days: { last: far, count: 2 } }))); L.openQuiz(e.w, e.d);
    L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('T6 days.last en el año siguiente (comparación de cadenas): no se sobrescribe', s.days.last === far && s.days.count === 2, JSON.stringify(s.days)); e.w.close(); }

  // ===== W. saveWarn() con localStorage lleno =====
  const warns = (d) => d.querySelectorAll('#savewarn');
  e = L.boot(JSON.stringify(base()), { storage: 'full' }); e.w.__full = true;
  L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'wrong');
  { const w1 = warns(e.d);
    ok('W1 almacenamiento lleno: aparece #savewarn', w1.length === 1);
    ok('W1 es role=alert con el texto exacto', w1.length === 1 && w1[0].getAttribute('role') === 'alert' && w1[0].textContent === 'No se pudo guardar tu progreso: el almacenamiento del navegador está lleno.', w1[0] && w1[0].textContent);
    ok('W1 es hijo de body y va antes de #app', w1.length === 1 && w1[0].parentNode === e.d.body && !!(w1[0].compareDocumentPosition(e.d.getElementById('app')) & 4)); }
  L.nextQ(e.w, e.d); L.answerOne(e.w, e.d, 'wrong'); L.nextQ(e.w, e.d); L.answerOne(e.w, e.d, 'right');
  ok('W2 tres fallos de guardado: sigue habiendo un solo aviso', warns(e.d).length === 1, 'n=' + warns(e.d).length);
  L.click(e.w, L.btn(e.d, 'quit') || L.btn(e.d, 'back'));
  if (L.btn(e.d, 'home')) L.click(e.w, L.btn(e.d, 'home'));
  ok('W3 el aviso sobrevive a render() al cambiar de vista', warns(e.d).length === 1 && !!e.d.querySelector('[data-act="mod"]'), 'n=' + warns(e.d).length);
  ok('W sin errores de consola', !e.errors.length, e.errors.join(' | ')); e.w.close();
  e = L.boot(JSON.stringify(base())); L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'right');
  ok('W4 con almacenamiento normal no hay aviso', warns(e.d).length === 0); e.w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nMIGRATE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})();
