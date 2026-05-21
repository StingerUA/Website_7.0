// Unified include.js for Alba Space website (Turkish)
// Includes: Dynamic Header/Footer,   l AI Widget (Text+Voice), Analytics (GA4 + Yandex)
runAfterDomReady(() => {
  // AI-виджеты включены — используются для текстового и голосового общения
  window.__disableAiWidgets = false;
  
  // 0. Inject model-viewer error handler (very first, before analytics)
  if (!document.querySelector('script[src*="model-viewer-error-handler"]')) {
    const errorScript = document.createElement('script');
    errorScript.src = '/assets/js/model-viewer-error-handler.js';
    errorScript.defer = false;
    errorScript.async = false;
    document.head.insertBefore(errorScript, document.head.firstChild);
  }

  // 0b. Fullscreen expand button for model-viewer (mobile only)
  if (document.querySelector('model-viewer') &&
      !document.querySelector('script[src*="model-viewer-fullscreen"]')) {
    const _fsScript = document.createElement('script');
    _fsScript.src = '/assets/js/model-viewer-fullscreen.js';
    _fsScript.defer = true;
    document.head.appendChild(_fsScript);
  }
  
  // 1. ЗАПУСК АНАЛИТИКИ (В первую очередь)
  injectAnalytics();

  // Load lang-switch.js dynamically if not present
  if (!document.querySelector('script[src*="lang-switch.js"]')) {
    const script = document.createElement('script');
    script.src = '/assets/js/lang-switch.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  // Voice debug diagnostics have been disabled in production.
  // Previously this loaded /assets/js/voice-debug.js and injected a fixed debug button.
  // 2. Favicon
  (function ensureFavicon() {
    try {
      const icons = Array.from(document.querySelectorAll('link[rel~="icon"]'));
      let primary = icons[0];
      if (icons.length > 1) {
        icons.slice(1).forEach((icon) => {
          if (icon.parentNode) icon.parentNode.removeChild(icon);
        });
      }
      if (primary) {
        if (primary.getAttribute('href') === '/favicon.png') {
          primary.setAttribute('href', '/assets/icons/AlbaLogo.png');
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

  (function injectOpenGraphMetaTags() {
    try {
      const head = document.head;
      if (!head) return;

      const hasOgTitle = !!document.querySelector('meta[property="og:title"]');
      const hasOgDesc = !!document.querySelector('meta[property="og:description"]');
      const hasOgImage = !!document.querySelector('meta[property="og:image"]');
      const hasOgUrl = !!document.querySelector('meta[property="og:url"]');
      const hasTwitterCard = !!document.querySelector('meta[name="twitter:card"]');

      const pageTitle = document.title || 'Alba Space';
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'ALBA Space — kosmos, tehnologiia i opyt dlia vsekh.';
      const pageUrl = window.location.href;
      const imageUrl = '/assets/images/og-preview.jpg';

      if (!hasOgTitle) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:title');
        meta.setAttribute('content', pageTitle);
        head.appendChild(meta);
      }

      if (!hasOgDesc) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:description');
        meta.setAttribute('content', metaDescription);
        head.appendChild(meta);
      }

      if (!hasOgImage) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:image');
        meta.setAttribute('content', imageUrl);
        head.appendChild(meta);
      }

      if (!hasOgUrl) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:url');
        meta.setAttribute('content', pageUrl);
        head.appendChild(meta);
      }

      if (!hasTwitterCard) {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'twitter:card');
        meta.setAttribute('content', 'summary_large_image');
        head.appendChild(meta);
      }
    } catch (e) {
      /* silently ignore metadata injection issues */
    }
  })();

  // 3. Загружаем CSS и скрипт для model-viewer
  injectModelViewerStyles();
  ensureModelViewerLoaded();
  // 3.1. Фикс фона и ширины на iOS
  injectBackgroundFix();
  // 3.2. Загружаем dropdown z-index fix
  injectDropdownZIndexFix();
  try {
    const p = (window.location && window.location.pathname ? window.location.pathname : '/') || '/';
    const path = String(p).toLowerCase();
    const isIndex = path === '/' || path === '/index.html' || path === '/eng/index.html' || path === '/rus/index.html';
    const isProductLike = /\/(product-[^/]+|shop|cart)\.html$/.test(path);
    if (!isIndex && !isProductLike) {
      document.documentElement.classList.add('alba-dark-gradient');
      if (document.body) document.body.classList.add('alba-dark-gradient');
    }
  } catch (e) {}

  // 4. Создаём лоадеры
  const ensurePreloaderScript = createPreloaderLoader();
  const ensureModelPreloader = createModelPreloaderLoader();
  const ensureModelNavLoader = createModelNavLoader();
  // 5. Mobile nav override - REMOVED, using site.css mobile styles instead
  // The override was causing pointer-events issues with menu toggle
  // 6. Load includes (Header / Footer)
  const includes = document.querySelectorAll("[data-include], [data-include-html]");
  if (includes.length) {
    includes.forEach((el) => {
      const url = el.getAttribute("data-include") || el.getAttribute("data-include-html");
      if (!url) return;
      const tryPaths = [url];
      if (url.startsWith("/")) {
        tryPaths.push(url.slice(1));
      }
      const loadFragment = async () => {
        let html = "";
        let lastErr;
        for (const path of tryPaths) {
          try {
            const res = await fetch(path, { cache: "default" });
            if (!res.ok) throw new Error("Failed " + res.status + " for " + path);
            html = await res.text();
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!html) throw lastErr || new Error("Unknown include error for " + url);
        // Вставка HTML и выполнение скриптов
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        const scripts = Array.from(tmp.querySelectorAll("script"));
        scripts.forEach((s) => {
          if (s.parentNode) s.parentNode.removeChild(s);
        });
        el.innerHTML = tmp.innerHTML;
          // Process any nested data-include elements inside the injected fragment
          const processNestedIncludes = async (rootEl) => {
            const nested = Array.from(rootEl.querySelectorAll('[data-include], [data-include-html]'));
            for (const n of nested) {
              const nestedUrl = n.getAttribute('data-include') || n.getAttribute('data-include-html');
              if (!nestedUrl) continue;
              const nestedTry = [nestedUrl];
              if (nestedUrl.startsWith('/')) nestedTry.push(nestedUrl.slice(1));
              let nestedHtml = '';
              let nestedErr;
              for (const p of nestedTry) {
                try {
                  const res2 = await fetch(p, { cache: 'default' });
                  if (!res2.ok) throw new Error('Failed ' + res2.status + ' for ' + p);
                  nestedHtml = await res2.text();
                  break;
                } catch (ee) { nestedErr = ee; }
              }
              if (!nestedHtml) {
                console.error('[include.js] nested include failed', nestedUrl, nestedErr);
                continue;
              }
              const tmp2 = document.createElement('div');
              tmp2.innerHTML = nestedHtml;
              const scripts2 = Array.from(tmp2.querySelectorAll('script'));
              scripts2.forEach((s) => { if (s.parentNode) s.parentNode.removeChild(s); });
              n.innerHTML = tmp2.innerHTML;
              scripts2.forEach((oldScript) => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes || []).forEach(({ name, value }) => {
                  if (name === 'src') newScript.src = value; else newScript.setAttribute(name, value);
                });
                if (!oldScript.src) newScript.textContent = oldScript.textContent || '';
                if (oldScript.async) newScript.async = true;
                if (oldScript.defer) newScript.defer = true;
                (document.head || document.documentElement).appendChild(newScript);
              });
              // recurse into newly-inserted fragment
              await processNestedIncludes(n);
            }
          };
          await processNestedIncludes(el);
        scripts.forEach((oldScript) => {
          // Skip external scripts already present in the DOM (prevents double-load SyntaxErrors)
          if (oldScript.src) {
            const abs = new URL(oldScript.src, window.location.href).href;
            if (document.querySelector(`script[src="${abs}"]`) ||
                document.querySelector(`script[src="${oldScript.src}"]`)) {
              return; // already loaded — skip
            }
          }
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes || []).forEach(({ name, value }) => {
            if (name === "src") {
              newScript.src = value;
            } else {
              newScript.setAttribute(name, value);
            }
          });
          if (!oldScript.src) {
            newScript.textContent = oldScript.textContent || "";
          }
          if (oldScript.async) newScript.async = true;
          if (oldScript.defer) newScript.defer = true;
          (document.head || document.documentElement).appendChild(newScript);
        });
      };
      loadFragment()
        .then(() => {
          if (url.includes("header-")) {
            markActiveNav();
            setupLangSwitch();
            ensurePreloaderScript();
            ensureModelPreloader();
            ensureModelNavLoader();
            // Re-initialize dropdowns after dynamic header insertion
            // Retry loop handles race condition where menu-toggle.js may still be loading
            (function tryInitDropdowns(attempts) {
              if (window.initDropdowns) {
                window.initDropdowns();
              } else if (attempts > 0) {
                setTimeout(function() { tryInitDropdowns(attempts - 1); }, 80);
              }
            })(15);
          }
          if (url.includes("footer-")) {
            enhanceFooter(el);
            ensureModelPreloader();
          }
          // After an include is injected, re-scan for revealable elements so
          // dynamically-inserted content (header/footer) and content shown by
          // interactive controls are observed and animated.
          try {
            if (typeof initScrollReveal === 'function') initScrollReveal();
          } catch (e) { /* ignore errors during init */ }
        })
        .catch((err) => console.error("[include.js] include failed", url, err));
    });
  } else {
    ensureModelPreloader();
  }
  // 7. GLOBAL AI WIDGET (Albamen / Albaman) — текстовый чат
  // Отключаем авто-открытие по умолчанию — будем открывать только по клику
  // ===== GLOBAL AI WIDGET (Albamen / Albaman) =====
  // Отключаем авто-открытие виджета по умолчанию — открываем только по клику
  window.__allowAiAutoOpen = false;
  // Включаем виджеты только на странице "hakkimizda"
  try {
    const _path = window.location.pathname || '/';
    // Enable unified AI widget on all pages
    if (!window.__disableAiWidgets) {
      injectUnifiedAiWidget();
    } else {
      console.info('[include.js] AI widget is disabled by flag');
    }
  } catch (e) {
    console.error('[include.js] Failed to decide AI widget injection:', e);
  }
    // Safety: ensure AI panels are collapsed on initial load
    try {
      const cleanupOpenAi = () => {
        document.querySelectorAll('.ai-panel-global.ai-open, .ai-panel-voice.ai-open').forEach(el => el.classList.remove('ai-open'));
        const floating = document.getElementById('ai-floating-global');
        if (floating && (!floating.dataset || floating.dataset.keepVisible !== 'true')) {
          floating.setAttribute('style', 'display: none !important');
        }
        const toggle = document.getElementById('ai-widget-toggle-btn');
        if (toggle) toggle.classList.remove('ai-open');
      };
      // run immediately and also shortly after to cover race conditions
      cleanupOpenAi();
      setTimeout(cleanupOpenAi, 300);
    } catch (e) { /* noop */ }
  // 9. Плавное появление блоков на всех страницах
  initScrollReveal();

  // --- Текстовый чат Albamen (старый UI, новая схема с памятью) ---
  function injectAiWidget() {
    const path = window.location.pathname || '/';
    const isEn = path.startsWith('/eng/');
    const isRu = path.startsWith('/rus/');

    const strings = isEn ? {
      placeholder: 'Send a message...',
      listening: 'Listening...',
      connect: 'Connecting...',
      initialStatus: 'How can I help you today?',
      talkPrompt: 'Tap and Talk 🔊',
      welcomeBack: 'Welcome back, ',
      voiceNotSupported: 'Voice not supported',
      connectionError: 'Connection error.'
    } : isRu ? {
      placeholder: 'Напишите сообщение...',
      listening: 'Слушаю...',
      connect: 'Подключение...',
      initialStatus: 'Чем я могу вам помочь?',
      talkPrompt: 'Нажми и говори 🔊',
      welcomeBack: 'С возвращением, ',
      voiceNotSupported: 'Голос не поддерживается',
      connectionError: 'Ошибка соединения.'
    } : {
      placeholder: 'Bir mesaj yazın...',
      listening: 'Dinliyorum...',
      connect: 'Bağlanıyor...',
      initialStatus: 'Bugün sana nasıl yardım edebilirim?',
      talkPrompt: 'Tıkla ve Konuş 🔊',
      welcomeBack: 'Tekrar hoş geldin, ',
      voiceNotSupported: 'Ses desteği yok',
      connectionError: 'Bağlantı hatası.'
    };

    // имя для приветствия
    const storedName = localStorage.getItem('albamen_user_name');
    if (storedName) {
      strings.initialStatus = strings.welcomeBack + storedName + '! 🚀';
    }

    // sessionId для памяти
    const sessionId = getAlbamenSessionId();

    if (document.getElementById('ai-floating-global')) return;

    // Создаем контейнер для виджетов (минимизированный — видны только кнопки)
    const floating = document.createElement('div');
    floating.className = 'ai-floating';
    floating.id = 'ai-floating-global';
    const avatarSrc = '/assets/images/albamenai.png';
    floating.innerHTML = `
      <div class="ai-hero-avatar" id="ai-avatar-trigger">
        <img src="${avatarSrc}" alt="Albamen AI">
      </div>
    `;
    floating.setAttribute('style', 'display: none !important'); // Скрываем виджеты по умолчанию — открываем только по клику
    document.body.appendChild(floating);

    // Создаем главную кнопку вызова виджетов (всегда видна)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'ai-widget-toggle-btn';
    toggleBtn.id = 'ai-widget-toggle-btn';
    toggleBtn.setAttribute('aria-label', isEn ? 'Open AI assistant' : 'AI asistanı aç');
    toggleBtn.innerHTML = `<img src="/assets/images/albamenai.png" alt="AI" style="width: 100%; height: 100%; object-fit: contain;" />`;
    document.body.appendChild(toggleBtn);

    // Обработчик для открытия/закрытия виджетов
    toggleBtn.addEventListener('click', () => {
      const computedDisplay = window.getComputedStyle(floating).display;
      if (computedDisplay === 'none') {
        floating.setAttribute('style', 'display: flex !important'); // Показываем виджеты
        toggleBtn.classList.add('ai-open');
      } else {
        floating.setAttribute('style', 'display: none !important'); // Скрываем виджеты
        toggleBtn.classList.remove('ai-open');
        // Закрываем панель чата если она открыта
        const panel = document.querySelector('.ai-panel-global');
        if (panel) panel.classList.remove('ai-open');
      }
    });

    const panel = document.createElement('div');
    panel.className = 'ai-panel-global';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <button class="ai-voice-btn" id="ai-voice-btn-panel" aria-label="Call AI">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </button>
        <div class="ai-header-actions">
          <button class="ai-fullscreen-btn" id="ai-fullscreen-btn" aria-label="Toggle fullscreen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path>
            </svg>
          </button>
          <button class="ai-close-icon" id="ai-close-btn">×</button>
        </div>
      </div>
      <div class="ai-panel-body">
        <div class="ai-messages-list" id="ai-messages-list-legacy"></div>
        <div class="ai-chat-avatar-large"><img src="${avatarSrc}" alt="Albamen"></div>
        <div class="ai-status-text" id="ai-status-text">${strings.initialStatus}</div>
        <div class="ai-status-text ai-voice-status" id="voice-status-text" style="display:none;">${strings.talkPrompt}</div>
        <div class="voice-controls hidden" id="voice-inline-controls">
          <div class="voice-wave hidden" id="voice-wave">
            <div class="voice-bar"></div><div class="voice-bar"></div><div class="voice-bar"></div>
          </div>
          <button class="voice-stop-btn hidden" id="voice-stop-btn">■</button>
        </div>
        <div class="ai-input-area">
          <button class="ai-action-btn ai-mic-btn-panel" id="ai-mic-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <input type="text" class="ai-input" id="ai-input-field-legacy" placeholder="${strings.placeholder}">
          <button class="ai-action-btn ai-send-btn-panel" id="ai-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Ensure panels are hidden by default and attach delegated handlers
    // This prevents accidental auto-open and makes close buttons reliable
    try {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      panel.classList.remove('voice-active');
      // Delegated click handler: open/close reliably even with duplicate IDs
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
    const closeBtn = document.getElementById('ai-close-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const micBtn = document.getElementById('ai-mic-btn');
    const inputField = document.getElementById('ai-input-field-legacy');
    const msgList = document.getElementById('ai-messages-list-legacy');
    const statusText = document.getElementById('ai-status-text');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const recognition = SpeechRec ? new SpeechRec() : null;
    let isListening = false;

    const openPanel = (evt) => {
      // Only open in response to a trusted user event, or when explicitly allowed.
      if (!evt || evt.isTrusted !== true) {
        if (!window.__allowAiAutoOpen) return;
      }
      panel.classList.add('ai-open');
    };
    const closePanel = () => {
      panel.classList.remove('ai-open');
      panel.classList.remove('chat-active');
      statusText.style.display = 'block';
      statusText.textContent = strings.initialStatus;
    };

    avatarTrigger.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    const fullscreenBtn = document.getElementById('ai-fullscreen-btn');
    fullscreenBtn.addEventListener('click', () => {
      panel.classList.toggle('ai-fullscreen');
    });

    function addMessage(text, type, id = null) {
      const div = document.createElement('div');
      div.className = `ai-msg ${type}`;
      div.textContent = text;
      if (id) div.id = id;
      msgList.appendChild(div);
      msgList.scrollTop = msgList.scrollHeight;
      return div;
    }

    // ── Conversation history (kept in memory per session) ──
    if (!window.__albamenHistory) window.__albamenHistory = [];
    const chatHistory = window.__albamenHistory;

    // ── Voice synthesis (superhero voice via Web Speech API) ──
    function speakAlbamen(text) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')  // remove emoji
        .replace(/[🚀🌌👨‍🚀⭐🛸💫🌟]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/https?:\/\/\S+/g, '')           // remove URLs
        .replace(/\n+/g, ' ')
        .trim();
      if (!clean) return;

      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const utt = new SpeechSynthesisUtterance(clean);

        // Detect language from text
        const isRu = /[а-яёА-ЯЁ]/.test(clean);
        const isTr = /[ğışüöçĞİŞÜÖÇ]/.test(clean) && !isRu;

        if (isRu) utt.lang = 'ru-RU';
        else if (isTr) utt.lang = 'tr-TR';
        else utt.lang = 'en-US';

        // Pick deepest male voice for the current language
        const preferred = voices.find(v =>
          v.lang.startsWith(utt.lang.slice(0, 2)) &&
          /male|david|mark|jorge|dmitri|yuri|ivan|ali|ahmet/i.test(v.name) &&
          !/female|zira|monica/i.test(v.name)
        ) || voices.find(v =>
          v.lang.startsWith(utt.lang.slice(0, 2)) &&
          !/female|zira|monica/i.test(v.name)
        ) || voices.find(v => !/female|zira|monica/i.test(v.name))
          || voices[0];

        if (preferred) utt.voice = preferred;
        utt.pitch  = 0.70;   // deep = superhero
        utt.rate   = 0.90;   // slightly slower = dramatic
        utt.volume = 1;
        window.speechSynthesis.speak(utt);
      };

      // Chrome loads voices async — wait if needed
      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
      }
    }

    function sendMessage() {
      const txt = (inputField.value || '').trim();
      if (!txt) return;

      panel.classList.add('chat-active');
      addMessage(txt, 'user');
      inputField.value = '';

      const loadingId = 'loading-' + Date.now();
      addMessage('...', 'bot', loadingId);
      statusText.textContent = strings.connect;
      statusText.style.display = 'block';

      const workerUrl = 'https://divine-flower-a0ae.nncdecdgc.workers.dev';

      const currentName = localStorage.getItem('albamen_user_name') || null;
      const currentAge  = localStorage.getItem('albamen_user_age')  || null;

      // Send last 10 messages as history for context
      const historySlice = chatHistory.slice(-10);

      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          sessionId,
          savedName: currentName,
          savedAge: currentAge,
          history: historySlice
        })
      })
        .then(res => res.json())
        .then(data => {
          const loader = document.getElementById(loadingId);
          if (loader) loader.remove();

          if (!data || typeof data.reply !== 'string') {
            addMessage(strings.connectionError, 'bot');
            statusText.style.display = 'none';
            return;
          }

          // Save name/age from structured JSON fields (fixed worker)
          if (data.saveName && typeof data.saveName === 'string') {
            const n = data.saveName.trim();
            if (n) localStorage.setItem('albamen_user_name', n);
          }
          if (data.saveAge && typeof data.saveAge === 'string') {
            const a = data.saveAge.trim();
            if (a) localStorage.setItem('albamen_user_age', a);
          }

          // Fallback: extract tags if worker didn't strip them
          let finalReply = data.reply.trim();
          const nmatch = finalReply.match(/<SAVE_NAME:([^>]+)>/);
          if (nmatch) {
            const n = nmatch[1].trim();
            if (n) localStorage.setItem('albamen_user_name', n);
            finalReply = finalReply.replace(nmatch[0], '').trim();
          }
          const amatch = finalReply.match(/<SAVE_AGE:([^>]+)>/);
          if (amatch) {
            const a = amatch[1].trim();
            if (a) localStorage.setItem('albamen_user_age', a);
            finalReply = finalReply.replace(amatch[0], '').trim();
          }

          if (/^(Grok Hatası|JS Hatası)/i.test(finalReply)) {
            addMessage(strings.connectionError, 'bot');
            statusText.style.display = 'none';
            return;
          }

          const reply = finalReply || strings.connectionError;

          // Add to history for next request
          chatHistory.push({ role: 'user',  text: txt   });
          chatHistory.push({ role: 'model', text: reply });

          addMessage(reply, 'bot');
          statusText.style.display = 'none';

          // 🔊 Speak the reply in superhero voice
          speakAlbamen(reply);
        })
        .catch(err => {
          console.error('AI Error:', err);
          const loader = document.getElementById(loadingId);
          if (loader) loader.remove();
          addMessage(strings.connectionError, 'bot');
          statusText.style.display = 'none';
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    micBtn.addEventListener('click', () => {
      if (!recognition) {
        statusText.textContent = strings.voiceNotSupported;
        statusText.style.display = 'block';
        return;
      }
      if (isListening) {
        recognition.stop();
        return;
      }
      panel.classList.add('chat-active');
      statusText.textContent = strings.listening;
      statusText.style.display = 'block';
      inputField.focus();
      recognition.lang = isEn ? 'en-US' : isRu ? 'ru-RU' : 'tr-TR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      isListening = true;
      recognition.start();
    });

    if (recognition) {
      recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map(res => res[0].transcript)
          .join(' ')
          .trim();
        if (transcript) {
          inputField.value = transcript;
        }
        // If final result — auto-send immediately
        if (event.results[event.results.length - 1].isFinal) {
          if (transcript) {
            setTimeout(() => sendMessage(), 300);
          }
        }
      });
      recognition.addEventListener('end', () => {
        isListening = false;
        statusText.textContent = strings.initialStatus;
        // Visual: reset mic button
        if (micBtn) micBtn.classList.remove('ai-mic-active');
      });
      recognition.addEventListener('error', () => {
        isListening = false;
        statusText.textContent = strings.voiceNotSupported;
        if (micBtn) micBtn.classList.remove('ai-mic-active');
      });
    }
  }

}); // END runAfterDomReady




