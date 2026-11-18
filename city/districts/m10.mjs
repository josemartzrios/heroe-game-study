// Distrito M10: Muralla Cifrada (Ciberseguridad). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-17-ciudad-tanda-2-design.md.
import { makeLayout, people } from '../layout.mjs';

const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [30, 2, -26, -54];   // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [16, -12, -40];          // ejes de calle
const tower = { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 };
const entry = { x: 0, z: 52, yaw: 0 };
const lay = makeLayout({ reserve: [[tower.x, tower.z], [entry.x, entry.z]], streetX: STREET_X, streetZ: STREET_Z, xRange: [-52, 52], zRange: [52, -68] });

const MENTOR_NAMES = ['Alicia', 'Benito', 'Cecilia', 'David', 'Eva', 'Felipe', 'Gloria', 'Horacio', 'Isabel', 'Jorge', 'Laura', 'Manuel', 'Natalia', 'Orlando', 'Patricia',
  'Ramiro', 'Sara', 'Tomás', 'Valeria', 'Xavier'];

const CREATURES = [
  { id: 'pescador', name: 'Pescador de Claves', topics: ['T01', 'T04', 'T17'] },
  { id: 'robada', name: 'Llave Robada', topics: ['T02', 'T03', 'T05'] },
  { id: 'debil', name: 'Cifrado Débil', topics: ['T06', 'T13'] },
  { id: 'inyector', name: 'Inyector', topics: ['T07', 'T09', 'T10', 'T11'] },
  { id: 'abierta', name: 'Puerta Abierta', topics: ['T08', 'T12', 'T14', 'T15'] },
  { id: 'tormenta', name: 'Tormenta de Tráfico', topics: ['T16', 'T18', 'T19', 'T20'] }
];

const REPAIRS = [['T03', 'la puerta sin cerradura'], ['T04', 'la contraseña en una nota'], ['T05', 'la cookie sin protección'], ['T06', 'el mensaje sin cifrar'],
  ['T09', 'el formulario inyectable'], ['T10', 'el script escondido'], ['T12', 'la clave de fábrica'], ['T16', 'la alarma sin registro'],
  ['T18', 'la inundación de tráfico']];

const APPRENTICES = [['Aldo', 'T01', 'correct'], ['Bela', 'T02', 'explain'], ['Coral', 'T04', 'correct'], ['Dante', 'T06', 'explain'], ['Elsa', 'T08', 'correct'],
  ['Fina', 'T11', 'correct'], ['Gilda', 'T13', 'explain'], ['Irma', 'T14', 'correct'], ['Juno', 'T17', 'explain'], ['Lino', 'T19', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M10', name: 'Muralla Cifrada', colors: { a: '#ff5f6d', b: '#c9b8ff' }, style: 'red', seed: 19,
  bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 },
  entry, exit: { x: 0, z: 57, w: 6, d: 2 },
  streets: { x: STREET_X, z: STREET_Z },
  blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'La Muralla Cifrada vuelve a proteger la ciudad: nadie entra sin permiso.' }
};
