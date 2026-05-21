/**
 * model-viewer-fullscreen.js
 * Adds a small expand button on the model-viewer (mobile only, ≤768px).
 * Clicking it opens a fullscreen overlay with the same model-viewer.
 * A close (×) button dismisses the overlay.
 */
(function () {
  'use strict';

  var CSS = `
    /* ── Expand button ── */
    .mv-expand-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 20;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(0, 194, 255, 0.5);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      transition: background 0.18s, transform 0.15s;
      backdrop-filter: blur(4px);
      -webkit-tap-highlight-color: transparent;
      padding: 0;
    }
    .mv-expand-btn:active { transform: scale(0.92); background: rgba(0,194,255,0.25); }
    .mv-expand-btn svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2; }

    /* ── Fullscreen overlay ── */
    .mv-fs-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #020617;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s;
    }
    .mv-fs-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    /* ── Close button ── */
    .mv-fs-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100001;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.18s;
      padding: 0;
    }
    .mv-fs-close:active { background: rgba(255,255,255,0.28); }

    /* ── The cloned model-viewer inside overlay ── */
    .mv-fs-viewer {
      width: 100vw;
      height: 100vh;
      display: block;
    }
  `;

  /* Inject CSS */
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  /* Wait until DOM + model-viewer elements are ready */
  function init() {
    var viewers = document.querySelectorAll('model-viewer');
    if (!viewers.length) return;

    viewers.forEach(function (mv) {
      /* Wrap model-viewer in relative-positioned container if not already */
      var parent = mv.parentElement;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      /* Create expand button */
      var btn = document.createElement('button');
      btn.className = 'mv-expand-btn';
      btn.setAttribute('aria-label', 'Tam ekran');
      btn.title = 'Tam ekran';
      btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      parent.appendChild(btn);

      /* Create overlay */
      var overlay = document.createElement('div');
      overlay.className = 'mv-fs-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');

      /* Close button */
      var closeBtn = document.createElement('button');
      closeBtn.className = 'mv-fs-close';
      closeBtn.setAttribute('aria-label', 'Kapat');
      closeBtn.innerHTML = '&times;';
      overlay.appendChild(closeBtn);

      /* Clone model-viewer into overlay */
      var clone = mv.cloneNode(true);
      clone.className = (clone.className || '') + ' mv-fs-viewer';
      clone.removeAttribute('id');
      clone.style.cssText = '';
      clone.setAttribute('camera-controls', '');
      clone.setAttribute('auto-rotate', '');

      /* Copy src from live viewer so auth-loaded blob URL is preserved */
      function syncSrc() {
        var liveSrc = mv.getAttribute('src');
        if (liveSrc && liveSrc !== clone.getAttribute('src')) {
          clone.setAttribute('src', liveSrc);
        }
      }

      overlay.appendChild(clone);
      document.body.appendChild(overlay);

      /* Open */
      btn.addEventListener('click', function () {
        syncSrc();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        /* trigger resize so model-viewer renders correctly at full size */
        setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
      });

      /* Close   */
      function closeOverlay() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
      closeBtn.addEventListener('click', closeOverlay);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeOverlay();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeOverlay();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    /* Small delay so model-viewer custom element can register */
    setTimeout(init, 300);
  }
}());