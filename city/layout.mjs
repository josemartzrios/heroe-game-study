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
