// HTTPS endpoint of the Cloudflare Worker that handles voice replies (STT + TTS)
const VOICE_WORKER_URL = 'https://divine-flower-a0ae.nncdecdgc.workers.dev/api/voice';
const VOICE_DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let recognition = null;
let isListening = false;
let currentWorkerRequest = null; // Для отслеживания текущего запроса

// === Логирование ===
function voiceLog(message, data = null) {
  if (VOICE_DEBUG) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Albamen Voice ${timestamp}]`, message, data || '');
  }
}

function voiceError(message, error = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.error(`[Albamen Voice ERROR ${timestamp}]`, message, error || '');
}

// Получение идентичности Albamen
function getVoiceIdentity() {
  // Сначала пробуем то, что положили из include.js
  if (window.albamenVoiceIdentity) {
    return window.albamenVoiceIdentity;
  }

  // Потом — общий хелпер, если доступен
  if (typeof window.getAlbamenIdentity === 'function') {
    return window.getAlbamenIdentity();
  }

  // Фолбэк: читаем напрямую из localStorage
  let sessionId = localStorage.getItem('albamen_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    localStorage.setItem('albamen_session_id', sessionId);
  }
  return {
    sessionId,
    name: localStorage.getItem('albamen_user_name') || null,
    age: localStorage.getItem('albamen_user_age') || null,
  };
}

// Конвертация Blob в Base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Инициализация обработчиков
function initVoiceHandlers() {
  voiceLog('Initializing voice handlers...');
  
  const voiceButtons = document.querySelectorAll('#ai-voice-btn, .ai-voice-btn, .ai-call-btn');
  const voiceModal = document.querySelector('.ai-panel-voice');
  const avatarImg = voiceModal?.querySelector('.ai-chat-avatar-large img');
  const closeBtn = document.getElementById('ai-voice-close-btn');
  const statusEl = document.getElementById('voice-status-text');
  const waveEl = document.getElementById('voice-wave');
  const stopBtn = document.getElementById('voice-stop-btn');
  const inlineControls = document.getElementById('voice-inline-controls');

  voiceLog('Elements found:', {
    voiceButtons: voiceButtons.length,
    voiceModal: !!voiceModal,
    chatPanel: !!chatPanel,
    statusEl: !!statusEl,
    waveEl: !!waveEl,
  });

  function showVoiceUi(show) {
    if (statusEl) statusEl.style.display = show ? 'block' : 'none';
    inlineControls?.classList.toggle('hidden', !show);
  }

  function setStatus(text, ensureVisible = true) {
    if (statusEl) {
      statusEl.textContent = text;
      if (ensureVisible) statusEl.style.display = 'block';
      voiceLog('Status updated:', text);
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      waveEl?.classList.add('hidden');
      stopBtn?.classList.add('hidden');
      if (avatarImg) avatarImg.classList.remove('ai-glow');
      setStatus('⌛ Albamen düşünüyor...');
    }
  }

  async function sendAudioToWorker(base64Audio) {
    const identity = getVoiceIdentity();
    const path = window.location.pathname || '/';
    const lang = path.startsWith('/rus/') ? 'ru' : path.startsWith('/eng/') ? 'en' : 'tr';

    try {
      const response = await fetch(VOICE_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          sessionId: identity.sessionId,
          language: lang
        })
      });

      if (!response.ok) throw new Error(`Worker error: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setStatus(data.text);
      
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.onplay = () => avatarImg?.classList.add('ai-glow');
        audio.onended = () => avatarImg?.classList.remove('ai-glow');
        audio.play();
      }

      // Save identity if updated
      if (data.saveName) localStorage.setItem('albamen_user_name', data.saveName);
      if (data.saveAge) localStorage.setItem('albamen_user_age', data.saveAge);

    } catch (err) {
      voiceError('Worker request failed:', err);
      setStatus('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  // Event Listeners
  voiceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      voiceModal?.classList.add('ai-open');
      startRecording();
    });
  });

  stopBtn?.addEventListener('click', stopRecording);

  closeBtn?.addEventListener('click', () => {
    stopRecording();
    voiceModal?.classList.remove('ai-open');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  });
}

// MutationObserver to catch dynamic widget injection
let initialized = false;
const observer = new MutationObserver(() => {
  if (!initialized && document.getElementById('ai-panel-voice')) {
    initVoiceHandlers();
    initialized = true;
    observer.disconnect();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
