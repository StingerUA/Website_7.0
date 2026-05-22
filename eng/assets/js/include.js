// Unified include.js for Alba Space website (English)
//
// This script dynamically loads header and footer fragments, highlights the
// current navigation item, provides a language switcher, keeps model-viewer
// available with a fallback, and enhances the footer with neatly styled address
// buttons and a call shortcut.

runAfterDomReady(() => {
  // AI-виджеты включены — используются для текстового и голосового общения
  window.__disableAiWidgets = false;
  // Ensure a valid favicon is present
  (function ensureFavicon() {
    try {
      const icons = Array.from(document.querySelectorAll('link[rel~="icon"]'));
      const primary = icons[0];
      if (icons.length > 1) {
        icons.slice(1).forEach((icon) => {
          if (icon.parentNode) icon.parentNode.removeChild(icon);
        });
      }
      if (primary) {
        if (primary.getAttribute('href') === '/favicon.png') {
          primary.setAttribute('href', '/assets/images/albalogo.png');
        }
        return;
      }
      const l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/png';
      l.href = '/assets/images/albalogo.png';
      document.head.appendChild(l);
    } catch (e) {
      /* silently ignore DOM issues */
    }
  })();

  const includes = document.querySelectorAll("[data-include], [data-include-html]");

  // Load CSS for model-viewer
  injectModelViewerStyles();

  // Ensure model-viewer script is loaded
  ensureModelViewerLoaded();

  const ensurePreloaderScript = createPreloaderLoader();
  const ensureModelPreloader = createModelPreloaderLoader();
  const ensureModelNavLoader = createModelNavLoader();

  // ---------------- Mobile nav override ----------------
  if (!document.getElementById("-nav-override-style")) {
    const navStyle = document.createElement("style");
    navStyle.id = "albaspace-nav-override-style";
    navStyle.textContent = `
      @media (max-width: 768px) {
        nav.main-nav {
          position: absolute;
          top: calc(100% + 10px);
          right: 12px;
          width: 33vw;
          max-width: 420px;
          min-width: 220px;
          background: #020617;
          border: 1px solid rgba(15, 23, 42, 0.8);
          border-radius: 10px;
          box-shadow: 0 18px 45px rgba(56,189,248,0.25);
          flex-direction: column;
          padding: 8px 0;
          z-index: 1001;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          opacity: 0;
          transform: translateY(-8px);
          transform-origin: top center;
          transition: opacity .28s ease, transform .28s ease;
          pointer-events: none;
          overflow: hidden;
          will-change: opacity, transform;
        }
        nav.main-nav.nav-open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        nav.main-nav a {
          padding: 12px 18px;
          font-size: 14px;
          border-bottom: 1px solid rgba(15,23,42,0.6);
          color: var(--text-main);
          display: block;
        }
        nav.main-nav a:last-child { border-bottom: none; }
      }
    `;
    document.head.appendChild(navStyle);
  }

  // ---------------- Load includes ----------------
  if (includes.length) {
    includes.forEach((el) => {
      const url = el.getAttribute("data-include") || el.getAttribute("data-include-html");
      if (!url) return;

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load " + url + " (" + res.status + ")");
          return res.text();
        })
        .then((html) => {
          el.innerHTML = html;

          if (url.includes("header-")) {
            markActiveNav();
            setupLangSwitch();
            ensurePreloaderScript();
            ensureModelPreloader();
            ensureModelNavLoader();
          }

          if (url.includes("footer-")) {
            enhanceFooter(el);
            ensureModelPreloader();
          }
        })
        .catch(console.error);
    });
  }

  ensureModelPreloader();

