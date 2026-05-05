/**
 * MENU TOGGLE - Mobile & Desktop Dropdown Handler
 * Optimized for performance and accessibility
 */

(function initDropdowns() {
  'use strict';

  const CONFIG = {
    desktop_breakpoint: 1024,
    debug: false
  };

  let initialized = false;
  let documentListenersInitialized = false;
  let resizeListenerInitialized = false;
  let lastWindowWidth = window.innerWidth;

  /**
   * Initialize dropdown menu handlers
   */
  function init() {
    if (initialized) return;

    const nav = document.querySelector('.main-nav');
    if (!nav) {
      requestAnimationFrame(init);
      return;
    }

    initialized = true;

    const dropdowns = nav.querySelectorAll('.dropdown');
    if (dropdowns.length === 0) {
      log('No dropdowns found');
      return;
    }

    // Setup each dropdown
    dropdowns.forEach(dropdown => {
      setupDropdown(dropdown);
    });

    // Setup event delegation
    setupDocumentListeners();
    setupWindowResize();
    
    // Ensure backdrop class is cleared on init
    updateBackdropClass();

    log(`✅ Initialized ${dropdowns.length} dropdowns`);
  }

  /**
   * Setup individual dropdown
   */
  function setupDropdown(dropdown) {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const menu = dropdown.querySelector('.dropdown-menu');

    if (!trigger || !menu) return;

    // Avoid binding duplicate listeners when dynamic headers re-initialize dropdowns.
    // Duplicate handlers toggle the same menu twice on a single tap, which makes
    // mobile dropdowns appear as if they do not open at all.
    if (trigger.dataset.dropdownToggleBound === 'true') return;
    trigger.dataset.dropdownToggleBound = 'true';

    // Click to toggle for both desktop and mobile
    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(dropdown, trigger, menu);
    });
  }

  /**
   * Toggle dropdown visibility
   */
  function toggleDropdown(dropdown, trigger, menu) {
    const isActive = dropdown.classList.contains('active');

    // Close other dropdowns - ensure they are fully disabled
    document.querySelectorAll('.dropdown.active').forEach(openDropdown => {
      if (openDropdown !== dropdown) {
        const closingMenu = openDropdown.querySelector('.dropdown-menu');
        openDropdown.classList.remove('active');
        const openTrigger = openDropdown.querySelector('.dropdown-trigger');
        if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
        
        // Explicitly disable pointer events on the closed menu
        if (closingMenu) {
          closingMenu.style.pointerEvents = 'none';
          // Also disable pointer events on all children to prevent hidden button clicks
          closingMenu.querySelectorAll('*').forEach(child => {
            child.style.pointerEvents = 'none';
          });
        }
      }
    });

    // Toggle current dropdown
    if (isActive) {
      dropdown.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      
      // Disable pointer events on closed menu
      if (menu) {
        menu.style.pointerEvents = 'none';
        menu.querySelectorAll('*').forEach(child => {
          child.style.pointerEvents = 'none';
        });
      }
      updateBackdropClass();
    } else {
      dropdown.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
      
      // Restore pointer events on opened menu
      if (menu) {
        menu.style.pointerEvents = 'auto';
        menu.querySelectorAll('*').forEach(child => {
          child.style.pointerEvents = 'auto';
        });
      }
      updateBackdropClass();
    }
  }

  /**
   * Update backdrop class on body based on active dropdowns
   */
  function updateBackdropClass() {
    const hasActiveDropdown = document.querySelectorAll('.dropdown.active').length > 0;
    if (hasActiveDropdown) {
      document.body.classList.add('has-active-dropdown');
    } else {
      document.body.classList.remove('has-active-dropdown');
    }
  }

  /**
   * Close dropdowns when clicking outside
   */
  function setupDocumentListeners() {
    if (documentListenersInitialized) return;
    documentListenersInitialized = true;

    document.addEventListener('click', e => {
      const nav = document.querySelector('.main-nav');
      if (nav && !nav.contains(e.target)) {
        document.querySelectorAll('.dropdown.active').forEach(dropdown => {
          dropdown.classList.remove('active');
          const trigger = dropdown.querySelector('.dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
        updateBackdropClass();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.dropdown.active').forEach(dropdown => {
          dropdown.classList.remove('active');
          const trigger = dropdown.querySelector('.dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
        updateBackdropClass();
      }
    });
  }

  /**
   * Handle window resize
   */
  function setupWindowResize() {
    if (resizeListenerInitialized) return;
    resizeListenerInitialized = true;

    window.addEventListener('resize', () => {
      const currentWidth = window.innerWidth;
      const wasDesktop = lastWindowWidth >= CONFIG.desktop_breakpoint;
      const isDesktop = currentWidth >= CONFIG.desktop_breakpoint;

      if (wasDesktop !== isDesktop) {
        document.querySelectorAll('.dropdown.active').forEach(dropdown => {
          dropdown.classList.remove('active');
          const trigger = dropdown.querySelector('.dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
        updateBackdropClass();

        lastWindowWidth = currentWidth;
        initialized = false;
        init();
      }
    });
  }

  /**
   * Debug logging
   */
  function log(message) {
    if (CONFIG.debug) {
      console.log('[MenuToggle]', message);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }

  // Export init function for dynamic header loading
  window.initDropdowns = function() {
    initialized = false; // reset so init() can run again after dynamic header load
    init();
  };
})();
