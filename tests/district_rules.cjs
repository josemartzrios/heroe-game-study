// Reglas entre distritos en un solo lugar: nombres de personas que suenan igual, colores propios, seeds y nombres de distrito únicos.
// Las importan feasibility_lib (tandas 2 a 4), adv/tanda3_attack y adv/tanda3_plan_attack (probadas en district_rules_test.cjs). También: de00 (CIEDE2000) y colorDistanceProblems,
// la regla de distancia de color de los distritos nuevos (spec de la Tanda 4).

// Sin invisibles (ancho cero, guion blando), con ancho completo en su forma normal, sin acentos y en minúsculas.
// Los espacios (también los Unicode), las marcas combinantes y los rellenos que no se ven (hangul, braille vacío) tampoco cuentan: no esconden un nombre.
const fold = (s) => String(s).normalize('NFKC').replace(/[\p{Cf}\p{Mn}\p{Zs}\s\u115F\u1160\u3164\uFFA0\u2800]/gu, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Cómo suena un nombre en español, sin acentos y en minúsculas. El orden importa: ch es un sonido propio (marca \u0001, no pasa por c ni h);
// gue/gui suenan /ge/ /gi/ (marca \u0002, no pasan por g+e/i → j); luego c y g suaves, h muda, z → s, v → b, x → j, ll/y → i y letras repetidas → una.
function phon(name) {
  return fold(name)
    .replace(/ch/g, '\u0001').replace(/qu/g, 'k').replace(/gu(?=[ei])/g, '\u0002')
    .replace(/c(?=[ei])/g, 's').replace(/c/g, 'k').replace(/g(?=[ei])/g, 'j')
    .replace(/h/g, '').replace(/\u0001/g, 'ch').replace(/\u0002/g, 'g')
    .replace(/z/g, 's').replace(/v/g, 'b').replace(/x/g, 'j').replace(/ll/g, 'i').replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

// Dos nombres se parecen si suenan igual o comparten el inicio de k = min(4, largo de cada forma) letras, con k >= 3.
function namesNear(a, b) {
  const A = phon(a), B = phon(b);
  if (A === B) return true;
  const k = Math.min(4, A.length, B.length);
  return k >= 3 && A.slice(0, k) === B.slice(0, k);
}

// Pares que ya estaban en el juego antes de esta regla (M02, M08, M03) y suenan igual: no se reportan.
const INHERITED = [['Carla', 'Karla'], ['Elena', 'Helena']];

// Problemas entre las personas (mentores y aprendices) de todos los distritos: nombres de menos de 3 letras y pares que se parecen.
function nameClashes(districts) {
  const people = Object.entries(districts).flatMap(([id, d]) => [...d.mentors, ...d.apprentices].map((p) => [p.name, id]));
  const out = people.filter(([n]) => fold(n).length < 3).map(([n, id]) => n + '(' + id + ') tiene menos de 3 letras');
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const [a, ia] = people[i], [b, ib] = people[j];
    if (namesNear(a, b) && !INHERITED.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) out.push(a + '(' + ia + ')/' + b + '(' + ib + ')');
  }
  return out;
}

// Distritos cuyos dos colores los usa también otro distrito (cada uno debe tener al menos un color propio; #AABBCC y #aabbcc son el mismo).
const lower = (c) => String(c).toLowerCase();
function ownColorProblems(districts) {
  return Object.entries(districts).filter(([id, d]) => {
    const others = Object.entries(districts).filter(([k]) => k !== id).flatMap(([, o]) => [lower(o.colors.a), lower(o.colors.b)]);
    return others.includes(lower(d.colors.a)) && others.includes(lower(d.colors.b));
  }).map(([id, d]) => id + ' ' + d.colors.a + ' ' + d.colors.b);
}

// Valores repetidos de un campo de distrito (key: 'seed' o 'name').
function repeated(districts, key) {
  const seen = new Set(), dup = [];
  for (const d of Object.values(districts)) { if (seen.has(d[key])) dup.push(d[key]); seen.add(d[key]); }
  return dup;
}

// CIEDE2000 (distancia de color percibida; < 10 es "casi el mismo color"). Movida desde adv/tanda3_attack.cjs.
function lab(h) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function de00(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2), rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7))), a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) / rad; if (h1p < 0) h1p += 360; let h2p = Math.atan2(b2, a2p) / rad; if (h2p < 0) h2p += 360;
  const dL = L2 - L1, dC = C2p - C1p; let dh = h2p - h1p; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad), Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hb = hb < 360 ? hb + 360 : hb - 360; hb /= 2; }
  const Tt = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dth = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * Tt, RT = -Math.sin(2 * dth * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

// Colores de la escena que ningún distrito nuevo debe imitar: el ámbar de ventanas y muros, el naranja de las reparaciones pendientes, el amarillo
// de la torre y de Iris, la luz de las ventanas restauradas, los 6 morados de las criaturas de referencia, el blanco de los ojos y la pupila de las criaturas, y los fondos del mapa.
const REF_COLORS = {
  amber: '#ffd76a', repair: '#ff8f3a', tower: '#ffd23f', lit: '#fff0a0',   // lit: la luz de las ventanas de un distrito restaurado
  purples: ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'],
  eyes: '#ffffff', pupil: '#12162e', grounds: ['#141a3a', '#232a52', '#2a2f5e', '#0d1230']
};
const HEX = /^#[0-9a-f]{6}$/i;
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function luminance(h) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

// Problemas de color de los distritos `ids` (los de una tanda nueva; los anteriores no se revisan) dentro de `districts`. Un texto por problema:
// id sin registrar, color mal formado, ΔE2000 < 10 con una referencia, con el otro color del distrito o con un color de otro distrito,
// contraste < 3:1 con los fondos y, para el cuerpo de las criaturas (a), ΔE2000 < 20 con el blanco de los ojos o contraste < 3:1 con la pupila.
function colorDistanceProblems(districts, ids) {
  const out = [], R = REF_COLORS;
  for (const id of [...new Set(ids)]) {
    const d = hasOwn(districts, id) ? districts[id] : null;
    if (!d || !d.colors) { out.push(id + ': no registrado'); continue; }
    const mine = { a: d.colors.a, b: d.colors.b }, bad = ['a', 'b'].filter((k) => typeof mine[k] !== 'string' || !HEX.test(mine[k]));
    bad.forEach((k) => out.push(id + ': color mal formado ' + JSON.stringify(mine[k])));
    if (bad.length) continue;
    for (const k of ['a', 'b']) {
      const c = mine[k];
      const refs = [['el ámbar', R.amber], ['el naranja de las reparaciones', R.repair], ['la torre y Iris', R.tower], ['la luz de las ventanas restauradas', R.lit], ...R.purples.map((p) => ['un morado de referencia', p]), ['el otro color del distrito', k === 'a' ? mine.b : mine.a]];
      for (const [oid, od] of Object.entries(districts)) if (oid !== id && od && od.colors) for (const x of [od.colors.a, od.colors.b]) if (typeof x === 'string' && HEX.test(x)) refs.push([oid, x]);
      for (const [name, x] of refs) if (de00(c, x) < 10) out.push(id + ' ' + k + ' ' + c + ' cerca de ' + name + ' ' + x);
      for (const g of R.grounds) if (contrast(c, g) < 3) out.push(id + ' ' + k + ' ' + c + ' sin contraste con el fondo ' + g);
      if (k === 'a') {
        if (de00(c, R.eyes) < 20) out.push(id + ' a ' + c + ' demasiado cerca del blanco de los ojos');
        if (contrast(c, R.pupil) < 3) out.push(id + ' a ' + c + ' sin contraste con la pupila ' + R.pupil);
      }
    }
  }
  return out;
}

module.exports = { phon, namesNear, nameClashes, ownColorProblems, repeated, de00, REF_COLORS, colorDistanceProblems };
