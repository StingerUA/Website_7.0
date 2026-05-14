#!/usr/bin/env python3
"""
patch_atlas_cart.py
-------------------
Запусти из корня репозитория:
    python3 patch_atlas_cart.py

Что делает:
  1. Находит все index.html внутри папок с "atlas-" в пути.
  2. Пропускает файлы, где кнопка уже добавлена (mv-add-cart-btn).
  3. Добавляет большую кнопку "Sepete Ekle / Add to Cart" перед футером.
  4. Добавляет CSS-блок центрирования (h1, p, model-viewer) в <style> страницы.
"""

import re
import sys
from pathlib import Path

# ── Блок кнопки корзины ────────────────────────────────────────────────────
CART_BLOCK = '''
  <!-- ═══════════════════════════════════════
       ADD TO CART — 50 TL
  ════════════════════════════════════════════ -->
  <div class="mv-add-cart-wrap" id="mvCartWrap">
    <button class="mv-add-cart-btn" id="mvAddCartBtn">
      <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2;flex-shrink:0"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      Sepete Ekle
    </button>
    <span class="mv-price-label">50 TL</span>
  </div>

  <script>
  (function(){
    var btn = document.getElementById('mvAddCartBtn');
    if (!btn) return;
    function getModelName() {
      var h1 = document.querySelector('h1');
      if (h1) return h1.textContent.trim();
      return document.title.split('\\u2013')[0].split('-')[0].trim() || 'Model';
    }
    function getSlug() {
      var m = window.location.pathname.match(/atlas\\/([^\\/]+)/);
      return m ? m[1] : 'model';
    }
    function getImage() {
      var v = document.getElementById('mainViewer');
      if (v) {
        var src = v.getAttribute('src') || '';
        var m = src.match(/\\/assets\\/models\\/([^.]+)\\.glb/);
        if (m) return '/assets/models-pictures/' + m[1] + '.png';
      }
      return '/assets/icons/alien.png';
    }
    function showToast(name) {
      var t = document.getElementById('albaCartToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'albaCartToast';
        t.className = 'alba-cart-toast';
        document.body.appendChild(t);
      }
      t.textContent = '\\uD83D\\uDED2 ' + name + ' sepete eklendi!';
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2500);
    }
    btn.addEventListener('click', function(){
      var id = getSlug(), name = getModelName(), img = getImage(), price = 50;
      if (window.cartManager && window.cartManager.addItem) {
        window.cartManager.addItem({ id:id, name:name, price:price, image:img, url:window.location.href, qty:1 });
      } else {
        try {
          var cart = JSON.parse(localStorage.getItem('alba_space_cart_v1') || '[]');
          var idx = cart.findIndex(function(e){ return e.id === id; });
          if (idx >= 0) { cart[idx].qty += 1; }
          else { cart.push({ id:id, name:name, price:price, image:img, url:window.location.href, qty:1 }); }
          localStorage.setItem('alba_space_cart_v1', JSON.stringify(cart));
          var total = cart.reduce(function(s,e){ return s+(Number(e.qty)||0); }, 0);
          document.querySelectorAll('[data-cart-count],.cart-count').forEach(function(b){ b.textContent=String(total); });
        } catch(ex){}
      }
      showToast(name);
    });
  }());
  </script>
'''

# ── CSS центрирования (добавляется в существующий <style> или новым тегом) ──
CENTER_CSS = """
    /* ── Centering: h1, description, model-viewer ── */
    h1 {
      text-align: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    .container p,
    .container > p {
      text-align: center !important;
      max-width: 760px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    .container {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    model-viewer {
      display: block !important;
      margin-left: auto !important;
      margin-right: auto !important;
      width: 100% !important;
      max-width: 900px !important;
      height: 520px !important;
    }
    @media (max-width: 768px) {
      model-viewer { height: 380px !important; }
    }
    .mv-add-cart-wrap {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 20px 16px 32px !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .mv-add-cart-btn {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 10px !important;
      background: #00c2ff !important;
      color: #020617 !important;
      border: none !important;
      border-radius: 14px !important;
      padding: 16px 36px !important;
      font-size: 17px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      font-family: 'Inter', system-ui, sans-serif !important;
      box-shadow: 0 4px 24px rgba(0,194,255,0.35) !important;
      transition: background 0.18s, transform 0.15s !important;
      width: 100% !important;
      max-width: 380px !important;
    }
    .mv-add-cart-btn:hover { background: #22d3ff !important; transform: translateY(-2px) !important; }
    .mv-price-label {
      font-size: 13px !important;
      color: rgba(255,255,255,0.5) !important;
      font-family: 'Inter', system-ui, sans-serif !important;
    }
    .alba-cart-toast {
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(20px) !important;
      background: rgba(2,6,23,0.95) !important;
      border: 1px solid rgba(0,194,255,0.4) !important;
      color: #fff !important;
      padding: 10px 20px !important;
      border-radius: 10px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 99999 !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.25s, transform 0.25s !important;
      white-space: nowrap !important;
    }
    .alba-cart-toast.show {
      opacity: 1 !important;
      transform: translateX(-50%) translateY(0) !important;
    }
"""

FOOTER_ANCHORS = [
    '<div data-include="/footer-tr.html">',
    '<div data-include="/footer-en.html">',
    '<div data-include="/footer-ru.html">',
    '<div data-include="/footer.html">',
]

def find_footer_anchor(html):
    for anchor in FOOTER_ANCHORS:
        if anchor in html:
            return anchor
    return None

def patch_file(path: Path) -> bool:
    html = path.read_text(encoding='utf-8')

    changed = False

    # ── 1. Inject cart button ──────────────────────────────────────────────
    if 'mv-add-cart-btn' not in html:
        anchor = find_footer_anchor(html)
        if anchor:
            html = html.replace(anchor, CART_BLOCK + '\n  ' + anchor, 1)
            changed = True
        elif '</body>' in html:
            html = html.replace('</body>', CART_BLOCK + '\n</body>', 1)
            changed = True

    # ── 2. Inject centering CSS ────────────────────────────────────────────
    if 'Centering: h1' not in html:
        if '</style>' in html:
            # Append into the LAST </style> before </head>
            idx = html.rfind('</style>', 0, html.find('</head>') + 1)
            if idx == -1:
                idx = html.find('</style>')
            if idx != -1:
                html = html[:idx] + CENTER_CSS + html[idx:]
                changed = True
        elif '</head>' in html:
            style_tag = '<style>' + CENTER_CSS + '</style>\n'
            html = html.replace('</head>', style_tag + '</head>', 1)
            changed = True

    if changed:
        path.write_text(html, encoding='utf-8')
        return True
    return False


def main():
    root = Path('.')
    # Find all index.html files where some parent folder contains "atlas-"
    candidates = [
        p for p in root.rglob('index.html')
        if any(part for part in p.parts if 'atlas-' in part)
        and '.bak' not in str(p)
        and 'node_modules' not in str(p)
    ]

    if not candidates:
        print('No atlas- pages found. Make sure you run this from the repo root.')
        sys.exit(1)

    total = len(candidates)
    patched = 0
    skipped = 0

    for p in sorted(candidates):
        result = patch_file(p)
        if result:
            patched += 1
            print(f'  ✅  {p}')
        else:
            skipped += 1
            print(f'  ⏭   {p}  (already patched)')

    print(f'\nDone. {patched} patched, {skipped} skipped, {total} total.')


if __name__ == '__main__':
    main()