// ... (Начало файла без изменений: runAfterDomReady, ensureFavicon, includes...)

  // ===== GLOBAL AI WIDGET (Albamen / Albaman) =====
  // Отключаем авто-открытие виджета по умолчанию — открываем только по клику
  window.__allowAiAutoOpen = false;
  // Временно отключаем AI-виджет. Установите `window.__disableAiWidgets = false` для включения.
  if (!window.__disableAiWidgets) {
    injectAiWidget();
  } else {
    console.info('[include.js] AI widgets are disabled by __disableAiWidgets flag');
  }
  // Safety: ensure AI panels are collapsed on initial load
  try {
    const cleanupOpenAi = () => {
      document.querySelectorAll('.ai-panel-global.ai-open, .ai-panel-voice.ai-open').forEach(el => el.classList.remove('ai-open'));
      const floating = document.getElementById('ai-floating-global');
      if (floating && (!floating.dataset || floating.dataset.keepVisible !== 'true')) {
        floating.style.display = 'none';
      }
      const toggle = document.getElementById('ai-widget-toggle-btn');
      if (toggle) toggle.classList.remove('ai-open');
    };
    cleanupOpenAi();
    setTimeout(cleanupOpenAi, 300);
  } catch (e) { /* noop */ }

  function injectAiWidget() {
    const path = window.location.pathname || '/';
    const isEn = path.startsWith('/eng/');

    // Тексты (локализация)
    const strings = isEn ? {
      placeholder: 'Send a message...',
      listening: 'Listening...',
      initialStatus: 'How can I help you today?', // Статус стал нейтральным
      talkPrompt: 'Tap and Talk 🔊',
      welcomeBack: 'Welcome back, ', // Приветствие для старых друзей
      voiceNotSupported: 'Voice not supported'
    } : {
      placeholder: 'Bir mesaj yazın...',
      listening: 'Dinliyorum...',
      initialStatus: 'Bugün sana nasıl yardım edebilirim?',
      talkPrompt: 'Tıkla ve Konuş 🔊',
      welcomeBack: 'Tekrar hoş geldin, ',
      voiceNotSupported: 'Ses desteği yok'
    };

    if (document.getElementById('ai-floating-global')) return;

    // --- 1. ПРОВЕРКА ПАМЯТИ (COOKIES/LOCALSTORAGE) ---
    // Пытаемся найти сохраненные данные
    const storedName = localStorage.getItem('albamen_user_name');
    const storedAge = localStorage.getItem('albamen_user_age');
    
    // Если имя есть, меняем начальный статус
    if (storedName) {
      strings.initialStatus = strings.welcomeBack + storedName + "! 🚀";
    }

    // --- HTML Structure ---
    const floating = document.createElement('div');
    floating.className = 'ai-floating';
    floating.id = 'ai-floating-global';
    const avatarSrc = '/assets/images/albamenai.png';

    floating.innerHTML = `
      <div class="ai-hero-avatar" id="ai-avatar-trigger">
        <img src="${avatarSrc}" alt="Albamen AI">
      </div>
      <button class="ai-call-btn pulse" id="ai-call-trigger" aria-label="Call AI">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
    `;

    const footerHost = document.querySelector('footer');
    if (footerHost && getComputedStyle(footerHost).position !== 'fixed') {
       if (getComputedStyle(footerHost).position === 'static') footerHost.style.position = 'relative';
       floating.classList.add('footer-docked');
       footerHost.appendChild(floating);
    } else {
       document.body.appendChild(floating);
    }

    const panel = document.createElement('div');
    panel.className = 'ai-panel-global';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <button class="ai-close-icon" id="ai-close-btn">×</button>
      </div>
      <div class="ai-panel-body">
        <div class="ai-messages-list" id="ai-messages-list-legacy"></div>
        <div class="ai-chat-avatar-large"><img src="${avatarSrc}" alt="Albamen"></div>
        <div class="ai-status-text" id="ai-status-text">${strings.initialStatus}</div>
        <div class="ai-input-area">
          <button class="ai-action-btn ai-mic-btn-panel" id="ai-mic-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <input type="text" class="ai-input" id="ai-input-field-legacy" placeholder="${strings.placeholder}">
          <button class="ai-action-btn ai-send-btn-panel" id="ai-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Ensure panels are hidden by default and attach delegated handlers
    try {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      panel.classList.remove('voice-active');
      if (!window.__albamen_ai_delegated) {
        window.__albamen_ai_delegated = true;
        document.addEventListener('click', (ev) => {
          const close = ev.target.closest && ev.target.closest('.ai-close-icon');
          if (close) {
            const p = close.closest('.ai-panel-global, .ai-panel-voice');
            if (p) p.classList.remove('ai-open');
            return;
          }
          const fullscreen = ev.target.closest && ev.target.closest('.ai-fullscreen-btn');
          if (fullscreen) {
            const p = fullscreen.closest('.ai-panel-global');
            if (p) p.classList.toggle('ai-fullscreen');
            return;
          }
          const openChat = ev.target.closest && ev.target.closest('#ai-avatar-trigger, #ai-call-trigger, .ai-call-btn, .ai-hero-avatar');
          if (openChat) {
            const p = document.querySelector('.ai-panel-global');
            if (p) p.classList.add('ai-open');
            return;
          }
          const openVoice = ev.target.closest && ev.target.closest('#ai-voice-btn, .ai-voice-btn');
          if (openVoice) {
            const vp = document.querySelector('.ai-panel-voice');
            if (vp) vp.classList.add('ai-open');
            return;
          }
        }, { capture: false });
      }
    } catch (e) { /* safe fallback */ }

    const avatarTrigger = document.getElementById('ai-avatar-trigger');
    const callTrigger = document.getElementById('ai-call-trigger');
    const closeBtn = document.getElementById('ai-close-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const micBtn = document.getElementById('ai-mic-btn');
    const inputField = document.getElementById('ai-input-field-legacy');
    const msgList = document.getElementById('ai-messages-list-legacy');
    const statusText = document.getElementById('ai-status-text');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    let recognition = null;
    let isListening = false;
    const voiceLang = isEn ? 'en-US' : 'tr-TR';

    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.lang = voiceLang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim();
        if (transcript && statusText) {
          statusText.textContent = transcript;
        }
      });

      recognition.addEventListener('end', () => {
        if (!isListening) return;
        isListening = false;

        const transcript = statusText?.textContent?.trim() || '';
        if (!transcript || transcript === strings.listening || transcript === strings.initialStatus) {
          if (statusText) statusText.textContent = strings.initialStatus;
          return;
        }

        if (statusText) statusText.textContent = strings.connect;

        const currentName = localStorage.getItem('albamen_user_name');
        const currentAge = localStorage.getItem('albamen_user_age');

        fetch('https://divine-flower-a0ae.nncdecdgc.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: transcript,
            savedName: currentName,
            savedAge: currentAge,
            isVoiceTranscript: true
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data || typeof data.reply !== 'string') {
              if (statusText) statusText.textContent = strings.connectionError;
              return;
            }

            if (data.saveName) {
              localStorage.setItem('albamen_user_name', data.saveName.trim());
            }
            if (data.saveAge) {
              localStorage.setItem('albamen_user_age', data.saveAge.trim());
            }

            if (statusText) statusText.textContent = data.reply.trim() || strings.connectionError;
          })
          .catch((err) => {
            console.error('Voice recognition error:', err);
            if (statusText) statusText.textContent = strings.connectionError;
          });
      });

      recognition.addEventListener('error', (event) => {
        isListening = false;
        console.error('SpeechRecognition error:', event.error || event);
        if (statusText) statusText.textContent = strings.voiceNotSupported;
      });
    }

    const openPanel = (evt) => {
      if (!evt || evt.isTrusted !== true) {
        if (!window.__allowAiAutoOpen) return;
      }
      panel.classList.add('ai-open');
    };
    const closePanel = () => {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      statusText.style.display = 'block';
    };

    avatarTrigger.addEventListener('click', openPanel);
    callTrigger.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    // === ОТПРАВКА СООБЩЕНИЯ С ПАМЯТЬЮ ===
    function sendMessage() {
      const txt = inputField.value.trim();
      if (!txt) return;

      panel.classList.add('chat-active');
      addMessage(txt, 'user');
      inputField.value = '';

      const loadingId = 'loading-' + Date.now();
      addMessage("...", 'bot', loadingId);

      // Читаем актуальные данные из памяти перед отправкой
      const currentName = localStorage.getItem('albamen_user_name');
      const currentAge = localStorage.getItem('albamen_user_age');

      const workerUrl = 'https://divine-flower-a0ae.nncdecdgc.workers.dev';

      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: txt,
          savedName: currentName, // Отправляем имя
          savedAge: currentAge    // Отправляем возраст
        })
      })
      .then(res => res.json())
      .then(data => {
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();

        if (data.reply) {
          // --- ОБРАБОТКА КОМАНД СОХРАНЕНИЯ ---
          let finalReply = data.reply;

          // Ищем тег имени <SAVE_NAME:...>
          const nameMatch = finalReply.match(/<SAVE_NAME:(.*?)>/);
          if (nameMatch) {
            const newName = nameMatch[1].trim();
            localStorage.setItem('albamen_user_name', newName); // Сохраняем в браузер
            finalReply = finalReply.replace(nameMatch[0], ''); // Удаляем тег из текста
            console.log("Albamen remembered name:", newName);
          }

          // Ищем тег возраста <SAVE_AGE:...>
          const ageMatch = finalReply.match(/<SAVE_AGE:(.*?)>/);
          if (ageMatch) {
            const newAge = ageMatch[1].trim();
            localStorage.setItem('albamen_user_age', newAge); // Сохраняем в браузер
            finalReply = finalReply.replace(ageMatch[0], ''); // Удаляем тег из текста
          }

          addMessage(finalReply.trim(), 'bot');
        } else {
          addMessage("Error: AI silent.", 'bot');
        }
      })
      .catch(err => {
        console.error("AI Error:", err);
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();
        addMessage("Connection error.", 'bot');
      });
    }

    function addMessage(text, type, id = null) {
      const div = document.createElement('div');
      div.className = `ai-msg ${type}`;
      div.textContent = text;
      if(id) div.id = id;
      msgList.appendChild(div);
      msgList.scrollTop = msgList.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    micBtn.addEventListener('click', () => {
      panel.classList.add('chat-active');
      statusText.textContent = strings.listening;
      inputField.focus();
    });
  }
