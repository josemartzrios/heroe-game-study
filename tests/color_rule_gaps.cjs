// Huecos de la regla de color de la Tanda 4 (tests/district_rules.cjs: lab, de00, contrast, REF_COLORS y colorDistanceProblems).
// No repite district_rules_test.cjs (que fija 2 pares de de00, la simetría y algunos mensajes) ni tanda4_feasibility.cjs (que solo mide "sin problemas").
//  1. de00 contra el conjunto de pruebas publicado de CIEDE2000 (Sharma, Wu y Dalal, 2005: 34 pares en Lab). Las pruebas de antes solo miran umbrales,
//     así que un error pequeño en la fórmula (una constante, un signo, una rama de ángulo) no las rompía. lab() se sustituye por una tabla para medir solo de00.
//  2. lab() y el contraste WCAG con valores conocidos (negro/blanco, rojo sRGB, #767676 sobre blanco = 4,54), de00 finita y no negativa en todo sRGB.
//  3. Los umbrales de colorDistanceProblems en su frontera (ΔE 10 con cada referencia, ΔE 20 con los ojos, contraste 3:1 con cada fondo), una por una.
//  4. Cada referencia se nombra (ámbar, naranja, torre, los 6 morados), cada fondo se nombra, y la pupila: su comprobación nunca salta sola.
//  5. Forma de la entrada: ids repetidos, colores mal formados de cualquier tipo, mayúsculas, otros distritos mal formados (sin lanzar ni NaN),
//     a y b de otros distritos, dos distritos nuevos cercanos entre sí (se reporta en los dos sentidos), a y b iguales (se reporta cada uno).
//  6. La tabla de "Valores medidos" del spec de la Tanda 4 (15,6 / 12,1 / 14,4 / 20,4, ojos ≥ 34, M07 a 20,6, M07-M01 6,4, nuevos entre sí ≥ 32).
//  7. REF_COLORS no se ha desfasado del código de la escena: cada color de referencia está escrito en city/*.js y los morados son los de sprites2d.js.
//  8. Inventario: los colores de la escena (55 en city/*.js) que quedan a ΔE < 10 de un color de M05 o M09 y no están en REF_COLORS.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const fc = require('fast-check');
const R = require('./district_rules.cjs');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const X = (a, b) => ({ X: { colors: { a, b } } });
const probs = (a, b, ids = ['X']) => R.colorDistanceProblems(X(a, b), ids);
const has = (errs, re) => errs.some((e) => re.test(e));
const hexOf = (n) => '#' + n.toString(16).padStart(6, '0');
const gray = (k) => '#' + k.toString(16).padStart(2, '0').repeat(3);

// Las funciones internas de district_rules.cjs (no se exportan): se evalúa el archivo tal cual en un contexto aparte.
const SRC = fs.readFileSync(path.join(__dirname, 'district_rules.cjs'), 'utf8');
function internals() {
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(SRC + '\n;this.__x = { lab: lab, de00: de00, contrast: contrast, luminance: luminance };', ctx);
  return { ctx, ...ctx.__x };
}

