// Generadores de estados estudio_isw_v1 (válidos y hostiles).
const { HK } = require('./lib.cjs');

function validState(r, ids) {
  const today = new Date();
  const ds = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dd = new Date(today); dd.setDate(dd.getDate() - r.int(0, 3));
  const hist = Array.from({ length: r.int(0, 10) }, () => r.pick([0, 0.5, 1]));
  const qs = {};
  ids.forEach((id) => { if (r.bool(0.5)) { const a = r.int(0, 6), c = r.int(0, a), q = r.bool(); qs[id] = { a, c, q, g: q ? r.int(0, 1) : 0, gs: q ? r.int(-1, 5) : -1 }; } });
  const virt = {};
  ['constancia', 'curiosidad', 'humildad', 'valentia', 'enfoque', 'integridad', 'resiliencia', 'liderazgo', 'sabiduria'].forEach((v) => { if (r.bool(0.3)) virt[v] = 1700000000000; });
  return {
    v: 1, xp: r.pick([0, r.int(0, 300), r.int(0, 12000)]), days: { last: r.bool(0.8) ? ds(dd) : null, count: r.int(0, 30) },
    session: r.int(0, 50), lastActive: r.pick([0, Date.now() - r.int(0, 3600000), Date.now() - 86400000 * 3]),
    topics: hist.length || r.bool() ? { [HK]: hist } : {}, qs, boss: r.bool(0.2) ? { M08: { best: r.int(0, 10), passed: r.bool() } } : {},
    hero: { name: 'Zed', look: { skin: r.int(0, 3), suit: r.int(0, 3), head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 }, welcomed: r.bool(0.9) },
    virtues: virt, stats: { learnTopics: [], cleared: r.int(0, 12), roundsNoPower: r.int(0, 12), bossFailed: {} },
  };
}

const HOSTILE = () => [null, true, false, 0, -1, -1e9, 1e308, 1.5, -0.0000001, '', 'abc', '5', '1e3', '<img src=x onerror=alert(1)>', [], [1, 2], {}, { a: 1 }, [[[]]], { __x: { y: { z: [] } } }];

function hostileState(r, ids) {
  const s = validState(r, ids);
  const H = HOSTILE();
  const paths = [];
  const nm = r.int(1, 3);
  for (let k = 0; k < nm; k++) {
    const kind = r.int(0, 13);
    const val = r.pick(H);
    if (kind === 0) { s.xp = val; paths.push('xp'); }
    else if (kind === 1) { s.topics = val; paths.push('topics'); }
    else if (kind === 2) { s.topics = { [HK]: val }; paths.push('topics[HK]'); }
    else if (kind === 3) { s.qs = val; paths.push('qs'); }
    else if (kind === 4) { const id = r.pick(ids); s.qs[id] = val; paths.push('qs[id]'); }
    else if (kind === 5) { const id = r.pick(ids); s.qs[id] = { a: r.pick(H), c: r.pick(H), q: r.pick(H), g: r.pick(H), gs: r.pick(H) }; paths.push('qs[id].*'); }
    else if (kind === 6) { s.days = val; paths.push('days'); }
    else if (kind === 7) { s.days = { last: r.pick(H), count: r.pick(H) }; paths.push('days.*'); }
    else if (kind === 8) { s.session = val; paths.push('session'); }
    else if (kind === 9) { s.virtues = val; paths.push('virtues'); }
    else if (kind === 10) { s.stats = r.bool() ? val : { learnTopics: r.pick(H), cleared: r.pick(H), roundsNoPower: r.pick(H), bossFailed: r.pick(H) }; paths.push('stats'); }
    else if (kind === 11) { s.world = r.bool() ? val : { at: r.pick(H), pos: r.pick(H), talked: r.pick(H), beaten: r.pick(H), run: r.pick(H) }; paths.push('world'); }
    else if (kind === 12) { s.boss = r.bool() ? val : { M08: r.pick(H) }; paths.push('boss'); }
    else { s.lastActive = r.pick([val, Date.now() + 1e12, -1e15]); paths.push('lastActive'); }
  }
  return { raw: JSON.stringify(s), paths };
}

function bigState(r, ids) {
  const s = validState(r, ids);
  const kind = r.int(0, 3);
  if (kind === 0) { s.topics[HK] = Array.from({ length: 1000 }, () => r.pick([0, 0.5, 1])); return { raw: JSON.stringify(s), paths: ['topics[HK] x1000'] }; }
  if (kind === 1) { for (let i = 0; i < 1000; i++) s.qs['NOEXISTE-' + i] = { a: 1, c: 0, q: true, g: 0, gs: -1 }; return { raw: JSON.stringify(s), paths: ['qs 1000 claves inexistentes'] }; }
  if (kind === 2) { for (let i = 0; i < 1000; i++) s.topics['M99:T' + i] = [1, 1, 1, 1, 1, 1, 1]; return { raw: JSON.stringify(s), paths: ['topics 1000 claves inexistentes'] }; }
  s.hero.name = 'A'.repeat(100000) + '‮​\u0000'; return { raw: JSON.stringify(s), paths: ['hero.name 100k'] };
}

function malformed(r, ids) {
  const good = JSON.stringify(validState(r, ids));
  const opts = [
    () => good.slice(0, r.int(1, good.length - 1)),
    () => 'null', () => '[]', () => '"x"', () => '1', () => 'true', () => '{}', () => '',
    () => good.replace('"v":1', '"v":"1"'), () => good.replace('"v":1', '"v":2'),
    () => good.replace(/"xp":[^,]*/, '"xp":NaN'),
    () => '{"v":1,"__proto__":{"xp":999,"topics":{"M08:T04":"x"}}}',
    () => '{"v":1,"constructor":{"prototype":{"polluted":1}},"topics":{"__proto__":[1,1]},"qs":{"__proto__":{"q":true}}}',
    () => good.replace('"topics":', '"topics":{"__proto__":{"M08:T04":7}},"_t":'),
    () => '\u0000' + good, () => good + 'garbage',
    () => '{"v":1}', () => '{"v":1,"hero":null,"days":null}',
    () => JSON.stringify({ v: 1, xp: 1e400 }),
  ];
  const idx = r.int(0, opts.length - 1);
  return { raw: opts[idx](), paths: ['malformado#' + idx] };
}

function genCase(seed, ids) {
  const r = require('./lib.cjs').rng(seed);
  const t = r();
  if (t < 0.15) return malformed(r, ids);
  if (t < 0.25) return bigState(r, ids);
  return hostileState(r, ids);
}

module.exports = { validState, hostileState, bigState, malformed, genCase };
