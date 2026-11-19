// Distrito M06: Fábrica de Objetos (Programación orientada a objetos). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-18-ciudad-tanda-3-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Agustín', 'Begoña', 'Casimiro', 'Dolores', 'Ezequiel', 'Fortunato', 'Graciela', 'Humberto', 'Isidro', 'Jazmín', 'Lucrecia', 'Mauricio', 'Nélida',
  'Osvaldo'];

const CREATURES = [
  { id: 'molde', name: 'Molde Vacío', topics: ['T01', 'T02'] },
  { id: 'atributo', name: 'Atributo Fugado', topics: ['T03', 'T04'] },
  { id: 'torcida', name: 'Herencia Torcida', topics: ['T05', 'T06'] },
  { id: 'contrato', name: 'Contrato Roto', topics: ['T07', 'T14'] },
  { id: 'acople', name: 'Acople Pegajoso', topics: ['T08', 'T09', 'T10'] },
  { id: 'flecha', name: 'Flecha Perdida', topics: ['T11', 'T12', 'T13'] }
];

const REPAIRS = [['T02', 'la clase que nadie instancia'], ['T03', 'el atributo expuesto'], ['T04', 'el constructor olvidado'], ['T05', 'el árbol de herencia'],
  ['T07', 'el contrato incumplido'], ['T09', 'el equipo desarmado'], ['T10', 'el coche sin motor'], ['T13', 'el diagrama sin flechas'],
  ['T14', 'el método sin polimorfismo']];

const APPRENTICES = [['Ale', 'T01', 'correct'], ['Bibi', 'T02', 'explain'], ['Cira', 'T03', 'correct'], ['Duna', 'T05', 'explain'], ['Pía', 'T06', 'correct'],
  ['Fiona', 'T08', 'explain'], ['Goyo', 'T10', 'correct'], ['Ulla', 'T11', 'explain'], ['Jael', 'T12', 'explain'], ['Sol', 'T13', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M06', name: 'Fábrica de Objetos', colors: { a: '#ff9ec7', b: '#b5ff8c' }, style: 'red', seed: 29,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'La Fábrica de Objetos vuelve a producir: cada clase sabe qué hacer.' }
};
