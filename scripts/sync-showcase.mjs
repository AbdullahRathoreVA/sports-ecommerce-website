// Mirror this private repo into the PUBLIC showcase repo, minus client-private files.
//
//   node scripts/sync-showcase.mjs            (also runs from the pre-push hook)
//
// What is excluded and why:
//   - the factory's own photos/videos — client media, not approved for public use
//   - internal planning docs and agent notes
//   - showcase/ itself (its README and screenshots are placed at the root / docs)
// Secrets never reach either repo: .env files are git-ignored, and this script
// exports only committed files (git archive HEAD).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const PUBLIC_REPO = process.env.SHOWCASE_REPO ?? "AbdullahRathoreVA/sports-ecommerce-website";
// D: drive only (user rule) — never the system temp folder on C:.
const WORK = resolve(process.env.SHOWCASE_DIR ?? "D:/.tmp/showcase-repo");
const ROOT = resolve(import.meta.dirname, "..");
const EXCLUDE = [
  "public/media/factory",
  "public/media/work",
  "public/media/clips",
  "public/media/films",
  "docs/BLUEPRINT.md",
  "docs/GEMINI-IMAGE-PROMPTS.md",
  "CLAUDE.md",
  "AGENTS.md",
  "showcase",
];

const git = (args, cwd = WORK) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const sha = git(["rev-parse", "--short", "HEAD"], ROOT);
const subject = git(["log", "-1", "--format=%s"], ROOT);

if (!existsSync(join(WORK, ".git"))) {
  mkdirSync(WORK, { recursive: true });
  execFileSync("git", ["clone", `https://github.com/${PUBLIC_REPO}.git`, WORK], { stdio: "inherit" });
}
try {
  git(["pull", "--ff-only", "-q"]);
} catch {
  /* empty repo on first run */
}

// Replace the working tree with the current HEAD export.
for (const name of readdirSync(WORK)) if (name !== ".git") rmSync(join(WORK, name), { recursive: true, force: true });
const tar = join(WORK, "..", "showcase-export.tar");
git(["archive", "--format=tar", "-o", tar, "HEAD"], ROOT);
execFileSync("tar", ["-xf", tar, "-C", WORK]);
rmSync(tar, { force: true });

// Showcase README and screenshots.
if (existsSync(join(WORK, "showcase/README.md"))) cpSync(join(WORK, "showcase/README.md"), join(WORK, "README.md"));
if (existsSync(join(WORK, "showcase/screenshots"))) cpSync(join(WORK, "showcase/screenshots"), join(WORK, "docs/screenshots"), { recursive: true });
for (const p of EXCLUDE) rmSync(join(WORK, p), { recursive: true, force: true });

git(["add", "-A"]);
const changed = git(["status", "--porcelain"]);
if (!changed) {
  console.log(`[showcase] already up to date with ${sha}`);
  process.exit(0);
}
git(["commit", "-q", "-m", `Sync ${sha}: ${subject}`]);
git(["branch", "-M", "main"]);
execFileSync("git", ["push", "-q", "-u", "origin", "main"], { cwd: WORK, stdio: "inherit" });
console.log(`[showcase] published ${sha} → https://github.com/${PUBLIC_REPO}`);
