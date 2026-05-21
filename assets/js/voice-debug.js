/**
 * Voice Chat Diagnostic Tool
 * Helps debug issues with Web Speech API and microphone access
 */

(function voiceDebugger() {
  console.log('====== VOICE CHAT DIAGNOSTICS ======');
  
  // 1. Check Web Speech API support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SpeechSynthesis = window.speechSynthesis;
  
  console.log('✓ Browser Support:');
  console.log('  - SpeechRecognition (STT):', !!SpeechRecognition);
  console.log('  - SpeechSynthesis (TTS):', !!SpeechSynthesis);
  
  // 2. Check MediaDevices API
  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
  
  console.log('✓ Audio API:');
  console.log('  - MediaDevices:', hasMediaDevices);
  console.log('  - getUserMedia:', hasGetUserMedia);
  
  // 3. Test microphone access
  if (hasGetUserMedia) {
    console.log('✓ Testing microphone access...');
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log('  ✅ Microphone access GRANTED');
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        console.error('  ❌ Microphone access DENIED:', err.name, err.message);
        if (err.name === 'NotAllowedError') {
          console.log('     → User denied microphone permission');
        } else if (err.name === 'NotFoundError') {
          console.log('     → No microphone device found');
        }
      });
  }
  
  // 4. Check HTTPS (required for most features)
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  console.log('✓ Connection:');
  console.log('  - HTTPS:', isHTTPS);
  console.log('  - Localhost:', isLocalhost);
  if (!isHTTPS && !isLocalhost) {
    console.warn('  ⚠️  Warning: Some features may be blocked on HTTP (not HTTPS)');
  }
  
  // 5. Check Worker availability
  console.log('✓ Worker:');
  console.log('  - URL: https://divine-flower-a0ae.nncdecdgc.workers.dev');
  
  // Test worker connectivity
  fetch('https://divine-flower-a0ae.nncdecdgc.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'ping' })
  })
    .then(res => {
      console.log('  ✅ Worker REACHABLE (status:', res.status + ')');
    })
    .catch(err => {
      console.error('  ❌ Worker UNREACHABLE:', err.message);
    });
  
  // 6. Check UI elements
  console.log('✓ UI Elements:');
  const elements = {
    'ai-voice-start-btn': document.getElementById('ai-voice-start-btn'),
    'ai-voice-stop-btn': document.getElementById('ai-voice-stop-btn'),
    'ai-voice-status': document.getElementById('ai-voice-status'),
    'ai-voice-wave': document.getElementById('ai-voice-wave'),
    'ai-avatar-voice': document.getElementById('ai-avatar-voice'),
    'ai-unified-widget': document.getElementById('ai-unified-widget')
  };
  
  Object.entries(elements).forEach(([key, el]) => {
    console.log(`  - ${key}:`, el ? '✅ Found' : '❌ NOT FOUND');
  });
  
  // 7. Quick test of SpeechRecognition
  if (SpeechRecognition) {
    console.log('✓ SpeechRecognition Test:');
    try {
      const rec = new SpeechRecognition();
      console.log('  - Instance created:', !!rec);
      console.log('  - Lang available:', rec.lang);
      console.log('  - Methods: start, stop, abort');
    } catch (e) {
      console.error('  - Failed to create instance:', e.message);
    }
  }
  
  console.log('====== END DIAGNOSTICS ======');
  
  // Create UI button to show diagnostics
  if (!document.getElementById('voice-debug-btn')) {
    const debugBtn = document.createElement('button');
    debugBtn.id = 'voice-debug-btn';
    debugBtn.textContent = '🔧';
    debugBtn.style.cssText = `
      position: fixed;
      bottom: 120px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1f2937;
      border: 2px solid #4b5563;
      color: #e5e7eb;
      cursor: pointer;
      font-size: 20px;
      z-index: 999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s;
    `;
    debugBtn.title = 'Open console (F12) to see voice diagnostics';
    debugBtn.onmouseover = () => {
      debugBtn.style.background = '#374151';
      debugBtn.style.borderColor = '#6b7280';
    };
    debugBtn.onmouseout = () => {
      debugBtn.style.background = '#1f2937';
      debugBtn.style.borderColor = '#4b5563';
    };
    debugBtn.onclick = () => {
      console.clear();
      voiceDebugger();
    };
    document.body.appendChild(debugBtn);
  }
})();
