#!/usr/bin/env python3
"""
patch_en_ru_atlas.py
Run from repo root:  python3 patch_en_ru_atlas.py

Adds:
  1. Protected model loading via /product-access worker
  2. "Add to Cart / В корзину" button
to all eng/atlas and rus/atlas pages that don't have it yet.
"""

import re, glob

# ── Auth script (language-neutral) ─────────────────────────────────────────
AUTH = """    <script>
      document.addEventListener('DOMContentLoaded', function () {
        var viewer = document.getElementById('mainViewer');
        if (!viewer) return;
        var pathMatch = window.location.pathname.match(/atlas-[^\/]+/);
        var slug = pathMatch ? pathMatch[0] : null;
        if (!slug) return;

        viewer.setAttribute('src', '/assets/models/zaglushka.glb');

        fetch('https://albaspace-api.nncdecdgc.workers.dev/product-access?slug=' + slug, {
          credentials: 'include'
        })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          if (data && data.access === 'premium') {
            return fetch(
              'https://albaspace-api.nncdecdgc.workers.dev/model?slug=' + slug,
              { credentials: 'include' }
            )
            .then(function(r){ return r.blob(); })
            .then(function(blob){ viewer.setAttribute('src', URL.createObjectURL(blob)); });
          }
        })
        .catch(function(e){ console.error('Model load error:', e); });
      });
    </script>"""

# ── Cart button — EN ────────────────────────────────────────────────────────
CART_EN = """
  <div class="mv-add-cart-wrap" id="mvCartWrap">
    <button class="mv-add-cart-btn" id="mvAddCartBtn">
      <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2;flex-shrink:0">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      Add to Cart
    </button>
    <span class="mv-price-label">50 TL</span>
  </div>
  <script>
  (function(){
    var btn = document.getElementById('mvAddCartBtn');
    if (!btn) return;
    function getName(){ var h=document.querySelector('h1'); return h ? h.textContent.trim() : document.title.split('\\u2013')[0].trim(); }
    function getSlug(){ var m=window.location.pathname.match(/atlas-[^\\/]+/); return m ? m[0] : 'model'; }
    function getImg(){ var v=document.getElementById('mainViewer'); if(v){var s=v.getAttribute('src')||'',m=s.match(/\\/assets\\/models\\/([^.]+)\\.glb/);if(m)return '/assets/models-pictures/'+m[1]+'.png';} return '/assets/icons/alien.png'; }
    function toast(n){ var t=document.getElementById('albaCartToast'); if(!t){t=document.createElement('div');t.id='albaCartToast';t.className='alba-cart-toast';document.body.appendChild(t);} t.textContent='\\uD83D\\uDED2 '+n+' added!'; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(function(){t.classList.remove('show');},2500); }
    btn.addEventListener('click', function(){
      var id=getSlug(), name=getName(), img=getImg(), price=50;
      if(window.cartManager && window.cartManager.addItem){ window.cartManager.addItem({id:id,name:name,price:price,image:img,url:window.location.href,qty:1}); }
      else { try{ var c=JSON.parse(localStorage.getItem('alba_space_cart_v1')||'[]'); var i=c.findIndex(function(e){return e.id===id;}); if(i>=0){c[i].qty+=1;}else{c.push({id:id,name:name,price:price,image:img,url:window.location.href,qty:1});} localStorage.setItem('alba_space_cart_v1',JSON.stringify(c)); var tot=c.reduce(function(s,e){return s+(Number(e.qty)||0);},0); document.querySelectorAll('[data-cart-count],.cart-count').forEach(function(b){b.textContent=String(tot);}); }catch(ex){} }
      toast(name);
    });
  }());
  </script>"""

# ── Cart button — RU ────────────────────────────────────────────────────────
CART_RU = CART_EN.replace('Add to Cart', 'В корзину').replace('added!', 'добавлено!')

FOOTER_ANCHORS = [
    '<div data-include="/footer-en',
    '<div data-include="/footer-ru',
    '<div data-include="/footer-tr',
    '<div data-include="/footer.html',
]

def patch(path, lang):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    changed = False

    # 1. Auth
    if 'loadProtectedModel' not in html and 'product-access' not in html:
        if 'mainViewer' in html:
            if '</body>' in html:
                html = html.replace('</body>', AUTH + '\n</body>', 1)
                changed = True

    # 2. Cart button
    if 'mv-add-cart-btn' not in html:
        cart = CART_RU if lang == 'ru' else CART_EN
        injected = False
        for anchor in FOOTER_ANCHORS:
            if anchor in html:
                html = html.replace(anchor, cart + '\n  ' + anchor, 1)
                injected = True
                changed = True
                break
        if not injected and '</body>' in html:
            html = html.replace('</body>', cart + '\n</body>', 1)
            changed = True

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
    return changed

def main():
    groups = [
        (glob.glob('eng/atlas/**/index.html', recursive=True), 'en'),
        (glob.glob('rus/atlas/**/index.html', recursive=True), 'ru'),
    ]
    for files, lang in groups:
        ok = skip = 0
        for p in sorted(files):
            if patch(p, lang):
                ok += 1
                print(f'  patched  {p}')
            else:
                skip += 1
        print(f'\n[{lang.upper()}] patched={ok}  already-ok={skip}  total={ok+skip}\n')

if __name__ == '__main__':
    main()