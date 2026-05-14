#!/usr/bin/env python3
"""
patch_nonatlas_cart.py
----------------------
Запусти из корня репозитория:
    python3 patch_nonatlas_cart.py

Что делает:
  Находит все index.html с <model-viewer> НЕ внутри папок atlas-*,
  добавляет кнопку "Sepete Ekle / Add to Cart / В корзину" перед футером.
  Пропускает уже обработанные файлы.
"""

import re, sys
from pathlib import Path

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
      return document.title.split('\u2013')[0].split('-')[0].trim() || 'Model';
    }
    function getSlug() {
      var parts = window.location.pathname.replace(/\\/+$/, '').split('/');
      return parts[parts.length - 1] || parts[parts.length - 2] || 'model';
    }
    function getImage() {
      var v = document.querySelector('model-viewer');
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
      t.textContent = '\uD83D\uDED2 ' + name + ' sepete eklendi!';
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

FOOTER_ANCHORS = [
    '<div data-include="/footer-tr.html">',
    '<div data-include="/footer-en.html">',
    '<div data-include="/footer-ru.html">',
    '<div data-include="/footer.html">',
]

def has_atlas_in_path(path: Path) -> bool:
    return any('atlas-' in part for part in path.parts)

def patch_file(path: Path) -> str:
    html = path.read_text(encoding='utf-8')
    if 'mv-add-cart-btn' in html:
        return 'skip'
    if '<model-viewer' not in html:
        return 'no-viewer'

    for anchor in FOOTER_ANCHORS:
        if anchor in html:
            html = html.replace(anchor, CART_BLOCK + '\n  ' + anchor, 1)
            path.write_text(html, encoding='utf-8')
            return 'ok'

    if '</body>' in html:
        html = html.replace('</body>', CART_BLOCK + '\n</body>', 1)
        path.write_text(html, encoding='utf-8')
        return 'ok'

    return 'no-anchor'


def main():
    root = Path('.')
    candidates = [
        p for p in root.rglob('index.html')
        if not has_atlas_in_path(p)
        and '.bak' not in str(p)
        and 'node_modules' not in str(p)
    ]

    if not candidates:
        print('No pages found. Run from the repo root.')
        sys.exit(1)

    counts = {'ok': 0, 'skip': 0, 'no-viewer': 0, 'no-anchor': 0}
    for p in sorted(candidates):
        result = patch_file(p)
        counts[result] += 1
        icon = {'ok': '✅', 'skip': '⏭', 'no-viewer': '—', 'no-anchor': '⚠️'}[result]
        if result in ('ok', 'no-anchor'):
            print(f'  {icon}  {p}')

    print(f'\nDone. patched={counts["ok"]}  skipped={counts["skip"]}  no-viewer={counts["no-viewer"]}  problem={counts["no-anchor"]}')


if __name__ == '__main__':
    main()
