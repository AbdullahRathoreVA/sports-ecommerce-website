"use server";

import { generateText } from "ai";
import { AuthError, requireAdmin } from "@/lib/auth";
import { withModel } from "@/lib/ai/provider";
import { HELP, searchHelp, topicText } from "@/lib/admin/help";

export type HelpAnswer = {
  answer: string | null;
  answeredBy: "ai" | "guide" | "none";
  topics: { id: string; title: string; summary: string }[];
};

const SYSTEM = `You are the help assistant inside the admin panel of Alrobel Sportswear's website.
Answer the admin's question using ONLY the help topics provided. Rules:
- Reply in the same language AND the same alphabet as the question. A question in Roman Urdu / Hinglish (Urdu or Hindi words written in English letters, e.g. "kaise karun") gets an answer in Roman Urdu written in English letters — never switch to Devanagari or Urdu script. Urdu script gets Urdu script; English gets English.
- Plain, short, practical: name the exact menu items and buttons, give numbered steps when there is an order.
- If the topics do not cover it, say you are not sure and suggest which page to look at or to ask the developer. Never invent features, prices or numbers.
- Plain text only: no markdown (no **, no #). Short paragraphs or a numbered list.`;

/** "How do I …?" — answered from the admin guide (AI when available, the guide's own words otherwise). */
export async function askHelp(question: string): Promise<{ ok: true; data: HelpAnswer } | { ok: false; error: string }> {
  try {
    await requireAdmin("viewDashboard");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Please sign in again." };
    throw e;
  }
  const q = question.trim().slice(0, 500);
  if (q.length < 2) return { ok: false, error: "Type a question first." };
  const matches = searchHelp(q, 5);
  // Give the model the best matches plus the table of contents, so it can still point to the right page.
  const context = [...matches.map(topicText), "", "ALL TOPICS:", ...HELP.map((t) => `- ${t.title}: ${t.summary}`)].join("\n\n");
  const result = await withModel(
    async (model, call) => {
      const { text } = await generateText({ model, system: `${SYSTEM}\n\nHELP TOPICS:\n${context}`, prompt: q, temperature: 0.2, maxOutputTokens: 500, ...call });
      if (!text.trim()) throw new Error("empty");
      return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim();
    },
    { label: "help", timeoutMs: 15_000 },
  );
  const topics = matches.map((t) => ({ id: t.id, title: t.title, summary: t.summary }));
  if (result) return { ok: true, data: { answer: result.value, answeredBy: "ai", topics } };
  if (matches[0]) return { ok: true, data: { answer: `${matches[0].summary}${matches[0].steps ? `\n\n${matches[0].steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}`, answeredBy: "guide", topics } };
  return { ok: true, data: { answer: null, answeredBy: "none", topics } };
}
