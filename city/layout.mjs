// Reparto de lugares en las calles de un distrito (solo build; nunca va al HTML).
// Recorre primero las filas de calle (x de xRange[0] a xRange[1]) y luego las columnas (z de zRange[0] bajando a zRange[1]);
// un punto entra si queda a >= min de todo lo ya tomado y de cada punto reservado (torre, pads, entrada...).
export function makeLayout({ reserve = [], streetX, streetZ, xRange, zRange, step = 8, min = 7 }) {
  // Un paso <= 0 o un extremo infinito harían un bucle sin fin y colgarían la build: se rechazan antes de recorrer nada.
  // Cada rango solo se exige si hay calles que lo recorran (las filas usan xRange y las columnas zRange).
  const finite = (r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]);
  if (!(Number.isFinite(step) && step > 0)) throw new Error('makeLayout: step debe ser un número finito mayor que 0');
  if (streetZ.length && !finite(xRange)) throw new Error('makeLayout: xRange debe tener dos extremos finitos');
  if (streetX.length && !finite(zRange)) throw new Error('makeLayout: zRange debe tener dos extremos finitos');
  const taken = reserve.map(([x, z]) => ({ x, z }));
  const spots = [];
  const add = (x, z) => {
    if (taken.every((p) => Math.hypot(p.x - x, p.z - z) >= min)) { taken.push({ x, z }); spots.push({ x, z }); }
  };
  for (const z of streetZ) for (let x = xRange[0]; x <= xRange[1]; x += step) add(x, z);
  for (const x of streetX) for (let z = zRange[0]; z >= zRange[1]; z -= step) add(x, z);
  let next = 0;
  return {
    take() {
      if (next >= spots.length) throw new Error('faltan lugares en las calles del distrito');
      const p = spots[next++];
      return { x: p.x, z: p.z };
    }
  };
}

// Arma los personajes de un distrito desde sus listas de datos, tomando lugares en este orden fijo (mentores → criaturas → reparaciones →
// aprendices): cambiar el orden movería a todos. Ids: m01…, r01…, a01…; mentores uno por tema en orden (T01, T02…); criaturas con área de 6 m.
export function people(lay, { mentors, creatures, repairs, apprentices }) {
  const pad = (n) => String(n).padStart(2, '0');
  const m = mentors.map((name, i) => ({ id: 'm' + pad(i + 1), topic: 'T' + pad(i + 1), name, ...lay.take() }));
  const c = creatures.map((cr) => { const p = lay.take(); return { ...cr, area: { x: p.x, z: p.z, r: 6 } }; });
  const r = repairs.map(([topic, label], i) => ({ id: 'r' + pad(i + 1), topic, label, ...lay.take() }));
  const a = apprentices.map(([name, topic, mode], i) => ({ id: 'a' + pad(i + 1), topic, name, mode, ...lay.take() }));
  return { mentors: m, creatures: c, repairs: r, apprentices: a };
}

// Marco común de los distritos de las tandas 2 y 3 (el mapa de Nodo Enlace sin pads): límites, entrada, salida, torre, calles, 16 manzanas y el
// reparto de lugares libres (lay), con la torre y la entrada reservadas. Todo es nuevo en cada llamada: dos distritos nunca comparten un objeto.
// Los distritos desestructuran lo que usan (no hacer `...standardFrame()` en el literal: metería `lay` y cambiaría el orden de las claves).
export function standardFrame() {
  const tower = { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }, entry = { x: 0, z: 52, yaw: 0 };
  const streets = { x: [-28, 0, 28], z: [16, -12, -40] };
  const lay = makeLayout({ reserve: [[tower.x, tower.z], [entry.x, entry.z]], streetX: streets.x, streetZ: streets.z, xRange: [-52, 52], zRange: [52, -68] });
  return {
    lay, tower, entry, exit: { x: 0, z: 57, w: 6, d: 2 }, bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 }, streets,
    blocks: [-42, -14, 14, 42].flatMap((x) => [30, 2, -26, -54].map((z) => [x, z]))
  };
}
