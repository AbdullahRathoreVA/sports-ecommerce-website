/**
 * Read-aloud for chat replies (Web Speech API), adapted from Titan Omega's
 * frontend/lib/voice.ts. Voices load asynchronously, Chrome drops long
 * utterances after ~15s and reads markdown/emoji aloud, and Urdu voices are
 * rarely installed — each of those is handled here.
 */

const TAGS: Record<string, string> = { en: "en-US", ur: "ur-PK", hi: "hi-IN", ar: "ar-SA", es: "es-ES", fr: "fr-FR", de: "de-DE", tr: "tr-TR", pt: "pt-BR", it: "it-IT", nl: "nl-NL" };

const ROMAN_URDU = /\b(hai|hain|aap|ap|kya|kia|mein|main|nahi|nahin|chahiye|karein|kar|sakte|hum|humare|aur|bhi|ke|ki|ka|ko|se|theek|shukriya)\b/gi;

/** Best-guess language of a reply, from its script (and Roman Urdu/Hindi words). */
export function detectLang(text: string): string {
  if (/[؀-ۿ]/.test(text)) return /[ٹڈڑںےۓہھگک]/.test(text) ? "ur" : "ar";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  const words = text.split(/\s+/).length || 1;
  // A Hindi voice reads Roman Urdu/Hindi far more naturally than an English one.
  if ((text.match(ROMAN_URDU)?.length ?? 0) / words > 0.12) return "hi";
  if (/[ñ¿¡]/i.test(text)) return "es";
  if (/[ğış]/i.test(text)) return "tr";
  return "en";
}

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return [];
  const now = window.speechSynthesis.getVoices();
  if (now.length) return now;
  return new Promise((resolve) => {
    let tries = 0;
    const timer = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length || ++tries > 15) {
        clearInterval(timer);
        resolve(v);
      }
    }, 150);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const is = (v: SpeechSynthesisVoice, code: string) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === code;
  if (lang === "ur") {
    // Real Urdu first; otherwise Hindi, which shares Urdu's phonetics and ships far more widely.
    return voices.find((v) => is(v, "ur") || /urdu/i.test(v.name)) ?? voices.find((v) => is(v, "hi") || /hindi/i.test(v.name)) ?? null;
  }
  const matches = voices.filter((v) => is(v, lang));
  // Prefer the higher-quality online voices when several match.
  return matches.find((v) => !v.localService) ?? matches[0] ?? null;
}

/** Strip what's for the eye: markdown, links, emoji, table pipes. */
export function speakable(text: string) {
  return (text || "")
    .replace(/\bhttps?:\/\/\S+/g, " ")
    .replace(/[*_`~]{1,3}/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-•·]\s+/gm, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, " ")
    .replace(/\|/g, " ")
    .replace(/^\s*[-=:]{3,}\s*$/gm, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function chunks(text: string, max = 160) {
  return text
    .split(/(?<=[.!?؟۔])\s+/u)
    .flatMap((s) => {
      if (s.length <= max) return [s];
      const out: string[] = [];
      let cur = "";
      for (const w of s.split(" ")) {
        if ((cur + " " + w).length > max && cur) {
          out.push(cur);
          cur = w;
        } else cur = cur ? `${cur} ${w}` : w;
      }
      return cur ? [...out, cur] : out;
    })
    .filter(Boolean);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speaks `text`; resolves when finished (or immediately if unsupported). */
export async function speak(text: string, onEnd?: () => void): Promise<void> {
  const clean = speakable(text);
  if (!speechSupported() || !clean) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  const lang = detectLang(clean);
  const voice = pickVoice(await loadVoices(), lang);
  synth.cancel();
  // Chrome swallows speak() called right after cancel().
  await new Promise((r) => setTimeout(r, 90));
  // resume() only, never pause(): pausing kills Chrome's online voices.
  const keepAlive = setInterval(() => synth.speaking && synth.resume(), 8000);
  const parts = chunks(clean);
  let done = 0;
  const finish = () => {
    if (++done >= parts.length) {
      clearInterval(keepAlive);
      onEnd?.();
    }
  };
  for (const part of parts) {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? TAGS[lang] ?? "en-US";
    u.rate = lang === "en" ? 1 : 0.95;
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  }
}
