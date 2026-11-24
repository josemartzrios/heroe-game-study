// Huecos de la Tanda 4 en lo que M05 y M09 hacen al registrarse (no repite tanda4_feasibility, review_tanda3_gaps, city_layout ni district_rules_test).
// Las pruebas adversariales de las tandas anteriores (adv/tanda3_attack, adv/review_tanda3_attack) miran city_at.TANDA3 (8 distritos): M05 y M09 quedaban fuera de
//  1. el objetivo guiado: empieza por el mentor del tema 1 y, siguiéndolo, se llega a "Vuelve a la plaza" sin atascarse ni apuntar a un id que no existe (los 10 distritos);
//  2. la restauración con datos reales: % de restauración 0..10 aprendices con y sin jefe (tope en need), aislamiento entre M05 y M09 (comparten a01..a10), ids ajenos y
//     valores que no son true, rango máximo Arquitecto con 10 y con un M11 que no existe;
//  3. la alcanzabilidad (rejilla de 0,2 m con el radio del héroe) desde la entrada hasta cada interactuable, la puerta de la torre y la salida de los 10 distritos, y desde la
//     entrada de la plaza hasta la boca de cada portal abierto (M05 y M09 dejaron de ser muros) con M11 todavía como muro sólido;
//  4. los sprites reales (sprites2d.js en vm): las criaturas de M05 y M09 se pintan con colors.a (cuerpo), colors.b (acento de 2 px) y ojos blancos con pupila, sin ningún morado
//     de referencia; ninguna criatura de otro distrito (ni del mismo) tiene la misma celda ni forma y cuerpo iguales; hay una fila de atlas por criatura y por persona;
//  5. el HTML construido lleva exactamente los datos de city/districts.mjs (si se edita m05.mjs y no se vuelve a ejecutar build.mjs, las pruebas de jsdom corren con datos viejos).
//  6. anclas de posición: la secuencia completa de los 72 lugares de standardFrame().lay (huella) y dónde queda cada personaje clave de M05 y M09.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { pathToFileURL } = require('url');
const fc = require('fast-check');
const CS = require('../city/story.js');
const CM = require('../city/move.js');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const TODAY = '2026-11-23', R = 0.4, NEAR = 2.2, EPS = 1e-6;
const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
const aabb = (o) => ({ minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 });
const insideBox = (x, z, r, boxes) => { const rr = r - EPS; return boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < rr * rr; }); };

