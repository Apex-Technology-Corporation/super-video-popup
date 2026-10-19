# Super Video Popup — Ficha de portafolio

## Nombre del proyecto

**Super Video Popup**

## Descripción breve (tarjeta)

Extensión para Chrome y Edge (Manifest V3) que saca cualquier video HTML5 a
una ventana flotante siempre visible con un solo clic, un botón sobre el
video o un atajo de teclado. Sin dependencias y sin enviar datos a ningún
servidor.

## Descripción completa

Super Video Popup es una extensión de navegador que permite seguir viendo un
video mientras se trabaja en otra pestaña, otra aplicación u otro monitor.
Detecta automáticamente los videos de la página, elige el más relevante y lo
abre en la ventana Picture-in-Picture nativa del navegador, que permanece por
encima del resto de ventanas.

El usuario puede activarla de tres formas: al abrir el popup de la extensión
(se activa sola si hay un video), con un botón flotante que aparece sobre cada
video, o con el atajo `Ctrl+Shift+P`. El popup muestra la pestaña actual, si
tiene video y si la ventana flotante está abierta, y permite cerrarla.

Está escrita en JavaScript, HTML y CSS planos, sin frameworks, sin bundler y
sin dependencias de ejecución. Todo el procesamiento ocurre en el navegador.

## Problema que resuelve

Muchos sitios esconden la opción de Picture-in-Picture en menús, no la
muestran o la bloquean con el atributo `disablePictureInPicture`. Cada sitio
la ofrece de una manera distinta, o no la ofrece. La extensión da un acceso
único y uniforme para sacar el video a una ventana flotante en cualquier
sitio, sin depender de una lista de dominios compatibles.

## Objetivo del proyecto

Construir una extensión ligera, de propósito único y apta para la Chrome Web
Store que convierta el video de cualquier página en una ventana flotante con
la menor fricción posible para el usuario.

## Público objetivo

- Personas que ven tutoriales, clases, streams o conferencias mientras
  trabajan o estudian.
- Usuarios de Chrome o Edge que trabajan con varias ventanas o monitores.

## Mi participación técnica

- **Confirmado por el repositorio:** autor del proyecto. Figura como autor
  en `manifest.json` (`"author": "alvarosiles"`) y es el único contribuidor
  en el historial de Git.
- **Pendiente de confirmar:** qué partes concretas del diseño y del código
  desarrollé yo directamente. El repositorio incluye notas con prompts para
  generar código y textos con asistentes de IA (`pront.md`,
  `prontp para desarrollar claude.md`), así que conviene precisarlo antes
  de publicarlo en el portafolio.

## Funcionalidades destacadas

- **Activación con un clic:** abrir el popup ya activa la ventana flotante
  si la pestaña tiene un video.
- **Botón flotante sobre cada video**, aislado con Shadow DOM para no
  interferir con los estilos del sitio.
- **Detección automática de videos**, incluidos los que se cargan después
  (sitios SPA) y los que están dentro de web components.
- **Selección inteligente:** si hay varios videos, prioriza el que se está
  reproduciendo y, si no, el más grande en pantalla.
- **Atajos de teclado globales** para activar y cerrar la ventana flotante.
- **Popup informativo:** pestaña actual, aviso "Sin video" y botón que
  cambia según el estado real de la ventana flotante.
- **Funciona en sitios que bloquean la PiP**, desactivando
  `disablePictureInPicture` cuando el usuario la pide expresamente.

## Tecnologías utilizadas

**Plataforma**
- Chrome Extensions — Manifest V3 (Chrome / Edge 116 o superior)

**Frontend**
- JavaScript (ES2017+), sin transpilación
- HTML5 y CSS3 con custom properties (tema oscuro)

**APIs del navegador**
- Picture-in-Picture API (`requestPictureInPicture`)
- `MutationObserver`, Shadow DOM, `requestAnimationFrame`
- `chrome.scripting`, `chrome.tabs`, `chrome.commands`, `chrome.runtime`

**Herramientas de desarrollo**
- Bash y PowerShell (scripts de instalación, pruebas y empaquetado)
- Python 3 con biblioteca estándar (cliente propio del Chrome DevTools
  Protocol)
- Python + Pillow (generación de iconos)
- Node.js (`node --check`, validación opcional de sintaxis)

**Publicación**
- Chrome Web Store (guía y textos preparados)
- GitHub Pages (landing y política de privacidad en `docs/`)

## Arquitectura y características técnicas relevantes

- **Arquitectura Manifest V3 por componentes:** un service worker para los
  atajos, tres content scripts (detección, control de la PiP y botón
  flotante) que comparten el mundo aislado de la página, y un popup.
- **Conservación del gesto de usuario:** la PiP solo se abre con un gesto
  reciente del usuario, y la mensajería asíncrona normal lo pierde. La
  activación usa `chrome.scripting.executeScript` de forma síncrona dentro
  del propio manejador del clic o del atajo. El botón flotante, como ya está
  dentro de la página, llama a la API directamente.
