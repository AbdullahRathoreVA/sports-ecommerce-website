/**
 * Conversational replies for the grounded (no-LLM) engine: greetings, "how
 * are you", thanks, goodbyes, "who are you", jokes and the time. Visitors
 * write in English, Roman Urdu/Hindi, Urdu script or Devanagari, so replies
 * follow the visitor's script. Pure and unit-tested; returns null when the
 * message isn't small talk.
 */

export type Lang = "en" | "roman" | "ur" | "hi";

const ROMAN_WORDS = /\b(kya|kia|kaise|kaisay|kesy|kese|kaisa|haal|hal|chal|raha|rahi|hai|hain|ho|aap|ap|tum|bhai|yaar|yar|acha|accha|theek|thik|shukriya|shukria|mujhe|chahiye|chaiye|batao|bataen|kitna|kitne|nahi|nahin|haan|salam|assalam|janab|ji)\b/i;

export function detectLang(text: string): Lang {
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  if (/[؀-ۿ]/.test(text)) return "ur";
  const hits = text.match(new RegExp(ROMAN_WORDS.source, "gi"))?.length ?? 0;
  return hits >= 1 && !/\b(the|is|are|what|how|can|you|your)\b/i.test(text) ? "roman" : hits >= 2 ? "roman" : "en";
}

type Kind = "greeting" | "how_are_you" | "thanks" | "bye" | "who" | "help" | "ack" | "joke" | "time";