// -------------------- HELPER FUNCTIONS --------------------
function runAfterDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function initScrollReveal() {
  if (window.__albaRevealReady) return;
  window.__albaRevealReady = true;

  const processed = new WeakSet();
  let revealIndex = 0;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px'
  });

  const selectors = [
    // Explicit opts-in
    '[data-reveal]',
    '.reveal',

    // Common layout containers across legacy pages
    'body > *:not(script):not(style):not(link):not(meta)',
    'main > *:not(script):not(style)',
    '.container',
    '.row',
    '.col',
    '.section',
    '.content',
    '.wrapper',

    // Semantically meaningful blocks
    'section',
    'article',
    '.card',
    '.glass-box',
    '.product-card',
    '.feature-card',
    '.info-card',
    '.panel',
    '.content-block',
    '.hero',
    '.category-card',
    '.logo-carousel-wrap',
    '.atlas-inner',
    '.shop-card',
    '.blog-card',
    '.gallery-card',
    '.team-card',
    '.mission-card'
  ];

  const tagForReveal = (el) => {
    if (!el || processed.has(el) || el.dataset.revealSkip === 'true') return;

    if (!el.classList.contains('reveal')) {
      el.classList.add('reveal');
    }

    if (!el.dataset.direction) {
      el.dataset.direction = (revealIndex % 2 === 0) ? 'left' : 'right';
    }

    const delay = el.dataset.direction === 'left' ? revealIndex * 0.05 : revealIndex * 0.06;
    el.style.setProperty('--reveal-delay', `${delay}s`);

    observer.observe(el);
    processed.add(el);
    revealIndex += 1;
  };

  const scan = () => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach(tagForReveal);
    });
  };

  // Run immediately
  scan();
  
  // Run again after layout is painted (optimized with requestIdleCallback for performance)
  // This catches dynamically added elements from headers/footers
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => scan(), { timeout: 800 });
  } else {
    setTimeout(scan, 300);
  }
}

