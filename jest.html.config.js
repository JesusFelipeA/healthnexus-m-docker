// Igual que jest.config.js, pero además genera un reporte HTML de un solo archivo:
//   npm run test:html   ->  reportes/reporte-app-jest.html
const base = require('./jest.config');

module.exports = {
  ...base,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reportes',
      filename: 'reporte-app-jest.html',
      pageTitle: 'HealthNexus · Pruebas de la app móvil (Jest)',
      expand: false,
      inlineSource: true, // todo en un solo .html (se puede enviar o abrir sin servidor)
      darkTheme: false,
    }],
  ],
};
