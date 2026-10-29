# Política de privacidad de HealthNexus (plantilla)

> **Plantilla orientativa.** Reemplaza los textos entre [corchetes], confirma cada afirmación con tu infraestructura
> real y pide que la revise un asesor legal (en México, aplica la Ley Federal de Protección de Datos Personales en
> Posesión de los Particulares y, si la institución es pública, la normativa que le corresponda).
> Publícala en una URL pública (no PDF) y pon esa URL en Play Console.

**Última actualización:** [FECHA]
**Responsable del tratamiento:** [NOMBRE DE LA INSTITUCIÓN], con domicilio en [DOMICILIO]. Contacto: [CORREO DE CONTACTO].

## 1. A quién va dirigida
HealthNexus es una herramienta para el personal de salud de [INSTITUCIÓN]. Las cuentas las crea y administra la institución; la app no permite registrarse por cuenta propia ni está dirigida a menores de edad.

## 2. Qué datos se tratan
| Datos | Cómo se obtienen | Para qué |
|---|---|---|
| Correo y contraseña de la cuenta | Los escribe el usuario al iniciar sesión | Autenticar al usuario y aplicar los permisos de su rol |
| Nombre y rol del usuario | De la cuenta creada por la institución | Mostrar el perfil y controlar el acceso |
| Datos de pacientes (identificación, contacto, triage, signos vitales, medicación, traslados) | Los captura el personal autorizado | Atención y gestión hospitalaria |
| Ubicación del dispositivo | Solo si el usuario concede el permiso, y únicamente en la pantalla de hospitales cercanos | Ordenar los hospitales por distancia |
| Registro de actividad (acción, usuario, fecha, dirección IP) | Automático en el servidor | Seguridad y auditoría |

## 3. Cómo se protegen
- La comunicación con el servidor usa HTTPS.
- Las contraseñas se guardan cifradas con un algoritmo de hash (bcrypt); la app no las almacena.
- El token de sesión se guarda en el almacenamiento seguro del dispositivo (Android Keystore).
- El acceso a cada módulo depende del rol del usuario y se valida en el servidor.
- Las acciones relevantes se registran en una bitácora de auditoría.
- [DESCRIBE copias de seguridad, ubicación y proveedor del servidor, plazos de conservación].

## 4. Con quién se comparten
No se venden ni se comparten datos con fines publicitarios. Los datos pueden ser tratados por [PROVEEDOR DE INFRAESTRUCTURA] únicamente para alojar el servicio, y se comunican a las autoridades cuando una ley lo exija.

## 5. Permisos del dispositivo
- **Ubicación:** opcional; si la niegas, la lista de hospitales se muestra sin distancia.
- **Internet:** necesario para comunicarse con el servidor.

## 6. Conservación y derechos
Los datos se conservan [PLAZO] o el tiempo que exija la normativa sanitaria aplicable. Puedes solicitar acceso, rectificación, cancelación u oposición, o la baja de tu cuenta, escribiendo a [CORREO DE CONTACTO].

## 7. Cambios
Si esta política cambia, se publicará la nueva versión en esta misma dirección con su fecha.
