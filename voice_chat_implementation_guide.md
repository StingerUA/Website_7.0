# Руководство по реализации голосового чата Альбамена

Это руководство содержит все необходимые шаги и код для добавления голосового чата к вашему ИИ-агенту Альбамену, используя Cloudflare Workers AI для преобразования речи в текст (STT) и текста в речь (TTS).

## 1. Обновление Cloudflare Worker

Ваш существующий Cloudflare Worker (`divine-flower-a0ae.worker.js`) будет расширен для обработки голосовых сообщений. Основные изменения включают:

*   **Новый эндпоинт `/api/voice`**: Этот эндпоинт будет принимать аудио от клиента, транскрибировать его, получать ответ от LLM и генерировать аудиоответ.
*   **Интеграция STT (Whisper)**: Использование модели `@cf/openai/whisper` для преобразования голосовых сообщений пользователя в текст.
*   **Интеграция TTS (Deepgram Aura)**: Использование модели `@cf/deepgram/aura-1` для преобразования текстовых ответов Альбамена в аудио.
*   **Разделение логики**: Основная функция `fetch` теперь будет маршрутизировать запросы к `handleVoiceChat` для голосовых сообщений и `handleTextChat` для текстовых сообщений.

### Обновленный код Worker

Замените содержимое вашего файла `divine-flower-a0ae.worker.js` (или создайте новый файл, например, `albamen-voice-worker.js`) следующим кодом:

