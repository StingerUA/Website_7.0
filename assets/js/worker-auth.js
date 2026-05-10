// Guard against double-loading (include.js may re-execute scripts)
if (typeof window.__workerAuthLoaded === 'undefined') {
  window.__workerAuthLoaded = true;

const WORKER_BASE_URL = "https://albaspace-api.nncdecdgc.workers.dev";
const WORKER_AUTH_URL = `${WORKER_BASE_URL}/auth/google`;
const WORKER_ME_URL = `${WORKER_BASE_URL}/me`;
const WORKER_PROFILE_URL = `${WORKER_BASE_URL}/profile`;
const AUTH_RETURN_KEY = "albaspace_auth_return_to";
const AUTH_SOURCE_KEY = "albaspace_auth_source";

function login(options = {}) {
  persistAuthState(options.source || "default");
  closeAuthUi(options);
  const returnUrl = window.location.href;
  window.location.href = WORKER_AUTH_URL + "?from=" + encodeURIComponent(returnUrl);
}

async function checkUser() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const res = await fetch(WORKER_ME_URL, {
      credentials: "include",
      signal: controller.signal,
      mode: "cors"
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const user = await res.json();
      console.log("Logged in:", user);

      setUserText("Hello " + (user.name || user.email || "user"));
      updateAuthMenu(user);
      closeAuthUi({ closeModal: true, closeMenu: true });
      restorePendingReturnUrl();
    } else {
      console.log("Not logged in (status: " + res.status + ")");
      setUserText("");
      updateAuthMenu(null);
    }
  } catch (error) {
    // Silently handle errors (CORS, timeout, network) without blocking page
    if (error.name === "AbortError") {
      console.debug("Auth check timeout - continuing without authentication");
    } else if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.debug("Auth API unreachable - continuing without authentication");
    } else {
      console.debug("Auth check failed:", error.message);
    }
    setUserText("");
    updateAuthMenu(null);
  }
}

function setUserText(text) {
  const seen = new Set();
  const userElements = [
    ...document.querySelectorAll(".worker-auth-user"),
    ...document.querySelectorAll("#user")
  ].filter((element) => {
    if (!element || seen.has(element)) {
      return false;
    }
    seen.add(element);
    return true;
  });

  userElements.forEach((element) => {
    element.innerText = text;
  });
}

function updateAuthMenu(user) {
  const loggedOutPanel = document.querySelector('.alien-auth-logged-out');
  const loggedInPanel  = document.querySelector('.alien-auth-logged-in');
  const accountLink    = document.getElementById('accountMenuLink');
  const accountAvatar  = document.getElementById('accountMenuAvatar');
  const accountName    = document.getElementById('accountMenuName');
  const triggerAvatar  = document.getElementById('accountAvatar');
  const trigger        = document.querySelector('.alien-ghost');
  const isLoggedIn     = !!(user && (user.name || user.email || user.avatar));

  // Show/hide logged-in vs logged-out panels
  if (loggedOutPanel && loggedInPanel) {
    loggedOutPanel.hidden = isLoggedIn;
    loggedInPanel.hidden  = !isLoggedIn;
  }

  if (accountLink) {
    accountLink.href = accountLink.dataset.accountPage || '/account.html';
  }

  // Avatar inside dropdown menu
  if (accountAvatar) {
    accountAvatar.src = (user && user.avatar) ? user.avatar : '/assets/icons/alien.png';
    accountAvatar.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;';
    if (user && user.avatar) accountAvatar.crossOrigin = 'anonymous';
  }

  // User name inside dropdown menu
  if (accountName) {
    accountName.textContent = (user && (user.name || user.email))
      ? (user.name || user.email)
      : (accountName.dataset.defaultText || 'Hesap');
  }

  // Trigger button avatar (the alien icon in header)
  if (triggerAvatar) {
    triggerAvatar.src = (user && user.avatar) ? user.avatar : '/assets/icons/alien.png';
    triggerAvatar.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;';
    if (user && user.avatar) triggerAvatar.crossOrigin = 'anonymous';
    if (trigger) {
      trigger.setAttribute('title', isLoggedIn
        ? (user.name || user.email || 'Hesap')
        : 'Hesap');
    }
  }
}

function persistAuthState(source) {
  try {
    sessionStorage.setItem(
      AUTH_RETURN_KEY,
      window.location.pathname + window.location.search + window.location.hash
    );
    sessionStorage.setItem(AUTH_SOURCE_KEY, source);
  } catch (error) {
    console.warn("Unable to persist auth state:", error);
  }
}

function restorePendingReturnUrl() {
  try {
    const returnTo = sessionStorage.getItem(AUTH_RETURN_KEY);
    const currentPath = window.location.pathname + window.location.search + window.location.hash;

    if (!returnTo) {
      return;
    }

    sessionStorage.removeItem(AUTH_RETURN_KEY);
    sessionStorage.removeItem(AUTH_SOURCE_KEY);

    if (returnTo !== currentPath && returnTo.startsWith("/")) {
      window.location.replace(returnTo);
    }
  } catch (error) {
    console.warn("Unable to restore auth state:", error);
  }
}

function closeAuthUi(options = {}) {
  if (options.closeMenu) {
    const menu = document.getElementById("alienMenu");
    const trigger = document.querySelector(".alien-ghost");

    if (menu) {
      menu.setAttribute("hidden", "");
      menu.style.display = "";
    }
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  if (options.closeModal) {
    const overlay = document.getElementById("signup-modal-overlay");
    if (overlay) {
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  }
}

async function saveAccountProfile(data) {
  const result = {
    ok: false,
    serverSaved: false,
    message: "Unable to save profile.",
    error: null
  };

  try {
    const response = await fetch(WORKER_PROFILE_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      result.message = body?.error || `Server error: ${response.status}`;
      result.error = body || { status: response.status };
      return result;
    }

    result.ok = true;
    result.serverSaved = true;
    result.message = 'Profile saved successfully.';
    // Re-fetch user and refresh header avatar + menu
    if (typeof checkUser === 'function') {
      setTimeout(checkUser, 300);
    }
    return result;
  } catch (error) {
    result.error = error;
    result.message = 'Unable to contact server. Your profile was saved locally.';
    return result;
  }
}

window.saveAccountProfile = saveAccountProfile;

function logout() {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('albamen_session_id');
  } catch (e) {
    console.warn('Unable to clear local auth state', e);
  }
  // Чистим все возможные cookie (старые и новые)
  document.cookie = 'user_id=; Max-Age=0; path=/;';
  document.cookie = 'albamen_session_id=; Max-Age=0; path=/;';
  document.cookie = 'albaspace_session=; Max-Age=0; path=/; SameSite=None; Secure;';
  // Удаляем сессию на сервере, потом перезагружаем
  fetch(WORKER_BASE_URL + '/logout', { credentials: 'include' })
    .finally(() => window.location.reload());
}

window.login = login;
window.checkUser = checkUser;
window.logout = logout;

// Defer checkUser() to prevent blocking page load
// Only attempt if header contains auth user element
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.worker-auth-user') || document.getElementById('accountAvatar') || document.querySelector('.alien-ghost')) {
      setTimeout(checkUser, 100);
    }
  }, { once: true });
} else {
  if (document.querySelector('.worker-auth-user') || document.getElementById('accountAvatar') || document.querySelector('.alien-ghost')) {
    setTimeout(checkUser, 100);
  }
}

}