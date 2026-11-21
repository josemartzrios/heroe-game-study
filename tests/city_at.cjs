// La ciudad real tal como estaba al cerrar una tanda: los mismos datos, pero solo con los distritos de esa tanda registrados.
// Las pruebas de la Tanda 3 comparan textos y rangos de "8 distritos"; con cityAt(city, TANDA3) no se rompen cuando se registren M05, M09 o M11.
const TANDA3 = ['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07'];

// city: el objeto de city/districts.mjs; ids: los distritos que se quedan (los que no estén registrados se ignoran, el orden es el de ids).
function cityAt(city, ids) {
  const has = (id) => Object.prototype.hasOwnProperty.call(city.districts, id);
  return Object.assign({}, city, { districts: Object.fromEntries(ids.filter(has).map((id) => [id, city.districts[id]])) });
}

module.exports = { TANDA3, cityAt };