// ... (Остальной код: HELPER FUNCTIONS и далее, без изменений)


// ================= HELPER FUNCTIONS =================

function runAfterDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// ================= MODEL VIEWER LOADER =================
function injectModelViewerStyles() {
  if (document.getElementById("-model-viewer-styles")) return;

  const style = document.createElement("style");
  style.id = "albaspace-model-viewer-styles";
  style.textContent = `
    model-viewer {
      width: 100%;
      height: 600px;
      margin-top: 30px;
      background: rgba(0, 0, 0, 0.65);
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(0, 150, 255, 0.5);
      display: block;
    }
    @media (max-width: 768px) {
      model-viewer {
        height: 420px;
        margin-top: 20px;
      }
    }
    model-viewer[ar-status="session-started"] {
      display: block !important;
    }
    model-viewer::part(default-progress-bar) {
      background: linear-gradient(90deg, #00b4ff, #00e5ff);
    }
  `;
  document.head.appendChild(style);
}

function ensureModelViewerLoaded() {
  const hasModelViewer = !!document.querySelector("model-viewer");
  if (!hasModelViewer) return;
  if (window.customElements && window.customElements.get("model-viewer")) return;

  const googleSrc = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.0/model-viewer.min.js";
  const fallbackSrc = "https://unpkg.com/@google/model-viewer@3.0.0/dist/model-viewer.min.js";

  const existingGoogleScript = document.querySelector(`script[src="${googleSrc}"]`);
  const existingFallbackScript = document.querySelector(`script[src="${fallbackSrc}"]`);

  if (existingGoogleScript || existingFallbackScript) return;

  const loadModelViewer = () => {
    if (window.customElements && window.customElements.get("model-viewer")) return;
    const script = document.createElement("script");
    script.type = "module";
    script.src = googleSrc;
    script.onerror = () => {
      if (window.customElements && window.customElements.get("model-viewer")) return;
      const fallbackScript = document.createElement("script");
      fallbackScript.type = "module";
      fallbackScript.src = fallbackSrc;
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  };

  setTimeout(loadModelViewer, 800);
  setTimeout(() => {
    if (!window.customElements || !window.customElements.get("model-viewer")) {
      const fallbackScript = document.createElement("script");
      fallbackScript.type = "module";
      fallbackScript.src = fallbackSrc;
      fallbackScript.async = true;
      document.head.appendChild(fallbackScript);
    }
  }, 3000);
}

function createPreloaderLoader() {
  let loaded = false;
  return function ensurePreloaderScript() {
    if (loaded) return;
    const preloader = document.getElementById("preloader");
    if (!preloader) return;
    const existing = document.querySelector("script[data-preloader-loader]");
    if (existing) { loaded = true; return; }
    const script = document.createElement("script");
    script.src = "/assets/js/preloader.js";
    script.defer = true;
    script.dataset.preloaderLoader = "true";
    document.head.appendChild(script);
    loaded = true;
  };
}

function createModelPreloaderLoader() {
  let loaded = false;
  return function ensureModelPreloader() {
    if (loaded) return;
    const hasViewer = !!document.querySelector('model-viewer');
    if (!hasViewer) return;
    const existing = document.querySelector('script[data-model-preloader]');
    if (existing) { loaded = true; return; }
    const script = document.createElement("script");
    script.src = "/assets/js/model-preloader.js";
    script.defer = true;
    script.dataset.modelPreloader = "true";
    document.head.appendChild(script);
    loaded = true;
  };
}

function createModelNavLoader() {
  let loaded = false;
  return function ensureModelNavLoader() {
    if (loaded) return;
    const existing = document.querySelector('script[data-model-nav-loader]');
    if (existing) { loaded = true; return; }
    const script = document.createElement('script');
    script.src = '/assets/js/model-nav-loader.js';
    script.defer = true;
    script.dataset.modelNavLoader = 'true';
    document.head.appendChild(script);
    loaded = true;
  };
}

// ================= NAV =================
function markActiveNav() {
  const path = normalizePath(window.location.pathname || "/");
  const navLinks = document.querySelectorAll(".main-nav a");
  let matched = false;
  navLinks.forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    try {
      const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
      if (linkPath === path) { a.classList.add("active"); matched = true; }
    } catch (e) {
      if (href && path.endsWith(href)) { a.classList.add("active"); matched = true; }
    }
  });
  if (!matched) {
    navLinks.forEach((a) => {
      const text = (a.textContent || "").trim().toUpperCase();
      if (text.includes("ATLAS")) a.classList.add("active");
    });
  }
}

