// city/hero3d.js con el Three r169 real (sin WebGL): cuerpo de cajas, cabezas, colores seguros, pose y dispose.
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

(async () => {
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href);
  const html = fs.readFileSync(path.join(__dirname, '..', 'engine.html'), 'utf8');
  const PARTS = vm.runInNewContext('(' + html.match(/var PARTS = (\{[\s\S]*?\n  \});/)[1] + ')');
  const H = require('../city/hero3d.js');
  const look = (o) => Object.assign({ skin: 0, suit: 0, head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 }, o || {});
  const meshes = (g) => { const a = []; g.traverse((o) => { if (o.isMesh) a.push(o); }); return a; };
  const sig = (g) => { const hd = g.getObjectByName('head'); return meshes(hd).map((m) => m.name + ':' + m.geometry.type + ':' + m.geometry.parameters.width + 'x' + m.geometry.parameters.height + ':' + m.position.toArray().join(',') + ':' + m.material.type).join('|'); };

  // (a) las 5 cabezas son distintas
  const sigs = [0, 1, 2, 3, 4].map((i) => sig(H.create(THREE, look({ head: i }), PARTS).group));
  ok('a las 5 cabezas tienen geometría distinta', new Set(sigs).size === 5, JSON.stringify(sigs));
  const cr = H.create(THREE, look({ head: 4 }), PARTS).group;
  const crm = meshes(cr.getObjectByName('head')).find((m) => m.geometry.type === 'OctahedronGeometry');
  ok('a2 el cristal es un octaedro Basic translúcido FrontSide', !!crm && crm.material.isMeshBasicMaterial && crm.material.transparent === true && crm.material.side === THREE.FrontSide);

  // (b) índices fuera de rango
  let thrown = null, hb;
  try { hb = H.create(THREE, look({ head: 999, skin: -1, suit: 999 }), PARTS); H.create(THREE, look({ head: -1, cape: 999 }), PARTS); H.create(THREE, null, PARTS); } catch (e) { thrown = e; }
  ok('b índices 999 y -1 y look nulo no lanzan y usan [0]', !thrown && sig(hb.group) === sigs[0], String(thrown));

  // (c) capa con capec hostil usa suit.s
  const c1 = H.create(THREE, look({ cape: 1, capec: '"/><img>', suit: 1 }), PARTS);
  const cape = c1.group.getObjectByName('cape');
  ok('c capa con capec inválido usa la sombra del traje', !!cape && cape.material.color.getHex() === parseInt(PARTS.suit[1].s.slice(1), 16), cape && cape.material.color.getHexString());
  const c2 = H.create(THREE, look({ cape: 1, capec: '#112233' }), PARTS);
  ok('c2 capa con capec válido', c2.group.getObjectByName('cape').material.color.getHex() === 0x112233);
  ok('c3 sin capa con cape 0', !H.create(THREE, look({ cape: 0 }), PARTS).group.getObjectByName('cape'));
  const hc = H.create(THREE, look({ head: 0, hc: 'xx' }), PARTS), hc2 = H.create(THREE, look({ head: 0, hc: '#ff0000' }), PARTS);
  const hairHex = (g) => meshes(g.getObjectByName('head')).map((m) => m.material.color.getHex());
  ok('c4 pelo: hc válido se usa y el inválido cae a #3b2a20', hairHex(hc.group).includes(0x3b2a20) && hairHex(hc2.group).includes(0xff0000));
  ok('c5 piel y traje salen de PARTS', H.create(THREE, look({ skin: 2, suit: 3 }), PARTS).group.getObjectByName('torso').material.color.getHex() === parseInt(PARTS.suit[3].f.slice(1), 16));

  // (d) pose
  const p = H.create(THREE, look(), PARTS), L = p.group.getObjectByName('legL'), R = p.group.getObjectByName('legR');
  p.setPose(7, 0.3);
  ok('d setPose(7, 0.3) mueve las piernas en sentido opuesto', Math.abs(L.rotation.x) > 0.05 && Math.abs(L.rotation.x + R.rotation.x) < 1e-9, L.rotation.x + ' ' + R.rotation.x);
  p.setPose(0, 1.7);
  ok('d2 setPose(0, t) las deja en 0', L.rotation.x === 0 && R.rotation.x === 0 && p.group.getObjectByName('armL').rotation.x === 0);
  p.setPose(NaN, NaN);
  ok('d3 setPose con NaN no rompe', Number.isFinite(L.rotation.x));

  // (e) dispose
  { const h = H.create(THREE, look({ head: 4, cape: 1 }), PARTS); let g = 0, m = 0;
    const gs = new Set(), ms = new Set(); h.group.traverse((o) => { if (o.geometry) gs.add(o.geometry); if (o.material) ms.add(o.material); });
    gs.forEach((x) => { const d = x.dispose.bind(x); x.dispose = () => { g++; d(); }; }); ms.forEach((x) => { const d = x.dispose.bind(x); x.dispose = () => { m++; d(); }; });
    h.dispose();
    ok('e dispose libera todas las geometrías y materiales', g === gs.size && m === ms.size && g > 5, g + '/' + gs.size + ' ' + m + '/' + ms.size); }

  // (f) restricciones gráficas
  { const bad = []; for (let hd = 0; hd < 5; hd++) { const h = H.create(THREE, look({ head: hd, cape: 3 }), PARTS); h.group.traverse((o) => { if (o.isLight) bad.push('luz'); if (o.material) { if (Array.isArray(o.material)) bad.push('arreglo'); if (o.material.transparent && o.material.side === THREE.DoubleSide) bad.push('doble'); if (!(o.material.isMeshLambertMaterial || o.material.isMeshBasicMaterial)) bad.push(o.material.type); } }); }
    ok('f sin luces, sin DoubleSide transparente y solo Lambert/Basic', bad.length === 0, bad.join()); }

  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'CITY_HERO OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
