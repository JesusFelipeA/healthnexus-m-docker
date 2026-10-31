# HealthNexus – App móvil (React Native CLI)

App Android hecha con **React Native CLI 0.87** que consume la API REST `healthnexus-api`.

## Requisitos
- **Node.js 22.11 o superior** (lo exige React Native 0.87).
- JDK 17 o superior, Android Studio con SDK de Android y un emulador (o un celular con depuración USB).
  Guía oficial de entorno: https://reactnative.dev/docs/set-up-your-development-environment
- La API `healthnexus-api` en marcha.

## Puesta en marcha
```
npm install
npx react-native start        # terminal 1: Metro
npx react-native run-android  # terminal 2: instala la app en el emulador/celular
```
Inicia sesión con un usuario de tu tabla `users`.

## Ambientes y URL de la API
La app no tiene secretos (todo lo del APK se puede extraer); por ambiente solo cambia la URL de la API. Las URL están en `ambientes.json` y `scripts/set-env.js` escribe `src/env.js` (fuera de Git), que lee `src/config.js`.

| Ambiente | URL | Cómo se usa |
|---|---|---|
| `dev` | `http://10.0.2.2:3000/api` (emulador) | `npm run env:dev` · se crea solo al hacer `npm install` |
| `staging` | URL HTTPS del servidor de QA | `npm run env:staging` · `npm run release:apk:staging` |
| `prod` | `https://healthnexus.duckdns.org/api` | `npm run release:apk` · `npm run release:aab` (siempre prod) |

- **Celular físico:** copia `ambientes.local.json.example` como `ambientes.local.json` (no se sube a Git), pon la IP de tu PC y ejecuta `npm run env:dev`.
- `npm run env:ver` muestra el ambiente actual. En la pantalla de inicio de sesión, junto a la versión, aparece `DEV` o `STAGING` cuando no es producción.
- Los comandos de release cambian a su ambiente solo mientras compilan y luego regresan al anterior. Staging y prod exigen HTTPS y una URL real (no `TU-DOMINIO`).

- En **debug** Android permite HTTP; en **release** solo HTTPS, así que publica la API con HTTPS antes de generar el APK.
- Si usas celular físico por USB, también sirve `adb reverse tcp:3000 tcp:3000` y la URL `http://localhost:3000/api`.
- Agrega la IP/origen a `CORS_ORIGINS` solo si pruebas desde navegador; las apps nativas no usan CORS.

## Docker en la app

La app Android corre en un emulador o celular, no en un contenedor. Docker se usa para lo que sí es de servidor: las pruebas, el lint y la compilación firmada del release. Los archivos están en la raíz del proyecto:

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile.dev` y `docker-compose.yml` | Node 22 para correr Metro, las pruebas (`test`) y el lint (`lint`) |
| `Dockerfile.build` | Imagen con JDK 17, Android SDK, NDK y Node 22 para generar el AAB/APK de release |
| `.dockerignore` | Deja fuera `node_modules`, carpetas de compilación y llaves de firma |
| `.gitattributes` | Fuerza saltos de línea LF para que `gradlew` funcione dentro de Linux |
| `docs/DOCKER.md` | Esta misma guía con más detalle |

### Desarrollo
```
docker compose run --rm test      # pruebas Jest
docker compose run --rm lint      # ESLint
```
Para **Metro** hay dos formas:

| Forma | Comandos | Cuándo usarla |
|---|---|---|
| En Windows (recomendada) | `npm start` | Detecta tus cambios al instante |
| En Docker | `docker compose up -d metro` | Si el proyecto está dentro de WSL; en `C:\` a veces no ve los cambios y hay que ejecutar `docker compose restart metro` |

Luego, con el celular conectado por USB y la depuración USB activa:
```
adb reverse tcp:8081 tcp:8081
npx react-native run-android --no-packager --active-arch-only
```
- `--no-packager` evita abrir otro Metro (usa el que ya corre en el puerto 8081).
- `--active-arch-only` compila solo la arquitectura de tu dispositivo; sin esta opción, en equipos con poca memoria la compilación puede fallar con "insufficient memory".
- Si cambias archivos de `src/`, la app se actualiza sola (Fast Refresh); si no, agita el celular y elige **Reload**. Solo recompila (`run-android`) cuando cambias algo nativo (`android/`, permisos o librerías nuevas).

### Compilar el release con Docker (AAB firmado)
1. Una sola vez, construye la imagen: `docker build -f Dockerfile.build -t healthnexus-android-build .`
2. Guarda el `.jks` y un `keystore.properties` **fuera del proyecto** (por ejemplo `C:\llaves\`); en ese archivo usa `storeFile=/secrets/healthnexus-upload.jks`.
3. Revisa que la URL de `prod` en `ambientes.json` sea la HTTPS real de tu API.
4. Compila (PowerShell):
   ```
   docker run --rm `
     -v "${PWD}:/app" `
     -v hn_node_modules:/app/node_modules `
     -v hn_gradle_cache:/root/.gradle `
     -v "C:/llaves/healthnexus-upload.jks:/secrets/healthnexus-upload.jks:ro" `
     -v "C:/llaves/keystore.properties:/app/android/keystore.properties:ro" `
     healthnexus-android-build `
     sh -c "npm ci && npm run release:aab"
   ```
