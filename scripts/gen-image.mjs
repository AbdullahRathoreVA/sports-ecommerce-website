// Generate a catalogue image with Gemini. Usage:
//   node scripts/gen-image.mjs <out-file> <aspect 4:5|16:9|3:2|1:1> <model> < prompt.txt
// Reads GOOGLE_GENERATIVE_AI_API_KEY from the environment. Never logs the key.
import { writeFileSync, readFileSync } from "node:fs";

const [, , out, aspect = "4:5", model = "gemini-3.1-flash-image"] = process.argv;
const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!key || !out) {
  console.error("usage: node scripts/gen-image.mjs <out> [aspect] [model] < prompt");
  process.exit(1);
}
const prompt = readFileSync(0, "utf8").trim();
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": key },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
  }),
});
const json = await res.json();
if (!res.ok) {
  console.error("ERROR", res.status, json.error?.status, (json.error?.message ?? "").slice(0, 300));
  process.exit(2);
}
const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
if (!part) {
  console.error("NO_IMAGE", JSON.stringify(json).slice(0, 400));
  process.exit(3);
}
writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
console.log("ok", out, part.inlineData.mimeType);