function normalizePath(p) {
  if (!p || p === "/") return "/eng/index.html";
  if (!p.endsWith(".html") && !p.endsWith("/")) return p + "/";
  return p;
}

// ================= LANG =================
function setupLangSwitch() {
  const path = window.location.pathname || "/";
  const isEn = path.startsWith("/eng/");
  const currentLang = isEn ? "en" : "tr";
  const container = document.querySelector(".top-lang-switch");
  if (!container) return;
  container.querySelectorAll("[data-lang]").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    btn.classList.toggle("active", lang === currentLang);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (lang === currentLang) return;
      const targetPath = lang === "en" ? toEnPath(path) : toTrPath(path);
      window.location.href = targetPath;
    });
  });
}

function toEnPath(path) {
  path = normalizePath(path);
  if (path.startsWith("/eng/")) return path;
  if (path === "/index.html") return "/eng/index.html";
  return "/eng" + (path.startsWith("/") ? path : "/" + path);
}

function toTrPath(path) {
  path = normalizePath(path);
  if (!path.startsWith("/eng/")) return path;
  const tr = path.replace(/^\/eng/, "") || "/index.html";
  return tr;
}

// ================= FOOTER ENHANCER =================
function enhanceFooter(root) {
  injectFooterStyles();
  const footer = root.querySelector("footer");
  if (!footer || footer.classList.contains("alba-footer-v5")) return;
  footer.classList.add("alba-footer-v5");

  const allowCallSquare = /\/hizmetler(\.html)?\/?$/i.test(window.location.pathname || "");
  if (!allowCallSquare) {
    footer.querySelectorAll(".alba-call-square").forEach((el) => el.remove());
  }

  const socials = footer.querySelector(".social-icons") || footer.querySelector(".footer-socials") || footer.querySelector("[data-socials]");
  if (socials) socials.classList.add("alba-footer-socials");

  const addressContainer = footer.querySelector(".footer-actions") || footer.querySelector(".footer-right") || footer.querySelector(".footer-address") || footer.querySelector(".footer-contact") || footer.querySelector("[data-footer-address]");
  if (!addressContainer) return;

  const rawAddrText = (addressContainer.innerText || "").trim();
  if (!rawAddrText) return;

  const merkezBlock = extractSection(rawAddrText, /Head Office/i, /Branch Office/i);
  const mailAnchors = footer.querySelectorAll('a[href^="mailto:"]');
  mailAnchors.forEach((el) => el.remove());

  const contactPanel = document.createElement('div');
  contactPanel.className = 'alba-footer-contact-panel';

  const phoneBtn = document.createElement('a');
  phoneBtn.className = 'alba-footer-action';
  phoneBtn.href = 'tel:+905387781018';
  phoneBtn.innerHTML = `
    <div class="action-row">
      <span class="action-icon">☎</span>
      <span class="action-text">+90 538 778 10 18</span>
    </div>
    <div class="action-hint alba-blink">Tap to call</div>
  `;
  contactPanel.appendChild(phoneBtn);

  const emailBtn = document.createElement('a');
  emailBtn.className = 'alba-footer-action';
  emailBtn.href = 'mailto:hello@albaspace.com.tr';
  emailBtn.innerHTML = `
    <div class="action-row">
      <span class="action-icon">✉</span>
      <span class="action-text">hello@albaspace.com.tr</span>
    </div>
    <div class="action-hint alba-blink">Write to us</div>
  `;
  contactPanel.appendChild(emailBtn);

  const map1 = buildMapButton(merkezBlock, 'Tap to open map');
  if (map1) contactPanel.appendChild(map1);

  addressContainer.innerHTML = '';
  addressContainer.style.display = 'flex';
  addressContainer.style.flexDirection = 'column';
  addressContainer.style.alignItems = 'center';
  addressContainer.style.justifyContent = 'center';
  addressContainer.style.width = '100%';
  addressContainer.style.margin = '0 auto';
  addressContainer.appendChild(contactPanel);
}

