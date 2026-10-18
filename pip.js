/**
 * pip.js — Super Video Popup
 * ─────────────────────────────────────────────────────────────────────────
 * Controla la Picture-in-Picture NATIVA clásica del navegador
 * (`video.requestPictureInPicture()`), la API pública y estándar que
 * implementan Chrome/Edge/Chromium para cualquier sitio o extensión que
 * la use. Se eligió a propósito en vez de la Document Picture-in-Picture
 * API: esa otra API permite dibujar controles propios (play/pausa, barra
 * de progreso...),
 * pero el navegador le agrega SIEMPRE una barra de título con el dominio
 * del sitio, un botón de expandir y uno de cerrar — no hay forma de
 * ocultar esa barra ni de que la extensión la controle. La PiP nativa
 * clásica, en cambio, es una ventana mínima sin esa barra: solo el video
 * con los controles propios del navegador (play/pausa/mute) apareciendo
 * al pasar el mouse.
 *
 * A cambio de esa ventana más liviana, se pierden los controles propios
 * (retroceder/avanzar 10s, barra de progreso, tamaños S/M/L): el tamaño y
 * la posición de la ventana los decide el navegador, no la extensión. El
 * popup de la extensión ya no ofrece esos controles de tamaño por el
 * mismo motivo (ver popup.html/popup.js).
 *
 * Nota importante sobre el gesto de usuario: `video.requestPictureInPicture()`
 * exige "activación transitoria" del documento que la pide, igual que la
 * API anterior. Por eso `open()`/`toggle()` solo deben invocarse como
 * consecuencia DIRECTA de un clic real (ver popup.js, que usa
 * chrome.scripting.executeScript de forma síncrona en el propio manejador
 * del clic, y background.js, que hace lo mismo dentro de
 * chrome.commands.onCommand). Cerrar la PiP ya abierta NO requiere gesto,
 * así que esa función sí se puede llamar libremente desde mensajes async
 * (ver content.js).
 */

(() => {
  'use strict';

  if (window.FVP_PiP) return; // ya inicializado en este documento

  const state = {
    video: null,
  };

  function isOpen() {
    return document.pictureInPictureElement != null;
  }

  async function open(preferredVideo) {
    if (isOpen()) return;

    const video = preferredVideo || window.FVP_findBestVideo();
    if (!video) throw new Error('No se encontró ningún video en esta página.');

    // Algunos sitios (p. ej. Pornhub) setean disablePictureInPicture=true en
    // el <video> a propósito para bloquear la PiP nativa del navegador. Como
    // esto es una decisión explícita del usuario al pedir la ventana
    // flotante (no una restricción técnica ni de DRM), la desactivamos antes
    // de pedir la PiP.
    if (video.disablePictureInPicture) video.disablePictureInPicture = false;

    await video.requestPictureInPicture();
    state.video = video;
    video.addEventListener(
      'leavepictureinpicture',
      () => {
        if (state.video === video) state.video = null;
      },
      { once: true }
    );
  }

  function close() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  async function toggle() {
    if (isOpen()) {
      close();
    } else {
      await open();
    }
  }

  window.FVP_PiP = { open, close, toggle, isOpen };
})();