5. El AAB queda en `android/app/build/outputs/bundle/release/`. Sube `hnVersionCode` en cada publicación.

La llave de firma se monta solo mientras se compila; nunca entra a la imagen ni a Git (`.gitignore` y `.dockerignore` excluyen `*.jks` y `keystore.properties`). Asigna a Docker Desktop al menos 8 GB de memoria.

## Publicar en Google Play
Guía completa, textos de la ficha y lista final: **[docs/PLAY_STORE.md](docs/PLAY_STORE.md)**. Resumen:
```
# 1) Una sola vez: crea tu llave (ver la guía) y copia android/keystore.properties.example → keystore.properties
# 2) La URL de producción está en ambientes.json ("prod")
npm run release:check     # revisa URL, llave, versión, iconos y permisos
npm run release:apk       # APK para probar en un celular real
npm run release:aab       # AAB que se sube a Play Console
```
En cada publicación sube `hnVersionCode` en `android/gradle.properties`. Plantilla de política de privacidad: [docs/POLITICA_DE_PRIVACIDAD.md](docs/POLITICA_DE_PRIVACIDAD.md). Gráficos para la ficha: carpeta `play-store/`.

## Estructura
```
App.js                      # navegación (pantallas según el rol)
src/
├── config.js               # URL de la API (lee src/env.js, generado por scripts/set-env.js)
├── api/client.js           # fetch base: token, errores, 401 → cierra sesión
├── api/index.js            # una función por endpoint
├── context/AuthContext.js  # sesión, rol y can(...roles)
├── services/secureStorage.js  # token cifrado (react-native-keychain / Keystore)
├── services/geolocation.js    # GPS para hospitales cercanos
├── hooks/useFetch.js
├── utils/triage.js         # niveles de triage, estados, formatos
├── theme/paletas.js        # colores del tema claro y oscuro (colors, conTema, insignias de triage)
├── theme/TemaContext.js    # tema Auto / Claro / Oscuro (se elige en la barra lateral)
├── components/ui.js        # Screen, Card, Field, SelectField, Button, Chip, TriageBadge, Toast, Skeleton...
├── components/EmergencyButton.js
├── screens/recuperar/      # recuperar contraseña: correo → código de 6 dígitos → contraseña nueva → listo
└── screens/                # Login, Dashboard, Triage, Patients, Internas, Externas, Hospitals,
                            # Seguimiento, Auditoria, SignosVitales, Medicacion,
                            # Medicamentos, Existencias, Movimientos, AlertasFarmacia
```

## Qué ve cada rol
| Pantalla | Roles |
|---|---|
| Triage, Pacientes, Derivaciones internas, Hospitales, Seguimiento | médico, enfermería |
| Derivaciones externas | médico (reservar cama en Hospitales: solo médico) |
| Signos vitales, Medicación | enfermería registra · médico solo consulta |
| Existencias por lote | farmacia, enfermería, médico (solo lectura, excepto farmacia) |
| Movimientos de inventario | farmacia registra · enfermería solo consulta |
| Medicamentos, Alertas de inventario | farmacia |
| Auditoría | solo administrador |
| Cuentas, estado de cuenta y recibos en PDF (descargar y compartir) | solo administrador |

