/**
 * Printed artwork for the 3D presentation box (canvas → texture): logo on
 * the front, a large logo + slogan on the lid, a shipping label on the sides.
 * Drawn in code so it stays sharp and on-brand without image files.
 */

const RED = "#e11d26";

function logoFont(weight: number, size: number, italic = false) {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-exo").trim() || "sans-serif";
  return `${italic ? "italic " : ""}${weight} ${size}px ${fam}`;
}

function board(ctx: CanvasRenderingContext2D, w: number, h: number, top = "#1c1e23", bottom = "#111317") {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.045;
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
  ctx.globalAlpha = 1;
}

function mark(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fill(new Path2D("M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z"));
  ctx.fillStyle = RED;
  ctx.fill(new Path2D("M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z"));
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center" = "left") {
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  ctx.textAlign = "left";
}

function wordmark(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number) {
  ctx.fillStyle = "#ffffff";
  ctx.font = logoFont(800, size);
  spaced(ctx, "ALROBEL", cx, y, size * 0.04, "center");
  ctx.fillStyle = RED;
  ctx.font = logoFont(700, size * 0.32, true);
  spaced(ctx, "SPORTS WEAR", cx, y + size * 0.5, size * 0.16, "center");
}

export function renderBoxArt() {
  // Front of the base: 1.7 × 0.62
  const front = document.createElement("canvas");
  front.width = 1024;
  front.height = 374;
  let ctx = front.getContext("2d")!;
  board(ctx, front.width, front.height);
  ctx.fillStyle = RED;
  ctx.fillRect(0, front.height - 14, front.width, 14);
  mark(ctx, 250, 96, 1.2);
  ctx.fillStyle = "#ffffff";
  ctx.font = logoFont(800, 96);
  spaced(ctx, "ALROBEL", 400, 196, 4);
  ctx.fillStyle = RED;
  ctx.font = logoFont(700, 30, true);
  spaced(ctx, "SPORTS WEAR", 406, 244, 15);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = logoFont(700, 19);
  spaced(ctx, "WE MAKE TO YOUR WISHES", 512, 318, 6, "center");

  // Lid top: 1.74 × 1.19 — stands behind the box after opening.
  const lid = document.createElement("canvas");
  lid.width = 1024;
  lid.height = 700;
  ctx = lid.getContext("2d")!;
  board(ctx, lid.width, lid.height, "#1a1c21", "#0f1114");
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.lineTo(180, 700);
  ctx.lineTo(90, 700);
  ctx.lineTo(0, 610);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1024, 0);
  ctx.lineTo(1024, 150);
  ctx.lineTo(874, 0);
  ctx.closePath();
  ctx.fill();
  mark(ctx, 452, 150, 1.0);
  wordmark(ctx, 512, 360, 118);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = logoFont(700, 26);
  spaced(ctx, "YOUR VISION · OUR CREATION", 512, 520, 8, "center");

  // Sides: 1.15 × 0.62 — shipping label.
  const side = document.createElement("canvas");
  side.width = 740;
  side.height = 400;
  ctx = side.getContext("2d")!;
  board(ctx, side.width, side.height);
  ctx.fillStyle = "#f3f2ee";
  ctx.fillRect(150, 70, 440, 250);
  ctx.fillStyle = "#111214";
  ctx.fillRect(150, 70, 440, 52);
  ctx.fillStyle = "#ffffff";
  ctx.font = logoFont(800, 25);
  spaced(ctx, "WORLDWIDE SHIPPING", 172, 106, 4);
  ctx.fillStyle = "#111214";
  ctx.font = logoFont(700, 21);
  spaced(ctx, "FROM: SIALKOT · PAKISTAN", 172, 165, 2);
  spaced(ctx, "TO: USA · UK · EUROPE · GULF", 172, 200, 2);
  for (let i = 0; i < 60; i++) ctx.fillRect(172 + i * 5.6, 228, Math.random() > 0.6 ? 4 : 2, 66);
  mark(ctx, 506, 236, 0.6);
  ctx.fillStyle = RED;
  ctx.fillRect(0, side.height - 12, side.width, 12);

  return { front, lid, side };
}
