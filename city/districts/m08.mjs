// Distrito M08: Nodo Enlace (Redes informáticas). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2 y §4.5.
import { makeLayout, people } from '../layout.mjs';
import { stations } from './m08_route.mjs';

const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [30, 2, -26, -54];   // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [16, -12, -40];          // ejes de calle
const tower = { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 };
const entry = { x: 0, z: 52, yaw: 0 };
const pads = [[0, 44], [0, 30], [0, 16], [-14, 16], [-28, 2], [-28, -12], [-14, -12], [0, -26], [0, -40], [0, -54]].map(([x, z]) => ({ x, z }));
const lay = makeLayout({
  reserve: [[tower.x, tower.z], [entry.x, entry.z], ...pads.map((p) => [p.x, p.z])],
  streetX: STREET_X, streetZ: STREET_Z, xRange: [-52, 52], zRange: [52, -68]
});

const MENTOR_NAMES = ['Alma', 'Baltasar', 'Celia', 'Darío', 'Estela', 'Fausto', 'Greta', 'Hernán', 'Irene', 'Julián', 'Lía', 'Mateo', 'Noemí', 'Óscar', 'Paula'];

const CREATURES = [
  { id: 'ruido', name: 'Ruido Blanco', topics: ['T01', 'T02', 'T03'] },
  { id: 'perdido', name: 'Paquete Perdido', topics: ['T04', 'T07', 'T14'] },
  { id: 'capas', name: 'Capa Confusa', topics: ['T05', 'T08', 'T09', 'T13'] },
  { id: 'handshake', name: 'Handshake Roto', topics: ['T06', 'T10', 'T12'] },
  { id: 'espia', name: 'Espía del Canal', topics: ['T11', 'T15'] }
];

const REPAIRS = [['T02', 'el cable cortado'], ['T03', 'la antena sin sentido'], ['T04', 'el router de casa sin salida'], ['T07', 'la dirección IP duplicada'],
  ['T10', 'la conexión a medias'], ['T11', 'el candado HTTPS roto'], ['T12', 'el puerto bloqueado'], ['T14', 'el enlace saturado']];

const APPRENTICES = [['Brisa', 'T01', 'explain'], ['Ciro', 'T02', 'correct'], ['Delia', 'T04', 'explain'], ['Eloy', 'T05', 'explain'], ['Flor', 'T07', 'correct'],
  ['Gus', 'T08', 'explain'], ['Iker', 'T10', 'correct'], ['Luna', 'T12', 'explain'], ['Teo', 'T13', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M08', name: 'Nodo Enlace', colors: { a: '#3dff9a', b: '#5ce1ff' }, style: 'red', seed: 11,
  bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 },
  entry, exit: { x: 0, z: 57, w: 6, d: 2 },
  streets: { x: STREET_X, z: STREET_Z },
  blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
  mentors, creatures, repairs, apprentices, tower, need: 6,
  celebrate: { text: 'Nodo Enlace vuelve a conectar la ciudad: los paquetes llegan a su destino.' },
  route: { stations, pads }
};
