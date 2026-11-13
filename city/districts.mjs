// Datos de "Ciudad Núcleo" (solo datos): rangos, orden de distritos, plaza con sus 11 portales y los distritos que existen.
// Cada distrito vive en city/districts/*.mjs; los que aún no existen son muros de La Maraña con cartel "Próximamente".
import { district as m02 } from './districts/m02.mjs';
import { district as m08 } from './districts/m08.mjs';

// Orden recomendado de los distritos (también el de los portales de la plaza para el objetivo "Entra a …").
export const ORDER = ['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07', 'M05', 'M09', 'M11'];

// ---- plaza: 11 portales a r = 38; M02 al norte (-90°) y los demás en el orden de los antiguos muros (cada 33°) ----
const WALL_DIST = ['M04', 'M03', 'M08', 'M06', 'M07', 'M05', 'M01', 'M11', 'M10', 'M09'];
const TAU = Math.PI * 2, r2 = (v) => Math.round(v * 100) / 100 + 0, r4 = (v) => Math.round(v * 10000) / 10000 + 0;
const angleOf = (dist) => (dist === 'M02' ? -90 : Math.round((-90 + 33 * (WALL_DIST.indexOf(dist) + 1)) * 100) / 100);
const portals = ORDER.map((dist) => {
  const angle = angleOf(dist), a = angle * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  // back: 5 m hacia el centro, mirando al centro (yaw 0 mira a -z; en el movimiento yaw = atan2(-vx, -vz))
  const yaw = r4((((Math.atan2(cos, sin)) % TAU) + TAU) % TAU);
  return { dist, angle, x: r2(38 * cos), z: r2(38 * sin), w: 6, d: 2, back: { x: r2(33 * cos), z: r2(33 * sin), yaw } };
});

export const city = {
  ranks: [[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], [6, 'Senior'], [8, 'Arquitecto'], [11, 'Tech Lead']],
  order: ORDER, radius: 0.4,
  plaza: {
    name: 'Plaza', r: 30,
    bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 40 }, entry: { x: 0, z: 8, yaw: 0 },
    hq: { x: 0, z: -14, w: 14, d: 10, h: 9 },
    director: { id: 'iris', name: 'Iris', x: -6, z: -4 }, mirror: { id: 'espejo', name: 'Espejo', x: 6, z: -4 }, portals
  },
  districts: { M02: m02, M08: m08 }
};
