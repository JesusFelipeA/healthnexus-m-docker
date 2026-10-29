module.exports = {
  preset: '@react-native/jest-preset',
  // HU-43: reporte de cobertura con `npm run test:coverage` (se genera en coverage/)
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/img/**'],
  coverageReporters: ['text-summary', 'text', 'lcov'],
};