// Oráculo independiente del contraste WCAG 2.x (definición del estándar).
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (h) => 0.2126 * lin(parseInt(h.slice(1, 3), 16)) + 0.7152 * lin(parseInt(h.slice(3, 5), 16)) + 0.0722 * lin(parseInt(h.slice(5, 7), 16));
const wcag = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// L1 a1 b1 | L2 a2 b2 | ΔE00 esperado (Sharma, Wu y Dalal, "The CIEDE2000 Color-Difference Formula", tabla de datos de prueba)
const SHARMA = `50.0000 2.6772 -79.7751 50.0000 0.0000 -82.7485 2.0425
50.0000 3.1571 -77.2803 50.0000 0.0000 -82.7485 2.8615
50.0000 2.8361 -74.0200 50.0000 0.0000 -82.7485 3.4412
50.0000 -1.3802 -84.2814 50.0000 0.0000 -82.7485 1.0000
50.0000 -1.1848 -84.8006 50.0000 0.0000 -82.7485 1.0000
50.0000 -0.9009 -85.5211 50.0000 0.0000 -82.7485 1.0000
50.0000 0.0000 0.0000 50.0000 -1.0000 2.0000 2.3669
50.0000 -1.0000 2.0000 50.0000 0.0000 0.0000 2.3669
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0009 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0010 7.1792
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0011 7.2195
50.0000 2.4900 -0.0010 50.0000 -2.4900 0.0012 7.2195
50.0000 -0.0010 2.4900 50.0000 0.0009 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0010 -2.4900 4.8045
50.0000 -0.0010 2.4900 50.0000 0.0011 -2.4900 4.7461
50.0000 2.5000 0.0000 50.0000 0.0000 -2.5000 4.3065
50.0000 2.5000 0.0000 73.0000 25.0000 -18.0000 27.1492
50.0000 2.5000 0.0000 61.0000 -5.0000 29.0000 22.8977
50.0000 2.5000 0.0000 56.0000 -27.0000 -3.0000 31.9030
50.0000 2.5000 0.0000 58.0000 24.0000 15.0000 19.4535
50.0000 2.5000 0.0000 50.0000 3.1736 0.5854 1.0000
50.0000 2.5000 0.0000 50.0000 3.2972 0.0000 1.0000
50.0000 2.5000 0.0000 50.0000 1.8634 0.5757 1.0000
50.0000 2.5000 0.0000 50.0000 3.2592 0.3350 1.0000
60.2574 -34.0099 36.2677 60.4626 -34.1751 39.4387 1.2644
63.0109 -31.0961 -5.8663 62.8187 -29.7946 -4.0864 1.2630
61.2901 3.7196 -5.3901 61.4292 2.2480 -4.9620 1.8731
35.0831 -44.1164 3.7933 35.0232 -40.0716 1.5901 1.8645
22.7233 20.0904 -46.6940 23.0331 14.9730 -42.5619 2.0373
36.4612 47.8580 18.3852 36.2715 50.5065 21.2231 1.4146
90.8027 -2.0831 1.4410 91.1528 -1.6435 0.0447 1.4441
90.9257 -0.5406 -0.9208 88.6381 -0.8985 -0.7239 1.5381
6.7747 -0.2908 -2.4247 5.8714 -0.0985 -2.2286 0.6377
2.0776 0.0795 -1.1350 0.9033 -0.0636 -0.5514 0.9082`.split('\n').map((l) => l.split(' ').map(Number));

