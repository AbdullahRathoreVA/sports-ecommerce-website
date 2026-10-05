// One-off migration: light theme utility classes → "Carbon & Volt" dark tokens.
// Works per string literal so exceptions (white buttons/chips) can be decided in context.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(name) && !full.includes(`${path.sep}jersey${path.sep}`)) files.push(full);
  }
})(ROOT);

const simple = [
  [/\bbg-cobalt-50\b/g, "bg-accent/10"],
  [/\bhover:bg-cobalt-600\b/g, "hover:bg-accent-hover"],
  [/\bring-cobalt\/10\b/g, "ring-accent/15"],
  [/\b(hover:)?text-cobalt-700\b/g, (_m, h) => `${h ?? ""}text-accent-hover`],
  [/\btext-cobalt-300\b/g, "text-accent"],
  [/\b(text|border|ring|bg|from|to|via)-cobalt\b(?!-)/g, "$1-accent"],
  [/accent-\[var\(--color-cobalt\)\]/g, "accent-[var(--color-accent)]"],
  [/\bplaceholder:text-stone-400\b/g, "placeholder:text-subtle"],
  [/\btext-stone-(700|600)\b/g, "text-muted"],
  [/\btext-stone-(500|400|300)\b/g, "text-subtle"],
  [/\bhover:bg-stone-(50|100)\b/g, "hover:bg-surface-2"],
  [/\bbg-stone-(50|100|200)\b/g, "bg-surface-2"],
  [/\bbg-stone-300\b/g, "bg-white/20"],
  [/\bborder-ink\/15\b/g, "border-white/12"],
  [/\bborder-ink\/10\b/g, "border-white/10"],
  [/\bborder-ink\/30\b/g, "border-white/25"],
  [/\bhover:border-ink\/(40|35)\b/g, "hover:border-white/35"],
  [/\bring-ink\/10\b/g, "ring-white/10"],
  [/\bring-ink\/\[0\.06\]/g, "ring-white/[0.07]"],
  [/\bring-ink\/\[0\.08\]/g, "ring-white/[0.09]"],
  [/\b(hover:)?ring-ink\/(20|40)\b/g, (_m, h) => `${h ?? ""}ring-white/25`],
  [/\bring-2 ring-ink\b(?!\/)/g, "ring-2 ring-accent"],
  [/\bring-ink\b(?!\/)/g, "ring-accent"],
  [/\bhover:bg-ink\/\[0\.03\]/g, "hover:bg-white/[0.04]"],
  [/\bhover:bg-ink\/\[0\.05\]/g, "hover:bg-white/[0.06]"],
  [/\bborder-ink bg-ink text-white\b/g, "border-accent bg-accent text-accent-ink"],
  [/\bhover:bg-chalk\b/g, "hover:bg-white/90"],
  [/\bbg-emerald-50\b/g, "bg-emerald-500/10"],
  [/\btext-emerald-900\b/g, "text-emerald-200"],
  [/\bring-emerald-200\b/g, "ring-emerald-500/30"],
  [/\btext-emerald-600\b/g, "text-emerald-400"],
  [/\bbg-red-50\b/g, "bg-red-500/10"],
  [/\btext-red-700\b/g, "text-red-300"],
  [/\bbg-amber-50\b/g, "bg-amber-500/10"],
  [/\btext-amber-900\b/g, "text-amber-200"],
  [/\bring-amber-200\b/g, "ring-amber-500/30"],
];

// Applied to each string literal: context-aware rules.
function literal(s) {
  const lightSurface = /\bbg-white\b/.test(s); // includes bg-white/90 etc.
  const keepsDarkText = lightSurface && /\btext-ink\b/.test(s);
  if (!keepsDarkText) s = s.replace(/\btext-ink\b/g, "text-fg");
  if (!keepsDarkText) s = s.replace(/\bbg-white\b(?!\/)/g, "bg-surface");
  // Accent fills carry dark text; white text on volt would fail contrast.
  if (/\bbg-accent\b(?!\/|-)/.test(s)) s = s.replace(/\btext-white\b(?!\/)/g, "text-accent-ink");
  return s;
}

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [re, rep] of simple) after = after.replace(re, rep);
  after = after.replace(/"([^"\n]*)"|`([^`]*)`/g, (m, dq, bt) => (dq !== undefined ? `"${literal(dq)}"` : `\`${literal(bt)}\``));
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(`migrated ${changed} files`);
