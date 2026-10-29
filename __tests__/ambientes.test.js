// Ambientes de la app (scripts/set-env.js): dev, staging y prod
const { resolverAmbiente, contenidoEnv } = require('../scripts/set-env');
const base = require('../ambientes.json');

describe('resolverAmbiente', () => {
  test('prod sale de ambientes.json y usa HTTPS', () => {
    expect(resolverAmbiente('prod', base)).toEqual({ url: 'https://healthnexus.duckdns.org/api' });
  });
  test('ambientes.local.json sobrescribe dev para usar el celular físico', () => {
    expect(resolverAmbiente('dev', base, { dev: { url: 'http://192.168.1.6:3000/api/' } })).toEqual({ url: 'http://192.168.1.6:3000/api' });
  });
  test('staging y prod no aceptan HTTP ni valores de ejemplo', () => {
    expect(resolverAmbiente('prod', { prod: { url: 'http://healthnexus.duckdns.org/api' } }).error).toMatch(/HTTPS/);
    expect(resolverAmbiente('staging', base).error).toMatch(/ejemplo/);
  });
  test('rechaza ambientes desconocidos y URL vacías', () => {
    expect(resolverAmbiente('qa', base).error).toMatch(/desconocido/);
    expect(resolverAmbiente('dev', {}).error).toMatch(/no tiene URL/);
  });
});

test('contenidoEnv genera el módulo que lee src/config.js', () => {
  const js = contenidoEnv('staging', 'https://qa.ejemplo.mx/api');
  expect(js).toContain("export const AMBIENTE = 'staging';");
  expect(js).toContain("export const API_URL = 'https://qa.ejemplo.mx/api';");
});

test('src/config.js expone la URL sin la diagonal final', () => {
  jest.isolateModules(() => {
    jest.doMock('../src/env', () => ({ AMBIENTE: 'dev', API_URL: 'http://10.0.2.2:3000/api/' }));
    const cfg = require('../src/config');
    expect(cfg.API_URL).toBe('http://10.0.2.2:3000/api');
    expect(cfg.AMBIENTE).toBe('dev');
  });
});
