module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Genera src/env.js si falta (clon limpio o CI) y desmonta las pantallas al final de cada prueba
  globalSetup: './jest.global-setup.js',
  setupFilesAfterEnv: ['./jest.after-env.js'],
  // HU-43: reporte de cobertura con `npm run test:coverage` (se genera en coverage/)
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/img/**'],
  coverageReporters: ['text-summary', 'text', 'lcov'],
};