(async () => {
  const { city } = await import(pathToFileURL(path.join(root, 'city', 'districts.mjs')).href);
  const RC = R.REF_COLORS, I = internals();

  // =================== 1. de00 contra el conjunto de Sharma ===================
  { const labs = {}; I.ctx.lab = (k) => labs[k];   // de00 busca `lab` en el ámbito global del contexto: se le da la tabla en vez de la conversión sRGB
    const bad = [];
    SHARMA.forEach((r, i) => { labs.A = [r[0], r[1], r[2]]; labs.B = [r[3], r[4], r[5]]; const v = I.de00('A', 'B'); if (!near(v, r[6], 5e-4)) bad.push('par ' + (i + 1) + ': ' + v + ' ≠ ' + r[6]); });
    ok('de00 coincide con los 34 pares del conjunto de prueba de CIEDE2000 (Sharma 2005) con 4 decimales', bad.length === 0, bad.join(' | '));
    // los mismos 34 pares con los colores intercambiados: la diferencia de matiz pasa a tener el signo contrario y entra por la otra rama (dh < -180 en vez de dh > 180)
    const badSwap = [];
    SHARMA.forEach((r, i) => { labs.A = [r[3], r[4], r[5]]; labs.B = [r[0], r[1], r[2]]; const v = I.de00('A', 'B'); if (!near(v, r[6], 5e-4)) badSwap.push('par ' + (i + 1) + ' invertido: ' + v + ' ≠ ' + r[6]); });
    ok('de00 da lo mismo con los 34 pares de Sharma invertidos (las dos ramas de la diferencia de matiz, dh > 180 y dh < -180)', badSwap.length === 0, badSwap.join(' | ')); }

  // =================== 2. lab, contraste y de00 en sRGB ===================
  { const [L0, a0, b0] = I.lab('#000000'), [L1, a1, b1] = I.lab('#ffffff'), [Lr, ar, br] = I.lab('#ff0000'), [Lg] = I.lab('#808080');
    ok('lab: negro = (0, 0, 0) y blanco = (100, 0, 0) con D65', near(L0, 0, 1e-9) && near(a0, 0, 1e-6) && near(b0, 0, 1e-6) && near(L1, 100, 0.01) && near(a1, 0, 0.02) && near(b1, 0, 0.02), [L0, a0, b0, L1, a1, b1].join());
    ok('lab: el rojo sRGB #ff0000 es (53,24; 80,09; 67,20) y el gris #808080 tiene L = 53,59', near(Lr, 53.24, 0.05) && near(ar, 80.09, 0.05) && near(br, 67.2, 0.05) && near(Lg, 53.585, 0.01), [Lr, ar, br, Lg].join()); }
  ok('de00: negro y blanco están a 100', near(R.de00('#000000', '#ffffff'), 100, 0.01), String(R.de00('#000000', '#ffffff')));
  ok('de00: mayúsculas y minúsculas dan la misma distancia', R.de00('#FF4800', '#36A3FF') === R.de00('#ff4800', '#36a3ff'), R.de00('#FF4800', '#36A3FF') + ' vs ' + R.de00('#ff4800', '#36a3ff'));
  ok('contraste WCAG: negro/blanco = 21, x/x = 1, #767676 sobre blanco = 4,54 y es simétrico', near(I.contrast('#000000', '#ffffff'), 21, 1e-9) && I.contrast('#12162e', '#12162e') === 1
    && near(I.contrast('#767676', '#ffffff'), 4.54, 0.005) && I.contrast('#767676', '#ffffff') === I.contrast('#ffffff', '#767676'), String(I.contrast('#767676', '#ffffff')));
  { const hex = fc.integer({ min: 0, max: 0xffffff }).map(hexOf);
    let bad = 0, worst = '';
    fc.assert(fc.property(hex, hex, (a, b) => { const d = R.de00(a, b); if (!Number.isFinite(d) || d < 0 || d > 150) { bad++; worst = a + ' ' + b + ' ' + d; } return true; }), { numRuns: 3000, seed: 20261123 });
    ok('de00 es finita (sin NaN), no negativa y menor que 150 para cualquier par sRGB (3000 pares, semilla fija)', bad === 0, bad + ' violaciones, p. ej. ' + worst);
    let badC = 0;
    fc.assert(fc.property(hex, hex, (a, b) => { const c = I.contrast(a, b); if (!(c >= 1 && c <= 21) || c !== I.contrast(b, a)) badC++; return true; }), { numRuns: 2000, seed: 20261123 });
    ok('el contraste está siempre entre 1 y 21 y es simétrico (2000 pares)', badC === 0, 'violaciones=' + badC);
    let badW = 0;
    fc.assert(fc.property(hex, hex, (a, b) => { if (!near(I.contrast(a, b), wcag(a, b), 1e-9)) badW++; return true; }), { numRuns: 2000, seed: 20261123 });
    ok('contrast coincide con la definición WCAG escrita aparte (2000 pares)', badW === 0, 'violaciones=' + badW); }

  // =================== 3. umbrales en su frontera ===================
  // colores a ΔE ≈ 9,3–9,6 (dentro) y ≈ 10,5–10,7 (fuera) de cada referencia, medidos con de00 (validada en el apartado 1)
  const FRONT = [
    ['el ámbar', RC.amber, '#ffd79f', '#ffd7a3'], ['el naranja de las reparaciones', RC.repair, '#ffa83a', '#ffab3a'], ['la torre y Iris', RC.tower, '#ffd286', '#ffd28c'],
    ['un morado de referencia', RC.purples[0], '#7a23c4', '#7a18c4'], ['un morado de referencia', RC.purples[1], '#b039ff', '#b02fff'], ['un morado de referencia', RC.purples[2], '#5a579a', '#5a5a9a'],
    ['un morado de referencia', RC.purples[3], '#9a73d8', '#9a77d8'], ['un morado de referencia', RC.purples[4], '#8a34e0', '#8a2be0'], ['un morado de referencia', RC.purples[5], '#6a5eb0', '#6a62b0']
  ];
  for (const [name, ref, inside, outside] of FRONT) {
    const re = new RegExp('cerca de ' + name + ' ' + ref);
    ok(`frontera ΔE 10 con ${name} ${ref}: ${inside} (${R.de00(inside, ref).toFixed(2)}) da problema y ${outside} (${R.de00(outside, ref).toFixed(2)}) no, en a y en b`,
      R.de00(inside, ref) < 10 && R.de00(outside, ref) >= 10 && has(probs(inside, '#36a3ff'), re) && !has(probs(outside, '#36a3ff'), re) && has(probs('#ff4800', inside), re) && !has(probs('#ff4800', outside), re),
      probs(inside, '#36a3ff').join(' | ') + ' // ' + probs(outside, '#36a3ff').join(' | '));
  }
  ok('frontera ΔE 20 con los ojos (solo el cuerpo a): #ffffbe (19,3) da problema, #ffffb4 (20,8) y M07 #ffd1a1 (20,6) no', R.de00('#ffffbe', '#ffffff') < 20 && R.de00('#ffffb4', '#ffffff') >= 20
    && has(probs('#ffffbe', '#36a3ff'), /ojos/) && !has(probs('#ffffb4', '#36a3ff'), /ojos/) && !has(probs('#ffd1a1', '#36a3ff'), /ojos/), probs('#ffffb4', '#36a3ff').join(' | '));
  ok('los ojos solo miran el cuerpo: el blanco puro y un color casi blanco en b no dan problema de ojos (así es M09)', !has(probs('#36a3ff', '#ffffff'), /ojos/) && !has(probs('#36a3ff', '#ffffbe'), /ojos/), probs('#36a3ff', '#ffffff').join(' | '));
  // contraste 3:1 con cada fondo: el gris más oscuro que llega a 3:1 con ese fondo (calculado con el oráculo WCAG) sí pasa y el anterior no
  for (const g of RC.grounds) {
    let k = 0; while (wcag(gray(k), g) < 3) k++;
    const re = new RegExp('sin contraste con el fondo ' + g);
    ok(`frontera de contraste 3:1 con el fondo ${g}: ${gray(k - 1)} (${wcag(gray(k - 1), g).toFixed(2)}) da problema y ${gray(k)} (${wcag(gray(k), g).toFixed(2)}) no, en a y en b`,
      has(probs(gray(k - 1), '#36a3ff'), re) && !has(probs(gray(k), '#36a3ff'), re) && has(probs('#ff4800', gray(k - 1)), re) && !has(probs('#ff4800', gray(k)), re), probs(gray(k - 1), '#36a3ff').join(' | '));
  }
  ok('REF_COLORS.grounds son los 4 fondos del spec: suelo #141a3a, calzada #232a52, fachadas #2a2f5e y fondo #0d1230', JSON.stringify(RC.grounds.slice().sort()) === JSON.stringify(['#0d1230', '#141a3a', '#232a52', '#2a2f5e']), RC.grounds.join());

  // =================== 4. cada referencia se nombra; la pupila ===================
  const NAMED = [['el ámbar', RC.amber], ['el naranja de las reparaciones', RC.repair], ['la torre y Iris', RC.tower], ...RC.purples.map((p) => ['un morado de referencia', p])];
  for (const [name, ref] of NAMED)
    ok(`el color ${ref} exacto nombra "${name}" en a y en b`, has(probs(ref, '#36a3ff'), new RegExp('X a ' + ref + ' cerca de ' + name + ' ' + ref)) && has(probs('#36a3ff', ref), new RegExp('X b ' + ref + ' cerca de ' + name + ' ' + ref)),
      probs(ref, '#36a3ff').join(' | '));
  ok('REF_COLORS tiene exactamente 6 morados distintos', RC.purples.length === 6 && new Set(RC.purples).size === 6, RC.purples.join());
  { let k = 0; while (wcag(gray(k), RC.pupil) < 3) k++;
    ok(`frontera de contraste 3:1 con la pupila ${RC.pupil} (solo el cuerpo a): ${gray(k - 1)} (${wcag(gray(k - 1), RC.pupil).toFixed(2)}) se queja de la pupila y ${gray(k)} (${wcag(gray(k), RC.pupil).toFixed(2)}) no; en b nunca`,
      has(probs(gray(k - 1), '#36a3ff'), /X a .* sin contraste con la pupila/) && !has(probs(gray(k), '#36a3ff'), /sin contraste con la pupila/) && !has(probs('#ff4800', gray(k - 1)), /pupila/), probs(gray(k - 1), '#36a3ff').join(' | ')); }
  ok('un cuerpo (a) igual a la pupila #12162e se queja de la pupila, y un cuerpo de contraste 3:1 con la fachada no', has(probs(RC.pupil, '#36a3ff'), /pupila/) && !has(probs('#36a3ff', '#36a3ff'), /pupila/), probs(RC.pupil, '#36a3ff').join(' | '));
  { const hex = fc.integer({ min: 0, max: 0xffffff }).map(hexOf);
    let alone = 0, sample = '';
    fc.assert(fc.property(hex, (c) => { const e = probs(c, '#36a3ff'); if (has(e, /X a .* sin contraste con la pupila/) && !has(e, /X a .* sin contraste con el fondo/)) { alone++; sample = c; } return true; }), { numRuns: 4000, seed: 20261123 });
    ok('la pupila nunca salta sola: si un cuerpo tiene 3:1 con los 4 fondos también lo tiene con la pupila (4000 colores)', alone === 0, alone + ' casos, p. ej. ' + sample); }

  // =================== 5. forma de la entrada ===================
  ok('ids repetidos se miden una vez', JSON.stringify(R.colorDistanceProblems(X('#36a3ff', '#36a3ff'), ['X', 'X', 'X'])) === JSON.stringify(R.colorDistanceProblems(X('#36a3ff', '#36a3ff'), ['X'])), '');
  ok('sin problemas devuelve un arreglo vacío (no undefined)', Array.isArray(probs('#ff4800', '#36a3ff')) && probs('#ff4800', '#36a3ff').length === 0, JSON.stringify(probs('#ff4800', '#36a3ff')));
  for (const d of [{}, { colors: null }, { colors: undefined }, null, undefined, 'texto', 0])
    ok(`un distrito ${JSON.stringify(d)} dentro de districts se reporta como "X: no registrado" y no lanza`, JSON.stringify(R.colorDistanceProblems({ X: d }, ['X'])) === '["X: no registrado"]', JSON.stringify(R.colorDistanceProblems({ X: d }, ['X'])));
  for (const bad of [undefined, null, 5, '', '#fff', '#12345', '#1234567', '#ff480000', ' #ff4800', '#ff4800 ', 'ff4800', '#gg4800', ['#ff4800'], {}, '#ff48\n00', '#ff4800\n']) {
    const A = probs(bad, '#36a3ff'), B = probs('#ff4800', bad);
    ok(`color ${JSON.stringify(bad) === undefined ? 'undefined' : JSON.stringify(bad)} mal formado: un solo problema "mal formado" en a o en b, sin medir nada más de ese distrito`, A.length === 1 && /mal formado/.test(A[0]) && B.length === 1 && /mal formado/.test(B[0]), A.concat(B).join(' | '));
  }
  { const up = probs('#FFD79F', '#36A3FF'), lo = probs('#ffd79f', '#36a3ff');
    ok('un color en mayúsculas es válido y da los mismos problemas que en minúsculas (aquí uno: el ámbar)', up.length === 1 && !has(up, /mal formado/) && JSON.stringify(up.map((s) => s.toLowerCase())) === JSON.stringify(lo.map((s) => s.toLowerCase())), up.join(' | ') + ' // ' + lo.join(' | ')); }
  ok('a y b iguales: se reporta el otro color en a y en b (dos mensajes)', has(probs('#36a3ff', '#36a3ff'), /X a #36a3ff cerca de el otro color del distrito #36a3ff/) && has(probs('#36a3ff', '#36a3ff'), /X b #36a3ff cerca de el otro color del distrito #36a3ff/), probs('#36a3ff', '#36a3ff').join(' | '));
  ok('a y b parecidos pero distintos (ΔE < 10) también se reportan en los dos', R.de00('#36a3ff', '#3aa6ff') < 10 && probs('#36a3ff', '#3aa6ff').filter((e) => /otro color/.test(e)).length === 2, probs('#36a3ff', '#3aa6ff').join(' | '));
  { const others = { Y: { colors: { a: undefined, b: '#zzz' } }, Z: null, W: {}, V: { colors: null }, U: 'x', T: { colors: { a: 5, b: {} } }, S: { colors: { a: '#fff', b: '' } }, ...X('#ff4800', '#36a3ff') };
    let out = null, thrown = null; try { out = R.colorDistanceProblems(others, ['X']); } catch (e) { thrown = e; }
    ok('otros distritos con colores mal formados, nulos o sin colors se ignoran: no lanza, no hay NaN y X sigue sin problemas', thrown === null && out.length === 0, thrown ? String(thrown) : out.join(' | ')); }
  { const out = R.colorDistanceProblems({ Y: { colors: { a: '#00ff00', b: '#36a4ff' } }, ...X('#ff4800', '#36a3ff') }, ['X']);
    ok('se compara también con el color b de otros distritos (no solo con a) y el problema nombra al distrito', has(out, /X b #36a3ff cerca de Y #36a4ff/), out.join(' | '));
    const out2 = R.colorDistanceProblems({ Y: { colors: { a: '#36a4ff', b: '#00ff00' } }, ...X('#ff4800', '#36a3ff') }, ['X']);
    ok('se compara con el color a de otros distritos y el problema nombra al distrito', has(out2, /X b #36a3ff cerca de Y #36a4ff/), out2.join(' | ')); }
  ok('el distrito medido no se compara con su propio registro (X solo, con colores lejanos, da 0 problemas)', R.colorDistanceProblems(X('#ff4800', '#36a3ff'), ['X']).length === 0, '');
  { const pair = { A: { colors: { a: '#ff4800', b: '#36a3ff' } }, B: { colors: { a: '#00e060', b: '#36a4ff' } } };
    const out = R.colorDistanceProblems(pair, ['A', 'B']);
    ok('dos distritos nuevos demasiado parecidos entre sí se reportan desde los dos lados', has(out, /A b #36a3ff cerca de B #36a4ff/) && has(out, /B b #36a4ff cerca de A #36a3ff/), out.join(' | '));
    ok('con un solo id solo se reporta ese lado: el otro distrito no se mide', R.colorDistanceProblems(pair, ['A']).length === 1 && !has(R.colorDistanceProblems(pair, ['A']), /^B/), R.colorDistanceProblems(pair, ['A']).join(' | ')); }
  { const hostile = R.colorDistanceProblems(X('#ff4800', '#36a3ff'), ['X', '__proto__', 'constructor', 'toString', 'hasOwnProperty']);
    ok('ids como __proto__, constructor, toString o hasOwnProperty dentro de ids dan "no registrado" cada uno, aunque haya otros distritos', JSON.stringify(hostile) === JSON.stringify(['__proto__: no registrado', 'constructor: no registrado', 'toString: no registrado', 'hasOwnProperty: no registrado']), hostile.join(' | ')); }

  // =================== 6. la tabla de "Valores medidos" del spec de la Tanda 4 ===================
  const real = Object.fromEntries(Object.entries(city.districts).map(([k, d]) => [k, d.colors])), realD = Object.fromEntries(Object.entries(city.districts).map(([k, d]) => [k, { colors: d.colors }]));
  const nearest = (id, k) => {
    const c = real[id][k], refs = [['reparaciones', RC.repair], ['torre e Iris', RC.tower], ['ámbar', RC.amber], ...RC.purples.map((p) => ['morado ' + p, p]), ['otro color', real[id][k === 'a' ? 'b' : 'a']]];
    for (const [o, col] of Object.entries(real)) if (o !== id) for (const kk of ['a', 'b']) refs.push([o + '.' + kk, col[kk]]);
    return refs.map(([n, x]) => [n, R.de00(c, x)]).sort((p, q) => p[1] - q[1])[0];
  };
  for (const [id, k, want, who] of [['M05', 'a', 15.6, 'reparaciones'], ['M05', 'b', 12.1, 'torre e Iris'], ['M09', 'a', 14.4, 'M03.b'], ['M09', 'b', 20.4, 'M10.b']]) {
    const [n, d] = nearest(id, k);
    ok(`spec: ${id}.${k} ${real[id][k]} queda a ΔE ${want} de ${who}`, n === who && near(d, want, 0.05), n + ' ' + d.toFixed(2));
  }
  ok('spec: los cuerpos de M05 y M09 quedan a ΔE ≥ 34 del blanco de los ojos y el cuerpo actual más cercano es M07 con 20,6', R.de00(real.M05.a, '#ffffff') >= 34 && R.de00(real.M09.a, '#ffffff') >= 34
    && Object.entries(real).filter(([id]) => id !== 'M05' && id !== 'M09').map(([id, c]) => [id, R.de00(c.a, '#ffffff')]).sort((p, q) => p[1] - q[1])[0][0] === 'M07' && near(R.de00(real.M07.a, '#ffffff'), 20.6, 0.05),
    [real.M05.a, real.M09.a].map((c) => R.de00(c, '#ffffff').toFixed(1)).join());
  { const four = [real.M05.a, real.M05.b, real.M09.a, real.M09.b]; let min = Infinity;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) min = Math.min(min, R.de00(four[i], four[j]));
    ok('spec: los cuatro colores nuevos quedan a ΔE ≥ 32 entre sí', min >= 32, String(min)); }
  ok('spec: M07 queda a ΔE 6,4 de M01 (el caso que la regla no revisa) y colorDistanceProblems con ["M07"] lo ve y con ["M05", "M09"] no', near(Math.min(...['a', 'b'].flatMap((k) => ['a', 'b'].map((kk) => R.de00(real.M07[k], real.M01[kk])))), 6.4, 0.05)
    && R.colorDistanceProblems(realD, ['M07']).length > 0 && R.colorDistanceProblems(realD, ['M05', 'M09']).length === 0, R.colorDistanceProblems(realD, ['M05', 'M09']).join(' | '));

  // =================== 7. REF_COLORS frente al código de la escena ===================
  const SCENE = fs.readdirSync(path.join(root, 'city')).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, 'city', f), 'utf8')).join('\n').toLowerCase();
  const refs = [['amber', RC.amber], ['repair', RC.repair], ['tower', RC.tower], ['eyes', RC.eyes], ['pupil', RC.pupil], ...RC.purples.map((p, i) => ['purple' + i, p]), ...RC.grounds.map((g, i) => ['ground' + i, g])];
  const missing = refs.filter(([, c]) => !SCENE.includes(c.toLowerCase())).map(([n, c]) => n + ' ' + c);
  ok('cada color de REF_COLORS está escrito en city/*.js (si el código cambia un color, la referencia se desfasa y esto lo avisa)', missing.length === 0, missing.join(' | '));
  { const spr = fs.readFileSync(path.join(root, 'city', 'sprites2d.js'), 'utf8'), m = spr.match(/\['(#[0-9a-f]{6})'(?:, '#[0-9a-f]{6}'){5}\]\[i\]/i), fromCode = m ? m[0].match(/#[0-9a-f]{6}/gi).map((c) => c.toLowerCase()) : [];
    ok('los 6 morados de REF_COLORS son, en orden, los de la tabla del cuerpo de las criaturas de referencia en sprites2d.js', fromCode.length === 6 && JSON.stringify(fromCode) === JSON.stringify(RC.purples), fromCode.join() + ' ≠ ' + RC.purples.join()); }
  ok('REF_COLORS: ámbar #ffd76a, naranja #ff8f3a, torre #ffd23f, ojos #ffffff y pupila #12162e (valores del spec)', RC.amber === '#ffd76a' && RC.repair === '#ff8f3a' && RC.tower === '#ffd23f' && RC.eyes === '#ffffff' && RC.pupil === '#12162e', JSON.stringify(RC));
  ok('todos los colores de REF_COLORS tienen la forma #rrggbb en minúsculas', [RC.amber, RC.repair, RC.tower, RC.eyes, RC.pupil, ...RC.purples, ...RC.grounds].every((c) => /^#[0-9a-f]{6}$/.test(c)), '');

  // =================== 8. inventario de colores de la escena que REF_COLORS no incluye ===================
  // REF_COLORS lista 15 colores; city/*.js escribe 55. Se recorren todos los #rrggbb del código de la escena y se anotan los que quedan a ΔE < 10 de un color de M05 o M09.
  // El spec acepta de ellos: el blanco de los ojos (M09 b, que no es el cuerpo), el pelo de Iris #e8ecff y la luz de las farolas #ffe066. Esta prueba fija ADEMÁS dos cercanías que el spec
  // no menciona (el traje rojo #e0533a de las personas, a 8,6 de M05 a, y la plata de las estrellas #cfd6e6, a 7,6 de M09 b): si el código de la escena añade otro color
  // parecido, o se retira uno de estos, la lista cambia y hay que decidirlo a propósito.
  { const fresh = {};
    for (const f of ['world2d.js', 'sprites2d.js', 'view.js', 'route_view.js', 'intro.js']) for (const m of fs.readFileSync(path.join(root, 'city', f), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) fresh[m[0].toLowerCase()] = true;
    const mine = { 'M05.a': real.M05.a, 'M05.b': real.M05.b, 'M09.a': real.M09.a, 'M09.b': real.M09.b }, found = [];
    for (const c of Object.keys(fresh)) for (const [k, v] of Object.entries(mine)) if (R.de00(v, c) < 10) found.push(k + '~' + c);
    const ACCEPTED = ['M05.a~#e0533a', 'M05.b~#ffe066', 'M09.b~#cfd6e6', 'M09.b~#e8ecff', 'M09.b~#ffffff'];
    ok('los colores de la escena a ΔE < 10 de M05/M09 son solo los aceptados (ojos y pelo de Iris en M09 b, luz de farola en M05 b) y los dos que el spec no menciona (#e0533a, #cfd6e6)', JSON.stringify(found.sort()) === JSON.stringify(ACCEPTED.slice().sort()), found.sort().join(' '));
    ok('la escena escribe al menos 40 colores distintos (si baja mucho, la lectura del código falló y el inventario no mide nada)', Object.keys(fresh).length >= 40, String(Object.keys(fresh).length)); }

  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'COLOR_RULE_GAPS FALLAS ' + fails.length : 'COLOR_RULE_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