const PATTERNS: [Kind, RegExp][] = [
  ["how_are_you", /(how (are|r) (you|u)|how'?s it going|how (have you been|do you do)|what'?s up|wh?at'?s up|\bsup\b|kaise (ho|hain)|kais[ae]y? h[oa]|kesy h[oa]|kese h[oa]|kya haal|kia haal|kya hal|kya chal raha|kia chal raha|kaisa chal raha|sab (theek|thik|khair)|कैसे हो|कैसे हैं|क्या चल रहा|क्या हाल|کیسے ہو|کیا حال|کیا چل رہا)/i],
  ["thanks", /^(\s*(thanks|thank you|thank u|thx|ty|cheers|shukriya|shukria|shukriyah|bohat shukriya|jazak ?allah|meherbani|dhanyavaad|dhanyavad|धन्यवाद|शुक्रिया|شکریہ|جزاک اللہ)(?![a-z0-9]).*)$/i],
  ["bye", /^\s*(bye|goodbye|good bye|see (you|ya)|take care|allah hafiz|khuda hafiz|alvida|फिर मिलेंगे|अलविदा|اللہ حافظ|خدا حافظ)(?![a-z0-9])/i],
  ["who", /(who are you|what are you|are you (a |an )?(bot|robot|ai|human|real)|your name|tum kaun|aap kaun|ap kon|tum kon|kaun ho|kon ho|तुम कौन|आप कौन|آپ کون|تم کون)/i],
  ["help", /^\s*(help|what can you do|how can you help|madad|kya kar sakte|मदद|مدد)(?![a-z0-9])/i],
  ["joke", /\b(joke|make me laugh|funny|mazaq|mazak|latifa|chutkula)\b/i],
  ["time", /\b(what('?s| is) the time|what time is it|time kya|kitne baje|today'?s date|what('?s| is) the date|what day is it)\b/i],
  ["greeting", /^\s*(hi+|hello+|hey+|hiya|yo|hola|bonjour|salam|salaam|assalam|asalam|as-salamu|aoa|a\.o\.a|adaab|namaste|namaskar|good (morning|afternoon|evening|day)|हेलो|हाय|नमस्ते|سلام|السلام|ہیلو)(?![a-z0-9])/i],
  ["ack", /^\s*(ok|okay|okk|k|cool|nice|great|awesome|good|fine|alright|acha|accha|theek|thik|hmm+|👍|ठीक|اچھا|ٹھیک)\s*[.!]*\s*$/i],
];

export function smallTalkKind(text: string): Kind | null {
  const t = text.trim();
  if (!t || t.length > 140) return null;
  for (const [kind, re] of PATTERNS) if (re.test(t)) return kind;
  return null;
}

const JOKES = [
  "Why did the football kit go to the doctor? It had too many patches. (Ours don't — sublimated prints are dyed into the fabric, so nothing peels.)",
  "Why are goalkeepers great at saving money? Because they never let anything get past them.",
  "Why did the hoodie join the team? It heard the squad needed more warm-ups.",
];

type Copy = Record<Kind, string>;

function copy(brand: string, now: Date): Record<Lang, Copy> {
  const pkt = now.toLocaleString("en-GB", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const joke = JOKES[now.getUTCMinutes() % JOKES.length]!;
  return {
    en: {
      greeting: `Hello! 👋 Welcome to ${brand}. I can help you choose products, explain materials and sizing, or put together a quote. What are you looking for today?`,
      how_are_you: "I'm doing great, thanks for asking! 😊 How about you? If you're planning team kits, uniforms or sportswear, I'm happy to help.",
      thanks: "You're welcome! Anything else I can help with?",
      bye: "Thanks for stopping by — take care! If you need a quote later, I'm right here.",
      who: `I'm the virtual assistant for ${brand}, an AI that knows our products and how ordering works. For anything I can't answer, I'll pass you to a real person on our sales team.`,
      help: "I can recommend products, explain fabrics, leather and sizing, tell you about minimum quantities, samples and lead times, and turn your requirements into a quote request. Just ask!",
      ack: "👍 Anything else you'd like to know?",
      joke,
      time: `In Sialkot, Pakistan (where our factory is) it's ${pkt}.`,
    },
    roman: {
      greeting: `Assalam o Alaikum! 👋 ${brand} mein khush aamdeed. Main products chunne, material aur sizes samjhane, ya quote banane mein madad kar sakta hoon. Aap ko kya chahiye?`,
      how_are_you: "Main bilkul theek hoon, poochne ka shukriya! 😊 Aap sunaiye, kaise hain? Team kits, uniforms ya sportswear ke baare mein kuch poochna ho to batayein.",
      thanks: "Koi baat nahi! Aur kuch madad chahiye?",
      bye: "Aane ka shukriya — Allah Hafiz! Baad mein quote chahiye ho to main yahin hoon.",
      who: `Main ${brand} ka virtual assistant (AI) hoon. Products aur order ke tareeqe ke baare mein bata sakta hoon, aur jo main na bata sakoon woh hamari sales team ke insaan se karwa deta hoon.`,
      help: "Main products suggest kar sakta hoon, fabric, leather aur sizes samjha sakta hoon, MOQ, sample aur production time bata sakta hoon, aur aap ki requirement se quote request bana sakta hoon. Poochiye!",
      ack: "👍 Aur kuch jaanna hai?",
      joke,
      time: `Sialkot, Pakistan mein (jahan hamari factory hai) is waqt ${pkt} hai.`,
    },
    hi: {
      greeting: `नमस्ते! 👋 ${brand} में आपका स्वागत है। मैं प्रोडक्ट चुनने, मटीरियल और साइज़ समझाने या कोटेशन बनाने में मदद कर सकता हूँ। आपको क्या चाहिए?`,
      how_are_you: "मैं बिल्कुल ठीक हूँ, पूछने के लिए शुक्रिया! 😊 आप कैसे हैं? किट, रेसिंग सूट, जैकेट या ग्लव्स के बारे में कुछ पूछना हो तो बताइए।",
      thanks: "कोई बात नहीं! और कुछ मदद चाहिए?",
      bye: "आने के लिए शुक्रिया — अपना ख़याल रखें! बाद में कोटेशन चाहिए तो मैं यहीं हूँ।",
      who: `मैं ${brand} का वर्चुअल असिस्टेंट (AI) हूँ। प्रोडक्ट और ऑर्डर के बारे में बता सकता हूँ, और जो मैं न बता सकूँ वह हमारी सेल्स टीम से करवा देता हूँ।`,
      help: "मैं प्रोडक्ट सुझा सकता हूँ, फ़ैब्रिक, लेदर और साइज़ समझा सकता हूँ, MOQ, सैंपल और प्रोडक्शन टाइम बता सकता हूँ, और आपकी ज़रूरत से कोटेशन रिक्वेस्ट बना सकता हूँ।",
      ack: "👍 और कुछ जानना है?",
      joke,
      time: `सियालकोट, पाकिस्तान में (जहाँ हमारी फ़ैक्ट्री है) अभी ${pkt} है।`,
    },
    ur: {
      greeting: `السلام علیکم! 👋 ${brand} میں خوش آمدید۔ میں پروڈکٹس چننے، میٹیریل اور سائز سمجھانے یا کوٹیشن بنانے میں مدد کر سکتا ہوں۔ آپ کو کیا چاہیے؟`,
      how_are_you: "میں بالکل ٹھیک ہوں، پوچھنے کا شکریہ! 😊 آپ سنائیں، کیسے ہیں؟ کٹس، ریسنگ سوٹس، جیکٹس یا گلوز کے بارے میں کچھ پوچھنا ہو تو بتائیں۔",
      thanks: "کوئی بات نہیں! اور کچھ مدد چاہیے؟",
      bye: "آنے کا شکریہ — اللہ حافظ! بعد میں کوٹیشن چاہیے ہو تو میں یہیں ہوں۔",
      who: `میں ${brand} کا ورچوئل اسسٹنٹ (AI) ہوں۔ پروڈکٹس اور آرڈر کے بارے میں بتا سکتا ہوں، اور جو میں نہ بتا سکوں وہ ہماری سیلز ٹیم سے کروا دیتا ہوں۔`,
      help: "میں پروڈکٹس تجویز کر سکتا ہوں، فیبرک، لیدر اور سائز سمجھا سکتا ہوں، MOQ، سیمپل اور پروڈکشن ٹائم بتا سکتا ہوں، اور آپ کی ضرورت سے کوٹیشن ریکویسٹ بنا سکتا ہوں۔",
      ack: "👍 اور کچھ جاننا ہے؟",
      joke,
      time: `سیالکوٹ، پاکستان میں (جہاں ہماری فیکٹری ہے) اس وقت ${pkt} ہے۔`,
    },
  };
}

/** A small-talk reply, or null if the message is a real question. */
export function smallTalk(text: string, brand: string, now = new Date()): { reply: string; kind: Kind; lang: Lang } | null {
  const kind = smallTalkKind(text);
  if (!kind) return null;
  const lang = detectLang(text);
  return { reply: copy(brand, now)[lang][kind], kind, lang };
}

/** Fallback for general questions when no AI model is reachable, in the visitor's language. */
export function offTopicFallback(text: string): string {
  const lang = detectLang(text);
  if (lang === "roman") return "Yeh sawal achha hai! Abhi main sirf hamare products, materials, sizes aur orders ke baare mein jawab de pa raha hoon. In mein se kuch poochna ho to zaroor batayein — ya main aap ka sawal hamari team tak pohncha doon?";
  if (lang === "hi") return "अच्छा सवाल है! अभी मैं सिर्फ़ हमारे प्रोडक्ट, मटीरियल, साइज़ और ऑर्डर के बारे में जवाब दे पा रहा हूँ। इनमें से कुछ पूछना हो तो बताइए — या मैं आपका सवाल हमारी टीम तक पहुँचा दूँ?";
  if (lang === "ur") return "اچھا سوال ہے! ابھی میں صرف ہمارے پروڈکٹس، میٹیریل، سائز اور آرڈرز کے بارے میں جواب دے پا رہا ہوں۔ ان میں سے کچھ پوچھنا ہو تو بتائیں — یا میں آپ کا سوال ہماری ٹیم تک پہنچا دوں؟";
  return "Good question! Right now I can only answer questions about our products, materials, sizing and orders. Ask me anything about those — or I can pass your question to our team.";
}
