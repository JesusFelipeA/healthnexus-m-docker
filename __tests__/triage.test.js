import { fmtDateTime, fmtMinutes, statusLabel, triageInfo } from '../src/utils/triage';

describe('utils/triage', () => {
  test('nivel de triage conocido y desconocido', () => {
    expect(triageInfo('rojo').label).toBe('Crítico');
    expect(triageInfo('amarillo').color).toBe('#F59E0B');
    expect(triageInfo('xyz').label).toBe('Sin clasificar');
  });
  test('formatos de fecha y minutos', () => {
    expect(fmtDateTime('2026-10-06 14:35:00')).toBe('06/10 14:35');
    expect(fmtMinutes(45)).toBe('45 min');
    expect(fmtMinutes(130)).toBe('2 h 10 min');
    expect(fmtMinutes(null)).toBe('');
  });
  test('estados', () => {
    expect(statusLabel('en_espera')).toBe('En espera');
  });
});

import { fmtDate } from '../src/utils/triage';
test('fmtDate', () => {
  expect(fmtDate('2026-10-06')).toBe('06/10/2026');
  expect(fmtDate(null)).toBe('');
});

// HU-43: los cinco niveles de triage tienen etiqueta y color propios
test('todos los niveles de triage (rojo, naranja, amarillo, verde, azul)', () => {
  const esperado = {
    rojo: ['Crítico', '#DC2626'],
    naranja: ['Muy urgente', '#EA580C'],
    amarillo: ['Urgente', '#F59E0B'],
    verde: ['Leve', '#16A34A'],
    azul: ['No urgente', '#2563EB'],
  };
  Object.entries(esperado).forEach(([nivel, [label, color]]) => {
    expect(triageInfo(nivel)).toEqual({ label, color });
  });
  expect(new Set(Object.values(esperado).map(([, c]) => c)).size).toBe(5);
  expect(triageInfo(null).label).toBe('Sin clasificar');
  expect(triageInfo(undefined).label).toBe('Sin clasificar');
});
