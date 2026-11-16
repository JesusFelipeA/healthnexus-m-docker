# Pruebas de extremo a extremo de la app con Maestro

Ocho flujos que manejan la app en tu celular como lo haría un usuario y guardan capturas como evidencia:

| Flujo | Qué prueba |
| --- | --- |
| 01 | Login con credenciales incorrectas muestra el mensaje de error |
| 02 | Enfermería entra al Dashboard y su menú solo muestra sus módulos |
| 03 | Médico entra con contraseña y PIN (primero un PIN incorrecto) |
| 04 | Farmacia ve su resumen, sin pacientes ni botón de emergencia |
| 05 | Enfermería activa un código de emergencia y aparece en el Dashboard |
| 06 | Cerrar sesión regresa al login |
| 07 | Recuperar contraseña: correo, código (un código incorrecto da un mensaje genérico) y regreso al login |
| 08 | Apariencia: elegir tema oscuro en la barra lateral y que se conserve al reiniciar la app |
| 09 | Modo sin conexión: registrar signos vitales en modo avión y que se envíen solos al reconectar (carpeta `sin-conexion/`, ver abajo) |

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
- El flujo 07 pide un código real a la API (cuenta para el límite de 3 por hora por correo); el código queda en los logs de la API en desarrollo.
- Si un paso no encuentra un elemento, abre `maestro studio`: muestra la pantalla y el selector correcto para cada elemento.

## Flujo 09: modo sin conexión

Está en `.maestro/sin-conexion/` para que `maestro test .maestro` no lo corra con los demás, porque pide tres condiciones:

1. **La app llega a la API por wifi o internet**: un APK de staging o prod, o la IP de tu PC en `ambientes.local.json`. Con `adb reverse` la conexión va por el cable USB y el modo avión no la corta.
2. **Maestro 1.39 o superior** (usa `setAirplaneMode`, solo Android).
3. **`PACIENTE`**: el nombre, o parte de él, de un paciente que vea `qa.enfermeria`.

```powershell
maestro test .maestro\sin-conexion -e CLAVE="Qa-Hospital-2026!" -e PACIENTE="Laura" --format junit --output reporte-sin-conexion.xml
```

El flujo hace esto:

1. Entra con conexión, para que la app guarde la lista de pacientes en el teléfono.
2. Activa el modo avión.
3. Registra signos y comprueba que aparecen como "Pendiente de enviar".
4. Desactiva el modo avión y espera hasta 60 s a que el registro quede como "Capturado sin conexión".

Al terminar, el modo avión queda apagado.
