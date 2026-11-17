# Accesibilidad

La app la usa personal del hospital durante turnos largos, con prisa, con guantes y con cualquier luz. Por eso la accesibilidad es un requisito de calidad, no algo opcional.

## Lo que ya cumple la app

| Criterio | Cómo se cumple |
|---|---|
| **Contraste AA (WCAG 2.1)** | `__tests__/tema.test.js` revisa que todos los textos tengan contraste AA en los temas claro y oscuro. |
| **Tema claro, oscuro y automático** | Se elige en *Apariencia*, en la barra lateral, y se conserva al reiniciar la app. |
| **Áreas táctiles de 44 px o más** | Los botones, chips y el botón de emergencia respetan ese tamaño mínimo. |
| **Lectores de pantalla (TalkBack)** | Los botones e íconos llevan `accessibilityLabel` y `accessibilityRole`. |
| **El color no es la única señal** | `TriageBadge` muestra color, número y texto. Los estados usan rojo para peligro, ámbar para advertencia y verde para correcto, siempre acompañados de texto. |
| **Bordes del sistema** | El botón de emergencia respeta la barra de navegación de Android 15/16 (de borde a borde). |
| **Formularios** | Los campos tienen etiqueta visible, anillo de foco y un botón para mostrar la contraseña. |

## Reglas para contribuir

- No uses colores fijos: usa los del tema para que el contraste se mantenga en los dos modos.
- Todo `Pressable` o ícono sin texto debe llevar `accessibilityLabel`.
- No transmitas información solo con color; agrega texto o un ícono.
- Respeta el tamaño de letra del sistema: no fijes `allowFontScaling={false}` salvo que haya un motivo justificado.
- Si agregas una pantalla, pruébala con TalkBack activado y con la letra del sistema al tamaño máximo.

## Reportar un problema de accesibilidad

Abre un issue con la plantilla **Reporte de error** y la etiqueta `accesibilidad`. Indica la pantalla, el dispositivo, la versión de Android y la herramienta de asistencia que usas (TalkBack, tamaño de letra, alto contraste, etc.).
