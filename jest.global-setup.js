// Antes de las pruebas: si falta src/env.js (clon nuevo o servidor de CI), se genera con el ambiente dev.
// src/env.js no se sube a Git (lo escribe scripts/set-env.js); sin él, 6 suites no pueden importar src/config.js.
const { ambienteActual, escribir } = require('./scripts/set-env');

module.exports = () => {
  if (!ambienteActual()) escribir('dev');
};
