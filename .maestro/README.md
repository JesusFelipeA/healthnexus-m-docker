# Pruebas de extremo a extremo de la app con Maestro

Seis flujos que manejan la app en tu celular como lo haría un usuario y guardan capturas como evidencia:

| Flujo | Qué prueba |
| --- | --- |
| 01 | Login con credenciales incorrectas muestra el mensaje de error |
| 02 | Enfermería entra al Dashboard y su menú solo muestra sus módulos |
| 03 | Médico entra con contraseña y PIN (primero un PIN incorrecto) |
| 04 | Farmacia ve su resumen, sin pacientes ni botón de emergencia |
| 05 | Enfermería activa un código de emergencia y aparece en el Dashboard |
| 06 | Cerrar sesión regresa al login |

## Instalar Maestro (una vez)

1. Java 17 o superior. Puedes usar el de Android Studio:
   ```powershell
   setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
   ```
2. Descarga `maestro.zip` de la última versión en https://github.com/mobile-dev-inc/maestro/releases, descomprímelo en `C:\maestro` y agrega `C:\maestro\bin` al PATH.
3. Cierra y abre PowerShell y comprueba con `maestro --version`.

## Correr los flujos

Con la API local arriba, los usuarios `qa.*` creados, el celular conectado (`adb devices`) y la app de desarrollo instalada (`npm run android`, con `adb reverse tcp:3000 tcp:3000`):

```powershell
maestro test .maestro -e CLAVE="Qa-Hospital-2026!" -e PIN=2468 --format junit --output reporte-app.xml
```

- Corre un solo flujo: `maestro test .maestro\03-medico-pin.yaml -e CLAVE=... -e PIN=2468`
- Las capturas quedan en la carpeta `evidencia\`.
- El flujo 05 envía una notificación push real a los teléfonos con sesión en tu API local, y deja la emergencia activa (la colección de Postman las atiende).
- Si un paso no encuentra un elemento, abre `maestro studio`: muestra la pantalla y el selector correcto para cada elemento.
