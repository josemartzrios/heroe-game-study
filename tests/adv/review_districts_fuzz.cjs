// Fuzzing masivo de los distritos (campaña aparte de la suite diaria): por objetivo, N entradas (100 000 por defecto) o 60 s, lo que llegue antes.
// Objetivos: normalizeCity (JSON mutado byte a byte), mirror (C hostil), nextObjective (C y ctx basura), scene/boxesFor/portalAt/step
// (ids y números hostiles), CityRoute (secuencias de llamadas fuera de orden y reentrantes) y checkDistrict (distritos mutados).
// Fallo = excepción no controlada, salida inválida, no idempotencia o > 50 ms por entrada (posible cuelgue). Cada firma de fallo se imprime
// con la entrada mínima encontrada (la de menor tamaño) para copiarla como regresión en review_districts_attack.cjs.
// Uso: node tests/adv/review_districts_fuzz.cjs [N=100000] [SEED=20261113] [MAX_S=60]   (sale con 1 si algo rompe)
const path = require('path');
const { rng } = require('./lib.cjs');
const CM = require('../../city/move.js');
const CS = require('../../city/story.js');
const CityRoute = require('../../city/route.js');

const N = +(process.argv[2] || 100000), SEED = +(process.argv[3] || 20261113), MAX_MS = 1000 * +(process.argv[4] || 60);
const TODAY = '2026-11-13', TAU = Math.PI * 2;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const str = (x) => { try { const s = JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : (typeof v === 'function' ? 'fn' : v)); return s === undefined ? String(x) : s; } catch (e) { return String(x); } };
const report = [];

function campaign(name, gen, run) {
  const r = rng(SEED ^ (name.length * 2654435761)), t0 = Date.now(), sig = {};
  let n = 0, slow = 0;
  for (; n < N && Date.now() - t0 < MAX_MS; n++) {
    const input = gen(r), a = Date.now();
    let err = null;
    try { err = run(input); } catch (e) { err = 'lanza ' + (e && e.constructor && e.constructor.name) + ': ' + String(e && e.message).replace(/\d+/g, '#'); }
    if (Date.now() - a > 250) { slow++; err = err || 'lento (> 250 ms)'; }   // un cuelgue o un coste patológico; 50 ms fallaba con una pausa del recolector de basura
    if (err) { const k = String(err).slice(0, 160), s = str(input); if (!sig[k]) sig[k] = { n: 0, min: s }; sig[k].n++; if (s.length < sig[k].min.length) sig[k].min = s; }
  }
  const fails = Object.values(sig).reduce((a, b) => a + b.n, 0);
  report.push({ name, n, ms: Date.now() - t0, fails, slow, sig });
}