(async () => {
  const D = (await imp('city/districts.mjs')).city, DIST = D.districts, MIDS = Object.keys(DIST);
  const NEW4 = ['M05', 'M09'];
  const ids = (list) => list.map((x) => x.id);

  // =================== 1. objetivo guiado ===================
  const ctxOf = (st) => ({ learned: (t) => st.learned.has(t), stars: (t) => st.stars[t] || 0, beatenEver: (id) => st.beaten.has(id), beatenToday: (id) => st.beaten.has(id), bossUnlocked: st.unlocked, bossPassed: st.passed });
  const fresh = () => ({ learned: new Set(), stars: {}, beaten: new Set(), unlocked: false, passed: false });
  // Sigue el objetivo hasta "Vuelve a la plaza"; devuelve los textos, los objetivos que apuntan a un id inexistente y si terminó. unlockAt: paso en que se abre la torre (o null: al saber todos los temas).
  function play(mid, unlockAt) {
    const M = DIST[mid], st = fresh(), C = CS.normalizeCity({ prologue: true }, D, null, TODAY), labels = [], dangling = [];
    const exists = { mentor: ids(M.mentors), practice: ids(M.mentors), creature: ids(M.creatures), repair: ids(M.repairs), apprentice: ids(M.apprentices), tower: [M.tower.id] };
    let steps = 0, o;
    for (; steps < 300; steps++) {
      if (unlockAt === null ? st.learned.size === M.mentors.length : steps >= unlockAt) st.unlocked = true;
      o = CS.nextObjective(C, D, mid, ctxOf(st)); labels.push(o.label);
      if (o.kind === 'plaza') break;
      if (o.kind === 'none') { if (st.unlocked) return { labels, dangling, done: false, steps, C }; st.unlocked = true; continue; }
      if (o.kind === 'route') { C.d[mid].route.done++; continue; }   // M08: la ruta del paquete, una estación por paso
      if (!exists[o.kind] || !exists[o.kind].includes(o.id)) dangling.push(o.kind + ':' + o.id);
      if (o.kind === 'mentor') st.learned.add(M.mentors.find((m) => m.id === o.id).topic);
      else if (o.kind === 'practice') st.stars[M.mentors.find((m) => m.id === o.id).topic] = 1;
      else if (o.kind === 'creature') st.beaten.add(o.id);
      else if (o.kind === 'repair') C.d[mid].repairs[o.id] = true;
      else if (o.kind === 'apprentice') C.d[mid].taught[o.id] = true;
      else if (o.kind === 'tower') st.passed = true;
      CS.applyRestore(C, D, (m) => m === mid && st.passed);
    }
    return { labels, dangling, done: !!o && o.kind === 'plaza', steps, C };
  }
  for (const mid of MIDS) {
    const M = DIST[mid], fresh0 = CS.normalizeCity({ prologue: true }, D, null, TODAY), o = CS.nextObjective(fresh0, D, mid, ctxOf(fresh()));
    const m1 = M.mentors.find((m) => m.id === o.id);
    ok(`${mid}: el objetivo guiado de un guardado vacío es hablar con el mentor del tema T01 (${M.mentors[0].name})`, o.kind === 'mentor' && !!m1 && m1.topic === 'T01' && o.label === 'Habla con ' + M.mentors[0].name, JSON.stringify(o));
  }
  { const want = { M05: ['Habla con Adela', 'Habla con Yolanda', 'Habla con Zacarías', 'Practica con Adela', 'Practica con Yolanda', 'Practica con Zacarías', 'Enfrenta a Patrón Forzado'],
      M09: ['Habla con Anselmo', 'Habla con Berta', 'Habla con Wenceslao', 'Practica con Anselmo', 'Practica con Berta', 'Practica con Wenceslao', 'Enfrenta a Loro Estocástico'] };
    for (const mid of NEW4) { const r = play(mid, 1e9);
      ok(`${mid}: el camino guiado empieza como el spec (la primera criatura reúne T01 con sus otros dos temas: primero hablar con los tres mentores, luego practicar, luego enfrentarla): ${want[mid].slice(0, 3).join(' → ')}…`, JSON.stringify(r.labels.slice(0, 7)) === JSON.stringify(want[mid]), r.labels.slice(0, 8).join(' → ')); } }
  for (const mid of MIDS) {
    const r = play(mid, null);
    ok(`${mid}: siguiendo el objetivo (torre al saber todos los temas) se llega a "Vuelve a la plaza" con el distrito restaurado, sin atascos ni ids inexistentes`, r.done && r.C.restored[mid] === true && r.dangling.length === 0, `${r.steps} pasos; atascado=${!r.done}; sin id: ${r.dangling.slice(0, 3).join(',')}; último: ${r.labels[r.labels.length - 1]}`);
  }
  { const r = play('M05', null), M = DIST.M05;
    ok('M05: el recorrido guiado visita a los 22 mentores, las 6 criaturas, las 9 reparaciones y 7 aprendices (need) antes de terminar', M.mentors.every((m) => r.labels.includes('Habla con ' + m.name)) && M.creatures.every((c) => r.labels.includes('Enfrenta a ' + c.name))
      && M.repairs.every((x) => r.labels.includes('Repara ' + x.label)) && r.labels.filter((l) => /^Enseña a /.test(l)).length === M.need, r.labels.length + ' objetivos'); }
  { const r = play('M09', null), M = DIST.M09;
    ok('M09: el recorrido guiado visita a los 19 mentores, las 6 criaturas, las 9 reparaciones y 7 aprendices (need) antes de terminar', M.mentors.every((m) => r.labels.includes('Habla con ' + m.name)) && M.creatures.every((c) => r.labels.includes('Enfrenta a ' + c.name))
      && M.repairs.every((x) => r.labels.includes('Repara ' + x.label)) && r.labels.filter((l) => /^Enseña a /.test(l)).length === M.need, r.labels.length + ' objetivos'); }
  { let bad = '';
    const r = fc.check(fc.property(fc.constantFrom(...NEW4), fc.integer({ min: 0, max: 80 }), (mid, at) => { const p = play(mid, at); if (!p.done || p.dangling.length || !p.C.restored[mid]) { bad = mid + '@' + at + ' ' + p.steps; return false; } return true; }), { numRuns: 200, seed: 20261123 });
    ok('M05/M09: abriendo la torre en un paso cualquiera (0..80) el recorrido guiado siempre termina restaurado (200 casos, semilla fija)', !r.failed, bad); }

  // =================== 2. restauración con datos reales ===================
  const mk = (mid, taughtIds, boss, extra) => { const C = CS.normalizeCity({ prologue: true, d: { [mid]: { taught: set(taughtIds), ...extra } } }, D, (m) => boss.includes(m), TODAY); return C; };
  const ALL10 = (mid) => ids(DIST[mid].apprentices);
  const PCT = [[0, 0, 50], [1, 7, 57], [2, 14, 64], [3, 21, 71], [4, 29, 79], [5, 36, 86], [6, 43, 93], [7, 50, 100], [8, 50, 100], [9, 50, 100], [10, 50, 100]];   // aprendices enseñados → % sin jefe, % con jefe (need 7, a mano)
  for (const mid of NEW4) {
    const bad = [];
    for (const [t, sin, con] of PCT) { const C = mk(mid, ALL10(mid).slice(0, t), []); if (CS.restoration(C, D, mid, false) !== sin || CS.restoration(C, D, mid, true) !== con) bad.push(t + ': ' + CS.restoration(C, D, mid, false) + '/' + CS.restoration(C, D, mid, true) + ' ≠ ' + sin + '/' + con); }
    ok(`${mid}: % de restauración con 0..10 aprendices enseñados, sin y con jefe (tabla escrita a mano; tope en need = 7)`, bad.length === 0, bad.join(' | '));
  }
  for (const mid of NEW4) {
    const A = ALL10(mid);
    const cases = [['jefe y los 7 primeros', A.slice(0, 7), [mid], true], ['jefe y los 7 últimos (a04..a10)', A.slice(3), [mid], true], ['jefe y los 10', A, [mid], true], ['jefe y 6', A.slice(0, 6), [mid], false], ['6 y un id inexistente a11', [...A.slice(0, 6), 'a11'], [mid], false], ['7 sin jefe', A.slice(0, 7), [], false]];
    for (const [label, taught, boss, want] of cases) { const C = mk(mid, taught, boss); ok(`${mid}: ${label} → ${want ? 'restaurado' : 'no restaurado'}`, (C.restored[mid] === true) === want, JSON.stringify(C.restored)); }
  }
  { const A5 = ALL10('M05'), A9 = ALL10('M09');
    ok('M05 y M09 comparten los ids a01..a10 (por eso el progreso va por distrito)', JSON.stringify(A5) === JSON.stringify(A9), A5.join() + ' / ' + A9.join());
    const C = CS.normalizeCity({ prologue: true, d: { M09: { taught: set(A9) } } }, D, () => true, TODAY);
    ok('enseñar a los 10 de M09 (jefe aprobado en todos) no restaura M05 ni cuenta para su porcentaje', C.restored.M09 === true && C.restored.M05 === undefined && CS.restoration(C, D, 'M05', true) === 50 && CS.taughtCount(C, D, 'M05') === 0, JSON.stringify(C.restored)); }
  { const base = (taught, boss) => CS.normalizeCity({ prologue: true, d: { M05: { taught } } }, D, boss, TODAY);
    const A = ALL10('M05'), seven = set(A.slice(0, 7));
    ok('un jefe que devuelve "true" como texto, 1 o un objeto no cuenta como aprobado (solo === true)', ['true', 1, {}, [], 'yes'].every((v) => base(seven, () => v).restored.M05 === undefined) && base(seven, () => true).restored.M05 === true, '');
    ok('un jefe que lanza una excepción cuenta como no aprobado y no rompe la carga', base(seven, () => { throw new Error('x'); }).restored.M05 === undefined, '');
    ok('aprendices enseñados con valor distinto de true (1, "true", fecha) no cuentan', (() => { const t = Object.fromEntries(A.slice(0, 7).map((id) => [id, 1])); return base(t, () => true).restored.M05 === undefined && CS.taughtCount(base(t, () => true), D, 'M05') === 0; })(), '');
    ok('un aprendiz de otro distrito con el mismo id no suma, y un id con __proto__ o constructor en taught se ignora', (() => { const raw = JSON.parse('{"__proto__":true,"constructor":true,"a01":true}'); const C = base(raw, () => true); return CS.taughtCount(C, D, 'M05') === 1 && ({}).a01 === undefined; })(), ''); }
  { // Sin pasar por normalizeCity (que ya filtra lo que no es true): story.js lee C.d directamente al enseñar en el motor, así que taughtCount/applyRestore se defienden solos.
    const A = ALL10('M05'), junk = [1, 'true', '2026-11-23', {}, [], null, 2, 'yes'];
    const C = { d: { M05: { taught: Object.fromEntries(A.map((id, i) => [id, junk[i % junk.length]])) } }, restored: {}, powers: {} };
    ok('taughtCount no cuenta aprendices con un valor que no sea exactamente true (1, "true", una fecha, {}, [], null), aunque no hayan pasado por normalizeCity', CS.taughtCount(C, D, 'M05') === 0, String(CS.taughtCount(C, D, 'M05')));
    CS.applyRestore(C, D, () => true);
    ok('applyRestore con taught lleno de valores que no son true no restaura M05, ni siquiera con el jefe aprobado', C.restored.M05 === undefined, JSON.stringify(C.restored));
    const C2 = { d: { M05: { taught: { ...set(A.slice(0, 6)), a07: 1 } } }, restored: {}, powers: {} };
    CS.applyRestore(C2, D, () => true);
    ok('6 aprendices en true y un séptimo con valor 1 no restauran M05 (need = 7 se cuenta solo con true)', CS.taughtCount(C2, D, 'M05') === 6 && C2.restored.M05 === undefined, String(CS.taughtCount(C2, D, 'M05'))); }
  { const all = { prologue: true, d: Object.fromEntries(MIDS.map((m) => [m, { taught: set(ALL10(m)) }])), restored: { ...set(MIDS), M11: true } };
    const C = CS.normalizeCity(all, D, () => true, TODAY);
    ok('con los 10 distritos restaurados (y un M11 que no existe en el guardado) el rango es Arquitecto, restoredIds tiene 10 y la plaza dice "Ciudad al día"', CS.rankOf(C, D) === 'Arquitecto' && CS.restoredIds(C, D).length === 10 && CS.nextObjective(C, D, 'plaza', null).kind === 'none' && /Ciudad al día/.test(CS.nextObjective(C, D, 'plaza', null).label), CS.rankOf(C, D) + ' ' + CS.restoredIds(C, D).length);
    ok('rankName con 10 es Arquitecto y con 11 sería Tech Lead (la tabla pide 11, hoy inalcanzable con 10 distritos)', CS.rankName(10, D) === 'Arquitecto' && CS.rankName(11, D) === 'Tech Lead' && CS.rankName(9, D) === 'Arquitecto' && CS.rankName(8, D) === 'Arquitecto' && CS.rankName(7, D) === 'Senior', [7, 8, 9, 10, 11].map((n) => CS.rankName(n, D)).join()); }

  // =================== 3. alcanzabilidad ===================
  function reachable(sceneId) {
    const sc = CM.scene(D, sceneId), B = sc.bounds, h = 0.2, nx = Math.floor((B.maxX - B.minX) / h) + 1, nz = Math.floor((B.maxZ - B.minZ) / h) + 1;
    const blocked = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz), boxes = CM.boxesFor(D, sceneId), X = (i) => B.minX + i * h, Z = (j) => B.minZ + j * h;
    for (const b of boxes) {
      const i0 = Math.max(0, Math.floor((b.minX - R - B.minX) / h)), i1 = Math.min(nx - 1, Math.ceil((b.maxX + R - B.minX) / h)), j0 = Math.max(0, Math.floor((b.minZ - R - B.minZ) / h)), j1 = Math.min(nz - 1, Math.ceil((b.maxZ + R - B.minZ) / h));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (insideBox(X(i), Z(j), R, [b])) blocked[i * nz + j] = 1;
    }
    const e = sc.entry, q = [Math.round((e.x - B.minX) / h) * nz + Math.round((e.z - B.minZ) / h)];
    if (blocked[q[0]]) return null;
    seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), i = Math.floor(c / nz), j = c % nz; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = a * nz + b; if (!seen[k] && !blocked[k]) { seen[k] = 1; q.push(k); } } }
    return {
      near(x, z, r) { const rr = r - h; for (let i = Math.max(0, Math.floor((x - r - B.minX) / h)); i <= Math.min(nx - 1, Math.ceil((x + r - B.minX) / h)); i++) for (let j = Math.max(0, Math.floor((z - r - B.minZ) / h)); j <= Math.min(nz - 1, Math.ceil((z + r - B.minZ) / h)); j++) if (seen[i * nz + j] && Math.hypot(X(i) - x, Z(j) - z) <= rr) return true; return false; },
      inRect(o) { const b = aabb(o); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (seen[i * nz + j] && X(i) >= b.minX && X(i) <= b.maxX && Z(j) >= b.minZ && Z(j) <= b.maxZ) return true; return false; }
    };
  }
  for (const mid of MIDS) {
    const G = reachable(mid), M = DIST[mid], door = CM.door(M.tower);
    const pts = [...M.mentors, ...M.repairs, ...M.apprentices, ...M.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), { id: 'puerta', x: door.x, z: door.z }];
    const bad = G ? pts.filter((p) => !G.near(p.x, p.z, NEAR)).map((p) => p.id) : ['entrada bloqueada'];
    if (G && !G.inRect(M.exit)) bad.push('salida');
    ok(`${mid}: desde la entrada se llega a ${NEAR} m de cada mentor, criatura, reparación, aprendiz y de la puerta de la torre, y se pisa la salida`, bad.length === 0, 'inalcanzables: ' + bad.join(','));
  }
  { const G = reachable('plaza'), open = D.plaza.portals.filter((p) => Object.prototype.hasOwnProperty.call(DIST, p.dist)), bad = G ? open.filter((p) => !G.inRect(p)).map((p) => p.dist) : ['entrada de la plaza bloqueada'];
    ok('plaza: la boca de cada portal abierto (uno por distrito registrado, M05 y M09 incluidos) se pisa desde la entrada', open.length === MIDS.length && NEW4.every((m) => open.some((p) => p.dist === m)) && bad.length === 0, open.length + ' abiertos; inalcanzables: ' + bad.join(','));
    for (const q of [D.plaza.director, D.plaza.mirror]) ok(`plaza: ${q.name} se alcanza a ${NEAR} m desde la entrada`, !!G && G.near(q.x, q.z, NEAR), q.id); }
  { const boxes = CM.boxesFor(D, 'plaza'), at = (p) => boxes.some((b) => p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ);
    const wall = D.plaza.portals.filter((p) => !DIST[p.dist]).map((p) => p.dist), closed = D.order.filter((m) => !DIST[m]);
    ok('plaza: los portales abiertos (con M05 y M09) ya no son cajas sólidas y los de ORDER sin distrito registrado (M11) sí', D.plaza.portals.filter((p) => DIST[p.dist]).every((p) => !at(p)) && wall.every((m) => at(D.plaza.portals.find((p) => p.dist === m))) && wall.join() === closed.join() && !closed.includes('M05') && !closed.includes('M09') && closed.includes('M11'), wall.join() + ' / ' + closed.join());
    ok('plaza: pisar el centro de cada portal abierto devuelve su distrito (portalAt) y el de M11 no devuelve nada', D.plaza.portals.every((p) => CM.portalAt(D, 'plaza', p.x, p.z) === (DIST[p.dist] ? p.dist : null)), D.plaza.portals.map((p) => p.dist + '=' + CM.portalAt(D, 'plaza', p.x, p.z)).join(' ')); }

  // =================== 4. sprites reales ===================
  const SPR_SRC = fs.readFileSync(path.join(root, 'city', 'sprites2d.js'), 'utf8');
  const SP = (() => { const m = { exports: {} }; vm.runInNewContext(SPR_SRC, { module: m, Math, Object, Array, Error }); const S = m.exports;
    S.init({ createElement() { const ops = []; return { width: 0, height: 0, ops, getContext() { const g = { fillStyle: '', fillRect(x, y, w, h) { ops.push([g.fillStyle, x, y, w, h]); }, clearRect() {}, drawImage() {} }; return g; } }; } }); S.setData(D); return S; })();
  const cell = (kind, v, step) => { const f = SP.frame(kind, v, 'down', step || 0); return f.img.ops.filter(([, x, y]) => x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.h).map(([c, x, y, w, h]) => [c, x - f.sx, y - f.sy, w, h]); };
  const PURPLES = ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'];
  for (const mid of NEW4) {
    const M = DIST[mid], bad = [];
    for (const c of M.creatures) for (const step of [0, 1]) {
      const ops = cell('creature', mid + ':' + c.id, step), y = step ? 1 : 0, has = (col, x, yy, w, h) => ops.some((o) => o[0] === col && o[1] === x && o[2] === yy && o[3] === w && o[4] === h);
      if (!has(M.colors.a, 2, 4 + y, 10, 7)) bad.push(c.id + ' sin cuerpo ' + M.colors.a);
      if (!has(M.colors.b, 6, 4 + y, 2, 1)) bad.push(c.id + ' sin acento ' + M.colors.b);
      if (!has('#ffffff', 4, 6 + y, 2, 2) || !has('#ffffff', 8, 6 + y, 2, 2)) bad.push(c.id + ' sin ojos blancos');
      if (!has('#12162e', 5, 7 + y, 1, 1) || !has('#12162e', 9, 7 + y, 1, 1)) bad.push(c.id + ' sin pupilas');
      if (ops.some((o) => PURPLES.includes(o[0]) || o[0] === '#ffd23f')) bad.push(c.id + ' usa el aspecto de referencia (morado/ojos amarillos)');
    }
    ok(`${mid}: las ${M.creatures.length} criaturas se pintan en sus dos cuadros con cuerpo colors.a, acento colors.b de 2 px, ojos blancos con pupila y sin colores de la referencia`, M.creatures.length === 6 && bad.length === 0, bad.slice(0, 5).join(' | '));
  }
  { const looks = [], key = (ops) => JSON.stringify(ops);
    for (const mid of MIDS) DIST[mid].creatures.forEach((c) => looks.push({ mid, id: c.id, k: key(cell('creature', mid + ':' + c.id)), shape: key(cell('creature', mid + ':' + c.id).map((o) => o.slice(1))), body: cell('creature', mid + ':' + c.id)[1][0] }));
    const same = [], sameD = [];
    for (let i = 0; i < looks.length; i++) for (let j = i + 1; j < looks.length; j++) {
      const a = looks[i], b = looks[j];
      if (a.mid === b.mid) { if (a.k === b.k) sameD.push(a.mid + ':' + a.id + '/' + b.id); continue; }
      if (a.k === b.k || (a.shape === b.shape && a.body === b.body)) same.push(a.mid + ':' + a.id + '/' + b.mid + ':' + b.id);
    }
    ok('ninguna criatura de un distrito se ve igual (misma celda, o misma forma y cuerpo) que otra de otro distrito, con los 10 distritos', same.length === 0, same.slice(0, 5).join(' | '));
    ok('ninguna criatura se ve igual que otra de su propio distrito (cada distrito tiene como mucho 6 formas distintas)', sameD.length === 0 && MIDS.every((m) => DIST[m].creatures.length <= 6), sameD.slice(0, 5).join(' | '));
    ok(`hay una fila de atlas por criatura (${looks.length}) y por persona (1 + mentores + aprendices) de los 10 distritos`, SP.kinds.creature.length === looks.length && SP.kinds.person.length === 1 + MIDS.reduce((n, m) => n + DIST[m].mentors.length + DIST[m].apprentices.length, 0), SP.kinds.creature.length + ' / ' + SP.kinds.person.length); }
  { const rows = SP.kinds.person.length, h = rows * SP.CELL;
    ok('el atlas de personas con M05 y M09 queda bajo el tope de 4 096 px (el spec calcula 282 filas = 3 948 px y 10 filas libres)', h <= 4096 && rows <= 292, rows + ' filas, ' + h + ' px'); }

  // =================== 5. el HTML trae los datos de districts.mjs ===================
  { const html = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8'), P = 'var CITY_DATA = ', s = html.indexOf(P) + P.length, e = html.indexOf(';\n', s);
    let inHtml = null; try { inHtml = JSON.parse(html.slice(s, e)); } catch (x) { /* se reporta abajo */ }
    let same = false, why = 'no se pudo leer CITY_DATA del HTML';
    if (inHtml) { try { assert.deepStrictEqual(inHtml, JSON.parse(JSON.stringify(D))); same = true; } catch (x) { why = String(x.message).split('\n').slice(0, 4).join(' ').slice(0, 300); } }
    ok('el CITY_DATA de juego_estudio.html es idéntico a city/districts.mjs (los 10 distritos); si no, falta ejecutar node build.mjs', same && Object.keys(inHtml.districts).join() === MIDS.join(), why);
    ok('el HTML construido trae a M05 y M09 con sus colores y nombres', !!inHtml && NEW4.every((m) => inHtml.districts[m] && inHtml.districts[m].colors.a === DIST[m].colors.a && inHtml.districts[m].name === DIST[m].name), ''); }

  // =================== 6. anclas de posición ===================
  // city_layout fija los 3 primeros lugares, el total (72) y el último; aquí se fija TODA la secuencia (con una huella) y dónde queda cada personaje clave de M05 y M09.
  // Cambiar el orden de streets.x, el paso o people() movería a todos los personajes y las pruebas que arman el distrito con people() (tanda4_feasibility) no lo notarían:
  // la tabla y el archivo se arman con la misma función.
  { const { standardFrame } = await imp('city/layout.mjs'), lay = standardFrame().lay, spots = []; try { for (;;) spots.push(lay.take()); } catch (e) { /* fin de lugares */ }
    const sha = require('crypto').createHash('sha1').update(JSON.stringify(spots)).digest('hex');
    ok('la secuencia completa de los 72 lugares de standardFrame().lay no cambia (huella SHA-1 fa5e497e…); es la que fija dónde está cada personaje de los 10 distritos', spots.length === 72 && sha === 'fa5e497e5f1ba60a64b76907e6eb5d186af3853b', spots.length + ' ' + sha);
    const at = (o) => o.x + ',' + o.z, M5 = DIST.M05, M9 = DIST.M09;
    ok('M05: Adela (m01) en -52,16; Patrón Forzado en 12,-12; la reparación r01 en -52,-40; Zacarías (m22) en 4,-12 y Zoe (a10, el último lugar usado, el 47.º) en -28,4',
      at(M5.mentors[0]) === '-52,16' && at(M5.creatures[0].area) === '12,-12' && at(M5.repairs[0]) === '-52,-40' && at(M5.mentors[21]) === '4,-12' && at(M5.apprentices[9]) === '-28,4' && at(spots[46]) === '-28,4',
      [M5.mentors[0], M5.creatures[0].area, M5.repairs[0], M5.mentors[21], M5.apprentices[9]].map(at).join(' | '));
    ok('M09: Anselmo (m01) en -52,16; Loro Estocástico en -12,-12; la reparación r01 en 36,-12; Wenceslao (m19) en -20,-12 y Sixto (a10, el lugar 44.º) en -28,44',
      at(M9.mentors[0]) === '-52,16' && at(M9.creatures[0].area) === '-12,-12' && at(M9.repairs[0]) === '36,-12' && at(M9.mentors[18]) === '-20,-12' && at(M9.apprentices[9]) === '-28,44' && at(spots[43]) === '-28,44',
      [M9.mentors[0], M9.creatures[0].area, M9.repairs[0], M9.mentors[18], M9.apprentices[9]].map(at).join(' | '));
    const used = (d) => d.mentors.length + d.creatures.length + d.repairs.length + d.apprentices.length;
    ok('M05 usa 47 lugares y M09 44 (quedan 25 y 28 libres de los 72), y todos sus personajes están en lugares distintos de la secuencia', used(M5) === 47 && used(M9) === 44
      && [M5, M9].every((d) => { const pts = [...d.mentors, ...d.creatures.map((c) => c.area), ...d.repairs, ...d.apprentices].map(at); return new Set(pts).size === pts.length && pts.every((q) => spots.some((sp) => at(sp) === q)); }), used(M5) + ' / ' + used(M9)); }

  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'TANDA4_DATA_GAPS FALLAS ' + fails.length : 'TANDA4_DATA_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
