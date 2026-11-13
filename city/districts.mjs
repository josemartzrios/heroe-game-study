// Datos de "Ciudad Núcleo" (solo datos): plaza, distrito del Taller Comunal (M02), rangos y villanos de M01 guardados.
// El distrito M02 vive en city/districts/m02.mjs; aquí se arma el formato que usa hoy el motor (rect, puente y etiquetas sin artículo).
import { district as m02 } from './districts/m02.mjs';

const bridge = { id: 'puente', x: 0, z: -178, w: 6, d: 10, to: 'M04' };
const repairs = m02.repairs.map((r) => ({ ...r, label: r.label.replace(/^(el|la) /, '') }));

// ---- plaza: 10 muros de La Maraña a r = 38 (el norte, hacia M02, queda libre) ----
const WALL_DIST = ['M04', 'M03', 'M08', 'M06', 'M07', 'M05', 'M01', 'M11', 'M10', 'M09'];
const roads = WALL_DIST.map((dist, k) => {
  const angle = Math.round((-90 + 33 * (k + 1)) * 100) / 100, a = angle * Math.PI / 180;
  return { dist, angle, wall: { x: Math.round(38 * Math.cos(a) * 100) / 100, z: Math.round(38 * Math.sin(a) * 100) / 100, w: 6, d: 2, h: 4 } };
});

export const city = {
  ranks: [[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], [6, 'Senior'], [8, 'Arquitecto'], [11, 'Tech Lead']],
  bounds: { minX: -70, maxX: 70, minZ: -195, maxZ: 40 }, radius: 0.4,
  spawn: { x: 0, z: 8, yaw: 0 },
  plaza: {
    r: 30, hq: { x: 0, z: -14, w: 14, d: 10, h: 9 },
    director: { id: 'iris', name: 'Iris', x: -6, z: -4 }, mirror: { id: 'espejo', name: 'Espejo', x: 6, z: -4 }, roads
  },
  streets: m02.streets,
  districts: {
    M02: {
      name: m02.name, seed: m02.seed, rect: { minX: -60, maxX: 60, minZ: -185, maxZ: -50 },
      blocks: m02.blocks,
      mentors: m02.mentors, creatures: m02.creatures, repairs, apprentices: m02.apprentices, tower: m02.tower, bridge, need: m02.need
    }
  }
};
