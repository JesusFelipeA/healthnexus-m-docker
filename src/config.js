// La URL de la API depende del ambiente elegido con npm run env:dev | env:staging | env:prod
// (scripts/set-env.js escribe src/env.js a partir de ambientes.json). Las versiones release
// se compilan con npm run release:aab / release:apk, que siempre usan prod.
import { AMBIENTE as AMBIENTE_ELEGIDO, API_URL as URL_AMBIENTE } from './env';

export const AMBIENTE = AMBIENTE_ELEGIDO;
export const API_URL = URL_AMBIENTE.replace(/\/$/, '');