El administrador ve todo. La API vuelve a validar los permisos en el servidor (los permisos coinciden con los de tu tabla `permissions`).
Para probar enfermería y farmacia crea usuarios con `scripts/crear-usuario.js` (ver README de la API).

## Apariencia (tema claro y oscuro)

En la barra lateral, **Apariencia** ofrece *Auto* (sigue el tema del teléfono), *Claro* y *Oscuro*. La elección se guarda en el teléfono (con `react-native-keychain`, en un servicio aparte del token) y se conserva al reiniciar la app.

Cómo funciona: `src/theme/paletas.js` define las dos paletas con los mismos nombres de color. `colors` es un solo objeto que se actualiza al cambiar de tema, y `App.js` vuelve a montar las pantallas conservando la pantalla actual. Para estilos nuevos usa `conTema`:
```js
const estilos = conTema((c) => StyleSheet.create({ caja: { backgroundColor: c.surface, borderColor: c.line } }));
function MiPantalla() { const s = estilos(); /* ... */ }
```
No escribas colores fijos (`'#fff'`, `'#102A6A'`): usa `colors.surface`, `colors.text`, `colors.onPrimary`, etc. Las pruebas (`__tests__/tema.test.js`) revisan que todos los textos tengan contraste AA en los dos temas.

## Recuperar contraseña

En el login, **¿La olvidaste?** abre el flujo: correo → código de 6 dígitos (vence en 15 minutos; se puede pedir otro a los 60 s) → contraseña nueva (8+ caracteres, una mayúscula y un número) → listo. La contraseña nueva sirve en la app y en la web, y las sesiones abiertas de la app se cierran. El **PIN del médico no se recupera por correo**: lo regenera el administrador en la web. Requiere la versión de la API con `/auth/recuperar` y la tabla `database/recuperacion.sql`.

## Notificaciones push (Firebase Cloud Messaging)

Al iniciar sesión, la app pide permiso de notificaciones (Android 13 o superior), obtiene el token del teléfono y lo registra en la API (`POST /notificaciones/token`, ligado a la huella del dispositivo). Al cerrar sesión lo borra. Llegan avisos de **código de emergencia** (médicos y enfermería) y de **paciente en nivel I** (médicos); al tocarlos se abre el Dashboard o Triage. Los mensajes no llevan nombres ni datos clínicos.

**Para activarlas en tu equipo:**
1. En la consola de Firebase, en el proyecto de HealthNexus, agrega la app Android con el paquete `com.healthnexusapp` y descarga `google-services.json`.
2. Cópialo en `android/app/google-services.json`. **No se sube al repo** (está en `.gitignore`); pásalo al equipo por un canal privado.
3. Compila de nuevo: `npm run android` (o `npm run release:apk`).

Sin ese archivo la app compila y funciona igual, solo que sin notificaciones. Las alertas usan el canal "Alertas de HealthNexus" con importancia alta (se crea en `MainApplication.kt`).

## Librerías nativas usadas
`@react-navigation/native` + `native-stack`, `react-native-screens`, `react-native-safe-area-context`,
`react-native-keychain` (token seguro), `@react-native-community/geolocation` (GPS),
`react-native-blob-util` (descarga el recibo PDF con el token) y `react-native-share` (compartirlo), `@react-native-firebase/app` y `messaging` (notificaciones push), `react-native-vector-icons` (Ionicons; la fuente ya está enlazada en `android/app/build.gradle`).

## Pruebas
`npm test` (utilidades, emergencias, derivaciones, cuentas, recibos, tema claro/oscuro, recuperar contraseña y las pantallas rediseñadas). Pruebas de extremo a extremo con Maestro en `.maestro/` (ver su README).

## Pendiente
- Escaneo de paciente con la cámara.
- Dispensación de recetas (farmacia) y descuento de inventario al administrar medicación.
- Solo está configurado Android; la carpeta `ios/` es la del proyecto base y no se probó.