function buildMapButton(blockText, hint) {
  if (!blockText) return null;
  const lines = blockText.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return null;
  const title = lines[0];
  const addressLines = lines.slice(1).filter((l) => !/(\+?\s*\d[\d\s()\-]{7,}\d)/.test(l));
  const address = addressLines.join(', ').replace(/\s+/g, ' ').trim();
  if (!address) return null;
  const a = document.createElement('a');
  a.className = 'alba-footer-action';
  a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = `
    <div class="action-row">
      <span class="action-icon">📍</span>
      <span class="action-text">${escapeHtml(title)}</span>
    </div>
    <div class="map-address">${escapeHtml(address)}</div>
    <div class="action-hint alba-blink">${escapeHtml(hint)}</div>
  `;
  return a;
}

function extractSection(text, startRegex, beforeRegex) {
  if (!text) return "";
  const start = text.search(startRegex);
  if (start === -1) return "";
  const sliced = text.slice(start);
  if (!beforeRegex) return sliced.trim();
  const end = sliced.search(beforeRegex);
  if (end === -1) return sliced.trim();
  return sliced.slice(0, end).trim();
}

function findPhone(text) {
  if (!text) return "";
  const m = text.match(/(\+?\s*\d[\d\s()-]{7,}\d)/);
  return m ? m[1].trim() : "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function injectFooterStyles() {
  if (document.getElementById("alba-footer-style-v5")) return;
  const s = document.createElement("style");
  s.id = "alba-footer-style-v5";
  s.textContent = `
    .alba-footer-contact-panel { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 20px; }
    .alba-footer-action { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 14px 20px; border-radius: 16px; background: rgba(15,23,42,0.55); border: 1px solid rgba(148,163,184,0.28); box-shadow: 0 14px 38px rgba(0,0,0,0.35); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); text-decoration: none; width: 220px; transition: transform .2s ease, box-shadow .25s ease, border-color .25s ease; }
    .alba-footer-action:hover { transform: translateY(-2px); border-color: rgba(56,189,248,0.7); box-shadow: 0 18px 52px rgba(56,189,248,0.12), 0 14px 38px rgba(0,0,0,0.45); }
    .alba-footer-action .action-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .alba-footer-action .action-icon { font-size: 18px; color: #38bdf8; }
    .alba-footer-action .action-text { font-weight: 900; color: #a7f3d0; font-size: 14px; letter-spacing: .04em; }
    .alba-footer-action .action-hint { font-size: 11px; color: #cbd5f5; opacity: .75; line-height: 1; }
    .alba-footer-action .map-address { color: #cbd5f5; font-size: 12px; line-height: 1.4; opacity: 0.9; text-align: center; margin-bottom: 6px; }
    .alba-blink { animation: alba-blink 1.5s ease-in-out infinite; }
    @keyframes alba-blink { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.3; } }
    @media (max-width: 768px) { .alba-footer-contact-panel { margin: 12px auto 0; } }
  `;
  document.head.appendChild(s);
}



