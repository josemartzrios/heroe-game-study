// Estaciones del viaje "Viaja como paquete" (solo datos). Los textos educativos salen de
// content_m08.mjs: kp apunta a un keyPoint por tema e índice; expect es un fragmento literal.
export const stations = [
  { id: 'S0', name: 'Prólogo: la red', topics: ['T01'], ask: 1, layers: 0, kp: [{ topic: 'T01', index: 0, expect: 'computadoras autónomas conectadas' }] },
  { id: 'S1', name: 'Aplicación (tu teléfono)', topics: ['T05', 'T11'], ask: 2, layers: 1, kp: [{ topic: 'T11', index: 0, expect: 'Protocolos de aplicación' }] },
  { id: 'S2', name: 'Transporte', topics: ['T09', 'T10', 'T12'], ask: 2, layers: 2, kp: [{ topic: 'T12', index: 3, expect: 'Los puertos pertenecen a la capa de' }] },
  { id: 'S3', name: 'Red', topics: ['T07'], ask: 2, layers: 3, kp: [{ topic: 'T07', index: 5, expect: 'identifica el origen y el destino' }] },
  { id: 'S4', name: 'Enlace y física', topics: ['T08', 'T02'], ask: 2, layers: 4, kp: [{ topic: 'T08', index: 3, expect: 'Enlace de datos' }] },
  { id: 'S5', name: 'El medio inalámbrico', topics: ['T02', 'T14'], ask: 1, layers: 4, kp: [{ topic: 'T02', index: 1, expect: 'ondas electromagnéticas' }] },
  { id: 'S6', name: 'Router de casa', topics: ['T04'], ask: 2, layers: 4, kp: [{ topic: 'T04', index: 1, expect: 'reparte la conexión' }] },
  { id: 'S7', name: 'Cable e Internet', topics: ['T02', 'T03', 'T04', 'T14'], ask: 2, layers: 4, kp: [{ topic: 'T04', index: 3, expect: 'la interconexión de muchas LAN' }] },
  { id: 'S8', name: 'Servidor', topics: ['T05', 'T12', 'T11'], ask: 2, layers: 1, kp: [{ topic: 'T12', index: 4, expect: 'hacia el puerto 443 del servidor' }] },
  { id: 'S9', name: 'Epílogo', topics: ['T06', 'T13', 'T15'], ask: 2, layers: 1, kp: [{ topic: 'T13', index: 0, expect: '7 capas, modelo' }] }
];
