// Reparto de lugares en las calles de un distrito (solo build; nunca va al HTML).
// Recorre primero las filas de calle (x de xRange[0] a xRange[1]) y luego las columnas (z de zRange[0] bajando a zRange[1]);
// un punto entra si queda a >= min de todo lo ya tomado y de cada punto reservado (torre, pads, entrada...).
export function makeLayout({ reserve = [], streetX, streetZ, xRange, zRange, step = 8, min = 7 }) {
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