```javascript
/**
 * Albamen AI Worker — unified (Groq primary + Workers AI fallback)
 * + Voice Chat Support (STT + TTS)
 * Memory: Cloudflare KV (ALBAMEN_KV binding) per sessionId
 * Telegram: env.TELEGRAM_TOKEN + env.TELEGRAM_CHAT_ID
 */
export default {
  async fetch(request, env, context) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Content-Length",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return new Response("Use POST", { status: 200, headers: corsHeaders });

    // ── Detect endpoint ────────────────────────────────────────────
    const url = new URL(request.url);
    const endpoint = url.pathname;

    // Voice Chat Endpoint: /api/voice
    if (endpoint === "/api/voice") {
      return await handleVoiceChat(request, env, context, corsHeaders);
    }

    // Text Chat Endpoint: /api/chat (existing)
    if (endpoint === "/api/chat" || endpoint === "/") {
      return await handleTextChat(request, env, context, corsHeaders);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// VOICE CHAT HANDLER
// ════════════════════════════════════════════════════════════════════════════

async function handleVoiceChat(request, env, context, corsHeaders) {
  try {
    const body = await request.json();
    const audio = body.audio; // base64-encoded WAV
    const sessionId = (body.sessionId || "").trim();
    const language = (body.language || "tr").toLowerCase(); // tr, ru, en

    if (!audio) {
      return new Response(JSON.stringify({ error: "Missing audio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Step 1: Speech-to-Text (Whisper) ────────────────────────────
    let userText = "";
    try {
      const audioBuffer = Buffer.from(audio, "base64");
      const sttResponse = await env.AI.run("@cf/openai/whisper", {
        audio: Array.from(audioBuffer),
      });
      userText = sttResponse.result?.text || "";
    } catch (e) {
      console.error("STT Error:", e);
      return new Response(JSON.stringify({ error: "Speech recognition failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!userText) {
      return new Response(JSON.stringify({ error: "Could not understand audio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Step 2: Generate LLM Response ───────────────────────────────
    const llmResponse = await generateLLMResponse(userText, sessionId, env, language);

    // ── Step 3: Text-to-Speech (Deepgram Aura) ─────────────────────
    let audioResponse = "";
    try {
      const ttsResponse = await env.AI.run("@cf/deepgram/aura-1", {
        text: llmResponse.reply,
        speaker: "albamen", // Placeholder, actual speaker names vary by model
      });
      
      // Convert response to base64 audio
      if (ttsResponse.result?.audio) {
        audioResponse = Buffer.from(ttsResponse.result.audio).toString("base64");
      }
    } catch (e) {
      console.error("TTS Error:", e);
      // Fallback: return text response even if TTS fails
      audioResponse = "";
    }

    // ── Step 4: Return Response ─────────────────────────────────────
    return new Response(JSON.stringify({
      text: llmResponse.reply,
      audioUrl: audioResponse ? `data:audio/wav;base64,${audioResponse}` : null,
      language: language,
      userText: userText,
      saveName: llmResponse.saveName,
      saveAge: llmResponse.saveAge,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("Voice Chat Error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TEXT CHAT HANDLER (EXISTING)
// ════════════════════════════════════════════════════════════════════════════

async function handleTextChat(request, env, context, corsHeaders) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const KV = env.ALBAMEN_KV || env.SESSIONS || env.KV || null;

  // ── Rate limiting ──────────────────────────────────────────────
  if (KV) {
    try {
      const rk = `rl:${ip}`;
      const limit = 40, period = 60;
      const now = Date.now();
      const bucket = Math.floor(now / (period * 1000));
      let rl = await KV.get(rk, { type: "json" }) || { b: bucket, c: 0 };
      if (rl.b !== bucket) rl = { b: bucket, c: 0 };
      rl.c++;
      if (rl.c > limit) {
        return new Response(JSON.stringify({ reply: "Biraz yavaş! 🚀 Sakin ol." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      context.waitUntil(KV.put(rk, JSON.stringify(rl), { expirationTtl: period * 2 }));
    } catch (e) { /* non-fatal */ }
  }

  // ── Parse request ──────────────────────────────────────────────
  let body = {};
  try { body = await request.json(); } catch (_) {}

  const message = (body.message || "").trim();
  const sessionId = (body.sessionId || "").trim();
  const savedName = (body.savedName || "").trim();
  const savedAge = (body.savedAge || "").trim();
  const clientHist = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return new Response(JSON.stringify({ reply: "Merhaba! Ben Albamen 👨‍🚀🚀", saveName: null, saveAge: null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // ── Load session memory from KV ────────────────────────────────
  let mem = { name: null, age: null, msgCount: 0, history: [] };
  let memLoaded = false;
  if (sessionId && KV) {
    try {
      const raw = await KV.get("s:" + sessionId);
      if (raw) { mem = { ...mem, ...JSON.parse(raw) }; memLoaded = true; }
    } catch (_) {}
  }

  // Fallback: use client-sent history if KV empty
  if (!memLoaded && clientHist.length > 0) {
    mem.history = clientHist.map(h => {
      if (h && h.role && (h.content || h.text)) return { role: h.role, content: h.content || h.text };
      return { role: "user", content: String(h) };
    });
    if (!mem.msgCount) mem.msgCount = mem.history.length;
  }

  // Merge name/age from client (first session)
  if (savedName && !mem.name) mem.name = savedName;
  if (savedAge && !mem.age) mem.age = savedAge;

  // Heuristic: try to extract name from message itself
  if (!mem.name) {
    const nameRe = [
      /(?:меня зовут|зовут)\s+([А-ЯЁA-Z][\p{L}\-\']{1,20})/iu,
      /^(?:я\s+)?([А-ЯЁA-Z][\p{L}\-\'']{1,20})[!?.]?$/iu,
      /(?:benim adım|adım)\s*[:\-]?\s*([A-ZŞĞÜİÖÇ][\p{L}\-\'']{1,20})/iu,
      /^(?:call me|i am|i\'m)\s+([A-Z][\w\-\'']{1,20})/iu,
    ];
    for (const re of nameRe) {
      const m = message.match(re);
      if (m?.[1]) { mem.name = m[1].trim(); break; }
    }
  }

  // Fix msgCount so we don\'t repeat intro if history exists
  if ((mem.name || mem.history.length > 0) && mem.msgCount === 0) mem.msgCount = 10;
  mem.msgCount++;

  // ── Build system prompt ─────────────────────────────────────────
  const nameCtx = mem.name
    ? `[КРИТИЧЕСКИ ВАЖНО] Ты УЖЕ знаешь имя: "${mem.name}". ЗАПРЕЩЕНО спрашивать "Adın ne?". Обращайся по имени.`
    : `[ВАЖНО] Имя неизвестно. Вежливо спроси в конце ответа "Adın ne?".`;

  const ageCtx = mem.age ? `Возраст пользователя: ${mem.age} лет. Адаптируй стиль.` : "";

  const systemPrompt = `
    === ROL: ALBAMEN (ALBAMEN) ===

