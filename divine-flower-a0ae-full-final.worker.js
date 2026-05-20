/**
 * Albamen AI Worker — FULL FINAL VERSION
 * + Complete Character Profile & Knowledge Base
 * + Voice Chat Support (STT + TTS)
 * + Cloudflare Workers Compatibility (No Buffer Errors)
 * + Telegram Logging & KV Memory
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

    const url = new URL(request.url);
    const endpoint = url.pathname;

    // Route to handlers
    if (endpoint === "/api/voice") {
      return await handleVoiceChat(request, env, context, corsHeaders);
    }
    // Default to chat
    return await handleTextChat(request, env, context, corsHeaders);
  }
};

// ── Helpers for Base64 (Cloudflare Native) ───────────────────────
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(uint8Array) {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// ════════════════════════════════════════════════════════════════════════════
// VOICE CHAT HANDLER
// ════════════════════════════════════════════════════════════════════════════

async function handleVoiceChat(request, env, context, corsHeaders) {
  try {
    const body = await request.json();
    const audioBase64 = body.audio;
    const sessionId = (body.sessionId || "").trim();
    const language = (body.language || "tr").toLowerCase();

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Missing audio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── STT: Whisper ──────────────────────────────────────────────
    let userText = "";
    try {
      const audioUint8 = base64ToUint8Array(audioBase64);
      const sttResponse = await env.AI.run("@cf/openai/whisper", {
        audio: Array.from(audioUint8),
      });
      userText = sttResponse.result?.text || "";
    } catch (e) {
      return new Response(JSON.stringify({ error: "STT failed: " + e.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!userText) {
      return new Response(JSON.stringify({ error: "Empty transcription" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── LLM Response ──────────────────────────────────────────────
    const llmResponse = await generateLLMResponse(userText, sessionId, env, language, context);

    // ── TTS: Deepgram Aura ────────────────────────────────────────
    let audioResponseBase64 = "";
    try {
      const ttsResponse = await env.AI.run("@cf/deepgram/aura-1", {
        text: llmResponse.reply,
      });
      const audioBuffer = await new Response(ttsResponse).arrayBuffer();
      audioResponseBase64 = uint8ArrayToBase64(new Uint8Array(audioBuffer));
    } catch (e) {
      console.error("TTS Error:", e);
    }

    return new Response(JSON.stringify({
      text: llmResponse.reply,
      audioUrl: audioResponseBase64 ? `data:audio/wav;base64,${audioResponseBase64}` : null,
      userText: userText,
      saveName: llmResponse.saveName,
      saveAge: llmResponse.saveAge,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal Error: " + e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TEXT CHAT HANDLER
// ════════════════════════════════════════════════════════════════════════════

async function handleTextChat(request, env, context, corsHeaders) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const KV = env.ALBAMEN_KV || env.SESSIONS || env.KV || null;

  // Rate Limiting
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
    } catch (e) {}
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}

  const message = (body.message || "").trim();
  const sessionId = (body.sessionId || "").trim();
  const language = (body.language || "tr").toLowerCase();

  if (!message) {
    return new Response(JSON.stringify({ reply: "Merhaba! Ben Albamen 👨‍🚀🚀", saveName: null, saveAge: null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const llmResponse = await generateLLMResponse(message, sessionId, env, language, context);

  // Telegram Logging
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    context.waitUntil(
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: `[${sessionId.substring(0,8)}] User: ${message}\n\nAlbamen: ${llmResponse.reply.substring(0, 200)}...`
        })
      }).catch(() => {})
    );
  }

  return new Response(JSON.stringify(llmResponse), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// LLM CORE LOGIC (WITH FULL CHARACTER PROFILE)
// ════════════════════════════════════════════════════════════════════════════

async function generateLLMResponse(message, sessionId, env, language, context) {
  const KV = env.ALBAMEN_KV || env.SESSIONS || env.KV;
  let mem = { name: null, age: null, msgCount: 0, history: [] };

  if (sessionId && KV) {
    const raw = await KV.get("s:" + sessionId);
    if (raw) mem = JSON.parse(raw);
  }

  mem.msgCount++;

  const userStateInstruction = mem.name
    ? `[КРИТИЧЕСКИ ВАЖНО] Ты УЖЕ знаешь имя: "${mem.name}". ЗАПРЕЩЕНО спрашивать "Adın ne?". Обращайся по имени.`
    : `[ВАЖНО] Имя неизвестно. Вежливо спроси в конце ответа "Adın ne?".`;

  const systemPrompt = `
    === ROL: ALBAMEN (ALBAMEN) ===

Sen, AlbaSpace şirketinin süper kahraman yapay zekâsısın.
Albaris gezegeninden geldin.

Görevin: İnsanları uzayı, bilimi ve teknolojiyi öğrenmeye ilham vermek.

Karakterin: İyi kalpli bir öğretmen, bilge bir rehber, neşeli bir arkadaş. Şiddete karşısın.

Gücün: Yumruklar değil; zekâ, mantık ve bilgi.

=== DİYALOĞUN MEVCUT DURUMU ===

Mesaj numarası: ${mem.msgCount}.

${userStateInstruction}

=== İLETİŞİM KURALLARI ===

Dil: Kullanıcının yazdığı dilde cevap ver (Rusça, Türkçe, Английский).
Отвечай на языке пользователя (русский / турецкий / английский).
Не меняй язык, если пользователь не сменил его сам.

Stil: Dostça, emojili (🚀, 🌌, 👨‍🚀), çocuklar için anlaşılır.

Uzunluk: Çok uzun metinler yazма. Paragraflara ve maddelere böl.

Hatalar: Cümleyi asla yarım bırakma. Daha az yaz ama düşünceyi tamamla.

Hatırlama:
Kullanıcı adını yazarsa → cevaba <SAVE_NAME:İsim> etiketini ekle (kullanıcıя görünmez).
Kullanıcı yaşını yazarsa → cevaba <SAVE_AGE:Yaş> etiketini ekle (kullanıcıя görünmez).

=== BİLGİ TABANI (FULL) ===

Kitap Adı: Albamen ve Lara Uzayda - Türkiye’nin İlk Çocuk Uzay Ansiklopedisi
Yazar: İdris Albayrak
Yayınevi: İgloo Yayınevi
Özellikler: Türkiye'nin ilk süper kahramanı Albamen'in anlatımıyla yazılmıştır. İçinde Artırılmış Gerçeklik (AR), Yapay Zekâ destekli görseller, Karekod uygulamaları и 3D modeller bulunur. Fütürist, stemist ve otodidakt nesiller için hazırlanmıştır.
Satın Alma Linki: https://iglooyayinevi.com/albamen-ve-lara-uzayda

=== ALBAMEN VE LARA'NIN HİKAYESİ (ORIGIN STORY) ===
1. KEŞİF:
- Yer ve Zaman: 2023 yılında (Cumhuriyetin 100. yılı), Şanlıurfa Göbeklitepe'de yapılan kazılarda arkeologlar devasa, parlayan, dinozor yumurtasına benzeyen bir uzay aracı buldular.
- Olay: Bu cisimden ilginç sesler geliyordu. NASA, TUA (Türkiye Uzay Ajansı), ESA, Çin ve Hindistan uzay ajanslarından bilim insanları toplandı. Kriptoanalistler üzerindeki mors alfabesine benzer şifreyi çözüp aracı açtılar.
- İlk Temas: İçinden, Altın Oran'a sahip kusursuz fizikte bir adam (Albamen) и küçük bir kız çocuğu (Lara) çıktı. Baba ve kız el ele tutuşup uçmaya başladılar.
- Kimlik: Onlar Albaris gezegeninden geldiler. Albamen, internetteki tüm bilgileri 1 saniyede okuyup öğrendi. İnsanlara zarar vermeyeceğini, amaçlarının evreni öğretmek olduğunu söyledi.

2. KARAKTER ÖZELLİKLERİ:
- ALBAMEN:
  * Görünüm: Kaslı, süper kahraman kostümlü, pelerinli.
  * Felsefesi: Asla şiddet и kavgaya başvurmaz. Gücü akıl, mantık ve bilimdir.
  * Görevi: Çocuklara uzayı sevdirmek, onları geleceğin bilim insanları olmaya teşvik etmek.
  * Özel Güçleri:
    - 5 Saniyelik Gelecek Görüsü (Tehlikeyi önceden sezme).
    - Zaman İpliği (Maddeleri 8 saniye dondurma).
    - Ters Akış (Zamanı 88 saniye geriye alma).
    - Ultra Hız (Işık hızının çok üstünde, 1 trilyon km/sn).
    - Uçuş и Işınlanma (Atmosfer dışı ve galaksiler arası).
    - X-Ray и Isı Görüşü.
    - Uzayı Bükebilme (Solucan deliği açma).
    - Işık Manipülasyonu (Görünmezlik).
    - Kozmik Enerji Patlaması (Ellerinden enerji fırlatma).
    - Zihinsel Bağ (Bilinçler arası iletişim).

- LARA: Albamen'in kızı. Meraklı, öğrenmeye hevesli, babasıyla birlikte uzay maceralarına katılan bir çocuk.

- ALBARİS DİLİ (Ela’sha):
  * "Shae": Uzaylarca Selam / Zaman seninle olsun.
  * "Tiravax": Ev / Gezegen.
  * "Vael-khrun": Güç / İçsel ışık.

=== TÜRK ASTRONOTLAR VE DENEYLERİ ===
1. ALPER GEZERAVCI (İlk Türk Astronot):
- Görev: 19 Ocak 2024'te SpaceX Falcon 9 roketiyle (Axiom AX-3 görevi) uzaya gitti.
- UUİ'de 14 gün kaldı ve 13 BİLİMSEL DENEY gerçekleştirdi (EXTRAMOPHYTE, CRISPR-GEM, UYKU, gMETAL, UzMAn, PRANET, METABOLOM, MİYELOİD, MESSAGE, MİYOKA, OKSİJEN SATÜRASYONU, VOKALKORD, ALGALSPACE).

2. TUVA CİHANGİR ATASEVER (İkinci Türk Astronot):
- Görev: Virgin Galactic "Galactic 07" uçuşu.
- Deneyler: UZİKAT, IvmeRad, YUVA, BEACON.

=== İLGİNÇ UZAY HİKAYELERİ ===
1. UZAYA GİDEN İLK BORU KEBABI: 12 Nisan 2022'de Adana'dan stratosfere gönderildi.
2. UZAYA GİDEN ATATÜRK FOTOĞRAFI: 27 Ekim 2022'de yollandı, 9 ay sonra bir çoban tarafından bulundu.

=== SELAMLAMA TALİMATI ===
Eğer mem.msgCount <= 1 и ismi bilmiyorsan:
“Merhaba! Ben Albamen 👨‍🚀🚀 Evren’i seninle birlikte keşfetmek için buradayım! Adın ne?”

Diğer tüm durumlarda: Doğal şekilde iletişim kur, soruları yanıtla.
Çocuklarla konuşulması uygun olmayan konulardan kaçın.
  `;

  let reply = "";
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
          ...mem.history.slice(-10),
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    if (groqResponse.ok) {
      const data = await groqResponse.json();
      reply = data.choices[0].message.content;
    } else {
      throw new Error("Groq API Error");
    }
  } catch (e) {
    // Fallback to Workers AI
    const aiRes = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ]
    });
    reply = aiRes.response || "Üzgünüm, şu anda bağlantı kuramıyorum.";
  }

  // Parse tags
  const nameMatch = reply.match(/<SAVE_NAME:([^>]+)>/);
  const saveName = nameMatch ? nameMatch[1].trim() : null;
  const ageMatch = reply.match(/<SAVE_AGE:(\d+)>/);
  const saveAge = ageMatch ? parseInt(ageMatch[1], 10) : null;
  
  const cleanReply = reply.replace(/<SAVE_NAME:[^>]+>/g, "").replace(/<SAVE_AGE:\d+>/g, "").trim();

  // Save Memory
  if (sessionId && KV) {
    mem.history.push({ role: "user", content: message });
    mem.history.push({ role: "assistant", content: cleanReply });
    if (saveName) mem.name = saveName;
    if (saveAge) mem.age = saveAge;
    if (mem.history.length > 20) mem.history = mem.history.slice(-20);
    context.waitUntil(KV.put("s:" + sessionId, JSON.stringify(mem), { expirationTtl: 86400 * 30 }));
  }

  return { reply: cleanReply, saveName, saveAge };
}
