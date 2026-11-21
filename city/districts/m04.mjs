// Distrito M04: Museo del Código (Historia de la programación). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-18-ciudad-tanda-3-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Amparo', 'Bernardo', 'Claudia', 'Damián', 'Esperanza', 'Francisco', 'Genaro', 'Hortensia', 'Iñaki', 'Jacinta', 'Leopoldo', 'Mercedes', 'Nicanor',
  'Ofelia', 'Prudencio', 'Remedios', 'Saúl'];

const CREATURES = [
  { id: 'paradigma', name: 'Paradigma Confundido', topics: ['T01', 'T04', 'T05', 'T08', 'T09'] },   // primera: el objetivo guiado empieza en T01
  { id: 'goto', name: 'GO TO Salvaje', topics: ['T02', 'T03'] },
  { id: 'impura', name: 'Función Impura', topics: ['T06', 'T07'] },
  { id: 'perforada', name: 'Tarjeta Perforada', topics: ['T10', 'T11', 'T12'] },
  { id: 'compilador', name: 'Compilador Errante', topics: ['T13', 'T14', 'T15'] },
  { id: 'bucle', name: 'Bucle Atascado', topics: ['T16', 'T17'] }
];

const REPAIRS = [['T01', 'el catálogo de paradigmas'], ['T03', 'el programa espagueti'], ['T05', 'la clase sin encapsular'], ['T07', 'la lambda sin retorno'],
  ['T09', 'el flujo de eventos'], ['T11', 'el ensamblador sin traducir'], ['T12', 'la tarjeta de COBOL'], ['T15', 'la máquina virtual parada'],
  ['T17', 'los hilos bloqueados']];

const APPRENTICES = [['Ada', 'T04', 'explain'], ['Boris', 'T02', 'correct'], ['Cata', 'T03', 'correct'], ['Dulce', 'T06', 'explain'], ['Enzo', 'T08', 'explain'],
  ['Flavio', 'T10', 'correct'], ['Tobías', 'T12', 'correct'], ['Mila', 'T13', 'explain'], ['Nuria', 'T14', 'correct'], ['Juan', 'T16', 'explain']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M04', name: 'Museo del Código', colors: { a: '#2ee6c5', b: '#ff5ca8' }, style: 'red', seed: 23,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'El Museo del Código vuelve a abrir: cada lenguaje cuenta su historia.' }
};
