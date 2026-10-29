/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registrarSegundoPlano } from './src/services/push';

// Debe registrarse antes de montar la app para recibir avisos con la app cerrada
registrarSegundoPlano();

AppRegistry.registerComponent(appName, () => App);
