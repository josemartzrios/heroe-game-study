/* Héroe 3D de Ciudad Núcleo a partir del avatar (look + PARTS). Cuerpo de cajas, una malla por pieza.
   Sin DOM. Colores siempre validados: un hex inválido nunca llega a un material. */
var CityHero = (function () {
  function hexOk(x) { return typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x); }
  function num(hex) { return hexOk(hex) ? parseInt(hex.slice(1), 16) : 0x888888; }
  function pick(list, i) { return (typeof i === 'number' && list[i]) ? list[i] : list[0]; }

  function create(THREE, look, PARTS) {
    look = (look && typeof look === 'object') ? look : {};
    var skin = pick(PARTS.skin, look.skin), suit = pick(PARTS.suit, look.suit), head = pick(PARTS.head, look.head);
    var own = Object.prototype.hasOwnProperty;
    var hairC = (own.call(look, 'hc') && hexOk(look.hc)) ? num(look.hc) : 0x3b2a20;
    var capeC = (own.call(look, 'capec') && hexOk(look.capec)) ? num(look.capec) : num(suit.s);
    var group = new THREE.Group(), geos = [], mats = [];
    function lam(color) { var m = new THREE.MeshLambertMaterial({ color: color }); mats.push(m); return m; }
    function box(parent, name, w, h, d, x, y, z, color) {
      var g = new THREE.BoxGeometry(w, h, d); geos.push(g);
      var m = new THREE.Mesh(g, lam(color)); m.name = name || ''; m.position.set(x, y, z); parent.add(m); return m;
    }
    function pivot(name, x, y, z) { var g = new THREE.Group(); g.name = name; g.position.set(x, y, z); group.add(g); return g; }
    var skinC = num(skin.f), suitC = num(suit.f), suitS = num(suit.s);

    var torso = box(group, 'torso', 0.5, 0.6, 0.28, 0, 1.0, 0, suitC);
    var legL = pivot('legL', -0.13, 0.7, 0), legR = pivot('legR', 0.13, 0.7, 0);
    box(legL, '', 0.2, 0.7, 0.22, 0, -0.35, 0, suitS); box(legR, '', 0.2, 0.7, 0.22, 0, -0.35, 0, suitS);
    var armL = pivot('armL', -0.36, 1.25, 0), armR = pivot('armR', 0.36, 1.25, 0);
    box(armL, '', 0.16, 0.55, 0.16, 0, -0.27, 0, skinC); box(armR, '', 0.16, 0.55, 0.16, 0, -0.27, 0, skinC);
    var hd = new THREE.Group(); hd.name = 'head'; hd.position.set(0, 1.62, 0); group.add(hd);
    box(hd, 'face', 0.36, 0.36, 0.34, 0, 0, 0, skinC);
    var k = head.k;
    if (k === 'hair_s') box(hd, 'hair', 0.4, 0.12, 0.38, 0, 0.2, 0, hairC);
    else if (k === 'hair_l') { box(hd, 'hair', 0.4, 0.12, 0.38, 0, 0.2, 0, hairC); box(hd, 'hairback', 0.4, 0.4, 0.1, 0, -0.04, -0.2, hairC); }
    else if (k === 'aviator') { box(hd, 'cap', 0.42, 0.14, 0.4, 0, 0.2, 0, 0x8a5a2b); box(hd, 'goggles', 0.34, 0.08, 0.06, 0, 0.1, 0.19, 0x222831); }
    else if (k === 'antenna') { box(hd, 'helmet', 0.42, 0.16, 0.4, 0, 0.2, 0, 0x5a5f6b); box(hd, 'mast', 0.04, 0.3, 0.04, 0.1, 0.45, 0, 0xcfd6e6); box(hd, 'tip', 0.09, 0.09, 0.09, 0.1, 0.62, 0, 0xffd23f); }
    else if (k === 'crystal') {
      var og = new THREE.OctahedronGeometry(0.34, 0); geos.push(og);
      var om = new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.45, side: THREE.FrontSide, depthWrite: false }); mats.push(om);
      var oct = new THREE.Mesh(og, om); oct.name = 'crystal'; oct.position.set(0, 0.04, 0); hd.add(oct);
    }
    var cape = null;
    if (typeof look.cape === 'number' && look.cape >= 1) {
      cape = box(group, 'cape', 0.46, look.cape >= 2 ? 0.95 : 0.6, 0.05, 0, look.cape >= 2 ? 0.78 : 0.95, -0.18, capeC);
    }
    return {
      group: group, torso: torso,
      setPose: function (speed, t) {
        var s = (typeof speed === 'number' && isFinite(speed)) ? Math.min(speed, 8) : 0, tt = (typeof t === 'number' && isFinite(t)) ? t : 0;
        var a = s > 0.05 ? Math.sin(tt * (4 + s)) * Math.min(0.9, 0.12 * s) : 0;
        legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a; armR.rotation.x = a;
        if (cape) cape.rotation.x = s > 0.05 ? Math.min(0.5, 0.05 * s) : 0;
      },
      dispose: function () { geos.forEach(function (g) { g.dispose(); }); mats.forEach(function (m) { m.dispose(); }); }
    };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityHero;
