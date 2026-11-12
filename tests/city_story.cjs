// Pruebas de city/story.js (lógica pura): normalizeCity, restoration, applyRestore, rankOf, apprenticesAvailable y nextObjective.
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
function rng(seed) { let a = seed >>> 0; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)); f.bool = (p = 0.5) => f() < p; f.pick = (a2) => a2[Math.floor(f() * a2.length)]; return f; }
const TODAY = '2026-11-11';
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);

(async () => {
  const CS = require('../city/story.js'), CM = require('../city/move.js');
  const { city: D } = await import(pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href);
  const M = D.districts.M02;
  const fresh = (bp = false) => CS.normalizeCity({}, D, bp, TODAY);
  const proto0 = Object.getOwnPropertyNames(Object.prototype).sort().join(',');

  // ---- normalizeCity ----
  { const C = fresh();
    ok('normalizeCity({}) es un estado vacío válido', C.prologue === false && C.run === false && C.bridgeSeen === false && Object.keys(C.taught).length === 0 && C.at.x === D.spawn.x && C.at.z === D.spawn.z); }
  { const bad = [null, [], 'x', 5, true, undefined].filter((raw) => { try { const C = CS.normalizeCity(raw, D, false, TODAY); return !(C && C.at && C.taught); } catch (e) { return true; } });
    ok('normalizeCity con city null, arreglo, texto o número no lanza y devuelve un estado válido', bad.length === 0, JSON.stringify(bad)); }
  { const raw = JSON.parse('{"taught":{"__proto__":{"a01":true},"constructor":true,"a01":true,"zz":true,"toString":true}}');
    const C = CS.normalizeCity(raw, D, false, TODAY);
    ok('normalizeCity: ids basura y __proto__ no pasan y el prototipo queda intacto', JSON.stringify(Object.keys(C.taught)) === '["a01"]' && Object.getPrototypeOf(C.taught) === Object.prototype && ({}).a01 === undefined && Object.getOwnPropertyNames(Object.prototype).sort().join(',') === proto0, JSON.stringify(C.taught)); }
  { const C = CS.normalizeCity(JSON.parse('{"__proto__":{"restored":{"M02":true},"taught":{"a01":true}}}'), D, false, TODAY);
    ok('normalizeCity: un __proto__ en la raíz no restaura nada', !C.restored.M02 && !C.taught.a01); }
  for (const [name, at, expect] of [
    ['x = "5" (cadena)', { x: '5', z: 8 }, 'spawn'], ['x = 1e308, z = NaN', { x: 1e308, z: null }, 'spawn'], ['z = []', { x: 3, z: [] }, 'spawn'],
    ['yaw = -Infinity (JSON 1e999)', JSON.parse('{"x":5,"z":8,"yaw":-1e999}'), 'yawSpawn'], ['yaw = 7.5', { x: 5, z: 8, yaw: 7.5 }, 'yawMod']]) {
    const C = CS.normalizeCity({ at }, D, false, TODAY);
    const sp = D.spawn;
    const good = expect === 'spawn' ? (C.at.x === sp.x && C.at.z === sp.z && C.at.yaw === sp.yaw)
      : expect === 'yawSpawn' ? (C.at.x === 5 && C.at.z === 8 && C.at.yaw === sp.yaw)
      : (C.at.x === 5 && Math.abs(C.at.yaw - (7.5 % (2 * Math.PI))) < 1e-9 && C.at.yaw >= 0 && C.at.yaw < 2 * Math.PI);
    ok('normalizeCity at ' + name, good, JSON.stringify(C.at)); }
  { const C = CS.normalizeCity({ at: { x: 500, z: -300, yaw: 0 } }, D, false, TODAY);
    ok('normalizeCity: at fuera del mundo se acota restando el radio', C.at.x === D.bounds.maxX - D.radius && C.at.z === D.bounds.minZ + D.radius, JSON.stringify(C.at)); }
  { const b = CM.boxesFor(D, false).find((x) => x.maxX - x.minX < 12 && x.minZ > -160 && x.minZ < -60); const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const C = CS.normalizeCity({ at: { x: cx, z: cz, yaw: 1 } }, D, false, TODAY);
    ok('normalizeCity: at dentro de un edificio vuelve al spawn', C.at.x === D.spawn.x && C.at.z === D.spawn.z, JSON.stringify(C.at)); }
  { const C = CS.normalizeCity({ beaten: { bit: '9999-99-99', eco: null, silicio: '2026-02-30', kernel: '2099-01-01', huerfano: '2026-11-10', alucina: TODAY } }, D, false, TODAY);
    ok('normalizeCity: solo fechas reales y no futuras en beaten', JSON.stringify(Object.keys(C.beaten).sort()) === '["alucina","huerfano"]', JSON.stringify(C.beaten)); }
  { const C = CS.normalizeCity({ powers: { planos: true }, restored: { M02: true } }, D, false, TODAY);
    ok('normalizeCity: restored y powers falsificados se descartan sin jefe', !C.restored.M02 && !C.powers.planos); }
  { const taught = {}; M.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
    const C = CS.normalizeCity({ taught }, D, true, TODAY), C2 = CS.normalizeCity({ taught }, D, false, TODAY);
    ok('normalizeCity: con el jefe y 8 enseñados queda restaurado con Planos; sin jefe, no', C.restored.M02 === true && C.powers.planos === true && !C2.restored.M02); }
  { const r = rng(40); const junk = ['__proto__', 'constructor', 'toString', 'a01', 'a13', '', 'bit', 'm01', 'r01'];
    let bad = 0;
    for (let i = 0; i < 400; i++) {
      const bag = () => '{' + Array.from({ length: r.int(0, 8) }, () => JSON.stringify(r.pick(junk)) + ':' + r.pick(['true', '"true"', '1', 'null', '{}', '"2026-11-10"'])).join(',') + '}';
      const raw = JSON.parse('{"taught":' + bag() + ',"beaten":' + bag() + ',"repairs":' + bag() + ',"at":{"x":' + r.pick(['"5"', '1e308', 'null', '3', '[]']) + ',"z":' + r.pick(['"x"', '-1e308', '8', '{}']) + '}}');
      const bp = r.bool(), C = CS.normalizeCity(raw, D, bp, TODAY);
      const valid = M.apprentices.filter((a) => C.taught[a.id] === true).length;
      if (!Number.isFinite(C.at.x) || !Number.isFinite(C.at.z) || typeof C.at.x !== 'number' || (C.restored.M02 && !(bp && valid >= 8)) || Object.getPrototypeOf(C.taught) !== Object.prototype || Object.keys(C.taught).some((k) => !M.apprentices.some((a) => a.id === k))) bad++;
    }
    ok('normalizeCity: 400 estados hostiles sin violar invariantes', bad === 0, 'violaciones=' + bad + ' prototipo=' + (Object.getOwnPropertyNames(Object.prototype).sort().join(',') === proto0)); }

  // ---- restoration / applyRestore / rankOf ----
  const withTaught = (n) => { const C = fresh(); M.apprentices.slice(0, n).forEach((a) => { C.taught[a.id] = true; }); return C; };
  ok('restoration: 0, 50 (8 enseñados sin jefe), 50 (jefe sin enseñados) y 100', CS.restoration(fresh(), D, false) === 0 && CS.restoration(withTaught(8), D, false) === 50 && CS.restoration(fresh(), D, true) === 50 && CS.restoration(withTaught(8), D, true) === 100);
  ok('restoration: bossPassed no booleano da un entero de 0 a 100', [undefined, 'true', null, {}, 0, 1].every((bp) => { const v = CS.restoration(fresh(), D, bp); return Number.isInteger(v) && v >= 0 && v <= 100; }));
  ok('restoration: con 12 enseñados no pasa del 100 %', CS.restoration(withTaught(12), D, true) === 100);
  { const C = withTaught(8); const a = CS.applyRestore(C, D, true), b = CS.applyRestore(C, D, true);
    ok('applyRestore: restaura una vez (changed solo la primera) y deja Planos', a.changed === true && b.changed === false && C.restored.M02 === true && C.powers.planos === true); }
  { const C = withTaught(8); C.restored = { M02: true }; C.powers = {}; const r = CS.applyRestore(C, D, true);
    ok('applyRestore: restored sin powers repone Planos (idempotente)', C.powers.planos === true && r.changed === false); }
  { const C = withTaught(2); C.restored = { M02: true }; C.powers = { planos: true }; CS.applyRestore(C, D, false);
    ok('applyRestore: sin la condición quita restored y powers', !C.restored.M02 && !C.powers.planos); }
  ok('rankOf: Becario sin restaurar y Junior con M02 restaurado', CS.rankOf(fresh(), D) === 'Becario' && CS.rankOf({ restored: { M02: true } }, D) === 'Junior');
  ok('apprenticesAvailable filtra por estrellas y por ya enseñados', (() => { const C = fresh(); C.taught[M.apprentices[0].id] = true; const av = CS.apprenticesAvailable(C, D, (t) => (t === M.apprentices[0].topic || t === M.apprentices[1].topic) ? 1 : 0); return av.length === 1 && av[0].id === M.apprentices[1].id; })());

  // ---- nextObjective ----
  const TOP = (i) => 'T' + String(i).padStart(2, '0');
  const mk = (st) => ({ learned: (t) => !!st.learned[t], stars: (t) => st.stars[t] || 0, beatenEver: (id) => own(st.beaten, id), beatenToday: (id) => st.beaten[id] === TODAY, bossUnlocked: Object.keys(st.stars).length === 23 && Object.values(st.stars).every((v) => v >= 1), bossPassed: !!st.bossPassed });
  const ST = () => ({ learned: {}, stars: {}, beaten: {}, bossPassed: false });
  const obj = (C, st) => CS.nextObjective(C, D, mk(st));
  { const C = fresh(), st = ST(); const o = obj(C, st);
    ok('nextObjective: sin prólogo → director "Habla con Iris"', o.kind === 'director' && o.label === 'Habla con Iris', JSON.stringify(o)); }
  { const C = fresh(); C.prologue = true; const st = ST(); const o = obj(C, st);
    ok('nextObjective: nada aprendido → mentor m01 "Habla con {nombre}"', o.kind === 'mentor' && o.id === 'm01' && o.label === 'Habla con ' + M.mentors[0].name, JSON.stringify(o));
    st.learned.T01 = st.learned.T02 = st.learned.T03 = true; st.stars.T01 = 1; st.stars.T03 = 1;
    const p = obj(C, st); ok('nextObjective: T02 sin estrellas → practicar con su mentor', p.kind === 'practice' && p.id === 'm02' && /^Practica con /.test(p.label), JSON.stringify(p));
    st.stars.T02 = 1; const c = obj(C, st); ok('nextObjective: grupo 1 completo menos la criatura → creature bit', c.kind === 'creature' && c.id === 'bit' && c.label === 'Enfrenta a Bit Errante', JSON.stringify(c)); }
  { const C = fresh(); C.prologue = true; const st = ST(); for (let i = 1; i <= 23; i++) { st.learned[TOP(i)] = true; st.stars[TOP(i)] = 1; } M.creatures.forEach((c) => { st.beaten[c.id] = '2026-11-01'; });
    const t = obj(C, st); ok('nextObjective: todo con 1 estrella y jefe sin aprobar → tower', t.kind === 'tower' && t.label === 'Entra a la torre', JSON.stringify(t));
    st.bossPassed = true; const r = obj(C, st); ok('nextObjective: jefe aprobado → repair "Repara el …"', r.kind === 'repair' && /^Repara el /.test(r.label), JSON.stringify(r));
    M.repairs.forEach((x) => { C.repairs[x.id] = true; }); const a = obj(C, st); ok('nextObjective: retos listos → apprentice "Enseña a …"', a.kind === 'apprentice' && /^Enseña a /.test(a.label), JSON.stringify(a));
    M.apprentices.slice(0, 7).forEach((x) => { C.taught[x.id] = true; }); st.beaten.bit = TODAY; const d = obj(C, st);
    ok('nextObjective: con 7 enseñados sigue pidiendo aprendices disponibles', d.kind === 'apprentice', JSON.stringify(d)); }
  { const C = fresh(); C.prologue = true; C.restored = { M02: true }; const st = ST(); const o = obj(C, st);
    ok('nextObjective: restaurado → bridge "Cruza el puente"', o.kind === 'bridge' && o.label === 'Cruza el puente');
    C.bridgeSeen = true; const o2 = obj(C, st); ok('nextObjective: puente visto → done "Capítulo completo"', o2.kind === 'done' && o2.label === 'Capítulo completo'); }
  { // partida simulada completa: cada criatura se pide como "nunca vencida" y el final es done
    const C = fresh(), st = ST(); const seen = []; let o, n = 0;
    const fulfil = (o) => { const m = o.id && M.mentors.find((x) => x.id === o.id);
      switch (o.kind) { case 'director': C.prologue = true; return true; case 'mentor': st.learned[m.topic] = true; return true; case 'practice': st.stars[m.topic] = 1; return true;
        case 'creature': st.beaten[o.id] = TODAY; return true; case 'repair': C.repairs[o.id] = true; return true; case 'apprentice': C.taught[o.id] = true; CS.applyRestore(C, D, st.bossPassed); return true;
        case 'tower': st.bossPassed = true; CS.applyRestore(C, D, true); return true; case 'bridge': C.bridgeSeen = true; return true; default: return false; } };
    do { o = obj(C, st); seen.push(o.kind + ':' + o.id); n++; } while (fulfil(o) && n < 500);
    const early = M.creatures.filter((c) => { const i = seen.indexOf('creature:' + c.id); return i >= 0 && seen.slice(0, i).every((k) => !k.startsWith('repair')); });
    ok('nextObjective: partida completa termina en done y pide las 6 criaturas antes de los retos', o.kind === 'done' && early.length === 6 && C.restored.M02 === true, `fin=${o.kind} pasos=${n} criaturas=${early.length}`); }
  { const r = rng(21); let bad = 0;
    for (let i = 0; i < 500; i++) {
      const C = fresh(), st = ST(); C.prologue = r.bool(0.9); const p = r.int(0, 10) / 10;
      for (let k = 1; k <= 23; k++) { st.learned[TOP(k)] = r.bool(p + 0.1); st.stars[TOP(k)] = st.learned[TOP(k)] && r.bool(p) ? r.int(1, 3) : 0; }
      M.creatures.forEach((c) => { if (r.bool(p * 0.8)) st.beaten[c.id] = r.bool() ? TODAY : '2026-11-01'; });
      M.repairs.forEach((x) => { if (r.bool(p)) C.repairs[x.id] = true; }); M.apprentices.forEach((x) => { if (st.stars[x.topic] >= 1 && r.bool(p)) C.taught[x.id] = true; });
      st.bossPassed = r.bool(0.3); const ctx = mk(st), o = CS.nextObjective(C, D, ctx), m = o.id && M.mentors.find((x) => x.id === o.id);
      if (o.kind === 'mentor' && ctx.learned(m.topic)) bad++;
      if (o.kind === 'tower' && (!ctx.bossUnlocked || ctx.bossPassed)) bad++;
      if (o.kind === 'apprentice') { const a = M.apprentices.find((x) => x.id === o.id); if (C.taught[a.id] === true || ctx.stars(a.topic) < 1) bad++; }
    }
    ok('nextObjective: 500 estados al azar nunca piden un mentor aprendido, la torre bloqueada ni un aprendiz no disponible', bad === 0, 'violaciones=' + bad); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_STORY OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
