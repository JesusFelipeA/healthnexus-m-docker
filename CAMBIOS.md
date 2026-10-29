# Cambios de esta versión (preparación para Google Play)

Alcance: **mejoras visuales y de empaquetado. No se cambió ninguna funcionalidad**: mismas pantallas, mismos endpoints,
mismas reglas por rol y mismo flujo de uso.

## Visual (código de la app)
| Cambio | Archivos |
|---|---|
| Los estados clínicos usan colores con significado: **rojo** = peligro/crítico/vencido/sin stock/error, **ámbar** = advertencia/por caducar/stock bajo, **verde** = correcto. Antes aparecían en azul marino y lavanda porque `coral` y `amber` se habían convertido en tonos de la marca | `ui.js` (tokens `danger`, `warning`, `success`), `Dashboard`, `Auditoria`, `Existencias`, `Medicamentos`, `Medicacion`, `Movimientos`, `AlertasFarmacia` |
| Inicio de sesión con la misma paleta que el resto de la app (usaba una paleta café/verde distinta), barra de estado clara sobre la cabecera morada y espacio seguro bajo la barra de estado | `Login.js` |
| El Login muestra la versión real (`package.json`) en lugar de «v1.0» fijo | `Login.js`, `package.json` |
| Botón de emergencia respeta la barra de navegación del sistema (Android 15/16 dibuja de borde a borde), borde blanco y sombra | `EmergencyButton.js` |
| Pantalla de carga con el logo mientras se recupera la sesión (antes un círculo girando) | `SplashScreen.js`, `App.js` |
| Botones con retroalimentación al presionar y etiquetas de accesibilidad (lectores de pantalla) | `ui.js`, `EmergencyButton.js` |
| Paleta por defecto del paginador alineada con la marca | `Paginator.js` |
| Logo optimizado de 795 KB a 316 KB (mismo nombre y aspecto) | `src/img/logo-healthnexus.png` |

## Android (empaquetado)
| Cambio | Archivos |
|---|---|
| **Iconos**: el icono redondo seguía siendo el robot de Android; el icono normal llevaba el logo con texto ilegible a ese tamaño. Ahora usan el símbolo; hay icono adaptable (Android 8+), temático (Android 13+) y clásico | `res/mipmap-*`, `mipmap-anydpi-v26/*.xml`, `res/values/colors.xml` |
| Icono de Play Store 512×512 y gráfico de funciones 1024×500 | `res/playstore-icon.png`, `play-store/` |
| Tema claro fijo (la interfaz no tiene modo oscuro; los diálogos nativos salían oscuros en modo oscuro), fondo blanco de arranque y color de marca en cursor y selección | `res/values/styles.xml` |
| **Firma de release con tu propia llave** (antes se firmaba con la de debug, que Play rechaza) | `android/app/build.gradle`, `android/keystore.properties.example`, `.gitignore` |
| `versionCode`/`versionName` configurables desde `gradle.properties` | `android/gradle.properties`, `build.gradle` |
| R8 + reducción de recursos en release, con interruptor `hnMinify` | `build.gradle`, `proguard-rules.pro` |
| Scripts `release:check`, `release:apk`, `release:aab` | `scripts/`, `package.json` |

## Documentación y pruebas
- `docs/PLAY_STORE.md` (guía y textos de la ficha), `docs/POLITICA_DE_PRIVACIDAD.md` (plantilla).
- `__tests__/visual.test.js`: 10 pruebas nuevas de los cambios visuales (14 en total con las anteriores).

## Lo que NO se tocó (decisiones tuyas)
- `applicationId` / paquete `com.healthnexusapp`: es **permanente** una vez publicada la app. Decide antes de la primera subida.
- El botón «¿Olvidaste tu contraseña?» del Login no hace nada (ya era así). Conviene implementarlo u ocultarlo antes de publicar.
- La app usa el contrato anterior de la API para Pacientes y Triage (alta desde Triage). Si despliegas la API más reciente (alta completa en `POST /patients`), esas dos pantallas deben actualizarse.

## Cuentas y recibos (HU-74, HU-75) — solo administrador
| Cambio | Archivos |
|---|---|
| Pantallas **Cuentas** (lista con búsqueda, filtros y saldo pendiente) y **Estado de cuenta** (cargos, pagos con cancelados marcados, aviso si el saldo no cuadra) | `Cuentas.js`, `CuentaDetalle.js`, `App.js`, `Dashboard.js` |
| **Descargar** el recibo a la carpeta Descargas y **compartirlo** (WhatsApp, correo…) en PDF; el archivo temporal se borra al terminar | `services/recibos.js` |
| Cliente HTTP: `authHeaders`, `verificarTransporte` (HTTPS obligatorio también en descargas), `notificarNoAutorizado` | `api/client.js` |
| Formato de dinero sin `Intl` (Hermes) | `utils/dinero.js` |
| Librerías nuevas: `react-native-blob-util`, `react-native-share` (traen su propio FileProvider); permiso `WRITE_EXTERNAL_STORAGE` solo hasta Android 9 | `package.json`, `AndroidManifest.xml` |
| Pruebas: 8 de pantallas y 7 del servicio de recibos | `__tests__/cuentas.test.js`, `__tests__/recibos.test.js` |
