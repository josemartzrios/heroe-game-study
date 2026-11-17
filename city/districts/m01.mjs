// Distrito M01: Ciudadela Escalable (Diseño de sistemas). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-17-ciudad-tanda-2-design.md.
import { makeLayout } from '../layout.mjs';

const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [30, 2, -26, -54];   // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [16, -12, -40];          // ejes de calle
const tower = { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 };
const entry = { x: 0, z: 52, yaw: 0 };
const lay = makeLayout({ reserve: [[tower.x, tower.z], [entry.x, entry.z]], streetX: STREET_X, streetZ: STREET_Z, xRange: [-52, 52], zRange: [52, -68] });
const pad = (n) => String(n).padStart(2, '0');

const MENTOR_NAMES = ['Adrián', 'Blanca', 'Camilo', 'Débora', 'Eduardo', 'Fernanda', 'Gerardo', 'Hilda', 'Ignacio', 'Josefina', 'Leandro', 'Marina', 'Norberto', 'Octavia',
  'Pascual', 'Raquel', 'Samuel', 'Tania', 'Úrsula'];
const mentors = MENTOR_NAMES.map((name, i) => ({ id: 'm' + pad(i + 1), topic: 'T' + pad(i + 1), name, ...lay.take() }));

const creatures = [
  { id: 'latencia', name: 'Latencia Eterna', topics: ['T01', 'T02', 'T03'] },
  { id: 'embudo', name: 'Embudo Saturado', topics: ['T04', 'T06', 'T17'] },
  { id: 'rebelde', name: 'Réplica Rebelde', topics: ['T07', 'T08', 'T09', 'T12'] },
  { id: 'rancia', name: 'Caché Rancia', topics: ['T10', 'T14'] },
  { id: 'desparramado', name: 'Dato Desparramado', topics: ['T05', 'T11', 'T13'] },
  { id: 'cascada', name: 'Fallo en Cascada', topics: ['T15', 'T16', 'T18', 'T19'] }
].map((c) => { const p = lay.take(); return { ...c, area: { x: p.x, z: p.z, r: 6 } }; });

const REPAIRS = [['T03', 'el proxy mal configurado'], ['T05', 'la base de datos equivocada'], ['T08', 'la réplica atrasada'], ['T09', 'el shard sobrecargado'],
  ['T10', 'la caché desactualizada'], ['T12', 'la red partida en dos'], ['T16', 'la cola de mensajes atascada'], ['T19', 'el cobro duplicado']];
const repairs = REPAIRS.map(([topic, label], i) => ({ id: 'r' + pad(i + 1), topic, label, ...lay.take() }));

const APPRENTICES = [['Alba', 'T01', 'explain'], ['Bastián', 'T02', 'explain'], ['Cris', 'T04', 'correct'], ['Dino', 'T06', 'explain'], ['Ema', 'T08', 'correct'],
  ['Fito', 'T09', 'correct'], ['Gia', 'T12', 'correct'], ['Iara', 'T14', 'explain'], ['Joel', 'T15', 'explain'], ['Kai', 'T18', 'correct']];
const apprentices = APPRENTICES.map(([name, topic, mode], i) => ({ id: 'a' + pad(i + 1), topic, name, mode, ...lay.take() }));

export const district = {
  id: 'M01', name: 'Ciudadela Escalable', colors: { a: '#d580ff', b: '#5ce1ff' }, style: 'red', seed: 17,
  bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 },
  entry, exit: { x: 0, z: 57, w: 6, d: 2 },
  streets: { x: STREET_X, z: STREET_Z },
  blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'La Ciudadela Escalable aguanta la hora pico: ningún servidor carga solo con todo.' }
};