// ===== GLOBAL AI WIDGET (Albamen / Albaman) =====
  // Временно отключаем AI-виджет. Установите `window.__disableAiWidgets = false` для включения.
  // Разрешаем инъекцию виджета только на странице "/eng/hakkimizda"
  try {
    const _path = window.location.pathname || '/';
    const _enableAiOnThisPage = /\/eng\/hakkimizda(\.html)?\/?$/i.test(_path);
    if (!window.__disableAiWidgets && _enableAiOnThisPage) {
      injectAiWidget();
    } else {
      console.info('[include.js] AI widgets are disabled by flag or not allowed on this page');
    }
  } catch (e) {
    console.error('[include.js] Failed to decide AI widget injection:', e);
  }

  function injectAiWidget() {
    const path = window.location.pathname || '/';
    const isEn = path.startsWith('/eng/');

    // Тексты (локализация)
    const strings = isEn ? {
      placeholder: 'Send a message...',
      listening: 'Listening...',
      initialStatus: 'How can I help you today?', // Статус стал нейтральным
      talkPrompt: 'Tap and Talk 🔊',
      welcomeBack: 'Welcome back, ', // Приветствие для старых друзей
      voiceNotSupported: 'Voice not supported'
    } : {
      placeholder: 'Bir mesaj yazın...',
      listening: 'Dinliyorum...',
      initialStatus: 'Bugün sana nasıl yardım edebilirim?',
      talkPrompt: 'Tıkla ve Konuş 🔊',
      welcomeBack: 'Tekrar hoş geldin, ',
      voiceNotSupported: 'Ses desteği yok'
    };

    if (document.getElementById('ai-floating-global')) return;

    // --- 1. ПРОВЕРКА ПАМЯТИ (COOKIES/LOCALSTORAGE) ---
    // Пытаемся найти сохраненные данные
    const storedName = localStorage.getItem('albamen_user_name');
    const storedAge = localStorage.getItem('albamen_user_age');
    
    // Если имя есть, меняем начальный статус
    if (storedName) {
      strings.initialStatus = strings.welcomeBack + storedName + "! 🚀";
    }

    // --- HTML Structure ---
    const floating = document.createElement('div');
    floating.className = 'ai-floating';
    floating.id = 'ai-floating-global';
    const avatarSrc = '/assets/images/albamenai.png';

    floating.innerHTML = `
      <div class="ai-hero-avatar" id="ai-avatar-trigger">
        <img src="${avatarSrc}" alt="Albamen AI">
      </div>
      <button class="ai-call-btn pulse" id="ai-call-trigger" aria-label="Call AI">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
    `;

    const footerHost = document.querySelector('footer');
    if (footerHost && getComputedStyle(footerHost).position !== 'fixed') {
       if (getComputedStyle(footerHost).position === 'static') footerHost.style.position = 'relative';
       floating.classList.add('footer-docked');
       footerHost.appendChild(floating);
    } else {
       document.body.appendChild(floating);
    }

    const panel = document.createElement('div');
    panel.className = 'ai-panel-global';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <button class="ai-close-icon" id="ai-close-btn">×</button>
      </div>
      <div class="ai-panel-body">
        <div class="ai-messages-list" id="ai-messages-list-legacy"></div>
        <div class="ai-chat-avatar-large"><img src="${avatarSrc}" alt="Albamen"></div>
        <div class="ai-status-text" id="ai-status-text">${strings.initialStatus}</div>
        <div class="ai-input-area">
          <button class="ai-action-btn ai-mic-btn-panel" id="ai-mic-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>
          <input type="text" class="ai-input" id="ai-input-field-legacy" placeholder="${strings.placeholder}">
          <button class="ai-action-btn ai-send-btn-panel" id="ai-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    const avatarTrigger = document.getElementById('ai-avatar-trigger');
    const callTrigger = document.getElementById('ai-call-trigger');
    const closeBtn = document.getElementById('ai-close-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const micBtn = document.getElementById('ai-mic-btn');
    const inputField = document.getElementById('ai-input-field-legacy');
    const msgList = document.getElementById('ai-messages-list-legacy');
    const statusText = document.getElementById('ai-status-text');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    let recognition = null;
    let isListening = false;
    const voiceLang = isEn ? 'en-US' : 'tr-TR';

    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.lang = voiceLang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(' ')
          .trim();
        if (transcript && statusText) {
          statusText.textContent = transcript;
        }
      });

      recognition.addEventListener('end', () => {
        if (!isListening) return;
        isListening = false;

        const transcript = statusText?.textContent?.trim() || '';
        if (!transcript || transcript === strings.listening || transcript === strings.initialStatus) {
          if (statusText) statusText.textContent = strings.initialStatus;
          return;
        }

        if (statusText) statusText.textContent = strings.connect;

        const currentName = localStorage.getItem('albamen_user_name');
        const currentAge = localStorage.getItem('albamen_user_age');

        fetch('https://divine-flower-a0ae.nncdecdgc.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: transcript,
            savedName: currentName,
            savedAge: currentAge,
            isVoiceTranscript: true
          })
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data || typeof data.reply !== 'string') {
              if (statusText) statusText.textContent = strings.connectionError;
              return;
            }

            if (data.saveName) {
              localStorage.setItem('albamen_user_name', data.saveName.trim());
            }
            if (data.saveAge) {
              localStorage.setItem('albamen_user_age', data.saveAge.trim());
            }

            if (statusText) statusText.textContent = data.reply.trim() || strings.connectionError;
          })
          .catch((err) => {
            console.error('Voice recognition error:', err);
            if (statusText) statusText.textContent = strings.connectionError;
          });
      });

      recognition.addEventListener('error', (event) => {
        isListening = false;
        console.error('SpeechRecognition error:', event.error || event);
        if (statusText) statusText.textContent = strings.voiceNotSupported;
      });
    }

    const openPanel = (evt) => {
      if (!evt || evt.isTrusted !== true) {
        if (!window.__allowAiAutoOpen) return;
      }
      panel.classList.add('ai-open');
    };
    const closePanel = () => {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      statusText.style.display = 'block';
    };

    avatarTrigger.addEventListener('click', openPanel);
    callTrigger.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    // === ОТПРАВКА СООБЩЕНИЯ С ПАМЯТЬЮ ===
    function sendMessage() {
      const txt = inputField.value.trim();
      if (!txt) return;

      panel.classList.add('chat-active');
      addMessage(txt, 'user');
      inputField.value = '';

      const loadingId = 'loading-' + Date.now();
      addMessage("...", 'bot', loadingId);

      // Читаем актуальные данные из памяти перед отправкой
      const currentName = localStorage.getItem('albamen_user_name');
      const currentAge = localStorage.getItem('albamen_user_age');

      const workerUrl = 'https://divine-flower-a0ae.nncdecdgc.workers.dev';

      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: txt,
          savedName: currentName, // Отправляем имя
          savedAge: currentAge    // Отправляем возраст
        })
      })
      .then(res => res.json())
      .then(data => {
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();

        if (data.reply) {
          // --- ОБРАБОТКА КОМАНД СОХРАНЕНИЯ ---
          let finalReply = data.reply;

          // Ищем тег имени <SAVE_NAME:...>
          const nameMatch = finalReply.match(/<SAVE_NAME:(.*?)>/);
          if (nameMatch) {
            const newName = nameMatch[1].trim();
            localStorage.setItem('albamen_user_name', newName); // Сохраняем в браузер
            finalReply = finalReply.replace(nameMatch[0], ''); // Удаляем тег из текста
            console.log("Albamen remembered name:", newName);
          }

          // Ищем тег возраста <SAVE_AGE:...>
          const ageMatch = finalReply.match(/<SAVE_AGE:(.*?)>/);
          if (ageMatch) {
            const newAge = ageMatch[1].trim();
            localStorage.setItem('albamen_user_age', newAge); // Сохраняем в браузер
            finalReply = finalReply.replace(ageMatch[0], ''); // Удаляем тег из текста
          }

          addMessage(finalReply.trim(), 'bot');
        } else {
          addMessage("Error: AI silent.", 'bot');
        }
      })
      .catch(err => {
        console.error("AI Error:", err);
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();
        addMessage("Connection error.", 'bot');
      });
    }

    function addMessage(text, type, id = null) {
      const div = document.createElement('div');
      div.className = `ai-msg ${type}`;
      div.textContent = text;
      if(id) div.id = id;
      msgList.appendChild(div);
      msgList.scrollTop = msgList.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    micBtn.addEventListener('click', () => {
      panel.classList.add('chat-active');
      statusText.textContent = strings.listening;
      inputField.focus();
    });
  }



// Вызов для совместимости: обёрнут в проверку флага
if (!window.__disableAiWidgets) {
  injectAiWidget();  // вызов, чтобы код сработал
} else {
  console.info('[include.js] final call skipped: AI widgets disabled');
}

});  // закрывает runAfterDomReady(() => { ... })


