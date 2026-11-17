# Política de seguridad

HealthNexus maneja información clínica (pacientes, signos vitales, medicación y traslados), así que tomamos en serio cualquier reporte de seguridad.

## Versiones con soporte

| Versión | Soporte |
|---|---|
| 1.1.x (actual en `main`) | ✅ Sí |
| 1.0.x | ❌ No: actualiza a la versión más reciente |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa cualquiera de estos canales privados:

1. **GitHub (preferido):** en la pestaña **Security** del repositorio, elige **Report a vulnerability**.
2. **Correo:** al222310418@gmail.com, con el asunto `[SEGURIDAD] HealthNexus Móvil`.

Incluye, si puedes:

- Qué componente afecta (app móvil, comunicación con la API, almacenamiento local, compilación o Docker).
- Pasos para reproducirlo y la versión de la app (aparece en la pantalla de inicio de sesión).
- El impacto posible (por ejemplo, acceso a datos de otro rol o exposición del token).
- Una prueba de concepto, **sin datos reales de pacientes**.

## Qué puedes esperar

| Etapa | Plazo |
|---|---|
| Acuse de recibo | 72 horas |
| Evaluación inicial y severidad | 7 días |
| Corrección de fallas críticas o altas | Lo antes posible, normalmente en menos de 30 días |

Te avisaremos cuando se publique la corrección y, si quieres, te daremos crédito en `CAMBIOS.md`.

## Alcance

**Sí entra:**
- El código de este repositorio (app React Native, scripts, Dockerfiles y el workflow de CI).
- La forma en que la app guarda el token (`react-native-keychain`) y se comunica con la API.
- La validación de permisos por rol del lado de la app.

**No entra (repórtalo en su propio repositorio):**
- Fallas de la API `healthnexus-api` o de la web Laravel.
- Ataques que requieren un teléfono con root o desbloqueado y acceso físico al dispositivo.
- Denegación de servicio, ingeniería social o spam.

## Buenas prácticas del proyecto

- La app no guarda secretos: todo lo que va dentro del APK se puede extraer, así que solo contiene la URL de la API por ambiente.
- En release, Android solo permite HTTPS.
- El token se guarda cifrado con el Keystore de Android, y un 401 cierra la sesión.
- Las llaves de firma nunca entran a Git ni a la imagen de Docker (`.gitignore` y `.dockerignore`).
- La API vuelve a validar los permisos de cada rol en el servidor.
