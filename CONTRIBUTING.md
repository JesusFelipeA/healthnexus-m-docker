# Cómo contribuir a HealthNexus Móvil

Gracias por ayudar. Esta guía explica cómo preparar tu entorno, cómo trabajar con ramas y qué debe cumplir un pull request para aceptarse.

## Antes de empezar

- Lee el [Código de conducta](CODE_OF_CONDUCT.md).
- Revisa los [issues abiertos](../../issues) para no duplicar trabajo. Si vas a hacer algo grande, abre primero un issue y coméntalo con el equipo.
- **Nunca** subas datos reales de pacientes, contraseñas, tokens, `ambientes.local.json`, `src/env.js`, llaves `.jks` ni `keystore.properties`.
- Para reportar una vulnerabilidad **no abras un issue público**: sigue la [Política de seguridad](SECURITY.md).

## Preparar el entorno

Requisitos: Node.js 22.11 o superior, JDK 17, Android Studio con el SDK de Android, y la API `healthnexus-api` en marcha.

```bash
git clone https://github.com/JesusFelipeA/healthnexus-m-docker.git
cd healthnexus-m-docker
npm install                  # también crea src/env.js con el ambiente dev
npx react-native start       # terminal 1
npx react-native run-android # terminal 2
```

Si prefieres Docker para las pruebas y el lint, consulta [docs/DOCKER.md](docs/DOCKER.md).

## Ramas

| Rama | Uso |
|---|---|
| `main` | Lo que se publica. El CI genera el APK desde aquí. No se hace push directo. |
| `development` | Integración. Aquí llegan los PR. |
| `feature/<descripcion-corta>` | Funciones nuevas, por ejemplo `feature/filtro-pacientes` |
| `fix/<descripcion-corta>` | Corrección de errores, por ejemplo `fix/login-401` |
| `docs/<descripcion-corta>` | Solo documentación |

Crea tu rama a partir de `development` y abre el PR hacia `development`.

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/), en español y en modo imperativo:

```
feat: agrega filtro por nivel de triage en Pacientes
fix: corrige cierre de sesión al recibir 401
style: aplica colores del tema en Existencias
test: agrega prueba de contraste en tema oscuro
docs: actualiza guía de Docker
chore: sube hnVersionCode a 12
```

## Estilo de código

- ESLint con la configuración `@react-native` y Prettier (`.prettierrc.js`). Ejecuta `npm run lint` antes de subir.
- **No escribas colores fijos** (`'#fff'`, `'#102A6A'`). Usa los del tema (`colors.surface`, `colors.text`…) y `conTema` para estilos nuevos.
- Una función por endpoint en `src/api/index.js`; las pantallas no llaman a `fetch` directamente.
- Los permisos por rol se validan con `can(...roles)` de `AuthContext`. Recuerda que la API los vuelve a validar.
- Agrega `accessibilityLabel` a los botones e íconos sin texto (ver [ACCESSIBILITY.md](ACCESSIBILITY.md)).

## Pruebas

```bash
npm test                      # Jest
npm run test:coverage         # con cobertura
docker compose run --rm test  # lo mismo, en Docker
```

- Toda función nueva o corrección debe llevar su prueba en `__tests__/`.
- Si cambias un flujo de pantalla, actualiza o agrega el flujo de Maestro en `.maestro/`.
- `__tests__/tema.test.js` revisa el contraste AA en los dos temas; no debe fallar.

## Pull requests

1. Actualiza tu rama con `development` antes de abrir el PR.
2. Llena la plantilla del PR: qué cambia, por qué, cómo probarlo y capturas si hay cambios visuales (en claro y en oscuro).
3. El CI (lint y pruebas) debe pasar en verde.
4. Se necesita al menos una aprobación de otro integrante antes de hacer merge.
5. Si tu cambio es nativo (`android/`, permisos o librerías nuevas), indícalo: hay que recompilar con `run-android`.

## Publicar una versión

Solo los mantenedores publican en Google Play. El proceso completo está en [docs/PLAY_STORE.md](docs/PLAY_STORE.md). En cada publicación se sube `hnVersionCode` en `android/gradle.properties` y la versión en `package.json`, y se registra el cambio en `CAMBIOS.md`.
