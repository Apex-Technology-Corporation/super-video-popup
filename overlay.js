/**
 * overlay.js — Super Video Popup
 * ─────────────────────────────────────────────────────────────────────────
 * Dibuja un botón flotante sobre cada <video> de la página para que el
 * usuario final pueda activar la Picture-in-Picture con un clic directo,
 * sin tener que abrir el icono de la extensión ni usar el atajo de teclado.
 *
 * El botón se muestra SIEMPRE que hay un video relevante en pantalla (no
 * solo al pasar el mouse): muchos sitios (streaming, sitios con anuncios)
 * cubren el <video> con una capa transparente que intercepta los eventos
 * de mouse antes de llegar al elemento, así que depender de mouseenter en
 * el propio <video> deja el botón sin aparecer nunca en esos casos. La
 * posición se recalcula con un loop (requestAnimationFrame) en vez de solo
 * eventos de scroll/resize, porque esos mismos sitios suelen mover/redibujar
 * el reproductor con animaciones o layouts dinámicos.
 *
 * El clic sobre este botón ocurre DENTRO del documento de la página (no en
 * el popup ni en el background), así que cuenta como gesto de usuario
 * "fresco" y puede llamar a window.FVP_PiP.toggle() de forma directa y
 * síncrona — el mismo motivo por el que popup.js/background.js necesitan
 * chrome.scripting.executeScript, pero aquí no hace falta porque ya estamos
 * en el mundo aislado correcto (mismo namespace que pip.js).
 *
 * Se usa Shadow DOM para que los estilos del botón no choquen con los del
 * sitio, y viceversa.
 */

(() => {
  'use strict';

  if (window.__FVP_overlayInjected) return;
  window.__FVP_overlayInjected = true;

  const MIN_SIZE = 80; // px — ignora videos minúsculos (iconos, trackers, etc.)
  const buttons = new WeakMap(); // video -> { host, btn }

  const ICON_OPEN =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' +
    '<path d="M19 11h-8v6h8v-6zm4-8H1c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h22c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H1V5h22v14z"/></svg>';

  function makeButton() {
    const host = document.createElement('div');
    host.style.all = 'initial';
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.top = '0';
    host.style.left = '0';
    host.style.pointerEvents = 'none';
    host.style.display = 'none';

    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      .btn {
        all: initial;
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: rgba(32, 33, 36, 0.85);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        color: #fff;
        cursor: pointer;
        pointer-events: auto;
        font-family: sans-serif;
        transition: background 150ms ease, transform 150ms ease;
      }
      .btn:hover { background: #7c5cfc; transform: scale(1.06); }
      .btn svg { display: block; }
    `;
    const btn = document.createElement('div');
    btn.className = 'btn';
    btn.title = 'Abrir en ventana flotante';
    btn.innerHTML = ICON_OPEN;
    btn.addEventListener(
      'click',
      (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        if (window.FVP_PiP) window.FVP_PiP.toggle().catch(() => {});
      },
      true
    );

    root.appendChild(style);
    root.appendChild(btn);
    document.documentElement.appendChild(host);

    return { host, btn };
  }

  function updatePosition(video, entry) {
    const rect = video.getBoundingClientRect();
    const onScreen =
      rect.width >= MIN_SIZE &&
      rect.height >= MIN_SIZE &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth &&
      video.isConnected;

    if (!onScreen) {
      entry.host.style.display = 'none';
      return;
    }

    entry.host.style.display = 'block';
    entry.host.style.top = `${rect.top + window.scrollY + 8}px`;
    entry.host.style.left = `${rect.right + window.scrollX - 36 - 8}px`;
  }

  const trackedVideos = new Set();
  const observedRoots = new WeakSet();

  function attach(video) {
    if (buttons.has(video)) return;
    const entry = makeButton();
    buttons.set(video, entry);
    trackedVideos.add(video);
  }

  function detach(video) {
    const entry = buttons.get(video);
    if (entry) {
      entry.host.remove();
      buttons.delete(video);
    }
    trackedVideos.delete(video);
  }

  /**
   * Recorre el documento y también los Shadow DOM abiertos (reproductores
   * tipo video.js u otros "web components" que montan el <video> dentro de
   * su propio shadow root, donde querySelectorAll normal no entra), y sigue
   * observando cada shadow root nuevo que encuentra para detectar videos
   * agregados después dinámicamente.
   */
  function collectVideos(root, out) {
    for (const el of root.querySelectorAll('*')) {
      if (el.tagName === 'VIDEO') out.push(el);
      if (el.shadowRoot) {
        if (!observedRoots.has(el.shadowRoot)) {
          observedRoots.add(el.shadowRoot);
          observer.observe(el.shadowRoot, { childList: true, subtree: true });
        }
        collectVideos(el.shadowRoot, out);
      }
    }
    return out;
  }

  function scan() {
    const found = collectVideos(document, []);
    const foundSet = new Set(found);
    for (const video of found) attach(video);
    for (const video of trackedVideos) {
      if (!foundSet.has(video) || !video.isConnected) detach(video);
    }
  }

  function tick() {
    for (const video of trackedVideos) {
      const entry = buttons.get(video);
      if (entry) updatePosition(video, entry);
    }
    requestAnimationFrame(tick);
  }

  const observer = new MutationObserver((mutations) => {
    let changed = false;
    for (const m of mutations) {
      if (m.addedNodes.length || m.removedNodes.length) changed = true;
    }
    if (changed) scan();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  scan();
  requestAnimationFrame(tick);
})();
