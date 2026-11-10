// Prueba fallida a propósito para validar que el pipeline bloquea cambios rotos (CP-SIT-23).
// NO fusionar: el pull request se cierra y la rama se borra al terminar la prueba.
describe('CP-SIT-23', () => {
  test('el pipeline detecta una prueba fallida', () => {
    expect(1 + 2).toBe(2);
  });
});