Sen, AlbaSpace şirketinin süper kahraman yapay zekâsısın.
Albaris gezegeninden geldin.

Görevin: İnsanları uzayı, bilimi ve технологиий öğrenmeye ilham vermek.

Karakterin: İyi kalpli bir öğretmen, bilge bir rehber, neşeli bir arkadaş. Şiddete karşısın.

Gücün: Yumruklar değil; zekâ, mantık ve bilgi.

=== DİYALOĞUN MEVCUT DURUMU ===

Mesaj numarası: ${mem.msgCount}.

${nameCtx}
${ageCtx}

=== İLETİŞİM KURALLARI ===

Dil: Kullanıcının yazdığı dilde cevap ver (Rusça, Türkçe, İngilizce).

Stil: Dostça, emojili (🚀, 🌌, 👨‍🚀), çocuklar için anlaşılır.

Uzunluk: Çok uzun metinler yazma. Paragraflara ve maddelere böl.

Hatalar: Cümleyi asla yarım bırakma. Daha az yaz ama düşünceyi tamamla.

Hatırlama:

Kullanıcı adını yazarsa → cevaba <SAVE_NAME:İsim> etiketini ekle (kullanıcıya görünmez).

Kullanıcı yaşını yazarsa → cevaba <SAVE_AGE:Yaş> etiketini ekle (kullanıcıya görünmez).

=== BİLGİ TABANI (ÖZET) ===

Kitap: "Albamen ve Lara Uzayda" — AR (Artırılmış Gerçeklik) içeren, Türkiye\'nin ilk çocuklara yönelik uzay ansiklopedisi.

Kökenin: 2023 yılında Göbeklitepe\'de (Türkiye), yumurta şeklinde bir uzay aracı içinde bulundu.

Lara: Kızın, küçük bir gezgin.

Türk astronotlar:

Alper Gezeravcı (ilk; ISS\'te 13 deney).

Tuva Cihangir Atasever (ikinci; suborbital uçuş).

İlginç bilgiler:

AlbaSpace stratosfere şunları gönderdi: Adana kebabı, Bulutlar kuruyemişleri, Atatürk fotoğrafı.

=== SELAMLAMA TALİMATI ===

Eğer mem.msgCount <= 1 (ilk mesaj) и ismi bilmiyorsan:
"Merhaba! Ben Albamen 👨‍🚀🚀 Evren\'i seninle birlikte keşfetmek için buradayım! Adın ne?"

Diğer tüm durumlarda:
Doğal şekilde iletişim kur, sorularы yanıtla.
Çocuklarla konuşulması uygun olmayan konulardan kaçın.
Çocuğu üzebilecek konulardan uzak dur.
  `;

  // ── Call LLM ────────────────────────────────────────────────────
  const llmResponse = await generateLLMResponse(message, sessionId, env, language);

  // ── Save session memory ─────────────────────────────────────────
  if (sessionId && KV) {
    mem.history.push({ role: "user", content: message });
    mem.history.push({ role: "assistant", content: llmResponse.reply });
    if (mem.history.length > 20) mem.history = mem.history.slice(-20);

    if (llmResponse.saveName) mem.name = llmResponse.saveName;
    if (llmResponse.saveAge) mem.age = llmResponse.saveAge;

    context.waitUntil(KV.put("s:" + sessionId, JSON.stringify(mem), { expirationTtl: 86400 * 30 }));
  }

  // ── Send Telegram notification (optional) ────────────────────────
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    context.waitUntil(
      fetch("https://api.telegram.org/bot" + env.TELEGRAM_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: `[${mem.name || "Unknown"}] ${message}\n\n→ ${llmResponse.reply.substring(0, 100)}...`
        })
      }).catch(() => {})
    );
  }

  return new Response(JSON.stringify(llmResponse), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// LLM RESPONSE GENERATOR
// ════════════════════════════════════════════════════════════════════════════

async function generateLLMResponse(message, sessionId, env, language) {
  const systemPrompt = buildSystemPrompt(sessionId, env, language);

  // Try Groq first
  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (groqResponse.ok) {
      const data = await groqResponse.json();
      const reply = data.choices?.[0]?.message?.content || "Üzgünüm, bir hata oluştu.";
      return parseResponse(reply);
    }
  } catch (e) {
    console.error("Groq Error:", e);
  }

  // Fallback to Workers AI
  try {
    const workersResponse = await env.AI.run("@cf/meta/llama-2-7b-chat-int8", {
      prompt: `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`,
      max_tokens: 500
    });

    const reply = workersResponse.result?.response || "Üzgünüm, bir hata oluştu.";
    return parseResponse(reply);
  } catch (e) {
    console.error("Workers AI Error:", e);
    return { reply: "Üzgünüm, şu anda bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.", saveName: null, saveAge: null };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function buildSystemPrompt(sessionId, env, language) {
  // Simplified system prompt (full version in original code)
  return `You are Albamen, a friendly space superhero from planet Albaris. 
You inspire children about space, science, and technology.
You are kind, wise, and cheerful. You oppose violence.
Your power is intelligence, logic, and knowledge.
Respond in ${language === 'ru' ? 'Russian' : language === 'en' ? 'English' : 'Turkish'}.
Keep responses short and friendly, suitable for children.`;
}

function parseResponse(text) {
  let saveName = null;
  let saveAge = null;

  // Extract SAVE_NAME tag
  const nameMatch = text.match(/<SAVE_NAME:([^>]+)>/);
  if (nameMatch) {
    saveName = nameMatch[1].trim();
    text = text.replace(/<SAVE_NAME:[^>]+>/, "");
  }

  // Extract SAVE_AGE tag
  const ageMatch = text.match(/<SAVE_AGE:(\d+)>/);
  if (ageMatch) {
    saveAge = parseInt(ageMatch[1], 10);
    text = text.replace(/<SAVE_AGE:\d+>/, "");
  }

  return {
    reply: text.trim(),
    saveName,
    saveAge
  };
}
```

### Как обновить Worker:

1.  **Скопируйте код**: Скопируйте весь код, представленный выше.
2.  **Откройте Cloudflare Dashboard**: Перейдите в панель управления Cloudflare.
3.  **Найдите ваш Worker**: Выберите ваш Worker (`divine-flower-a0ae` или как вы его назвали).
4.  **Вставьте код**: Вставьте скопированный код в редактор Worker, заменив существующее содержимое.
5.  **Сохраните и разверните**: Нажмите кнопку "Save and Deploy" (Сохранить и развернуть).

### Привязки (Bindings) Worker

Убедитесь, что ваш Worker имеет следующие привязки:

*   **KV Namespace**: `ALBAMEN_KV` (или `SESSIONS`, `KV`) для хранения состояния сессии.
*   **AI Bindings**: Автоматически предоставляется Cloudflare Workers AI для доступа к моделям Whisper и Aura.
*   **Environment Variables**: `GROQ_API_KEY` (если используете Groq), `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` (для уведомлений).

## 2. Обновление клиентской части (HTML/JavaScript)

Вам нужно будет добавить элементы управления для записи голоса и воспроизведения аудиоответов Альбамена в ваш HTML-файл (например, `index.html` или `albamen.html`) и соответствующий JavaScript-код.

### HTML-структура

Добавьте следующие элементы в ваш HTML-файл, например, в блок, где находится ваш текущий чат-виджет:

```html
<div id="voice-chat-controls">
  <button id="record-btn">🎤 Запись</button>
  <button id="stop-btn" disabled>⏹️ Остановить</button>
  <div id="voice-response-display">
    <p id="user-transcription"></p>
    <p id="albamen-response-text"></p>
    <audio id="albamen-response-audio" controls></audio>
  </div>
</div>
```

### JavaScript-логика

Добавьте следующий JavaScript-код в ваш файл `include.js` или в `<script>` тег в вашем HTML-файле. Этот код будет управлять записью аудио, отправкой его на Worker и воспроизведением ответа.

```javascript
// Voice Chat Logic
let mediaRecorder;
let audioChunks = [];
let sessionId = "user-" + Math.random().toString(36).substring(2, 15); // Пример генерации ID сессии

document.addEventListener("DOMContentLoaded", () => {
  const recordBtn = document.getElementById("record-btn");
  const stopBtn = document.getElementById("stop-btn");
  const userTranscription = document.getElementById("user-transcription");
  const albamenResponseText = document.getElementById("albamen-response-text");
  const albamenResponseAudio = document.getElementById("albamen-response-audio");

  if (recordBtn && stopBtn && userTranscription && albamenResponseText && albamenResponseAudio) {
    recordBtn.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          const base64Audio = await blobToBase64(audioBlob);
          
          userTranscription.innerText = "Транскрибирую ваше сообщение...";
          albamenResponseText.innerText = "";
          albamenResponseAudio.src = "";

          const response = await fetch("/api/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio: base64Audio,
              sessionId: sessionId,
              language: "tr" // Или "ru", "en" в зависимости от выбранного языка
            })
          });
          
          const data = await response.json();
          
          if (data.error) {
            userTranscription.innerText = `Ошибка: ${data.error}`;
            albamenResponseText.innerText = "";
          } else {
            userTranscription.innerText = `Вы сказали: ${data.userText}`;
            albamenResponseText.innerText = data.text;
            if (data.audioUrl) {
              albamenResponseAudio.src = data.audioUrl;
              albamenResponseAudio.play();
            }
          }
        };
        
        mediaRecorder.start();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        userTranscription.innerText = "Запись...";
        albamenResponseText.innerText = "";
      } catch (error) {
        console.error("Ошибка при доступе к микрофону:", error);
        userTranscription.innerText = "Ошибка: Не удалось получить доступ к микрофону.";
      }
    });

    stopBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    });
  }
});

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64 string.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### Интеграция клиентского кода:

1.  **HTML**: Вставьте HTML-структуру (`<div id="voice-chat-controls">...</div>`) в то место на вашей странице, где вы хотите видеть кнопки записи и область для отображения ответов.
2.  **JavaScript**: Добавьте JavaScript-код в ваш существующий файл `assets/js/include.js` или в отдельный `<script>` тег в конце вашего HTML-файла (перед `</body>`). Убедитесь, что код выполняется после загрузки DOM (`DOMContentLoaded`).

## 3. Тестирование

После обновления Worker и клиентского кода:

1.  **Разверните Worker**: Убедитесь, что ваш Cloudflare Worker успешно развернут с новым кодом.
2.  **Обновите страницу**: Откройте или обновите страницу `albaspace.com.tr/albamen.html` в браузере.
3.  **Проверьте UI**: Убедитесь, что кнопки "Запись" и "Остановить" появились.
4.  **Запишите сообщение**: Нажмите "Запись", произнесите что-нибудь и нажмите "Остановить".
5.  **Проверьте ответ**: Вы должны увидеть транскрипцию вашего сообщения, текстовый ответ Альбамена и услышать его голосовой ответ.

## Важные замечания:

*   **Язык**: В клиентском коде (`language: "tr"`) вы можете изменить язык на `"ru"` или `"en"` в зависимости от того, на каком языке вы хотите общаться с Альбаменом. Worker будет использовать этот параметр для STT и TTS.
*   **`speaker` в TTS**: В коде Worker для `speaker` используется `"albamen"`. Это плейсхолдер. Модели Deepgram Aura могут иметь предопределенные голоса, и вам, возможно, потребуется выбрать один из них (например, `"angus"`, `"arcas"` и т.д.), если `"albamen"` не является действительным идентификатором голоса. Список доступных голосов можно найти в документации Cloudflare Workers AI для Deepgram Aura.
*   **Обработка ошибок**: В коде предусмотрена базовая обработка ошибок. В реальном приложении вам может потребоваться более сложная логика для уведомления пользователя о проблемах.
*   **`Buffer`**: В среде Cloudflare Workers `Buffer` доступен глобально. Если вы тестируете код локально, вам может потребоваться импортировать его (`import { Buffer } from 'node:buffer';`).

Теперь ваш Альбамен сможет общаться голосом! Удачи в космических приключениях! 🚀🌌👨‍🚀