function injectAnalytics() {
  if (!document.querySelector('script[src*="googletagmanager"]')) {
    const gScript = document.createElement('script');
    gScript.async = true;
    gScript.src = "https://www.googletagmanager.com/gtag/js?id=G-FV3RXWJ5PQ";
    document.head.appendChild(gScript);
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-FV3RXWJ5PQ');
  }
  if (!window.ym) {
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        k=e.createElement(t),a=e.getElementsByTagName(t)[0];
        k.async=1;
        k.src=r;
        if(a) { a.parentNode.insertBefore(k,a); }
        else { document.head.appendChild(k); }
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=105726731", "ym");
    ym(105726731, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true,
        ecommerce:"dataLayer"
    });
  }
}

function injectModelViewerStyles() {
  if (document.getElementById("albaspace-model-viewer-styles")) return;
  const style = document.createElement("style");
  style.id = "albaspace-model-viewer-styles";
  style.textContent = `
    model-viewer { width: 100%; height: 600px; margin-top: 30px; background: rgba(0, 0, 0, 0.65); border-radius: 12px; box-shadow: 0 0 30px rgba(0, 150, 255, 0.5); display: block; }
    @media (max-width: 768px) { model-viewer { height: 420px; margin-top: 20px; } }
    model-viewer[ar-status="session-started"] { display: block !important; }
    model-viewer::part(default-progress-bar) { background: linear-gradient(90deg, #00b4ff, #00e5ff); }
  `;
  document.head.appendChild(style);
}