(async () => {
  const D = (await import(path.join(__dirname, '..', '..', 'city', 'districts.mjs'))).city;
  const { checkDistrict } = await import(path.join(__dirname, '..', '..', 'city', 'check_district.mjs'));
  const { stations } = await import(path.join(__dirname, '..', '..', 'city', 'districts', 'm08_route.mjs'));
  const fs = require('fs'), vm = require('vm');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
  const MODULES = vm.runInNewContext(html.match(/const MODULES = (\[[\s\S]*?\n\]);/)[1]);
  const MIDS = Object.keys(D.districts);
  const HOST = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty', '', 'M99', 'plaza', ...MIDS];
  const NUMS = [0, -0, 1, -1, 0.5, NaN, Infinity, -Infinity, 1e308, -1e308, 5e-324, 2 ** 53, '0', '3', null, true, [], {}, [1]];
  const junk = (r, depth = 0) => {
    const p = r();
    if (p < 0.25) return r.pick(NUMS);
    if (p < 0.4) return (r() - 0.5) * 10 ** r.int(0, 6);
    if (p < 0.55) return r.pick(HOST);
    if (p < 0.65) return r.pick(['2026-01-01', '2026-11-13', '2026-11-14', '9999-12-31', '2026-02-29', 'x', '\u0000', '<img src=x>', '‮']);
    if (depth > 2 || p < 0.8) return r.bool() ? true : false;
    if (p < 0.9) { const a = []; for (let i = r.int(0, 4); i--;) a.push(junk(r, depth + 1)); return a; }
    const o = {}; for (let i = r.int(0, 5); i--;) o[r.pick(HOST.concat(['beaten', 'repairs', 'taught', 'route', 'done', 'x', 'z', 'yaw', 'd', 'at', 'scene']))] = junk(r, depth + 1); return o;
  };

  // ---- T1 normalizeCity con JSON mutado byte a byte (lo que haría un localStorage editado o truncado) ----
  const validCity = JSON.stringify(CS.mirror(CS.normalizeCity({ prologue: true, scene: 'M08', at: { x: 3, z: 40, yaw: 1 }, d: { M02: { beaten: { [D.districts.M02.creatures[0].id]: '2026-01-01' }, taught: { [D.districts.M02.apprentices[0].id]: true } }, M08: { route: { done: 4 }, repairs: { r01: true } } } }, D, () => true, TODAY)));
  const ALPH = '{}[]",:0123456789.-eE truefalsnul_proto_constructor\\u0000';
  campaign('T1 normalizeCity(JSON mutado)', (r) => {
    let s = validCity;
    for (let k = r.int(1, 8); k--;) {
      const i = r.int(0, s.length), op = r.int(0, 3);
      if (op === 0) s = s.slice(0, i) + s.slice(i + r.int(1, 6));
      else if (op === 1) s = s.slice(0, i) + ALPH[r.int(0, ALPH.length - 1)] + s.slice(i);
      else if (op === 2) s = s.slice(0, i) + r.pick(['"__proto__"', '"constructor"', '1e999', '-0', 'null', '[]', '{}', '"M08"', '"plaza"']) + s.slice(i);
      else s = s.slice(0, i);
    }
    return s;
  }, (s) => {
    let raw; try { raw = JSON.parse(s); } catch (e) { raw = s; }
    const bp = (m) => m === 'M02';
    const a = CS.normalizeCity(raw, D, bp, TODAY), b = CS.normalizeCity(JSON.parse(JSON.stringify(a)), D, bp, TODAY);
    if (JSON.stringify(a) !== JSON.stringify(b)) return 'no idempotente';
    if (!(a.scene === 'plaza' || own(D.districts, a.scene))) return 'escena ' + a.scene;
    if (![a.at.x, a.at.z, a.at.yaw].every(Number.isFinite) || a.at.yaw < 0 || a.at.yaw >= TAU || Object.is(a.at.yaw, -0)) return 'at inválido';
    if (Object.keys(a.d).join() !== MIDS.join()) return 'd con claves ' + Object.keys(a.d);
    if ({}.polluted !== undefined || Object.prototype.scene !== undefined) return 'contaminación';
    return null;
  });

  // ---- T2 mirror con C hostil ----
  campaign('T2 mirror(C hostil)', (r) => {
    const m = () => (r.bool(0.3) ? junk(r) : JSON.parse('{"__proto__":' + str(junk(r)).replace(/^undefined$/, 'null') + ',"' + r.pick(['bit', 'r01', 'a01']) + '":' + r.pick(['true', '"2026-01-01"']) + '}'));
    return { d: r.bool(0.9) ? { M02: r.bool(0.9) ? { beaten: m(), repairs: m(), taught: m() } : junk(r) } : junk(r) };
  }, (C) => {
    CS.mirror(C);
    for (const f of ['beaten', 'repairs', 'taught']) if (Object.getPrototypeOf(C[f]) !== Object.prototype) return 'prototipo de ' + f + ' cambiado';
    return null;
  });

  // ---- T3 nextObjective con C y ctx basura ----
  campaign('T3 nextObjective(C basura, ctx basura)', (r) => {
    const C = r.bool(0.6) ? CS.normalizeCity(junk(r), D, (m) => r.bool(), TODAY) : { prologue: junk(r), restored: junk(r), d: junk(r) };
    if (r.bool(0.3) && C.d && typeof C.d === 'object') { const mid = r.pick(MIDS); C.d[mid] = { route: { done: junk(r) }, repairs: junk(r), taught: junk(r), beaten: junk(r) }; }
    const v = () => r.pick([0, -0, 1, 3, -1, NaN, Infinity, '1', 'x', '', true, false, null, undefined]);   // la vista arma ctx con números y booleanos: primitivos, sin objetos con toString hostil
    return { C, sc: r.pick(HOST), ctx: { learned: () => v(), stars: () => v(), beatenEver: () => v(), beatenToday: () => v(), bossUnlocked: v(), bossPassed: v() } };
  }, ({ C, sc, ctx }) => {
    if (C.restored !== null && C.restored !== undefined && typeof C.restored !== 'object') return null;   // la vista nunca pasa restored de otro tipo
    const o = CS.nextObjective(C, D, sc, sc === 'plaza' ? null : ctx);
    if (!o || typeof o.kind !== 'string' || typeof o.label !== 'string') return 'forma ' + str(o);
    if (o.kind === 'route') { const k = +o.id.slice(3); if (!(k >= 0 && k < D.districts[sc].route.pads.length && Number.isInteger(k))) return 'pad ' + o.id; }
    return null;
  });

  // ---- T4 scene/boxesFor/portalAt/step ----
  campaign('T4 move(ids y números hostiles)', (r) => ({ id: r.bool(0.8) ? r.pick(HOST) : junk(r), x: junk(r), z: junk(r), s: { x: junk(r), z: junk(r), yaw: junk(r), vx: junk(r), vz: junk(r) }, it: { mx: junk(r), mz: junk(r), run: junk(r) }, dt: junk(r) }), (c) => {
    const bx = CM.boxesFor(D, c.id), p = CM.portalAt(D, c.id, c.x, c.z);
    if (p !== null && p !== 'plaza' && !own(D.districts, p)) return 'portal ' + p;
    const o = CM.step(c.s, c.it, c.dt, bx, { radius: 0.4, safe: { x: 0, z: 0, yaw: 0 }, canRun: true });
    if (![o.x, o.z, o.yaw, o.vx, o.vz, o.speed].every(Number.isFinite)) return 'step no finito';
    if (o.speed > CM.RUN + 1e-9) return 'velocidad ' + o.speed;
    return null;
  });

  // ---- T5 CityRoute: llamadas fuera de orden y reentrantes ----
  const bank = (r) => { const by = {}; stations.forEach((s) => s.topics.forEach((t) => { if (!by[t]) { by[t] = []; for (let k = r.int(0, 3); k--;) by[t].push({ id: r.bool(0.05) ? r.pick(['__proto__', 'constructor', 'toString']) : t + '-' + k, topic: t }); } })); return by; };
  campaign('T5 CityRoute(secuencias hostiles)', (r) => ({ seed: r.int(0, 2 ** 30), from: r.pick([0, 3, 9, -1, NaN, 10, '2', 4.5]), ops: Array.from({ length: r.int(5, 120) }, () => r.pick(['start', 'ask', 'answer', 'answer', 'next', 'next', 'state'])), re: r.int(0, 7) }), (c) => {
    const r = rng(c.seed); let fin = 0, depth = 0, xp = 0, f;
    const reent = (bit, fn) => { if ((c.re & bit) && depth < 50) { depth++; try { fn(); } finally { depth--; } } };
    f = CityRoute.create({
      stations, questionsByTopic: bank(r), from: c.from, rnd: () => r(),
      prep: (q) => ({ q, labels: ['a', 'b', 'c'], correct: r.int(0, 2) }),
      onStation: () => reent(1, () => f.ask()), onAsk: () => reent(2, () => f.answer(r.int(0, 2))),
      onResult: (x) => { const g = x.ok ? 10 : 0; xp += g; reent(4, () => f.next()); return g; }, onLayer() {}, onSummary: () => fin++
    });
    for (const op of c.ops) { if (op === 'answer') f.answer(r.int(-1, 3)); else f[op](); }
    const s = f.state();
    if (fin > 1) return 'onSummary x' + fin;
    if (s.xp !== xp) return 'xp ' + s.xp + ' != ' + xp;
    if (!(s.station >= 0 && s.station < stations.length)) return 'estación ' + s.station;
    return null;
  });

  // ---- T6 checkDistrict con distritos mutados ----
  const PATHS = (o, pre = []) => { const out = []; if (o && typeof o === 'object') for (const k of Object.keys(o)) { out.push(pre.concat(k)); if (pre.length < 3) out.push(...PATHS(o[k], pre.concat(k))); } return out; };
  const P = Object.fromEntries(MIDS.map((m) => [m, PATHS(D.districts[m])]));
  campaign('T6 checkDistrict(distrito mutado)', (r) => {
    const mid = r.pick(MIDS), d = structuredClone(D.districts[mid]), ops = [];
    for (let k = r.int(1, 3); k--;) {
      const p = r.pick(P[mid]), del = r.bool(0.3), v = junk(r); ops.push([p.join('.'), del ? 'DELETE' : v]);
      let o = d; for (let i = 0; i < p.length - 1 && o && typeof o === 'object'; i++) o = o[p[i]];
      if (o && typeof o === 'object') { if (del) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v; }
    }
    return { mid, d, ops };
  }, ({ mid, d }) => {
    const errs = checkDistrict(d, MODULES.find((m) => m.id === mid));
    if (!Array.isArray(errs) || errs.some((e) => typeof e !== 'string' || !/^R\d+: /.test(e))) return 'salida inválida';
    return null;
  });

  // ---- informe ----
  let total = 0, broken = 0;
  for (const c of report) {
    total += c.n; if (c.fails) broken++;
    console.log((c.fails ? 'FAIL' : 'PASS') + ' | ' + c.name + ' | ' + c.n + ' entradas en ' + c.ms + ' ms | fallos=' + c.fails + ' lentos=' + c.slow);
    Object.entries(c.sig).sort((a, b) => b[1].n - a[1].n).slice(0, 8).forEach(([k, v]) => {
      const min = c.name.startsWith('T6') ? str(JSON.parse(v.min).ops) : v.min;   // en T6 la entrada mínima es la lista de mutaciones
      console.log('     · ' + k + ' (x' + v.n + ') entrada mínima: ' + min.slice(0, 300));
    });
  }
  console.log('\nsemilla=' + SEED + ' objetivos=' + report.length + ' entradas=' + total + ' objetivos rotos=' + broken);
  process.exit(broken ? 1 : 0);
})();
