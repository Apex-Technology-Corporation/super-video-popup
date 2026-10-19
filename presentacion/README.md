# Super Video Popup

<!-- https://alvarosiles.github.io/super-video-popup/privacy.html -->

Extensión para **Google Chrome / Microsoft Edge** (Manifest V3) que abre el
video HTML5 de la página actual en una **ventana flotante Picture-in-Picture**
que se mantiene encima de las demás ventanas: sigues viendo el video
mientras trabajas en otra pestaña, otra aplicación u otro monitor.

- **Versión:** 1.0.0 (`manifest.json`)
- **Autor:** [alvarosiles](https://github.com/alvarosiles)
- **Contacto:** alvarosiles.developer@gmail.com
- **Licencia:** MIT ([LICENSE](LICENSE))

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Objetivo y problema que resuelve](#2-objetivo-y-problema-que-resuelve)
3. [Características principales](#3-características-principales)
4. [Arquitectura](#4-arquitectura)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Tecnologías y versiones](#6-tecnologías-y-versiones)
7. [Módulos y funcionalidades](#7-módulos-y-funcionalidades)
8. [Base de datos](#8-base-de-datos)
9. [Backend y API](#9-backend-y-api)
10. [Configuración e instalación](#10-configuración-e-instalación)
11. [Variables de entorno](#11-variables-de-entorno)
12. [Ejecución en desarrollo](#12-ejecución-en-desarrollo)
13. [Compilación y despliegue](#13-compilación-y-despliegue)
14. [Seguridad y consideraciones importantes](#14-seguridad-y-consideraciones-importantes)
15. [Limitaciones identificadas](#15-limitaciones-identificadas)

---

## 1. Descripción general

Super Video Popup es una extensión de navegador sin dependencias externas,
escrita en JavaScript plano. Detecta los elementos `<video>` de cualquier
página y los envía a la Picture-in-Picture **nativa** del navegador mediante
`video.requestPictureInPicture()`.

Se puede activar de tres formas:

- con un clic en el icono de la extensión (el popup activa la PiP al abrirse),
- con un botón flotante que la extensión dibuja sobre cada video,
- con un atajo de teclado (`Ctrl+Shift+P`).

![Popup de la extensión sobre una página con video](presentacion/01-vista-principal.png)

## 2. Objetivo y problema que resuelve

Muchos sitios no muestran un acceso visible a la Picture-in-Picture, la
esconden en menús contextuales o la desactivan con el atributo
`disablePictureInPicture`. La extensión ofrece un acceso único y uniforme
(icono, botón sobre el video o atajo) para sacar el video a una ventana
flotante en cualquier sitio, sin depender de una lista de dominios
compatibles.

## 3. Características principales

- **Activación con un clic:** abrir el popup ya activa la PiP si la pestaña
  tiene un video (`popup.js` → `autoActivate`).
- **Botón flotante sobre cada video** de al menos 80×80 px, aislado con
  Shadow DOM para no chocar con los estilos del sitio (`overlay.js`).
- **Detección automática de videos**, incluidos los montados dinámicamente
  (SPA) y los que están dentro de Shadow DOM abiertos (`MutationObserver`).
- **Selección del video más relevante:** prioriza el que se está
  reproduciendo y, si ninguno lo está, el de mayor área visible
  (`content.js` → `pickBestVideo`).
- **Atajos de teclado globales:** `Ctrl+Shift+P` (activar/cerrar) y
  `Ctrl+Shift+C` (cerrar).
- **El video no sale del DOM:** la PiP nativa solo lo refleja en la
  ventana flotante, así que no hay nada que restaurar al cerrarla.
- **Funcionamiento 100 % local:** sin peticiones de red, sin almacenamiento
  y sin código remoto.
- Popup con tema oscuro y acento violeta (`#7C5CFC`).

## 4. Arquitectura

La extensión sigue el modelo de componentes de Manifest V3:

| Componente | Archivo | Contexto de ejecución |
|---|---|---|
| Service worker | `background.js` | Fondo de la extensión |
| Content scripts | `content.js`, `pip.js`, `overlay.js` | Mundo aislado de cada página y de cada iframe (`all_frames: true`) |
| Popup (action) | `popup.html`, `popup.css`, `popup.js` | Página de la extensión |

### Restricción clave: el gesto de usuario

`requestPictureInPicture()` exige **activación transitoria** (un gesto de
usuario reciente) en el documento de la página. Un mensaje asíncrono de
`chrome.runtime.sendMessage` no conserva ese gesto, así que la activación
nunca pasa por mensajería. Se usa `chrome.scripting.executeScript` llamado
de forma síncrona dentro del propio manejador del clic o del atajo:

```
Clic en el icono / botón del popup / atajo Ctrl+Shift+P
        │
        ▼
chrome.scripting.executeScript(...)   ← llamada síncrona en el mismo manejador
        │
        ▼
window.FVP_PiP.open() / toggle()      (pip.js, ya inyectado en la pestaña)
        │
        ▼
video.requestPictureInPicture()       ← aceptada: el gesto sigue vigente
        │
        ▼
Ventana Picture-in-Picture nativa del navegador
```

El botón flotante de `overlay.js` no necesita este rodeo: el clic ocurre
dentro del documento de la página y en el mismo mundo aislado que `pip.js`,
así que llama a `window.FVP_PiP.toggle()` directamente.

Las acciones que **no** abren ventanas (consultar el estado, cerrar la PiP)
sí usan mensajería normal (`chrome.tabs.sendMessage`).

### Comunicación entre módulos

Los tres content scripts comparten el mundo aislado de la página y se
comunican mediante propiedades de `window`:

| Símbolo | Definido en | Uso |
|---|---|---|
| `window.FVP_findBestVideo()` | `content.js` | Lo usan `pip.js` y `popup.js` (vía `executeScript`) para elegir el video |
| `window.FVP_PiP = { open, close, toggle, isOpen }` | `pip.js` | API de control de la PiP |
| `window.__floatVideoProInjected`, `window.__FVP_overlayInjected` | `content.js`, `overlay.js` | Evitan una doble inicialización |

Mensajes que acepta `content.js` (`chrome.runtime.onMessage`):

| `type` | Respuesta |
|---|---|
| `FVP_GET_STATE` | `{ ok: true, state: { hasVideo, pipActive, domain } }` |
| `FVP_CLOSE_PIP` | Cierra la PiP y responde con el estado actualizado |

## 5. Estructura del proyecto

```
super-video-popup/
├── manifest.json            # Configuración Manifest V3
├── background.js            # Service worker: atajos de teclado
├── content.js               # Detección/selección de video y mensajes de estado
├── pip.js                   # Control de la Picture-in-Picture nativa (window.FVP_PiP)
├── overlay.js               # Botón flotante sobre cada <video> (Shadow DOM)
├── popup.html               # Interfaz del popup
├── popup.css                # Estilos del popup (tema oscuro)
├── popup.js                 # Lógica del popup (estado + activación)
├── icons/                   # icon16/32/48/128.png
├── gen_icons.py             # Genera los iconos con Pillow
├── scripts/
│   ├── 1-install.sh         # Abre chrome://extensions en tu Chrome habitual
│   ├── 2-test-extension.sh  # Chrome de pruebas con la extensión cargada (Linux/macOS)
│   ├── 2-test-extension.ps1 # Ídem para Windows
│   ├── _cdp_loader.py       # Cliente CDP mínimo usado por 2-test-extension.*
│   ├── 3-build.sh           # Empaqueta en dist/*.zip
│   └── 3-build.ps1          # Ídem para Windows
├── 3-build.ps1              # Copia antigua del build (ver Limitaciones)
├── docs/                    # Landing y política de privacidad (GitHub Pages)
├── store-assets/            # Imágenes y textos para la Chrome Web Store
├── presentacion/            # Capturas reales de la extensión en funcionamiento
├── PUBLISHING.md            # Guía de publicación en la Chrome Web Store
├── version-portafolio.md    # Ficha del proyecto para portafolio
└── LICENSE
```

En la raíz también hay notas de trabajo en Markdown (`pront.md`,
`prontp descripcion.md`, `prontp para desarrollar claude.md`,
`si o si agregarlo.md`, `webstore.md`, `marketplace_visual_code.md`) con
prompts y borradores de textos. No forman parte de la extensión.

**Puntos de entrada:** `manifest.json` declara `background.js` (service
worker), `popup.html` (action popup) y los content scripts
`content.js` → `pip.js` → `overlay.js`, en ese orden, con
`run_at: document_idle`.

## 6. Tecnologías y versiones

| Categoría | Tecnología | Versión / detalle verificable |
|---|---|---|
| Plataforma | Chrome Extensions, Manifest V3 | `manifest_version: 3` |
| Navegador mínimo | Chrome / Edge (Chromium) | `minimum_chrome_version: "116"` |
| Lenguaje | JavaScript (ES2017+: `async/await`, IIFE, `WeakMap`) | Sin transpilación ni bundler |
| UI | HTML5 + CSS3 (custom properties) | Sin frameworks |
| APIs web | Picture-in-Picture API, `MutationObserver`, Shadow DOM, `requestAnimationFrame` | — |
| APIs de extensión | `chrome.scripting`, `chrome.tabs`, `chrome.commands`, `chrome.runtime` | — |
| Herramientas | Bash, PowerShell, Python 3 (biblioteca estándar) | Scripts en `scripts/` |
| Iconos | Python + Pillow | `gen_icons.py` (versión no fijada) |
| Validación opcional | Node.js (`node --check`) | Solo si está instalado |
| Hosting de documentos | GitHub Pages (`docs/`) | Según `PUBLISHING.md` |

No existe `package.json` ni otro gestor de dependencias: la extensión no
tiene dependencias de ejecución.

## 7. Módulos y funcionalidades

### `content.js` — detección y estado
- `findVideos()`: todos los `<video>` del documento.
- `pickBestVideo()`: filtra los que se reproducen (`!paused && !ended &&
  readyState > 2`) y devuelve el de mayor `clientWidth × clientHeight`.
- Responde a `FVP_GET_STATE` y `FVP_CLOSE_PIP`.

### `pip.js` — Picture-in-Picture
- `open(preferredVideo?)`: elige el video, pone `disablePictureInPicture =
  false` si el sitio lo bloqueó y llama a `requestPictureInPicture()`.
- `close()`: `document.exitPictureInPicture()`.
- `toggle()` e `isOpen()` (basado en `document.pictureInPictureElement`).

### `overlay.js` — botón flotante
- Crea un botón de 36×36 px en la esquina superior derecha de cada video
  visible de al menos 80×80 px.
- Usa un Shadow DOM cerrado (`mode: 'closed'`) y `z-index: 2147483647`.
- Recorre también los Shadow DOM abiertos para encontrar videos dentro de
  web components, y observa cada shadow root nuevo.
- Recalcula la posición en cada frame (`requestAnimationFrame`), porque
  muchos sitios cubren el video con capas transparentes o lo mueven con
  animaciones.

### `popup.html` / `popup.js` — interfaz
- Muestra el favicon, título y dominio de la pestaña activa.
- Indica "Sin video" y desactiva el botón si no hay video.
- Botón principal que alterna entre **Activar Picture-in-Picture** y
  **Cerrar ventana flotante** según el estado real.
- Tarjeta con los atajos de teclado y un aviso sobre `Ctrl+Shift+C`.
- Mensajes de estado temporales cuando la página no admite inyección
  (`chrome://`, Chrome Web Store, visor de PDF).

### `background.js` — atajos
| Comando | Atajo sugerido | Acción |
|---|---|---|
| `activate-pip` | `Ctrl+Shift+P` | `executeScript` → `FVP_PiP.toggle()` |
| `close-pip` | `Ctrl+Shift+C` | Mensaje `FVP_CLOSE_PIP` al content script |

![Ventana flotante Picture-in-Picture activa](presentacion/02-funcionalidad-principal.png)

![Botón flotante de la extensión sobre el video](presentacion/03-funcionalidad-complementaria.png)

## 8. Base de datos

**No aplica.** La extensión no usa base de datos, `chrome.storage`,
`localStorage` ni IndexedDB. No guarda ningún estado entre sesiones: el
estado de la PiP se lee en cada momento desde `document.pictureInPictureElement`.

## 9. Backend y API

**No aplica.** No hay servidor, API HTTP ni endpoints. Toda la lógica corre
en el navegador. La única "API" interna es la mensajería de la extensión
descrita en la sección [Arquitectura](#4-arquitectura).

El único componente que habla un protocolo de red es
`scripts/_cdp_loader.py`, una herramienta de desarrollo que se conecta por
WebSocket al Chrome DevTools Protocol en `127.0.0.1` para cargar la
extensión en un perfil de pruebas. No forma parte del paquete.

## 10. Configuración e instalación

### Requisitos
- Chrome o Edge 116 o superior.
- Para los scripts de ayuda (opcional): Bash o PowerShell y Python 3.
- Para regenerar iconos (opcional): Python 3 con Pillow.
- Para el build con Bash: el comando `zip`.

### Instalación manual (modo desarrollador)
1. Abre `chrome://extensions` (o `edge://extensions`).
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona la carpeta del proyecto.
4. Fija el icono de Super Video Popup en la barra de extensiones.

### Instalación asistida
```bash
./scripts/1-install.sh   # Abre chrome://extensions en tu Chrome habitual
                         # y copia la ruta del proyecto al portapapeles
```

## 11. Variables de entorno

La extensión **no usa variables de entorno**. Los scripts de Windows solo
leen variables estándar del sistema (`$env:ProgramFiles`,
`$env:LOCALAPPDATA`, `$env:TEMP`) para localizar el navegador y crear el
perfil temporal de pruebas.

## 12. Ejecución en desarrollo

El script de pruebas abre Chrome con un **perfil aislado** (no toca tu
perfil habitual), activa el modo desarrollador, carga la extensión con
`Extensions.loadUnpacked` vía CDP (puerto `9333`) y abre un video de
muestra:

```bash
# Linux / macOS (perfil en /tmp/super-video-popup-test-profile)
./scripts/2-test-extension.sh
./scripts/2-test-extension.sh https://example.com/   # URL propia
```

```powershell
# Windows (perfil en %TEMP%\super-video-popup-test-profile)
powershell -File scripts\2-test-extension.ps1
powershell -File scripts\2-test-extension.ps1 https://example.com/
```

La URL por defecto es `https://www.w3schools.com/html/mov_bbb.mp4`. El
perfil de pruebas se borra y se recrea en cada ejecución.

Tras modificar el código, recarga la extensión desde `chrome://extensions`
y recarga la pestaña donde quieras probarla.

Para regenerar los iconos:
```bash
python3 gen_icons.py
```

## 13. Compilación y despliegue

### Empaquetado
```bash
./scripts/3-build.sh                 # Linux / macOS
powershell -File scripts\3-build.ps1 # Windows
```

Ambos scripts validan `manifest.json`, comprueban que existan los archivos
de la lista, ejecutan `node --check` si Node está disponible y generan
`dist/super-video-popup-v<versión>.zip`. `dist/` está en `.gitignore`.

> ⚠️ **Antes de publicar:** la lista de archivos de los dos scripts no
> incluye `overlay.js`, que sí está declarado en `manifest.json`. Hay que
> añadirlo a la lista (y a la validación con `node --check`); de lo
> contrario el paquete no cargará. Ver [Limitaciones](#15-limitaciones-identificadas).

### Publicación
La guía completa para la Chrome Web Store está en
[PUBLISHING.md](PUBLISHING.md); los textos de la ficha y las
justificaciones de permisos, en
[store-assets/store-listing.md](store-assets/store-listing.md).

La política de privacidad y la landing (`docs/privacy.html`,
`docs/index.html`) están preparadas para publicarse con GitHub Pages
desde la carpeta `/docs`.

## 14. Seguridad y consideraciones importantes

### Permisos

| Permiso | Uso |
|---|---|
| `activeTab` | Identificar la pestaña activa al abrir el popup o usar un atajo. |
| `scripting` | `chrome.scripting.executeScript`, necesario para activar la PiP sin perder el gesto de usuario. |
| `host_permissions: <all_urls>` | Inyectar los content scripts en cualquier sitio y en todos sus iframes. |

### Verificado en el código
- No hay `fetch`, `XMLHttpRequest`, `WebSocket`, `eval` ni `new Function`
  en los archivos JavaScript de la extensión.
- No se usa `chrome.storage` ni ningún otro almacenamiento.
- El único `innerHTML` (`overlay.js`) asigna una constante SVG definida en
  el propio archivo, no contenido externo.
- El botón flotante vive en un Shadow DOM cerrado, así que la página no
  puede leer ni alterar sus estilos o eventos desde el DOM normal.

### Consideraciones
- `<all_urls>` con `all_frames: true` es un permiso amplio: la Chrome Web
  Store puede pedir una revisión más larga y una justificación detallada
  (ya redactada en `store-listing.md`).
- `pip.js` **ignora a propósito** `disablePictureInPicture` cuando el
  usuario pide la ventana flotante. Es una decisión de producto que conviene
  explicar en la ficha de la tienda.
- `scripts/2-test-extension.*` termina por la fuerza los procesos de
  Chrome/Edge cuyo comando incluya la ruta del perfil de pruebas y borra
  ese perfil. No afecta al perfil habitual.

## 15. Limitaciones identificadas

**Build y empaquetado**
- `scripts/3-build.sh` y `scripts/3-build.ps1` no incluyen `overlay.js` en
  la lista de archivos del zip, aunque `manifest.json` lo declara como
  content script. Un paquete generado así no carga en Chrome.
- `3-build.ps1` en la raíz es una copia de otro proyecto ("Super Volume"):
  genera `super-volume-v<versión>.zip`. El archivo que hay ahora en `dist/`
  (`super-volume-v1.0.0.zip`) sale de ese script. El script correcto es
  `scripts/3-build.ps1`.

**Documentación desactualizada respecto al código**
- `store-assets/store-listing.md`, `docs/index.html` y `docs/privacy.html`
  describen la Document Picture-in-Picture API, controles propios
  (play/pausa, volumen, tamaños S/M/L), un fallback automático y que el
  video "vuelve a su lugar". El código actual usa solo la PiP nativa
  clásica y no tiene esos controles. Hay que actualizar esos textos antes
  de publicar.
- El comentario de cabecera de `background.js` menciona
  `documentPictureInPicture`. `popup.css` y el flag `__floatVideoProInjected`
  conservan el nombre anterior del proyecto ("Float Video Pro").
- La versión `v1.0.0` del popup está escrita a mano en `popup.html`, no se
  lee de `manifest.json`.

**Funcionales**
- Solo actúa sobre elementos `<video>` (no `<audio>` ni `<canvas>`).
- El tamaño, la posición y los controles de la ventana flotante los decide
  el navegador. En la versión de Chrome usada para las capturas, la ventana
  muestra al pasar el mouse una barra con el origen del sitio y los
  controles nativos.
- `content.js` solo busca videos en el DOM principal (`querySelectorAll`);
  los videos dentro de Shadow DOM sí reciben el botón de `overlay.js`, pero
  no los encuentra la selección automática del popup ni la del atajo.
- `Ctrl+Shift+C` coincide con "Inspeccionar elemento" de Chrome y puede no
  quedar asignado; se cambia en `chrome://extensions/shortcuts`.
- No funciona en páginas que no admiten inyección (`chrome://`, Chrome Web
  Store, visor de PDF).
- Sitios con DRM o reproductores propios pueden rechazar la PiP.

**Rendimiento**
- `overlay.js` mantiene un bucle `requestAnimationFrame` permanente en cada
  página e iframe, y en cada mutación del DOM recorre todos los elementos
  (`querySelectorAll('*')`, incluidos los shadow roots). En páginas muy
  dinámicas esto puede tener un coste apreciable.

**Calidad**
- No hay pruebas automatizadas ni linter configurados. La única validación
  es `node --check` dentro de los scripts de build.