// Фикс увеличенного фона и «лишней ширины» на iPhone/iOS
function injectBackgroundFix() {
  if (document.getElementById('alba-bg-fix-style')) return;

  const style = document.createElement('style');
  style.id = 'alba-bg-fix-style';
  style.textContent = `
    /* Prevent horizontal overflow — use clip on html (safe for position:fixed) */
    html { overflow-x: clip; }
    body { overflow-x: hidden !important; max-width: 100vw !important; }
    model-viewer { max-width: 100% !important; box-sizing: border-box !important; }
    @media (max-width: 1024px) {
      body { background-attachment: scroll !important; }
    }
  `;
  document.head.appendChild(style);
}

// Inject dropdown z-index fix CSS
function injectDropdownZIndexFix() {
  if (document.getElementById('alba-dropdown-z-index-fix')) return;
  
  const link = document.createElement('link');
  link.id = 'alba-dropdown-z-index-fix';
  link.rel = 'stylesheet';
  link.href = '/assets/css/dropdown-z-index-fix.css';
  document.head.appendChild(link);
}

function ensureModelViewerLoaded() {
  const hasModelViewer = !!document.querySelector("model-viewer");
  if (!hasModelViewer) return;
  if (window.customElements && window.customElements.get("model-viewer")) return;
  const googleSrc = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.0/model-viewer.min.js";
  const fallbackSrc = "https://unpkg.com/@google/model-viewer@3.0.0/dist/model-viewer.min.js";
  const localSrc = "/assets/js/model-viewer.min.js";
  const existingGoogleScript = document.querySelector(`script[src="${googleSrc}"]`);
  const existingLocalScript = document.querySelector(`script[src="${localSrc}"]`);

  const loadModelViewerScript = (src, onSuccess, onError) => {
    if (window.customElements && window.customElements.get("model-viewer")) {
      onSuccess?.();
      return;
    }

    if (document.querySelector(`script[src="${src}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.setAttribute('crossorigin', 'anonymous');
    script.onload = () => {
      onSuccess?.();
    };
    script.onerror = () => {
      onError?.();
    };
    document.head.appendChild(script);
  };

  const tryLocalFallback = () => {
    if (window.customElements && window.customElements.get("model-viewer")) return;
    console.debug('[model-viewer] Trying local fallback...');
    loadModelViewerScript(localSrc, () => {
      console.debug('[model-viewer] Local fallback loaded successfully');
    }, () => {
      console.warn('[model-viewer] Local fallback failed too');
    });
  };

  const tryFallback = () => {
    if (window.customElements && window.customElements.get("model-viewer")) return;
    console.debug('[model-viewer] Primary CDN failed, trying unpkg fallback...');
    loadModelViewerScript(fallbackSrc, () => {
      console.debug('[model-viewer] Fallback CDN loaded successfully');
    }, () => {
      console.warn('[model-viewer] Fallback CDN failed, trying local fallback...');
      tryLocalFallback();
    });
  };

  const loadPrimaryModelViewer = () => {
    if (window.customElements && window.customElements.get("model-viewer")) return;
    if (!existingGoogleScript) {
      loadModelViewerScript(googleSrc, () => {
        console.debug('[model-viewer] Primary CDN loaded successfully');
      }, tryFallback);
    } else {
      console.debug('[model-viewer] Primary CDN script already present, waiting for registration...');
    }

    setTimeout(() => {
      if (!window.customElements || !window.customElements.get("model-viewer")) {
        console.debug('[model-viewer] model-viewer not registered after timeout, trying fallback...');
        tryFallback();
      }
    }, 10000); // 10 second timeout
  };

  if (!existingLocalScript) {
    setTimeout(loadPrimaryModelViewer, 800);
  } else {
    console.debug('[model-viewer] Local model-viewer script already present');
  }
}

function createPreloaderLoader() {
  let loaded = false;
  return function ensurePreloaderScript() {
    if (loaded) return;
    if (document.querySelector("script[data-preloader-loader]")) { loaded = true; return; }
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
    if (!document.querySelector('model-viewer')) return;
    if (document.querySelector('script[data-model-preloader]')) { loaded = true; return; }
    const script = document.createElement("script");
    script.src = '/assets/js/model-preloader.js';
    script.defer = true;
    script.dataset.modelPreloader = 'true';
    document.head.appendChild(script);
    loaded = true;
  };
}

function createModelNavLoader() {
  let loaded = false;
  return function ensureModelNavLoader() {
    if (loaded) return;
    if (document.querySelector('script[data-model-nav-loader]')) { loaded = true; return; }
    const script = document.createElement("script");
    script.src = '/assets/js/model-nav-loader.js';
    script.defer = true;
    script.dataset.modelNavLoader = 'true';
    document.head.appendChild(script);
    loaded = true;
  };
}

function markActiveNav() {
  const path = normalizePath(window.location.pathname || "/");
  const navLinks = document.querySelectorAll(".main-nav a");
  const isEnglish = (document.documentElement.lang || "").toLowerCase().startsWith("en") || path.startsWith("/eng/");
  const isProductPage = /\/product-[^/]+\.html$/i.test(path);
  let matched = false;

  const highlightShop = () => {
    const targetPath = normalizePath(isEnglish ? "/eng/shop.html" : "/shop.html");
    let found = false;
    navLinks.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      try {
        const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
        if (linkPath === targetPath) { a.classList.add("active"); found = true; }
      } catch (e) {
        // fallback below
      }
      if (!found) {
        const label = (a.textContent || "").trim().toUpperCase();
        if ((isEnglish && label.includes("SHOP")) || (!isEnglish && label.includes("MAĞAZA"))) {
          a.classList.add("active");
          found = true;
        }
      }
    });
    return found;
  };

  if (isProductPage) {
    matched = highlightShop();
  }
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
  if (!p || p === "/") return "/index.html";
  if (!p.endsWith(".html") && !p.endsWith("/")) return p + "/";
  return p;
}

function setupLangSwitch() {
  const path = window.location.pathname || "/";
  const isEn = path.startsWith("/eng/");
  const isRu = path.startsWith("/rus/");
  const currentLang = isEn ? "en" : isRu ? "ru" : "tr";
  const container = document.querySelector(".top-lang-switch");
  if (!container) return;
  container.querySelectorAll("[data-lang]").forEach((btn) => {
    const lang = btn.getAttribute("data-lang");
    btn.classList.toggle("active", lang === currentLang);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (lang === currentLang) return;
      let targetPath;
      if (lang === "en") targetPath = toEnPath(path);
      else if (lang === "ru") targetPath = toRuPath(path);
      else targetPath = toTrPath(path);
      window.location.href = targetPath;
    });
  });
}

function toEnPath(path) {
  path = normalizePath(path);
  if (path.startsWith("/eng/")) return path;
  if (path.startsWith("/rus/")) return path.replace(/^\/rus/, "/eng");
  if (path === "/index.html") return "/eng/index.html";
  return "/eng" + (path.startsWith("/") ? path : "/" + path);
}

function toTrPath(path) {
  path = normalizePath(path);
  if (path.startsWith("/eng/")) return path.replace(/^\/eng/, "") || "/index.html";
  if (path.startsWith("/rus/")) return path.replace(/^\/rus/, "") || "/index.html";
  return path;
}

function toRuPath(path) {
  path = normalizePath(path);
  if (path.startsWith("/rus/")) return path;
  if (path.startsWith("/eng/")) return path.replace(/^\/eng/, "/rus");
  if (path === "/index.html") return "/rus/index.html";
  return "/rus" + (path.startsWith("/") ? path : "/" + path);
}

function enhanceFooter(root) {
  injectFooterStyles();
  const footer = root.querySelector("footer");
  if (!footer || footer.classList.contains("alba-footer-v5")) return;
  footer.classList.add("alba-footer-v5");
  const allowCallSquare = /\/hizmetler(\.html)?\/?$/i.test(window.location.pathname || "");
  if (!allowCallSquare) { footer.querySelectorAll(".alba-call-square").forEach((el) => el.remove()); }
  const socials = footer.querySelector(".social-icons") || footer.querySelector(".footer-socials") || footer.querySelector("[data-socials]");
  if (socials) socials.classList.add("alba-footer-socials");
  const addressContainer = footer.querySelector(".footer-actions") || footer.querySelector(".footer-right") || footer.querySelector(".footer-address") || footer.querySelector(".footer-contact") || footer.querySelector("[data-footer-address]");
  if (!addressContainer) return;
  const rawAddrText = (addressContainer.innerText || "").trim();
  if (!rawAddrText) return;
  const isEnglish = window.location.pathname.startsWith('/eng/');
  const headOfficeRegex = isEnglish ? /Head Office/i : /Merkez Ofis/i;
  const branchOfficeRegex = isEnglish ? /Branch Office/i : /Adana Şube/i;
  const phoneHint = isEnglish ? 'Tap to call' : 'Aramak için dokunun';
  const emailHint = isEnglish ? 'Write to us' : 'Bize yazın';
  const mapHint = isEnglish ? 'Tap to open map' : 'Haritayı açmak için dokunun';
  const merkezBlock = extractSection(rawAddrText, headOfficeRegex, branchOfficeRegex);
  const mailAnchors = footer.querySelectorAll('a[href^="mailto:"]');
  mailAnchors.forEach((el) => el.remove());
  const contactPanel = document.createElement('div');
  contactPanel.className = 'alba-footer-contact-panel';
  const phoneBtn = document.createElement('a');
  phoneBtn.className = 'alba-footer-action';
  phoneBtn.href = 'tel:+905387781018';
  phoneBtn.innerHTML = `<div class="action-row"><span class="action-icon">☎</span><span class="action-text">+90 538 778 10 18</span></div><div class="action-hint alba-blink">${phoneHint}</div>`;
  contactPanel.appendChild(phoneBtn);
  const emailBtn = document.createElement('a');
  emailBtn.className = 'alba-footer-action';
  emailBtn.href = 'mailto:hello@albaspace.com.tr';
  emailBtn.innerHTML = `<div class="action-row"><span class="action-icon">✉</span><span class="action-text">hello@albaspace.com.tr</span></div><div class="action-hint alba-blink">${emailHint}</div>`;
  contactPanel.appendChild(emailBtn);
  const map1 = buildMapButton(merkezBlock, mapHint);
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
  a.innerHTML = `<div class="action-row"><span class="action-icon">📍</span><span class="action-text">${escapeHtml(title)}</span></div><div class="map-address">${escapeHtml(address)}</div><div class="action-hint alba-blink">${escapeHtml(hint)}</div>`;
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

function escapeHtml(str) {
  return String(str || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function injectFooterStyles() {
  if (document.getElementById("alba-footer-style-v5")) return;
  const s = document.createElement("style");
  s.id = "alba-footer-style-v5";
  s.textContent = `
    .alba-footer-contact-panel { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 20px; }
    .alba-footer-action { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 16px; border-radius: 12px; background: rgba(15,23,42,0.88); border: 1px solid rgba(148,163,184,0.45); color: #e5e7eb; text-decoration: none; width: 100%; max-width: 360px; box-shadow: 0 16px 40px rgba(15,23,42,0.8); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease; }
    .alba-footer-action:hover { transform: translateY(-1px); box-shadow: 0 20px 55px rgba(15,23,42,0.95); border-color: rgba(56,189,248,0.8); background: radial-gradient(circle at top, rgba(15,23,42,1), rgba(8,47,73,0.96)); }
    .action-row { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
    .action-icon { font-size: 18px; }
    .action-text { letter-spacing: 0.01em; }
    .map-address { margin-top: 6px; font-size: 13px; color: #cbd5f5; text-align: center; line-height: 1.35; }
    .action-hint { margin-top: 6px; font-size: 12px; color: #60a5fa; }
    .alba-blink { animation: albaBlink 1.6s ease-in-out infinite; }
    @keyframes albaBlink { 0%, 100% { opacity: 1; transform: translateY(0); } 50% { opacity: 0.4; transform: translateY(-1px); } }
  `;
  document.head.appendChild(s);
}

function getAlbamenSessionId() {
  let id = localStorage.getItem('albamen_session_id');
  if (!id) {
    if (window.crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'sess-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }
    localStorage.setItem('albamen_session_id', id);
  }
  return id;
}


function getAlbamenIdentity() {
  return {
    sessionId: getAlbamenSessionId(),
    name: localStorage.getItem('albamen_user_name') || null,
    age: localStorage.getItem('albamen_user_age') || null,
  };
}



/**
 * Unified AI Chat Widget
 * Combines text chat and voice chat in one window
 * Matches Albamen page design with dark theme and cyan/green accents
 */

function injectUnifiedAiWidget() {
  const path = window.location.pathname || '/';
  const isEn = path.startsWith('/eng/');
  const isRu = path.startsWith('/rus/');

  const strings = isEn ? {
    placeholder: 'Send a message...',
    listening: 'Listening...',
    connect: 'Connecting...',
    initialStatus: 'How can I help you today?',
    welcomeBack: 'Welcome back, ',
    voiceNotSupported: 'Voice not supported',
    connectionError: 'Connection error.',
    talkPrompt: 'Tap and Talk 🔊',
    voiceTabTitle: 'Voice Chat',
    textTabTitle: 'Text Chat'
  } : isRu ? {
    placeholder: 'Напишите сообщение...',
    listening: 'Слушаю...',
    connect: 'Подключение...',
    initialStatus: 'Чем я могу вам помочь?',
    welcomeBack: 'С возвращением, ',
    voiceNotSupported: 'Голос не поддерживается',
    connectionError: 'Ошибка соединения.',
    talkPrompt: 'Нажми и говори 🔊',
    voiceTabTitle: 'Голосовой чат',
    textTabTitle: 'Текстовый чат'
  } : {
    placeholder: 'Bir mesaj yazın...',
    listening: 'Dinliyorum...',
    connect: 'Bağlanıyor...',
    initialStatus: 'Bugün sana nasıl yardım edebilirim?',
    welcomeBack: 'Tekrar hoş geldin, ',
    voiceNotSupported: 'Ses desteği yok',
    connectionError: 'Bağlantı hatası.',
    talkPrompt: 'Tıkla ve Konuş 🔊',
    voiceTabTitle: 'Sesli Sohbet',
    textTabTitle: 'Metin Sohbeti'
  };

  // Get stored name for greeting
  const storedName = localStorage.getItem('albamen_user_name');
  if (storedName) {
    strings.initialStatus = strings.welcomeBack + storedName + '! 🚀';
  }

  // Get session ID for memory
  const sessionId = getAlbamenSessionId();
  const avatarSrc = '/assets/images/albamenai.png';

  // Check if widget already exists
  if (document.getElementById('ai-unified-widget')) return;

  // ===== INJECT CSS FOR UNIFIED WIDGET =====
  if (!document.getElementById('ai-unified-style')) {
    const style = document.createElement('style');
    style.id = 'ai-unified-style';
    style.textContent = `
      /* Small floating button */
      .ai-widget-button {
        position: fixed;
        /* place button above the half-height panel so it's accessible */
        bottom: calc(50vh + 20px);
        right: 20px;
        width: 128px;
        height: 128px;
        border-radius: 50%;
        background: #020617;
        border: 2px solid rgba(56, 189, 248, 0.5);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 1200;
        overflow: hidden;
        padding: 8px;
      }

      .ai-widget-button:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 32px rgba(6, 182, 212, 0.6);
        border-color: rgba(56, 189, 248, 0.8);
      }

      .ai-widget-button:active {
        transform: scale(0.95);
      }

      /* Main chat window */
      .ai-unified-widget {
        position: fixed;
        /* anchor the panel to the bottom and make it half the viewport height */
        bottom: 20px;
        right: 20px;
        width: 420px;
        max-width: 90vw;
        height: 50vh;
        max-height: 50vh;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(6, 182, 212, 0.1);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 1201;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .ai-unified-widget.open {
        display: flex;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Header with tabs */
      .ai-widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid rgba(56, 189, 248, 0.1);
        background: rgba(15, 23, 42, 0.8);
      }

      .ai-widget-tabs {
        display: flex;
        gap: 8px;
        flex: 1;
      }

      .ai-tab-btn {
        flex: 1;
        padding: 8px 12px;
        background: transparent;
        border: 1px solid rgba(56, 189, 248, 0.2);
        color: #cbd5f5;
        border-radius: 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .ai-tab-btn:hover {
        border-color: rgba(56, 189, 248, 0.5);
        background: rgba(56, 189, 248, 0.05);
      }

      .ai-tab-btn.active {
        background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        border-color: rgba(56, 189, 248, 0.8);
        color: white;
      }

      .ai-close-btn {
        background: transparent;
        border: none;
        color: #cbd5f5;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .ai-close-btn:hover {
        color: #0ea5e9;
        transform: rotate(90deg);
      }

      .ai-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ai-voice-panel-btn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid rgba(56, 189, 248, 0.2);
        background: rgba(56, 189, 248, 0.08);
        color: #0ea5e9;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .ai-voice-panel-btn:hover {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.5);
        transform: translateY(-2px);
      }

      .ai-voice-panel-btn:active {
        transform: translateY(0);
      }

      /* Chat body */
      .ai-widget-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      .ai-tab-content {
        display: none;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }

      .ai-tab-content.active {
        display: flex;
      }

      /* Messages list */
      .ai-messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ai-messages-container::-webkit-scrollbar {
        width: 6px;
      }

      .ai-messages-container::-webkit-scrollbar-track {
        background: rgba(56, 189, 248, 0.05);
        border-radius: 10px;
      }

      .ai-messages-container::-webkit-scrollbar-thumb {
        background: rgba(56, 189, 248, 0.3);
        border-radius: 10px;
      }

      .ai-messages-container::-webkit-scrollbar-thumb:hover {
        background: rgba(56, 189, 248, 0.5);
      }

      .ai-message {
        display: flex;
        gap: 8px;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-message.user {
        justify-content: flex-end;
      }

      .ai-message.bot {
        justify-content: flex-start;
      }

      .ai-message-content {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 16px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
      }

      .ai-message.user .ai-message-content {
        background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-message.bot .ai-message-content {
        background: rgba(56, 189, 248, 0.1);
        color: #e5e7eb;
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(56, 189, 248, 0.2);
      }

      /* Avatar and status area */
      .ai-avatar-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        gap: 12px;
      }

      .ai-avatar-img {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 2px solid rgba(56, 189, 248, 0.3);
        object-fit: cover;
      }

      .ai-avatar-img.glow {
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.6), 0 0 40px rgba(6, 182, 212, 0.3);
        animation: avatarGlow 1.5s ease-in-out infinite;
      }

      @keyframes avatarGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.6), 0 0 40px rgba(6, 182, 212, 0.3); }
        50% { box-shadow: 0 0 30px rgba(56, 189, 248, 0.8), 0 0 60px rgba(6, 182, 212, 0.5); }
      }

      .ai-status-text {
        text-align: center;
        color: #cbd5f5;
        font-size: 14px;
        min-height: 20px;
      }

      /* Voice controls */
      .ai-voice-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 16px;
      }

      .ai-voice-wave {
        display: flex;
        gap: 4px;
        align-items: flex-end;
      }

      .ai-voice-bar {
        width: 4px;
        height: 6px;
        border-radius: 2px;
        background: #22c55e;
        animation: voiceWave 1.2s ease-in-out infinite;
      }

      .ai-voice-bar:nth-child(2) { animation-delay: 0.12s; }
      .ai-voice-bar:nth-child(3) { animation-delay: 0.24s; }

      @keyframes voiceWave {
        0%, 100% { height: 6px; }
        50% { height: 20px; }
      }

      .ai-voice-stop-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: #ef4444;
        color: #fee2e2;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.2s ease;
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        animation: pulsStop 1.4s infinite;
      }

      .ai-voice-stop-btn:hover {
        transform: scale(1.1);
      }

      @keyframes pulsStop {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
        70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }

      /* Input area */
      .ai-input-area {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid rgba(56, 189, 248, 0.1);
        background: rgba(15, 23, 42, 0.6);
      }

      .ai-input-field {
        flex: 1;
        background: rgba(56, 189, 248, 0.05);
        border: 1px solid rgba(56, 189, 248, 0.2);
        color: #e5e7eb;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .ai-input-field:focus {
        outline: none;
        border-color: rgba(56, 189, 248, 0.5);
        background: rgba(56, 189, 248, 0.08);
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
      }

      .ai-input-field::placeholder {
        color: #64748b;
      }

      .ai-action-btn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid rgba(56, 189, 248, 0.2);
        background: rgba(56, 189, 248, 0.05);
        color: #0ea5e9;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .ai-action-btn:hover {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.5);
        transform: translateY(-2px);
      }

      .ai-action-btn:active {
        transform: translateY(0);
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        .ai-unified-widget {
          width: 100%;
          max-width: 100%;
          height: min(78vh, calc(100vh - 16px));
          max-height: calc(100vh - 16px);
          bottom: 0;
          left: 0;
          right: 0;
          border-radius: 16px 16px 0 0;
          padding-bottom: env(safe-area-inset-bottom, 14px);
          box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35), 0 0 30px rgba(6, 182, 212, 0.12);
        }

        .ai-widget-body {
          padding-bottom: env(safe-area-inset-bottom, 14px);
        }

        .ai-widget-button {
          width: 48px;
          height: 48px;
          bottom: calc(78vh + 16px);
          right: 16px;
        }

        .ai-messages-container {
          padding: 10px 14px;
        }

        .ai-avatar-area {
          padding: 16px 14px 12px;
        }

        .ai-message-content {
          max-width: 84%;
          font-size: 13px;
        }

        .ai-voice-controls {
          flex-wrap: wrap;
          gap: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ===== CREATE WIDGET BUTTON =====
  const button = document.createElement('button');
  button.className = 'ai-widget-button';
  button.id = 'ai-widget-button';
  button.setAttribute('aria-label', isEn ? 'Open AI Chat' : 'AI Sohbeti Aç');
  button.innerHTML = `<img src="/assets/images/albamenai.png" alt="AI" style="width: 100%; height: 100%; object-fit: contain;" />`;
  button.addEventListener('click', () => {
    const widget = document.getElementById('ai-unified-widget');
    if (widget) {
      widget.classList.toggle('open');
      try {
        // hide floating button automatically when widget closed by itself
        button.style.display = widget.classList.contains('open') ? '' : 'none';
      } catch (e) {}
    }
  });
  document.body.appendChild(button);
  // Hide floating button by default; will be revealed when header toggle is used
  try {
    button.style.display = 'none';
  } catch (e) { /* ignore */ }

  // ===== CREATE MAIN WIDGET =====
  const widget = document.createElement('div');
  widget.className = 'ai-unified-widget';
  widget.id = 'ai-unified-widget';

  widget.innerHTML = `
    <div class="ai-widget-header">
      <div class="ai-widget-tabs">
        <button class="ai-tab-btn active" data-tab="text">${strings.textTabTitle}</button>
        <button class="ai-tab-btn" data-tab="voice">${strings.voiceTabTitle}</button>
      </div>
      <div class="ai-header-actions">
        <button class="ai-action-btn ai-voice-panel-btn" id="ai-voice-panel-btn" aria-label="${strings.voiceTabTitle}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <button class="ai-close-btn" id="ai-widget-close">×</button>
      </div>
    </div>

    <div class="ai-widget-body">
      <!-- Text Chat Tab -->
      <div class="ai-tab-content active" data-tab="text">
        <div class="ai-messages-container" id="ai-messages-list"></div>
        <div class="ai-input-area">
          <input type="text" class="ai-input-field" id="ai-input-field" placeholder="${strings.placeholder}">
          <button class="ai-action-btn" id="ai-send-btn" title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      <!-- Voice Chat Tab -->
      <div class="ai-tab-content" data-tab="voice">
        <div class="ai-avatar-area">
          <img src="${avatarSrc}" alt="Albamen" class="ai-avatar-img" id="ai-avatar-voice">
          <div class="ai-status-text" id="ai-voice-status">${strings.initialStatus}</div>
          <div class="ai-voice-controls">
            <div class="ai-voice-wave" id="ai-voice-wave" style="display: none;">
              <div class="ai-voice-bar"></div>
              <div class="ai-voice-bar"></div>
              <div class="ai-voice-bar"></div>
            </div>
            <button class="ai-voice-stop-btn" id="ai-voice-stop-btn" style="display: none;">■</button>
            <button class="ai-action-btn" id="ai-voice-start-btn" style="width: 48px; height: 48px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // ===== TAB SWITCHING =====
  const tabButtons = widget.querySelectorAll('.ai-tab-btn');
  const tabContents = widget.querySelectorAll('.ai-tab-content');
  const voicePanelBtn = widget.querySelector('#ai-voice-panel-btn');

  function switchAiTab(tabName) {
    tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabName));
    tabContents.forEach(c => c.classList.toggle('active', c.getAttribute('data-tab') === tabName));
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchAiTab(btn.getAttribute('data-tab'));
    });
  });

  function openVoiceTab() {
    if (widget) {
      widget.classList.add('open');
    }
    switchAiTab('voice');
    try {
      const fb = document.getElementById('ai-widget-button');
      if (fb) fb.style.display = 'none';
    } catch (e) { /* ignore */ }
  }

  if (voicePanelBtn) {
    voicePanelBtn.addEventListener('click', openVoiceTab);
  }

  const legacyMicBtn = document.getElementById('ai-mic-btn');
  if (legacyMicBtn) {
    legacyMicBtn.addEventListener('click', openVoiceTab);
  }

  // ===== CLOSE BUTTON =====
  document.getElementById('ai-widget-close').addEventListener('click', () => {
    widget.classList.remove('open');
    // hide floating button when widget closed
    try {
      const fb = document.getElementById('ai-widget-button');
      if (fb) fb.style.display = 'none';
    } catch (e) { /* noop */ }
  });

  // ===== TEXT CHAT LOGIC =====
  const inputField = document.getElementById('ai-input-field');
  const sendBtn = document.getElementById('ai-send-btn');
  const messagesList = document.getElementById('ai-messages-list');

  function addMessage(text, type, id) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${type}`;
    if (id) msgDiv.id = id;
    const content = document.createElement('div');
    content.className = 'ai-message-content';
    // Bot responses may contain safe markdown-like text; user input is always plain text
    if (type === 'bot') {
      content.innerHTML = text;
    } else {
      content.textContent = text;
    }
    msgDiv.appendChild(content);
    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
    return msgDiv;
  }

  function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    inputField.value = '';

    const loadingId = 'loading-' + Date.now();
    addMessage('...', 'bot', loadingId);

    const currentName = localStorage.getItem('albamen_user_name') || null;
    const currentAge = localStorage.getItem('albamen_user_age') || null;

    fetch('https://divine-flower-a0ae.nncdecdgc.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId,
        savedName: currentName,
        savedAge: currentAge
      })
    })
      .then(res => res.json())
      .then(data => {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (!data || typeof data.reply !== 'string') {
          addMessage(strings.connectionError, 'bot');
          return;
        }

        if (data.saveName) {
          localStorage.setItem('albamen_user_name', data.saveName.trim());
        }
        if (data.saveAge) {
          localStorage.setItem('albamen_user_age', data.saveAge.trim());
        }

        addMessage(data.reply.trim() || strings.connectionError, 'bot');
      })
      .catch(err => {
        console.error('AI Error:', err);
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        addMessage(strings.connectionError, 'bot');
      });
  }

  sendBtn.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ===== VOICE CHAT LOGIC =====
  // Use a delayed search to ensure elements are in DOM
  const findVoiceElements = () => {
    return {
      voiceStatusEl: document.getElementById('ai-voice-status'),
      voiceStartBtn: document.getElementById('ai-voice-start-btn'),
      voiceStopBtn: document.getElementById('ai-voice-stop-btn'),
      voiceWave: document.getElementById('ai-voice-wave'),
      avatarVoice: document.getElementById('ai-avatar-voice')
    };
  };

  let voiceElements = findVoiceElements();

  console.log('[AI Widget] Voice elements (attempt 1):', {
    voiceStatusEl: !!voiceElements.voiceStatusEl,
    voiceStartBtn: !!voiceElements.voiceStartBtn,
    voiceStopBtn: !!voiceElements.voiceStopBtn,
    voiceWave: !!voiceElements.voiceWave,
    avatarVoice: !!voiceElements.avatarVoice
  });

  // Retry after a small delay if elements not found
  if (!voiceElements.voiceStartBtn) {
    setTimeout(() => {
      voiceElements = findVoiceElements();
      console.log('[AI Widget] Voice elements (attempt 2 - delayed):', {
        voiceStatusEl: !!voiceElements.voiceStatusEl,
        voiceStartBtn: !!voiceElements.voiceStartBtn,
        voiceStopBtn: !!voiceElements.voiceStopBtn,
        voiceWave: !!voiceElements.voiceWave,
        avatarVoice: !!voiceElements.avatarVoice
      });
      initVoiceHandlers();
    }, 100);
  } else {
    initVoiceHandlers();
  }

  function initVoiceHandlers() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    console.log('[AI Widget] SpeechRecognition available:', !!SpeechRec);

    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.lang = isEn ? 'en-US' : isRu ? 'ru-RU' : 'tr-TR';
      recognition.interimResults = true;
    }

    if (!voiceElements.voiceStartBtn) {
      console.error('[AI Widget] Voice start button not found!');
      return;
    }

    voiceElements.voiceStartBtn.addEventListener('click', () => {
      console.log('[AI Widget] Voice button clicked');

      if (!recognition) {
        if (voiceElements.voiceStatusEl) {
          voiceElements.voiceStatusEl.textContent = strings.voiceNotSupported;
        }
        return;
      }

      if (isListening) {
        recognition.stop();
        return;
      }

      isListening = true;
      if (voiceElements.voiceStatusEl) voiceElements.voiceStatusEl.textContent = strings.listening;
      if (voiceElements.voiceWave) voiceElements.voiceWave.style.display = 'flex';
      if (voiceElements.voiceStopBtn) voiceElements.voiceStopBtn.style.display = 'flex';
      if (voiceElements.voiceStartBtn) voiceElements.voiceStartBtn.style.display = 'none';
      if (voiceElements.avatarVoice) voiceElements.avatarVoice.classList.add('glow');

      recognition.start();
    });

    if (voiceElements.voiceStopBtn) {
      voiceElements.voiceStopBtn.addEventListener('click', () => {
        if (recognition && isListening) {
          recognition.stop();
        }
      });
    }

    if (recognition) {
      recognition.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map(res => res[0].transcript)
          .join(' ')
          .trim();
        
        if (transcript && voiceElements.voiceStatusEl) {
          voiceElements.voiceStatusEl.textContent = transcript;
        }
      });

      recognition.addEventListener('end', () => {
        isListening = false;
        if (voiceElements.voiceWave) voiceElements.voiceWave.style.display = 'none';
        if (voiceElements.voiceStopBtn) voiceElements.voiceStopBtn.style.display = 'none';
        if (voiceElements.voiceStartBtn) voiceElements.voiceStartBtn.style.display = 'flex';
        if (voiceElements.avatarVoice) voiceElements.avatarVoice.classList.remove('glow');

        const transcript = voiceElements.voiceStatusEl?.textContent || '';
        if (transcript && transcript !== strings.listening && transcript !== strings.initialStatus) {
          // Send voice transcript to text worker
          const currentName = localStorage.getItem('albamen_user_name') || null;
          const currentAge = localStorage.getItem('albamen_user_age') || null;

          fetch('https://divine-flower-a0ae.nncdecdgc.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: transcript,
              sessionId,
              savedName: currentName,
              savedAge: currentAge,
              isVoiceTranscript: true
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data && data.reply && voiceElements.voiceStatusEl) {
                voiceElements.voiceStatusEl.textContent = data.reply.trim();
                
                if (data.saveName) {
                  localStorage.setItem('albamen_user_name', data.saveName.trim());
                }
                if (data.saveAge) {
                  localStorage.setItem('albamen_user_age', data.saveAge.trim());
                }

                // Speak the response
                if (window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(data.reply);
                  utterance.lang = isEn ? 'en-US' : isRu ? 'ru-RU' : 'tr-TR';
                  utterance.onstart = () => {
                    if (voiceElements.avatarVoice) voiceElements.avatarVoice.classList.add('glow');
                  };
                  utterance.onend = () => {
                    if (voiceElements.avatarVoice) voiceElements.avatarVoice.classList.remove('glow');
                    if (voiceElements.voiceStatusEl) voiceElements.voiceStatusEl.textContent = strings.initialStatus;
                  };
                  window.speechSynthesis.speak(utterance);
                }
              }
            })
            .catch(err => {
              console.error('Voice error:', err);
              if (voiceElements.voiceStatusEl) voiceElements.voiceStatusEl.textContent = strings.connectionError;
            });
        } else {
          if (voiceElements.voiceStatusEl) voiceElements.voiceStatusEl.textContent = strings.initialStatus;
        }
      });

      recognition.addEventListener('error', () => {
        isListening = false;
        if (voiceElements.voiceWave) voiceElements.voiceWave.style.display = 'none';
        if (voiceElements.voiceStopBtn) voiceElements.voiceStopBtn.style.display = 'none';
        if (voiceElements.voiceStartBtn) voiceElements.voiceStartBtn.style.display = 'flex';
        if (voiceElements.avatarVoice) voiceElements.avatarVoice.classList.remove('glow');
        if (voiceElements.voiceStatusEl) voiceElements.voiceStatusEl.textContent = strings.voiceNotSupported;
      });
    }
  }
} // end injectUnifiedAiWidget
