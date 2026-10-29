// HU-40: validación de rangos de signos vitales
import { esAnormal, revisarSignos } from '../src/utils/signosVitales';

describe('revisarSignos', () => {
  test('sin ningún valor no se puede guardar', () => {
    expect(revisarSignos({ pacienteId: 1 }).error).toMatch(/al menos un signo/);
  });
  test('valores normales: sin error ni avisos', () => {
    expect(revisarSignos({ temperatura: 36.7, frecuenciaCardiaca: 72, frecuenciaRespiratoria: 16, saturacionOxigeno: 98, glucosa: 95, presionArterial: '120/80' }))
      .toEqual({ error: null, avisos: [] });
  });
  test('valores imposibles o mal escritos se bloquean', () => {
    expect(revisarSignos({ temperatura: 60 }).error).toMatch(/Temperatura fuera de lo posible/);
    expect(revisarSignos({ frecuenciaCardiaca: NaN }).error).toMatch(/solo números/);
    expect(revisarSignos({ frecuenciaCardiaca: 72.5 }).error).toMatch(/entero/);
    expect(revisarSignos({ presionArterial: '120-80' }).error).toMatch(/formato 120\/80/);
    expect(revisarSignos({ presionArterial: '80/120' }).error).toMatch(/diastólica/);
  });
  test('fuera del rango normal genera avisos (se guarda solo si confirman)', () => {
    const r = revisarSignos({ temperatura: 39.2, saturacionOxigeno: 88, presionArterial: '160/100', frecuenciaCardiaca: 80 });
    expect(r.error).toBeNull();
    expect(r.avisos).toHaveLength(3);
    expect(r.avisos.join(' ')).toMatch(/Temperatura: 39.2/);
    expect(r.avisos.join(' ')).toMatch(/Saturación de oxígeno: 88/);
    expect(r.avisos.join(' ')).toMatch(/Presión arterial: 160\/100/);
  });
  test('peso, talla y dolor no tienen rango normal: no avisan', () => {
    expect(revisarSignos({ peso: 120, talla: 1.9, escalaDolor: 8 }).avisos).toEqual([]);
  });
});

test('esAnormal resalta los valores fuera de rango en la lista', () => {
  expect(esAnormal('temperatura', '38.5')).toBe(true);
  expect(esAnormal('temperatura', 36.8)).toBe(false);
  expect(esAnormal('presionArterial', '150/95')).toBe(true);
  expect(esAnormal('presionArterial', '118/76')).toBe(false);
  expect(esAnormal('peso', 200)).toBe(false);
  expect(esAnormal('glucosa', null)).toBe(false);
});
