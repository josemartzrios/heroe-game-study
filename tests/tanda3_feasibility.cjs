// Factibilidad de datos del spec 2026-11-18-ciudad-tanda-3-design.md (M04, M06, M07) contra el contenido REAL.
// Transcribe las tablas del spec; todo lo demás (armar cada distrito con standardFrame() y people(), checkDistrict R1–R7 y R11, el archivo real y las reglas
// entre TODOS los distritos registrados, que se ejecutan aquí una sola vez) lo hace feasibility_lib.run con district_rules.cjs; el archivo y título de
// cada módulo, de modules.cjs. Solo lee datos; no depende de build.mjs.
const F = require('./feasibility_lib.cjs');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

// ---- Tablas del spec v2 (transcritas tal cual) ----
const SPEC = {
  M04: {
    name: 'Museo del Código', topicCount: 17,
    colors: { a: '#2ee6c5', b: '#ff5ca8' }, style: 'red', seed: 23, need: 7,
    mentors: 'Amparo, Bernardo, Claudia, Damián, Esperanza, Francisco, Genaro, Hortensia, Iñaki, Jacinta, Leopoldo, Mercedes, Nicanor, Ofelia, Prudencio, Remedios, Saúl',
    creatures: [
      ['paradigma', 'Paradigma Confundido', ['T01', 'T04', 'T05', 'T08', 'T09']],
      ['goto', 'GO TO Salvaje', ['T02', 'T03']],
      ['impura', 'Función Impura', ['T06', 'T07']],
      ['perforada', 'Tarjeta Perforada', ['T10', 'T11', 'T12']],
      ['compilador', 'Compilador Errante', ['T13', 'T14', 'T15']],
      ['bucle', 'Bucle Atascado', ['T16', 'T17']]
    ],
    repairs: [['T01', 'el catálogo de paradigmas'], ['T03', 'el programa espagueti'], ['T05', 'la clase sin encapsular'],
      ['T07', 'la lambda sin retorno'], ['T09', 'el flujo de eventos'], ['T11', 'el ensamblador sin traducir'],
      ['T12', 'la tarjeta de COBOL'], ['T15', 'la máquina virtual parada'], ['T17', 'los hilos bloqueados']],
    apprentices: [['Ada', 'T04', 'explicar'], ['Boris', 'T02', 'corregir'], ['Cata', 'T03', 'corregir'], ['Dulce', 'T06', 'explicar'],
      ['Enzo', 'T08', 'explicar'], ['Flavio', 'T10', 'corregir'], ['Tobías', 'T12', 'corregir'], ['Mila', 'T13', 'explicar'],
      ['Nuria', 'T14', 'corregir'], ['Juan', 'T16', 'explicar']],
    celebrate: 'El Museo del Código vuelve a abrir: cada lenguaje cuenta su historia.'
  },
  M06: {
    name: 'Fábrica de Objetos', topicCount: 14,
    colors: { a: '#ff9ec7', b: '#b5ff8c' }, style: 'red', seed: 29, need: 7,
    mentors: 'Agustín, Begoña, Casimiro, Dolores, Ezequiel, Fortunato, Graciela, Humberto, Isidro, Jazmín, Lucrecia, Mauricio, Nélida, Osvaldo',
    creatures: [
      ['molde', 'Molde Vacío', ['T01', 'T02']],
      ['atributo', 'Atributo Fugado', ['T03', 'T04']],
      ['torcida', 'Herencia Torcida', ['T05', 'T06']],
      ['contrato', 'Contrato Roto', ['T07', 'T14']],
      ['acople', 'Acople Pegajoso', ['T08', 'T09', 'T10']],
      ['flecha', 'Flecha Perdida', ['T11', 'T12', 'T13']]
    ],
    repairs: [['T02', 'la clase que nadie instancia'], ['T03', 'el atributo expuesto'], ['T04', 'el constructor olvidado'],
      ['T05', 'el árbol de herencia'], ['T07', 'el contrato incumplido'], ['T09', 'el equipo desarmado'],
      ['T10', 'el coche sin motor'], ['T13', 'el diagrama sin flechas'], ['T14', 'el método sin polimorfismo']],
    apprentices: [['Ale', 'T01', 'corregir'], ['Bibi', 'T02', 'explicar'], ['Cira', 'T03', 'corregir'], ['Duna', 'T05', 'explicar'],
      ['Pía', 'T06', 'corregir'], ['Fiona', 'T08', 'explicar'], ['Goyo', 'T10', 'corregir'], ['Ulla', 'T11', 'explicar'],
      ['Jael', 'T12', 'explicar'], ['Sol', 'T13', 'corregir']],
    celebrate: 'La Fábrica de Objetos vuelve a producir: cada clase sabe qué hacer.'
  },
  M07: {
    name: 'Cinco Calles', topicCount: 13,
    colors: { a: '#ffd1a1', b: '#e05cff' }, style: 'red', seed: 31, need: 7,
    mentors: 'Amelia, Bautista, Constanza, Domingo, Eugenia, Fulgencio, Guadalupe, Hipólito, Ingrid, Jerónimo, Leonor, Moisés, Nora',
    creatures: [
      ['caos', 'Diseño Caótico', ['T01', 'T02', 'T13']],
      ['dios', 'Clase Dios', ['T03', 'T04']],
      ['rigido', 'Código Rígido', ['T05', 'T06']],
      ['impostora', 'Subclase Impostora', ['T07', 'T08']],
      ['gorda', 'Interfaz Gorda', ['T09', 'T10']],
      ['mandon', 'Detalle Mandón', ['T11', 'T12']]
    ],
    repairs: [['T01', 'el software frágil'], ['T02', 'el acrónimo olvidado'], ['T04', 'la clase que hace de todo'],
      ['T06', 'el switch interminable'], ['T08', 'el pato de juguete'], ['T09', 'la interfaz gigante'],
      ['T10', 'el control con mil botones'], ['T12', 'la base de datos soldada'], ['T13', 'el código que huele mal']],
    apprentices: [['Asier', 'T01', 'explicar'], ['Blas', 'T02', 'corregir'], ['Cande', 'T03', 'explicar'], ['Dámaso', 'T05', 'explicar'],
      ['Elvira', 'T06', 'corregir'], ['Fidel', 'T07', 'explicar'], ['Gisela', 'T08', 'corregir'], ['Hilario', 'T09', 'corregir'],
      ['Ion', 'T11', 'explicar'], ['Rubén', 'T12', 'corregir']],
    celebrate: 'Cinco Calles vuelve a ordenarse: cada principio SOLID tiene su calle.'
  }
};

(async () => {
  await F.run(SPEC, 'TANDA 3', ok);
  const fails = results.filter((r) => r[0] === 'FAIL'); results.forEach((r) => console.log(r.join(' ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'TANDA 3 FACTIBLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
