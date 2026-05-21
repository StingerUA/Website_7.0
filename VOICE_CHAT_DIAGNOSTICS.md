# 🎙️ Диагностика голосового чата

## Как проверить, почему не работает голос?

### 1️⃣ Откройте консоль браузера
- Нажмите **F12** или **Ctrl+Shift+I** (Windows) / **Cmd+Option+I** (Mac)
- Перейдите на вкладку **Console**

### 2️⃣ Проверьте диагностику
Скрипт `voice-debug.js` автоматически запустится и выведет:
```
✓ Browser Support:
  - SpeechRecognition (STT): true/false
  - SpeechSynthesis (TTS): true/false

✓ Audio API:
  - MediaDevices: true/false
  - getUserMedia: true/false

✓ Testing microphone access...
  ✅ Microphone access GRANTED
  или
  ❌ Microphone access DENIED: NotAllowedError
```

### 3️⃣ Возможные проблемы и решения

#### ❌ "SpeechRecognition: false"
- **Проблема**: Браузер не поддерживает Web Speech API
- **Решение**: Используйте Chrome, Firefox или Edge (не Safari на iOS/Mac)

#### ❌ "Microphone access DENIED: NotAllowedError"
- **Проблема**: Вы или браузер отклонили разрешение на доступ к микрофону
- **Решение**: 
  1. Откройте параметры сайта в адресной строке 🔒
  2. Найдите "Микрофон" / "Microphone"
  3. Нажмите "Разрешить" / "Allow"
  4. Перезагрузите страницу

#### ❌ "Microphone access DENIED: NotFoundError"
- **Проблема**: К компьютеру не подключен микрофон
- **Решение**: Подключите микрофон или используйте встроенный

#### ❌ "Connection: HTTPS: false"
- **Проблема**: Сайт на HTTP, а не HTTPS (некоторые браузеры блокируют микрофон)
- **Решение**: Используйте HTTPS или localhost для тестирования

#### ❌ "Worker UNREACHABLE"
- **Проблема**: Cloudflare Worker недоступен
- **Решение**: Проверьте интернет-соединение, Worker может быть отключен

### 4️⃣ Как тестировать вручную

Откройте консоль и выполните:
```javascript
// Тест микрофона
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Микрофон работает!');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(e => console.error('❌ Микрофон не работает:', e.message));

// Тест Web Speech
const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
rec.start();
console.log('🎤 Говорите в микрофон...');
rec.onresult = e => console.log('📝 Услышано:', e.results[0][0].transcript);
```

### 5️⃣ Кнопка для быстрой диагностики
- Нажмите кнопку **🔧** в нижнем правом углу страницы
- Она переполнит консоль и повторит диагностику

## 📋 Структура голосового чата

```
Страница
├── AI Widget (ai-unified-widget)
│   ├── Вкладка "Text Chat"
│   └── Вкладка "Voice Chat" (нужно нажать, чтобы перейти)
│       ├── Avatar Albamen
│       ├── Status text
│       ├── Voice wave animation
│       └── Кнопка 🎤 (ai-voice-start-btn)
│
├── Worker Cloudflare
│   ├── STT (Whisper - преобразует речь в текст)
│   ├── LLM (Groq/Llama - генерирует ответ)
│   └── TTS (Deepgram - преобразует текст в речь)
│
└── Browser APIs
    ├── SpeechRecognition (Web Speech API)
    ├── MediaDevices (getUserMedia)
    └── SpeechSynthesis (встроенный TTS)
```

## 🔄 Поток голосового чата

1. **User clicks 🎤 button** → Требует разрешение на микрофон
2. **Listening...** → Записывается речь пользователя
3. **User stops speaking** → Автоматический стоп (или нажимает ■ Stop)
4. **STT (Whisper)** → Речь преобразуется в текст на Worker
5. **LLM (Groq)** → Генерируется ответ Albamen
6. **TTS (Deepgram)** → Ответ преобразуется в речь
7. **Response appears** → Текст показывается, аудио проигрывается

## 🐛 Если ничего не помогает

1. Откройте **DevTools** (F12) → **Network**
2. Нажмите на кнопку 🎤
3. Посмотрите какие запросы идут (должен быть POST на worker)
4. Проверьте ответ (может быть ошибка 500, 403, или CORS проблема)
5. Возьмите скриншот консоли и отправьте разработчику

