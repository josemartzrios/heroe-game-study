// Distrito M10: Muralla Cifrada (Ciberseguridad). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-17-ciudad-tanda-2-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

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
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'La Muralla Cifrada vuelve a proteger la ciudad: nadie entra sin permiso.' }
};
