# Guía para publicar HealthNexus en Google Play

> Esta guía resume lo que hay que hacer. Los requisitos de Google cambian con frecuencia: confirma cada punto en la
> [Play Console](https://play.google.com/console) antes de enviar. Lo marcado como **(verificado)** se comprobó en la
> documentación oficial de Google en octubre de 2026.

## 0. Lo que ya está listo en este proyecto
| Requisito | Estado |
|---|---|
| Nivel de API objetivo | `targetSdk 36` **(verificado: las apps nuevas deben apuntar a Android 16, API 36, desde el 31/08/2026)** |
| Formato de entrega | AAB (`npm run release:aab`) |
| Firma de release | Lee `android/keystore.properties` (tú generas la llave, paso 1) |
| Versión | `hnVersionCode` y `hnVersionName` en `android/gradle.properties` |
| Reducción y ofuscación (R8) | Activada en release (`hnMinify=true`) |
| Icono de la app | Adaptable + temático (Android 13+) + clásico; sin el robot de Android |
| Icono de Play Store (512×512) | `play-store/icon-512.png` |
| Gráfico de funciones (1024×500) | `play-store/feature-graphic-1024x500.png` |
| Tráfico | Solo HTTPS en release (Android bloquea HTTP) |
| Copias de seguridad de Android | Desactivadas (`allowBackup=false`) |
| Permisos | `INTERNET`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` (la ubicación solo se pide en «Hospitales») |

## 1. Crear tu llave de subida (una sola vez)
En la carpeta `android/`:
```
keytool -genkeypair -v -storetype PKCS12 -keystore healthnexus-upload.jks -alias healthnexus-upload -keyalg RSA -keysize 2048 -validity 10000
```
1. Copia `keystore.properties.example` como `keystore.properties` y pon tus contraseñas.
2. **Guarda el `.jks` y las contraseñas en un lugar seguro y con respaldo.** No se suben a Git (ya están en `.gitignore`).
3. Al crear la app en Play Console deja activado **Play App Signing**: Google guarda la llave final y tu `.jks` es solo la llave de subida.

## 2. Configurar la URL de producción
En `ambientes.json`, la URL de `prod` debe ser la **HTTPS** real de tu API (hoy `https://healthnexus.duckdns.org/api`). `npm run release:aab` siempre compila contra `prod`.
Con `npm run release:check` el proyecto te avisa si falta algo.

## 3. Probar la versión release en un celular real (antes de subir nada)
```
npm install
npm run release:check
npm run release:apk
```
El APK queda en `android/app/build/outputs/apk/release/app-release.apk`. Instálalo con `adb install -r app-release.apk` y prueba:
- Inicio de sesión con cada rol (administrador, médico, enfermería, farmacia) contra la API de producción.
- Que cada pantalla cargue datos y que los formularios largos se puedan llenar con el teclado abierto.
- Que el botón rojo de emergencia no quede tapado por la barra de navegación del sistema.
- La ventana de permiso de ubicación en «Hospitales» y que la lista funcione si la niegas.
- Que no se cierre la app al navegar (así se descarta un problema de R8; si ocurre, pon `hnMinify=false`, repite y avísanos del error).

## 4. Generar el AAB que se sube
```
npm run release:aab
```
Resultado: `android/app/build/outputs/bundle/release/app-release.aab`.
En **cada** nueva versión sube `hnVersionCode` (entero mayor al anterior) y, si quieres, `hnVersionName`.

## 5. Play Console
1. **Crear la app**: nombre «HealthNexus», idioma español, tipo *App*, gratuita.
2. **Cuenta personal nueva**: si tu cuenta de desarrollador es personal y se creó después del 13/11/2023, necesitas una **prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de pedir acceso a producción **(verificado)**. Planéalo con tiempo: reúne a los 12 testers desde ahora. Las cuentas de organización no tienen este requisito.
3. **Ficha de la tienda** (textos propuestos más abajo): icono 512, gráfico de funciones 1024×500 y **mínimo 2 capturas de pantalla del teléfono** (las debes tomar tú desde el emulador o un celular; no se incluyen).
4. **Política de privacidad**: una URL pública (no PDF). Parte de `docs/POLITICA_DE_PRIVACIDAD.md` y que la revise un asesor legal.
5. **Acceso a la app**: como el inicio de sesión es obligatorio, entrega a los revisores un usuario y contraseña de prueba (con datos ficticios).
6. **Seguridad de los datos** (propuesta más abajo) y **declaración de apps de salud** (obligatoria para todas las apps **(verificado)**): responde con lo que la app hace realmente.
7. **Clasificación de contenido**, **público objetivo** (solo adultos, es una herramienta de personal) y **anuncios** (la app no tiene).
8. **Categoría**: «Medicina» o «Salud y bienestar»; elige según lo que la app hace y lee los requisitos de esa categoría.
9. Crear la versión en **prueba cerrada** → subir el AAB → enviar a revisión.

> Si HealthNexus será solo para el personal de una institución, evalúa también la **distribución privada** de Google Play
> para organizaciones, que evita la publicación abierta. Consúltalo en la documentación de Google Play.

## 6. Textos propuestos para la ficha (español)
**Título (11/30):** HealthNexus

**Descripción corta (77/80):** Gestión hospitalaria: pacientes, triage, derivaciones y farmacia en tu móvil.

**Descripción completa:**
```
HealthNexus es la aplicación móvil del sistema de gestión hospitalaria HealthNexus para el personal de salud.
Requiere una cuenta proporcionada por tu institución.

Según tu rol (administrador, médico, enfermería o farmacia) puedes:
• Registrar y clasificar pacientes con triage
• Consultar y gestionar pacientes y su seguimiento
• Gestionar derivaciones internas y externas
• Ver hospitales cercanos y su disponibilidad de camas
• Registrar signos vitales y la administración de medicamentos
• Consultar el inventario de farmacia, sus lotes, caducidades y movimientos
• Revisar la bitácora de auditoría
• Activar un código de emergencia

La información se transmite cifrada y el acceso depende de tu rol.
```
> Ajusta la lista a lo que tu versión realmente incluya. No prometas funciones que la app no tenga.

## 7. Formulario de seguridad de los datos (propuesta; confírmala con tu equipo)
| Dato | ¿Se recopila? | Para qué | ¿Se comparte? |
|---|---|---|---|
| Nombre y correo (cuenta) | Sí | Funcionalidad y administración de la cuenta | No |
| Información de salud (datos de pacientes capturados por el personal) | Sí | Funcionalidad de la app | No |
| Ubicación (precisa) | Sí, si el servidor la procesa; la app solo la envía para ordenar hospitales por cercanía | Funcionalidad | No |
| Registro de actividad (acciones, fecha, IP en el servidor) | Sí | Seguridad y auditoría | No |
- Datos **cifrados en tránsito**: sí (HTTPS en producción).
- Eliminación de datos: las cuentas las administra la institución; indica un correo de contacto para solicitarla.
- Si el servidor no guarda la ubicación y solo la usa en el momento de responder, revisa en las definiciones de Google si cuenta como «recopilada» o «procesada de forma efímera».

## 8. Lista final
- [ ] `ambientes.json` → `prod` apunta a tu API real con HTTPS
- [ ] `keystore.properties` y `.jks` creados y respaldados
- [ ] `npm run release:check` sin errores
- [ ] APK release probado en un celular real con los 4 roles
- [ ] Capturas de pantalla, política de privacidad y usuario de prueba listos
- [ ] 12 testers reunidos (si la cuenta es personal nueva)
- [ ] `hnVersionCode` mayor al de la versión anterior