- **Separación de responsabilidades:** las acciones que abren ventanas pasan
  por inyección síncrona; las que no (consultar el estado, cerrar) usan
  mensajería normal.
- **PiP nativa en lugar de Document PiP:** decisión documentada en el código.
  La ventana nativa es más liviana, a cambio de no poder dibujar controles
  propios.
- **Robustez frente a sitios reales:** el botón se reposiciona en cada frame
  porque muchos reproductores tienen capas transparentes encima o se animan,
  y el recorrido entra en los Shadow DOM abiertos.
- **Entorno de pruebas automatizado:** un script abre Chrome con un perfil
  aislado, activa el modo desarrollador y carga la extensión mediante el
  DevTools Protocol, con un cliente WebSocket (RFC 6455) escrito a mano y
  sin dependencias externas.
- **Cero dependencias de ejecución** y paquete reducido a los archivos
  necesarios.

## Integraciones importantes

- **APIs de extensiones de Chrome** (scripting, tabs, commands, runtime).
- **Chrome DevTools Protocol** (solo en desarrollo, para cargar la extensión
  en un perfil de pruebas).
- **Chrome Web Store** y **GitHub Pages** como canales de publicación
  preparados.

No hay integraciones con servicios externos ni APIs de terceros durante el
uso de la extensión.

## Aspectos de seguridad relevantes

- Comprobado en el código: no hay peticiones de red (`fetch`,
  `XMLHttpRequest`, `WebSocket`), ni `eval` ni código remoto.
- No almacena datos: no usa `chrome.storage` ni otro almacenamiento local.
- Permisos limitados a `activeTab`, `scripting` y `host_permissions:
  <all_urls>`, con su justificación redactada para la tienda.
- La interfaz inyectada vive en un Shadow DOM cerrado, aislada de la página.
- Política de privacidad preparada para publicarse.

## Retos técnicos identificados

- **Activación transitoria:** conseguir que la PiP se abra desde el popup y
  desde un atajo de teclado sin que el navegador la rechace por falta de
  gesto de usuario.
- **Detectar videos en sitios modernos:** reproductores montados
  dinámicamente, dentro de web components o tapados por capas
  transparentes que interceptan el mouse.
- **Elegir el video correcto** cuando la página tiene varios (anuncios,
  miniaturas, el reproductor principal).
- **Automatizar las pruebas** en versiones recientes de Chrome, que ignoran
  `--load-extension` si el modo desarrollador está apagado.

## Mejoras futuras recomendadas

- Añadir `overlay.js` a los scripts de empaquetado (ahora se queda fuera del
  zip y el paquete no cargaría) y eliminar el `3-build.ps1` duplicado de la
  raíz.
- Actualizar la ficha de la tienda, la landing y la política de privacidad
  para que describan la PiP nativa y no controles que ya no existen.
- Hacer que la selección automática de video también encuentre los videos
  dentro de Shadow DOM, como ya hace el botón flotante.
- Sustituir el bucle permanente de `requestAnimationFrame` por
  `IntersectionObserver` y `ResizeObserver` para reducir el consumo.
- Añadir opciones de usuario (mostrar u ocultar el botón flotante,
  desactivar la activación automática al abrir el popup).
- Incorporar pruebas automatizadas de extremo a extremo y un linter.
- Leer la versión del popup desde `manifest.json`.

## Estado real del proyecto

- **Versión 1.0.0, funcional en local.** Las capturas de esta ficha se
  tomaron con la extensión cargada en Chrome mediante el script de pruebas
  del propio proyecto, sobre una página de demostración con un video de
  muestra.
- **Publicación en la Chrome Web Store: no confirmada.** Los textos, las
  imágenes y la guía de publicación están preparados, pero el script de
  empaquetado tiene que corregirse antes de generar un paquete válido.
- Sin pruebas automatizadas.

## Capturas

| Archivo | Contenido |
|---|---|
| [`presentacion/01-vista-principal.png`](presentacion/01-vista-principal.png) | Popup de la extensión abierto sobre una página con video: muestra la pestaña detectada, el botón "Cerrar ventana flotante" (la PiP se activó al abrir el popup) y los atajos de teclado. |
| [`presentacion/02-funcionalidad-principal.png`](presentacion/02-funcionalidad-principal.png) | Ventana Picture-in-Picture activa y flotando sobre el navegador mientras la página muestra "Reproduciendo en modo imagen en imagen". |
| [`presentacion/03-funcionalidad-complementaria.png`](presentacion/03-funcionalidad-complementaria.png) | Botón flotante violeta que la extensión inyecta en la esquina superior derecha del video. |

![Vista principal](presentacion/01-vista-principal.png)
![Funcionalidad principal](presentacion/02-funcionalidad-principal.png)
![Funcionalidad complementaria](presentacion/03-funcionalidad-complementaria.png)
