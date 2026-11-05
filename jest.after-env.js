/* eslint-env jest */
// Después de cada prueba se desmontan las pantallas que quedaron montadas.
// Así ningún efecto pendiente (búsquedas con espera, cargas de la API) se ejecuta cuando Jest ya
// cerró el entorno, que es lo que provocaba "import a file after the Jest environment has been torn down".
const ReactTestRenderer = require('react-test-renderer');
const { act } = ReactTestRenderer;

const montados = new Set();
const crearOriginal = ReactTestRenderer.create;
ReactTestRenderer.create = (...args) => {
  const r = crearOriginal(...args);
  const desmontar = r.unmount.bind(r);
  r.unmount = (...a) => { montados.delete(r); return desmontar(...a); };
  montados.add(r);
  return r;
};

afterEach(() => {
  for (const r of [...montados]) {
    try { act(() => r.unmount()); } catch (e) { /* ya estaba desmontado */ }
  }
  montados.clear();
});
