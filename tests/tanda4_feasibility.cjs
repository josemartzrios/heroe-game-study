// Factibilidad de datos del spec 2026-11-22-ciudad-tanda-4-design.md (M05 y M09) contra el contenido REAL.
// Transcribe las tablas del spec y deja el resto en feasibility_lib.run: arma cada distrito con standardFrame() y people(), pasa checkDistrict, lo compara con
// el archivo real y mide la distancia de color de los dos distritos nuevos. Las reglas entre todos los distritos (nombres, colores propios, semillas) las
// ejecuta tanda3_feasibility sobre city.districts completo, así que aquí no se repiten (cross: false).
const F = require('./feasibility_lib.cjs');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

// ---- Tablas del spec v2 (transcritas tal cual) ----
const SPEC = {
  M05: {
    name: 'Mercado de Patrones', topicCount: 22,
    colors: { a: '#ff4800', b: '#fff700' }, style: 'red', seed: 37, need: 7,
    mentors: 'Adela, Benjamín, Celestino, Delfina, Eusebio, Farah, Gaspar, Higinio, Imelda, Josué, Lázaro, Matilde, Norma, Olegario, Petra, Rafael, Salvador, Tadeo, Uriel, Vicente, Yolanda, Zacarías',
    creatures: [
      ['forzado', 'Patrón Forzado', ['T01', 'T21', 'T22']],
      ['caprichoso', 'Creador Caprichoso', ['T02', 'T03', 'T04', 'T05', 'T06']],
      ['envoltorio', 'Envoltorio Infinito', ['T07', 'T08', 'T09', 'T10']],
      ['arbol', 'Árbol Hueco', ['T11', 'T12', 'T13']],
      ['chismoso', 'Observador Chismoso', ['T14', 'T15', 'T16']],
      ['indeciso', 'Estado Indeciso', ['T17', 'T18', 'T19', 'T20']]
    ],
    repairs: [['T02', 'el pedido a medio armar'], ['T03', 'el creador sin subclases'], ['T05', 'la instancia duplicada'],
      ['T07', 'el enchufe que no encaja'], ['T08', 'el café sin decorar'], ['T09', 'el mostrador de trámites'],
      ['T13', 'el portero dormido'], ['T16', 'el boletín sin suscriptores'], ['T18', 'la máquina expendedora']],
    apprentices: [['Aitana', 'T01', 'explicar'], ['Dafne', 'T08', 'explicar'], ['Lara', 'T14', 'explicar'], ['Maite', 'T17', 'explicar'],
      ['Nerea', 'T21', 'explicar'], ['Rocío', 'T04', 'corregir'], ['Toño', 'T06', 'corregir'], ['Vito', 'T11', 'corregir'],
      ['Yago', 'T15', 'corregir'], ['Zoe', 'T19', 'corregir']],
    celebrate: 'El Mercado de Patrones vuelve a abrir: cada problema encuentra su receta.'
  },
  M09: {
    name: 'Laboratorio Neuronal', topicCount: 19,
    colors: { a: '#36a3ff', b: '#f4f4ff' }, style: 'red', seed: 41, need: 7,
    mentors: 'Anselmo, Berta, Clemente, Doroteo, Edurne, Gregorio, Hermenegildo, Ildefonso, Justino, Leocadia, Macario, Nazario, Obdulia, Primitivo, Rosendo, Severino, Telmo, Urbano, Wenceslao',
    creatures: [
      ['loro', 'Loro Estocástico', ['T01', 'T02', 'T19']],
      ['desbordado', 'Contexto Desbordado', ['T03', 'T04', 'T05']],
      ['ambiguo', 'Prompt Ambiguo', ['T06', 'T07', 'T08']],
      ['vector', 'Vector Desorientado', ['T09', 'T10', 'T11', 'T12']],
      ['agente', 'Agente Sin Freno', ['T13', 'T14', 'T15']],
      ['factura', 'Factura Disparada', ['T16', 'T17', 'T18']]
    ],
    repairs: [['T03', 'el contador de tokens'], ['T04', 'la memoria de corto plazo'], ['T05', 'el dial de temperatura'],
      ['T08', 'los ejemplos sin formato'], ['T11', 'el buscador de documentos'], ['T13', 'la caja de herramientas'],
      ['T14', 'el plan de tareas olvidado'], ['T15', 'el conector sin protocolo'], ['T16', 'el filtro de instrucciones']],
    apprentices: [['Ainhoa', 'T01', 'explicar'], ['Chema', 'T06', 'explicar'], ['Gerva', 'T10', 'explicar'], ['Iratxe', 'T12', 'explicar'],
      ['Urko', 'T17', 'explicar'], ['Mabel', 'T02', 'corregir'], ['Nacho', 'T07', 'corregir'], ['Quima', 'T09', 'corregir'],
      ['Rita', 'T14', 'corregir'], ['Sixto', 'T18', 'corregir']],
    celebrate: 'El Laboratorio Neuronal vuelve a pensar: cada respuesta del modelo se verifica antes de fiarse de ella.'
  }
};

(async () => {
  await F.run(SPEC, 'TANDA 4', ok, { colorIds: ['M05', 'M09'], cross: false });
  const fails = results.filter((r) => r[0] === 'FAIL'); results.forEach((r) => console.log(r.join(' ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'TANDA 4 FACTIBLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
