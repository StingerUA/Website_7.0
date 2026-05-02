/*
 * cart.js
 *
 * Lightweight client‑side shopping cart for Alba Space shop pages.  The cart
 * persists to `localStorage` so that the contents survive page reloads.  It
 * supports multiple variants of a product (e.g. size, colour) by storing
 * additional attributes on each cart entry.  A global `cartManager` object
 * exposes methods for reading and writing the cart, updating quantities and
 * badges, and manipulating individual entries.  Elements that show the cart
 * count should use the `[data-cart-count]` attribute, or the legacy class
 * `.cart-count` for backward compatibility.
 */

(function () {
  const CART_KEY = 'alba_space_cart_v1';

  /**
   * Load the cart from localStorage.  If nothing is stored this returns
   * an empty array.  Each item has the shape:
   *   {
   *     id: string,
   *     name: string,
   *     price: number,
   *     image: string,
   *     url: string,
   *     size?: string,
   *     color?: string,
   *     qty: number
   *   }
   *
   * @returns {Array<Object>} The current cart.
   */
  function load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('Cart parse error', err);
      return [];
    }
  }

  /**
   * Persist the cart back to localStorage.
   *
   * @param {Array<Object>} cart The cart to save.
   */
  function save(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('Cart save error', err);
    }
  }

  /**
   * Compute the total number of items in the cart by summing the qty
   * property of each entry.
   *
   * @param {Array<Object>} [cart] Optional cart array to count.  If
   *   omitted, the current cart is loaded from storage.
   * @returns {number} Total quantity of items.
   */
  function getTotalCount(cart) {
    const items = cart || load();
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  /**
   * Update all on‑page badges that display the cart item count.  Elements
   * annotated with `data-cart-count` or the class `cart-count` will have
   * their text content replaced with the computed total.
   */
  function updateBadge() {
    const total = getTotalCount();
    document.querySelectorAll('[data-cart-count], .cart-count').forEach(el => {
      el.textContent = String(total);
    });
  }

  /**
   * Add a new entry to the cart.  If an existing entry matches the new
   * item on `id`, `size` and `color`, its quantity is incremented by
   * `item.qty`.  Otherwise a new entry is appended.  After updating, the
   * cart is persisted and badges are refreshed.
   *
   * @param {Object} item The item to add.  Must include id, name, price,
   *   image, url and qty.  Optional: size, color.
   */
  function addItem(item) {
    const cart = load();
    const matchIndex = cart.findIndex(entry => {
      return entry.id === item.id && entry.size === item.size && entry.color === item.color;
    });
    if (matchIndex >= 0) {
      cart[matchIndex].qty += item.qty;
    } else {
      cart.push({ ...item });
    }
    save(cart);
    updateBadge();
  }

  /**
   * Update the quantity for an entry at the given index.  If the new
   * quantity is less than 1, the entry is removed.  Returns the
   * updated cart array.
   *
   * @param {number} index Position of the item in the cart array.
   * @param {number} qty New quantity value.
   * @returns {Array<Object>} The updated cart.
   */
  function updateQty(index, qty) {
    const cart = load();
    if (index < 0 || index >= cart.length) return cart;
    const newQty = Number(qty);
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].qty = newQty;
    }
    save(cart);
    updateBadge();
    return cart;
  }

  /**
   * Remove the entry at the given index from the cart.  Returns the
   * updated cart array.
   *
   * @param {number} index Position of the item to remove.
   * @returns {Array<Object>} The updated cart.
   */
  function remove(index) {
    const cart = load();
    if (index < 0 || index >= cart.length) return cart;
    cart.splice(index, 1);
    save(cart);
    updateBadge();
    return cart;
  }

  // Expose the API globally
  window.cartManager = {
    load,
    save,
    getTotalCount,
    updateBadge,
    addItem,
    updateQty,
    remove
  };

  /**
   * Ensure the cart icon exists inside the header-social container.  The site
   * header is injected dynamically via include.js, so we may need to wait for
   * the fragment to appear before appending the icon.
   *
   * @returns {boolean} True if the icon is present after this call.
   */
  function ensureCartIcon() {
    const headerSocial = document.querySelector('.header-social');
    if (!headerSocial) return false;

    const topLangSwitch = headerSocial.querySelector('.top-lang-switch');
    if (!topLangSwitch) return false;

    if (document.querySelector('.header-cart-link')) return true;

    const path = window.location.pathname || '';
    const lang = (document.documentElement.lang || '').toLowerCase();
    const isEnglish = lang.startsWith('en') || path.startsWith('/eng/');
    const link = document.createElement('a');
    link.href = isEnglish ? '/eng/cart.html' : '/cart.html';
    link.className = 'lang-flag header-cart-link';
    link.setAttribute('aria-label', 'Cart');
    link.innerHTML =
      `<span class="header-cart-icon">`
        +
        `<img src="/assets/icons/cart.png" alt="Cart">`
        +
        `<span class="header-cart-count" data-cart-count>`
          +
          `0`
        +
        `</span>`
      +
      `</span>`;

    topLangSwitch.appendChild(link);
    updateBadge();
    return true;
  }

  function initCartUi() {
    updateBadge();
    try {
      const iconReady = ensureCartIcon();
      if (!iconReady) {
        const observer = new MutationObserver(() => {
          if (ensureCartIcon()) {
            updateBadge();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch (err) {
      console.warn('Cart icon injection failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartUi);
  } else {
    initCartUi();
  }
})();