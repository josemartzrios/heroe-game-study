// Pruebas de city/story.js (lógica pura): normalizeCity (forma por distrito, migración, listas blancas), taughtCount, restoration,
// applyRestore, rankOf, apprenticesAvailable, mirror y nextObjective (plaza y distritos).
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
  const M = D.districts.M02, M8 = D.districts.M08, P = D.plaza, MIDS = Object.keys(D.districts), SIN = D.order.find((m) => !Object.prototype.hasOwnProperty.call(D.districts, m));
  const NONE = () => false, BP = (list) => (mid) => list.indexOf(mid) >= 0;
  const fresh = (bp = NONE) => CS.normalizeCity({}, D, bp, TODAY);
  const norm = (raw, bp = NONE) => CS.normalizeCity(raw, D, bp, TODAY);
  const proto0 = Object.getOwnPropertyNames(Object.prototype).sort().join(',');
  const portal = (mid) => P.portals.find((p) => p.dist === mid);
  const keys = (o) => JSON.stringify(Object.keys(o).sort());

  // ---- forma de normalizeCity({}) ----
  { const C = fresh();
    ok('normalizeCity({}): estado vacío en la plaza, sin bridgeSeen', C.prologue === false && C.run === false && !('bridgeSeen' in C) && C.scene === 'plaza' && keys(C.tips) === '[]' && keys(C.restored) === '[]' && keys(C.powers) === '[]');
    ok('normalizeCity({}): at = entrada de la plaza', C.at.x === P.entry.x && C.at.z === P.entry.z && C.at.yaw === P.entry.yaw, JSON.stringify(C.at));
    ok('normalizeCity({}): d tiene M02 (sin route) y M08 (route.done 0), todo vacío', keys(C.d) === JSON.stringify(MIDS.slice().sort()) && ['beaten', 'repairs', 'taught'].every((k) => keys(C.d.M02[k]) === '[]' && keys(C.d.M08[k]) === '[]') && !('route' in C.d.M02) && C.d.M08.route.done === 0, JSON.stringify(C.d)); }
  { const bad = [null, [], 'x', 5, true, undefined].filter((raw) => { try { const C = norm(raw); return !(C && C.at && C.d && C.d.M02 && C.d.M08 && C.scene === 'plaza'); } catch (e) { return true; } });
    ok('normalizeCity con city null, arreglo, texto o número no lanza y devuelve un estado válido', bad.length === 0, JSON.stringify(bad)); }

  // ---- listas blancas ----
  { const raw = JSON.parse('{"d":{"M02":{"taught":{"__proto__":{"a01":true},"constructor":true,"a01":true,"zz":true,"toString":true}}}}');
    const C = norm(raw);
    ok('normalizeCity: ids basura y __proto__ no pasan y el prototipo queda intacto', keys(C.d.M02.taught) === '["a01"]' && Object.getPrototypeOf(C.d.M02.taught) === Object.prototype && ({}).a01 === undefined && Object.getOwnPropertyNames(Object.prototype).sort().join(',') === proto0); }
  { const C = norm(JSON.parse('{"__proto__":{"restored":{"M02":true},"d":{"M02":{"taught":{"a01":true}}}}}'));
    ok('normalizeCity: un __proto__ en la raíz no restaura ni enseña nada', !C.restored.M02 && !C.d.M02.taught.a01); }
  { const C = norm(JSON.parse('{"d":{"__proto__":{"taught":{"a01":true}},"M02":{}}}'));
    ok('normalizeCity: d.__proto__ se descarta (solo los distritos de los datos)', keys(C.d) === JSON.stringify(MIDS.slice().sort()) && Object.getPrototypeOf(C.d) === Object.prototype); }
  { const raw = { d: { M08: { repairs: { r09: true, r01: true }, taught: { a10: true, a09: true }, beaten: { bit: TODAY, ruido: TODAY } }, M02: { beaten: { ruido: TODAY, bit: TODAY }, repairs: { r09: true } } } };
    const C = norm(raw);
    ok('normalizeCity: ids de otro distrito o inexistentes se descartan (r09/a10/bit en M08, ruido en M02)', keys(C.d.M08.repairs) === '["r01"]' && keys(C.d.M08.taught) === '["a09"]' && keys(C.d.M08.beaten) === '["ruido"]' && keys(C.d.M02.beaten) === '["bit"]' && keys(C.d.M02.repairs) === '["r09"]', JSON.stringify(C.d)); }
  { const C = norm({ d: { M02: { route: { done: 5 } } } });
    ok('normalizeCity: d.M02 no tiene route y d.M08.route.done parte de 0', !('route' in C.d.M02) && C.d.M08.route.done === 0); }
  { const C = norm(JSON.parse('{"tips":{"__proto__":{"talk":true},"talk":"true","x":true,"star":true,"portals":1}}')), C2 = norm({ tips: { talk: true, tower: true, nada: true } });
    ok('normalizeCity: tips solo con los 6 ids y true estricto', keys(C.tips) === '["star"]' && keys(C2.tips) === '["talk","tower"]' && JSON.stringify(CS.TIP_IDS) === '["talk","star","creature","repair","tower","portals"]', JSON.stringify([C.tips, C2.tips])); }
  { const bad = [];
    for (const v of [NaN, '3', 3.7, -1, Infinity, -Infinity, -0, null, undefined, {}, [], true]) { const C = norm({ d: { M08: { route: { done: v } } } }); if (!Object.is(C.d.M08.route.done, 0)) bad.push(String(v) + '→' + C.d.M08.route.done); }
    for (const v of [5, null, 'x', [], 0]) { const C = norm({ d: { M08: { route: v } } }); if (!Object.is(C.d.M08.route.done, 0)) bad.push('route=' + JSON.stringify(v)); }
    const n = M8.route.stations.length;
    ok('normalizeCity: route.done inválido (NaN, "3", 3.7, -1, Infinity, -0, route no objeto) → 0', bad.length === 0, bad.join(' | '));
    ok('normalizeCity: route.done 10 → 10 y 99 → 10 (recorta al número de estaciones)', n === 10 && norm({ d: { M08: { route: { done: 10 } } } }).d.M08.route.done === 10 && norm({ d: { M08: { route: { done: 99 } } } }).d.M08.route.done === 10 && norm({ d: { M08: { route: { done: 4 } } } }).d.M08.route.done === 4); }
  { const C = norm({ beaten: { bit: '9999-99-99', eco: null, silicio: '2026-02-30', kernel: '2099-01-01', huerfano: '2026-11-10', alucina: TODAY } });
    ok('normalizeCity: solo fechas reales y no futuras en beaten', keys(C.d.M02.beaten) === '["alucina","huerfano"]', JSON.stringify(C.d.M02.beaten)); }

  // ---- posición y escena ----
  const r0 = D.radius;
  for (const [name, at, expect] of [
    ['x = "5" (cadena)', { x: '5', z: 8 }, 'entry'], ['x = 1e308, z = NaN', { x: 1e308, z: null }, 'entry'], ['z = []', { x: 3, z: [] }, 'entry'],
    ['yaw = -Infinity (JSON 1e999)', JSON.parse('{"x":5,"z":8,"yaw":-1e999}'), 'yawEntry'], ['yaw = 7.5', { x: 5, z: 8, yaw: 7.5 }, 'yawMod']]) {
    const C = norm({ at }), e = P.entry;
    const good = expect === 'entry' ? (C.scene === 'plaza' && C.at.x === e.x && C.at.z === e.z && C.at.yaw === e.yaw)
      : expect === 'yawEntry' ? (C.at.x === 5 && C.at.z === 8 && C.at.yaw === e.yaw)
      : (C.at.x === 5 && Math.abs(C.at.yaw - (7.5 % (2 * Math.PI))) < 1e-9 && C.at.yaw >= 0 && C.at.yaw < 2 * Math.PI);
    ok('normalizeCity at ' + name, good, JSON.stringify(C.at)); }
  { const C = norm({ at: { x: 500, z: -300, yaw: 0 } });
    ok('normalizeCity: at fuera del mundo se acota a los bounds de la escena restando el radio', C.scene === 'plaza' && C.at.x === P.bounds.maxX - r0 && C.at.z === P.bounds.minZ + r0, JSON.stringify(C.at)); }
  { const s0 = M.mentors[0];
    const C = norm({ at: { x: s0.x, z: s0.z, yaw: 1 } });
    ok('migración: at dentro del distrito antiguo → scene M02 con las mismas coordenadas', C.scene === 'M02' && C.at.x === s0.x && C.at.z === s0.z && C.at.yaw === 1, JSON.stringify(C)); }
  { const C = norm({ at: { x: 20, z: -46, yaw: 0 } });
    ok('migración: z = -46 (franja -50..-44 que el rect viejo no tenía) → M02', C.scene === 'M02' && C.at.x === 20 && C.at.z === -46, JSON.stringify(C.at)); }
  { const C = norm({ at: { x: 65, z: -100, yaw: 0 } }), C2 = norm({ at: { x: 20, z: -190, yaw: 0 } });
    ok('migración: x = 65 y z = -190 se acotan a los bounds de M02 menos el radio', C.scene === 'M02' && C.at.x === M.bounds.maxX - r0 && C2.scene === 'M02' && C2.at.z === M.bounds.minZ + r0, JSON.stringify([C.at, C2.at])); }
  { const p = portal('M02'), C = norm({ at: { x: 0, z: -38, yaw: 2 } });
    ok('migración: at en la calle vieja (0, -38) cae en el portal M02 → back del portal', C.scene === 'plaza' && C.at.x === p.back.x && C.at.z === p.back.z && C.at.yaw === p.back.yaw, JSON.stringify(C.at)); }
  { const C = norm({ at: { x: 20, z: 10, yaw: 1 } });
    ok('migración: at en la plaza vieja → plaza con las mismas coordenadas', C.scene === 'plaza' && C.at.x === 20 && C.at.z === 10 && C.at.yaw === 1, JSON.stringify(C)); }
  { const C = norm({ at: { x: 0, z: -14, yaw: 1 } });
    ok('normalizeCity: at dentro de la sede vuelve a la entrada de la plaza', C.scene === 'plaza' && C.at.x === P.entry.x && C.at.z === P.entry.z, JSON.stringify(C.at)); }
  { const b = CM.boxesFor(D, 'M02').find((x) => x.maxX - x.minX < 12 && x.minZ > -160 && x.minZ < -60), cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    const C = norm({ at: { x: cx, z: cz, yaw: 1 } }), C2 = norm({ scene: 'M02', at: { x: cx, z: cz, yaw: 1 } });
    ok('normalizeCity: at dentro de un edificio de M02 vuelve a la entrada de M02', C.scene === 'M02' && C.at.x === M.entry.x && C.at.z === M.entry.z && C.at.yaw === M.entry.yaw && C2.scene === 'M02' && C2.at.x === M.entry.x && C2.at.z === M.entry.z, JSON.stringify([C.at, C2.at])); }
  { const C = norm({ scene: 'M02', at: { x: M.exit.x, z: M.exit.z, yaw: 1 } }), C2 = norm({ scene: 'M08', at: { x: M8.exit.x, z: M8.exit.z, yaw: 1 } });
    ok('normalizeCity: at en la salida de un distrito vuelve a su entrada', C.scene === 'M02' && C.at.x === M.entry.x && C.at.z === M.entry.z && C2.scene === 'M08' && C2.at.x === M8.entry.x && C2.at.z === M8.entry.z, JSON.stringify([C.at, C2.at])); }
  { const p = portal('M08'), C = norm({ scene: 'plaza', at: { x: p.x, z: p.z, yaw: 0 } }), w = portal(SIN), C2 = norm({ scene: 'plaza', at: { x: w.x, z: w.z, yaw: 0 } });
    ok('normalizeCity: at en la boca de un portal → back; en un muro "Próximamente" → entrada de la plaza', C.at.x === p.back.x && C.at.z === p.back.z && C2.at.x === P.entry.x && C2.at.z === P.entry.z, JSON.stringify([C.at, C2.at])); }
  { const s8 = M8.mentors[0], C = norm({ scene: 'M08', at: { x: s8.x, z: s8.z, yaw: 1 } });
    ok('normalizeCity: con scene válida se usa su propia escena (no el rect viejo)', C.scene === 'M08' && C.at.x === s8.x && C.at.z === s8.z, JSON.stringify(C)); }
  { const C = norm({ scene: 'plaza', at: { x: 0, z: -100, yaw: 0 } });
    ok('normalizeCity: scene "plaza" presente no aplica LEGACY_M02_RECT (se acota a la plaza)', C.scene === 'plaza' && C.at.z === P.bounds.minZ + r0, JSON.stringify(C.at)); }
  { const s0 = M.mentors[0], bad = [];
    for (const sc of ['__proto__', 'constructor', 'toString', 'M99', 'm02', '', 5, null, [], {}, true]) { const C = norm({ scene: sc, at: { x: s0.x, z: s0.z, yaw: 1 } }); if (!(C.scene === 'plaza' && C.at.x === P.entry.x && C.at.z === P.entry.z)) bad.push(String(sc) + '→' + C.scene + JSON.stringify(C.at)); }
    ok('normalizeCity: scene desconocida (__proto__, constructor, toString, M99…) → plaza en su entrada', bad.length === 0, bad.join(' | ')); }
  ok('LEGACY_M02_RECT cubre lo que el mundo viejo aceptaba al norte de la plaza', CS.LEGACY_M02_RECT.minX === -70 && CS.LEGACY_M02_RECT.maxX === 70 && CS.LEGACY_M02_RECT.minZ === -195 && CS.LEGACY_M02_RECT.maxZ === -44);

  // ---- migración de d y de los campos planos ----
  { const C = norm({ prologue: true, run: true, bridgeSeen: true, beaten: { bit: '2026-11-10' }, repairs: { r01: true }, taught: { a01: true } });
    ok('migración: campos planos → d.M02; bridgeSeen se descarta; M08 vacío', C.prologue === true && C.run === true && !('bridgeSeen' in C) && keys(C.d.M02.beaten) === '["bit"]' && keys(C.d.M02.repairs) === '["r01"]' && keys(C.d.M02.taught) === '["a01"]' && keys(C.d.M08.taught) === '[]'); }
  { const C = norm({ beaten: { bit: '2026-11-10' }, d: { M02: { beaten: { eco: '2026-11-09' } } } });
    ok('migración: d (objeto plano) gana sobre los campos planos', keys(C.d.M02.beaten) === '["eco"]', JSON.stringify(C.d.M02.beaten)); }
  { const C = norm({ taught: { a01: true }, d: { M08: { taught: { a01: true } } } }), C2 = norm({ taught: { a01: true }, d: { M02: null } });
    ok('migración: d sin M02 o con M02 null → d.M02 vacío (no se rellena desde los planos)', keys(C.d.M02.taught) === '[]' && keys(C.d.M08.taught) === '["a01"]' && keys(C2.d.M02.taught) === '[]'); }
  { const bad = [null, [], 'x', 5, true].filter((d) => { const C = norm({ taught: { a01: true }, d }); return keys(C.d.M02.taught) !== '["a01"]'; });
    ok('migración: d null, arreglo, texto o número cuenta como "sin d" y migra desde los planos', bad.length === 0, JSON.stringify(bad)); }
  { const taught = {}; M.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
    const C = norm({ scene: 'M02', at: { x: M.mentors[0].x, z: M.mentors[0].z }, d: { M02: { taught } } }, BP(['M02']));
    ok('guardado de una partida con M02 restaurado se conserva (restored, powers, rango Junior)', C.restored.M02 === true && C.powers.planos === true && CS.rankOf(C, D) === 'Junior'); }

  // ---- restauración por distrito ----
  { const C = norm({ powers: { planos: true }, restored: { M02: true } });
    ok('normalizeCity: restored y powers falsificados se descartan sin jefe', !C.restored.M02 && !C.powers.planos); }
  { const taught = {}; M.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
    const C = norm({ d: { M02: { taught } } }, BP(['M02'])), C2 = norm({ d: { M02: { taught } } });
    ok('normalizeCity: con el jefe y 8 enseñados M02 queda restaurado con Planos; sin jefe, no', C.restored.M02 === true && C.powers.planos === true && !C2.restored.M02); }
  { const taught = {}; M8.apprentices.slice(0, 6).forEach((a) => { taught[a.id] = true; });
    const C = norm({ d: { M08: { taught, route: { done: 0 } } } }, BP(['M08']));
    ok('normalizeCity: M08 con jefe y 6 enseñados queda restaurado aunque route.done sea 0; no da poder', C.restored.M08 === true && !C.restored.M02 && keys(C.powers) === '[]', JSON.stringify([C.restored, C.powers])); }
  { const tm = {}, t8 = {}; M.apprentices.slice(0, 8).forEach((a) => { tm[a.id] = true; }); M8.apprentices.slice(0, 6).forEach((a) => { t8[a.id] = true; });
    const C = norm({ d: { M02: { taught: tm }, M08: { taught: t8 } } }, BP(['M02', 'M08']));
    ok('normalizeCity: con los dos distritos restaurados, powers = solo planos y rango Junior', C.restored.M02 === true && C.restored.M08 === true && keys(C.powers) === '["planos"]' && CS.rankOf(C, D) === 'Junior'); }
  { const calls = [];
    norm({ d: { M02: { taught: { a01: true } } } }, (mid) => { calls.push(mid); return false; });
    ok('normalizeCity: bossPassedOf solo se llama con claves de D.districts', calls.length > 0 && calls.every((m) => own(D.districts, m)), JSON.stringify(calls)); }
  { const taught = {}; M.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
    const bad = [];
    for (const [name, f] of [['true (no función)', true], ['texto', 'x'], ['undefined', undefined], ['lanza', () => { throw new Error('x'); }], ['devuelve "true"', () => 'true'], ['devuelve 1', () => 1]]) {
      let C; try { C = norm({ d: { M02: { taught } } }, f); } catch (e) { bad.push(name + ' lanzó'); continue; }
      if (C.restored.M02) bad.push(name + ' restauró');
    }
    ok('normalizeCity: bossPassedOf no función, que lanza o que no devuelve true → sin restaurar y sin lanzar', bad.length === 0, bad.join(' | ')); }
  { const r = rng(40); const junk = ['__proto__', 'constructor', 'toString', 'a01', 'a13', '', 'bit', 'ruido', 'm01', 'r01', 'r09'];
    let bad = 0;
    for (let i = 0; i < 400; i++) {
      const bag = () => '{' + Array.from({ length: r.int(0, 8) }, () => JSON.stringify(r.pick(junk)) + ':' + r.pick(['true', '"true"', '1', 'null', '{}', '"2026-11-10"'])).join(',') + '}';
      const dm = () => '{"taught":' + bag() + ',"beaten":' + bag() + ',"repairs":' + bag() + ',"route":{"done":' + r.pick(['3', '"3"', '-1', '99', 'null', '3.5']) + '}}';
      const raw = JSON.parse('{"scene":' + JSON.stringify(r.pick(['plaza', 'M02', 'M08', '__proto__', 'M99', 5])) + ',"d":{"M02":' + dm() + ',"M08":' + dm() + ',"__proto__":' + dm() + '},"at":{"x":' + r.pick(['"5"', '1e308', 'null', '3', '-40', '0', '55']) + ',"z":' + r.pick(['"x"', '-1e308', '8', '{}', '-100', '-48', '20']) + '}}');
      const bp = r.bool(), C = norm(raw, bp ? () => true : NONE);
      const sc = CM.scene(D, C.scene);
      const taughtOk = MIDS.every((mid) => Object.keys(C.d[mid].taught).every((k) => D.districts[mid].apprentices.some((a) => a.id === k)));
      const restoredOk = MIDS.every((mid) => !C.restored[mid] || (bp && CS.taughtCount(C, D, mid) >= D.districts[mid].need));
      const inB = sc && C.at.x >= sc.bounds.minX && C.at.x <= sc.bounds.maxX && C.at.z >= sc.bounds.minZ && C.at.z <= sc.bounds.maxZ;
      const doneOk = Number.isInteger(C.d.M08.route.done) && C.d.M08.route.done >= 0 && C.d.M08.route.done <= M8.route.stations.length && !('route' in C.d.M02);
      if (!sc || !inB || !Number.isFinite(C.at.x) || !Number.isFinite(C.at.z) || !taughtOk || !restoredOk || !doneOk || Object.getPrototypeOf(C.d) !== Object.prototype || Object.keys(C.d).join() !== MIDS.join()) bad++;
    }
    ok('normalizeCity: 400 estados hostiles sin violar invariantes', bad === 0, 'violaciones=' + bad + ' prototipo=' + (Object.getOwnPropertyNames(Object.prototype).sort().join(',') === proto0)); }
  { const C = fresh();
    ok('normalizeCity es idempotente sobre su propia salida (JSON ida y vuelta)', JSON.stringify(norm(JSON.parse(JSON.stringify(C)))) === JSON.stringify(C)); }

  // ---- restoration / applyRestore / rankOf / taughtCount ----
  const withTaught = (n, mid = 'M02') => { const C = fresh(); D.districts[mid].apprentices.slice(0, n).forEach((a) => { C.d[mid].taught[a.id] = true; }); return C; };
  ok('taughtCount cuenta por distrito', CS.taughtCount(withTaught(3), D, 'M02') === 3 && CS.taughtCount(withTaught(3), D, 'M08') === 0 && CS.taughtCount(withTaught(4, 'M08'), D, 'M08') === 4);
  ok('restoration M02: 0, 50 (8 enseñados sin jefe), 50 (jefe sin enseñados) y 100', CS.restoration(fresh(), D, 'M02', false) === 0 && CS.restoration(withTaught(8), D, 'M02', false) === 50 && CS.restoration(fresh(), D, 'M02', true) === 50 && CS.restoration(withTaught(8), D, 'M02', true) === 100);
  ok('restoration M08: need 6 → 3 enseñados sin jefe = 25 %, 6 con jefe = 100 %', CS.restoration(withTaught(3, 'M08'), D, 'M08', false) === 25 && CS.restoration(withTaught(6, 'M08'), D, 'M08', true) === 100);
  ok('restoration: bossPassed no booleano da un entero de 0 a 100', [undefined, 'true', null, {}, 0, 1].every((bp) => { const v = CS.restoration(fresh(), D, 'M02', bp); return Number.isInteger(v) && v >= 0 && v <= 100; }));
  ok('restoration: con 12 enseñados no pasa del 100 %', CS.restoration(withTaught(12), D, 'M02', true) === 100);
  { const C = withTaught(8); const a = CS.applyRestore(C, D, BP(['M02'])), b = CS.applyRestore(C, D, BP(['M02']));
    ok('applyRestore: restaura una vez (changed lista solo la primera) y deja Planos', JSON.stringify(a.changed) === '["M02"]' && b.changed.length === 0 && C.restored.M02 === true && C.powers.planos === true); }
  { const C = withTaught(8); C.restored = { M02: true }; C.powers = {}; const r = CS.applyRestore(C, D, BP(['M02']));
    ok('applyRestore: restored sin powers repone Planos (idempotente)', C.powers.planos === true && r.changed.length === 0); }
  { const C = withTaught(2); C.restored = { M02: true }; C.powers = { planos: true }; CS.applyRestore(C, D, NONE);
    ok('applyRestore: sin la condición quita restored y powers', !C.restored.M02 && !C.powers.planos); }
  { const C = withTaught(8); M8.apprentices.slice(0, 6).forEach((a) => { C.d.M08.taught[a.id] = true; });
    const r = CS.applyRestore(C, D, BP(['M02', 'M08']));
    ok('applyRestore: dos distritos a la vez → changed en el orden de D.districts y M08 sin poder', JSON.stringify(r.changed) === '["M02","M08"]' && C.restored.M08 === true && keys(C.powers) === '["planos"]', JSON.stringify([r, C.powers])); }
  { const C = withTaught(8); C.restored = 5; C.powers = null; CS.applyRestore(C, D, BP(['M02']));
    ok('applyRestore: restored o powers corruptos se reponen como objetos', C.restored.M02 === true && C.powers.planos === true); }
  ok('rankOf: 0 → Becario, 1 → Junior, 2 → Junior', CS.rankOf(fresh(), D) === 'Becario' && CS.rankOf({ restored: { M02: true } }, D) === 'Junior' && CS.rankOf({ restored: { M02: true, M08: true } }, D) === 'Junior');
  ok('rankOf ignora las claves heredadas de Object.prototype (solo cuentan las propias)', (() => { const ids = ['M08', 'M03', 'M01']; ids.forEach((m) => { Object.prototype[m] = true; }); try { const C = fresh(); C.restored = { M02: true }; return CS.rankOf(C, D) === D.ranks[1][1]; } finally { ids.forEach((m) => { delete Object.prototype[m]; }); } })());
  ok('apprenticesAvailable filtra por estrellas y por ya enseñados, por distrito', (() => { const C = fresh(); C.d.M02.taught[M.apprentices[0].id] = true; const av = CS.apprenticesAvailable(C, D, 'M02', (t) => (t === M.apprentices[0].topic || t === M.apprentices[1].topic) ? 1 : 0); const av8 = CS.apprenticesAvailable(C, D, 'M08', () => 1); return av.length === 1 && av[0].id === M.apprentices[1].id && av8.length === 9; })());
  { const C = withTaught(3); C.d.M02.beaten.bit = '2026-11-10'; C.d.M02.repairs.r01 = true; CS.mirror(C);
    ok('mirror: copia d.M02 a los campos planos (copias, no la misma referencia)', JSON.stringify(C.taught) === JSON.stringify(C.d.M02.taught) && C.taught !== C.d.M02.taught && C.beaten.bit === '2026-11-10' && C.repairs.r01 === true && C.repairs !== C.d.M02.repairs);
    C.taught.zzz = true; ok('mirror: cambiar el espejo no toca d.M02', !('zzz' in C.d.M02.taught)); }

  // ---- nextObjective ----
  const TOP = (i) => 'T' + String(i).padStart(2, '0');
  const mk = (st, n) => ({ learned: (t) => !!st.learned[t], stars: (t) => st.stars[t] || 0, beatenEver: (id) => own(st.beaten, id), beatenToday: (id) => st.beaten[id] === TODAY,
    bossUnlocked: Array.from({ length: n }, (_, i) => st.stars[TOP(i + 1)] >= 1).every(Boolean), bossPassed: st.bossPassed });
  const ST = () => ({ learned: {}, stars: {}, beaten: {}, bossPassed: false });
  const obj = (C, st, sc = 'M02') => CS.nextObjective(C, D, sc, mk(st, D.districts[sc].mentors.length));
  const objPlaza = (C) => CS.nextObjective(C, D, 'plaza', mk(ST(), 23));
  { const o = objPlaza(fresh());
    ok('nextObjective plaza: sin prólogo → director "Habla con Iris"', o.kind === 'director' && o.id === 'iris' && o.label === 'Habla con Iris', JSON.stringify(o)); }
  { const C = fresh(); C.prologue = true; const o = objPlaza(C);
    ok('nextObjective plaza: portal del primer distrito sin restaurar → "Entra a Taller Comunal"', o.kind === 'portal' && o.id === 'M02' && o.label === 'Entra a Taller Comunal', JSON.stringify(o));
    C.restored.M02 = true; const o2 = objPlaza(C);
    ok('nextObjective plaza: con M02 restaurado → "Entra a Nodo Enlace"', o2.kind === 'portal' && o2.id === 'M08' && o2.label === 'Entra a Nodo Enlace', JSON.stringify(o2));
    MIDS.forEach((m) => { C.restored[m] = true; }); const o3 = objPlaza(C);
    ok('nextObjective plaza: con todos restaurados → "Ciudad al día: más distritos pronto"', o3.kind === 'none' && o3.id === null && o3.label === 'Ciudad al día: más distritos pronto', JSON.stringify(o3));
    const C4 = fresh(); C4.prologue = true; C4.restored.M08 = true; ok('nextObjective plaza: sigue el orden ORDER aunque M08 ya esté restaurado (M02 primero)', objPlaza(C4).id === 'M02'); }
  { const C = fresh(); C.prologue = true; const st = ST(); const o = obj(C, st);
    ok('nextObjective M02: nada aprendido → mentor m01 "Habla con {nombre}"', o.kind === 'mentor' && o.id === 'm01' && o.label === 'Habla con ' + M.mentors[0].name, JSON.stringify(o));
    st.learned.T01 = st.learned.T02 = st.learned.T03 = true; st.stars.T01 = 1; st.stars.T03 = 1;
    const p = obj(C, st); ok('nextObjective M02: T02 sin estrellas → practicar con su mentor', p.kind === 'practice' && p.id === 'm02' && /^Practica con /.test(p.label), JSON.stringify(p));
    st.stars.T02 = 1; const c = obj(C, st); ok('nextObjective M02: grupo 1 completo menos la criatura → creature bit', c.kind === 'creature' && c.id === 'bit' && c.label === 'Enfrenta a Bit Errante', JSON.stringify(c)); }
  { const C = fresh(); C.prologue = true; const st = ST(); for (let i = 1; i <= 23; i++) { st.learned[TOP(i)] = true; st.stars[TOP(i)] = 1; } M.creatures.forEach((c) => { st.beaten[c.id] = '2026-11-01'; });
    const t = obj(C, st); ok('nextObjective M02: todo con 1 estrella y jefe sin aprobar → tower', t.kind === 'tower' && t.label === 'Entra a la torre', JSON.stringify(t));
    st.bossPassed = true; const r = obj(C, st); ok('nextObjective M02: jefe aprobado → repair "Repara el semáforo"', r.kind === 'repair' && r.id === 'r01' && r.label === 'Repara el semáforo', JSON.stringify(r));
    M.repairs.forEach((x) => { C.d.M02.repairs[x.id] = true; }); const a = obj(C, st); ok('nextObjective M02: retos listos → apprentice "Enseña a …"', a.kind === 'apprentice' && /^Enseña a /.test(a.label), JSON.stringify(a));
    M.apprentices.slice(0, 7).forEach((x) => { C.d.M02.taught[x.id] = true; }); st.beaten.bit = TODAY; const d = obj(C, st);
    ok('nextObjective M02: con 7 enseñados sigue pidiendo aprendices disponibles', d.kind === 'apprentice', JSON.stringify(d)); }
  { const C = fresh(); C.prologue = true; C.restored = { M02: true }; const st = ST(); const o = obj(C, st);
    ok('nextObjective M02: restaurado → plaza "Vuelve a la plaza"', o.kind === 'plaza' && o.id === 'exit' && o.label === 'Vuelve a la plaza', JSON.stringify(o)); }
  { const C = fresh(); C.prologue = true; const st = ST(); for (let i = 1; i <= 15; i++) { st.learned[TOP(i)] = true; st.stars[TOP(i)] = 1; } M8.creatures.forEach((c) => { st.beaten[c.id] = '2026-11-01'; });
    C.d.M08.route.done = 3;
    const t = obj(C, st, 'M08'); ok('nextObjective M08: con el jefe sin aprobar sigue la torre (antes que la ruta)', t.kind === 'tower', JSON.stringify(t));
    st.bossPassed = true; const r = obj(C, st, 'M08');
    ok('nextObjective M08: jefe aprobado y done 3 → ruta "estación 4 de 10" (id pad3)', r.kind === 'route' && r.id === 'pad3' && r.label === 'Ruta del paquete · estación 4 de 10', JSON.stringify(r));
    C.d.M08.route.done = 10; const r2 = obj(C, st, 'M08');
    ok('nextObjective M08: ruta completa → sigue con las reparaciones "Repara el cable cortado"', r2.kind === 'repair' && r2.id === 'r01' && r2.label === 'Repara el cable cortado', JSON.stringify(r2));
    const C3 = fresh(); C3.prologue = true; const r3 = obj(C3, ST(), 'M08');
    ok('nextObjective M08: nada aprendido → mentor m01 Alma (la ruta no aparece antes que las criaturas)', r3.kind === 'mentor' && r3.id === 'm01' && r3.label === 'Habla con Alma', JSON.stringify(r3)); }
  { // partida simulada completa en los dos distritos: la plaza lleva a cada distrito y el final es "none"
    const C = fresh(), sts = Object.fromEntries(MIDS.map((m) => [m, ST()])); let scene = 'plaza'; const seen = []; let o, n = 0;
    const fulfil = (o) => { const Md = D.districts[scene], m = o.id && Md && Md.mentors.find((x) => x.id === o.id), st = sts[scene];
      switch (o.kind) { case 'director': C.prologue = true; return true; case 'portal': scene = o.id; return true; case 'plaza': scene = 'plaza'; return true;
        case 'mentor': st.learned[m.topic] = true; return true; case 'practice': st.stars[m.topic] = 1; return true; case 'creature': st.beaten[o.id] = TODAY; return true;
        case 'repair': C.d[scene].repairs[o.id] = true; return true; case 'route': C.d[scene].route.done++; return true;
        case 'apprentice': C.d[scene].taught[o.id] = true; CS.applyRestore(C, D, (mid) => !!sts[mid].bossPassed); return true;
        case 'tower': st.bossPassed = true; CS.applyRestore(C, D, (mid) => !!sts[mid].bossPassed); return true; default: return false; } };
    do { o = scene === 'plaza' ? CS.nextObjective(C, D, 'plaza', mk(ST(), 23)) : CS.nextObjective(C, D, scene, mk(sts[scene], D.districts[scene].mentors.length)); seen.push(scene + ':' + o.kind + ':' + o.id); n++; } while (fulfil(o) && n < 1000);
    const early = (mid) => D.districts[mid].creatures.filter((c) => { const i = seen.indexOf(mid + ':creature:' + c.id); return i >= 0 && seen.slice(0, i).every((k) => !k.startsWith(mid + ':repair')); }).length;
    ok('nextObjective: partida completa en todos los distritos termina en "none", restaura todos, pasa por la ruta y pide las criaturas antes de los retos', o.kind === 'none' && MIDS.every((m) => C.restored[m] === true) && C.d.M08.route.done === 10 && early('M02') === 6 && early('M08') === 5, `fin=${o.kind} pasos=${n} M02=${early('M02')} M08=${early('M08')} done=${C.d.M08.route.done}`); }
  { const r = rng(21); let bad = 0;
    for (const [sc, nTop] of MIDS.map((m) => [m, D.districts[m].mentors.length])) for (let i = 0; i < 250; i++) {
      const C = fresh(), st = ST(), Md = D.districts[sc]; C.prologue = r.bool(0.9); const p = r.int(0, 10) / 10;
      for (let k = 1; k <= nTop; k++) { st.learned[TOP(k)] = r.bool(p + 0.1); st.stars[TOP(k)] = st.learned[TOP(k)] && r.bool(p) ? r.int(1, 3) : 0; }
      Md.creatures.forEach((c) => { if (r.bool(p * 0.8)) st.beaten[c.id] = r.bool() ? TODAY : '2026-11-01'; });
      Md.repairs.forEach((x) => { if (r.bool(p)) C.d[sc].repairs[x.id] = true; }); Md.apprentices.forEach((x) => { if (st.stars[x.topic] >= 1 && r.bool(p)) C.d[sc].taught[x.id] = true; });
      if (Md.route) C.d[sc].route.done = r.int(0, 10);
      st.bossPassed = r.bool(0.3); const ctx = mk(st, nTop), o = CS.nextObjective(C, D, sc, ctx), m = o.id && Md.mentors.find((x) => x.id === o.id);
      if (o.kind === 'mentor' && ctx.learned(m.topic)) bad++;
      if (o.kind === 'tower' && (!ctx.bossUnlocked || ctx.bossPassed)) bad++;
      if (o.kind === 'apprentice') { const a = Md.apprentices.find((x) => x.id === o.id); if (C.d[sc].taught[a.id] === true || ctx.stars(a.topic) < 1) bad++; }
      if (o.kind === 'route' && (!Md.route || C.d[sc].route.done >= Md.route.stations.length || o.id !== 'pad' + C.d[sc].route.done)) bad++;
    }
    ok('nextObjective: 500 estados al azar en M02 y M08 nunca piden un mentor aprendido, la torre bloqueada, un aprendiz no disponible ni una ruta inválida', bad === 0, 'violaciones=' + bad); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_STORY OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
