// Igual que jest.config.js, pero además genera un reporte JUnit (XML):
//   npm run test:junit  ->  reportes/junit-app.xml
// Un <testsuite> por archivo de __tests__; lo leen Jenkins (junit 'reportes/*.xml'),
// GitHub Actions, Azure DevOps y cualquier visor de JUnit.
const base = require('./jest.config');

const modulo = (archivo) => archivo.replace(/\.test\.[jt]sx?$/, '');

module.exports = {
  ...base,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './reportes',
      outputName: 'junit-app.xml',
      suiteName: 'HealthNexus app móvil',
      suiteNameTemplate: (v) => modulo(v.filename),
      // Las pruebas sueltas (sin describe) quedan con el nombre del archivo como clase
      classNameTemplate: (v) => `app.${modulo(v.filename)}${v.classname ? ` › ${v.classname}` : ''}`,
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      addFileAttribute: 'true',
      reportTestSuiteErrors: 'true',
    }],
  ],
};
