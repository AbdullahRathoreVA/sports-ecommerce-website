/**
 * Jersey artwork renderer (Canvas 2D).
 *
 * Draws a kit design into one 2048×1024 canvas: the FRONT occupies the left
 * half, the BACK the right half. The 3D shader projects each half onto the
 * garment from the front and from behind, so the generated mesh's own UVs are
 * never needed. The same drawing is shown flat as the 2D fallback.
 *
 * Coordinates inside a half are normalised 0..1 (u right, v down) in the
 * jersey's front-view bounding box.
 */

export type Pattern = "solid" | "hoops" | "stripes" | "sash" | "fade" | "chevron" | "split" | "marble" | "pinstripe" | "camo";

export type JerseyDesign = {
  base: string;
  accent: string;
  trim: string;
  pattern: Pattern;
  sponsor: string;
  name: string;
  number: string;
  textColor: string;
  crest?: HTMLImageElement | HTMLCanvasElement | null;
  crestShape?: "shield" | "circle";
  houseMark?: boolean;
};

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "hoops", label: "Hoops" },
  { id: "stripes", label: "Stripes" },
  { id: "pinstripe", label: "Pinstripe" },
  { id: "sash", label: "Sash" },
  { id: "chevron", label: "Chevron" },
  { id: "split", label: "Half & half" },
  { id: "fade", label: "Gradient fade" },
  { id: "marble", label: "Marble" },
  { id: "camo", label: "Geo camo" },
];

export const PRESETS: { id: string; label: string; design: Omit<JerseyDesign, "crest"> }[] = [
  { id: "volt", label: "Volt hoops", design: { base: "#121316", accent: "#cdf54a", trim: "#0b0c0e", pattern: "hoops", sponsor: "YOUR SPONSOR", name: "CARTER", number: "9", textColor: "#ffffff", houseMark: true } },
  { id: "cobalt", label: "Cobalt hoops", design: { base: "#1f3fe0", accent: "#ffffff", trim: "#0b0c0e", pattern: "hoops", sponsor: "YOUR SPONSOR", name: "CARTER", number: "9", textColor: "#ffffff", houseMark: true } },
  { id: "red-stripes", label: "Classic stripes", design: { base: "#c81e1e", accent: "#ffffff", trim: "#111827", pattern: "stripes", sponsor: "YOUR SPONSOR", name: "OKAFOR", number: "7", textColor: "#ffffff", houseMark: true } },
  { id: "gold-marble", label: "Gold marble", design: { base: "#111111", accent: "#e9b949", trim: "#e9b949", pattern: "marble", sponsor: "YOUR SPONSOR", name: "SAINTS", number: "1", textColor: "#e9b949", houseMark: true } },
  { id: "green-camo", label: "Keeper camo", design: { base: "#15803d", accent: "#a3e635", trim: "#052e16", pattern: "camo", sponsor: "YOUR SPONSOR", name: "NOVAK", number: "1", textColor: "#ffffff", houseMark: true } },
  { id: "pink-fade", label: "Pink fade", design: { base: "#ec4899", accent: "#0b0c0e", trim: "#0b0c0e", pattern: "fade", sponsor: "YOUR SPONSOR", name: "LEE", number: "3", textColor: "#0b0c0e", houseMark: true } },
  { id: "sky-sash", label: "Sky sash", design: { base: "#e0f2fe", accent: "#0369a1", trim: "#0369a1", pattern: "sash", sponsor: "YOUR SPONSOR", name: "SHAH", number: "10", textColor: "#0369a1", houseMark: true } },
];

export const CANVAS_W = 2048;
export const CANVAS_H = 1024;

type Ctx = CanvasRenderingContext2D;

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

/** Deterministic PRNG so marble/camo look the same on every render. */
function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPattern(ctx: Ctx, d: JerseyDesign, w: number, h: number, back: boolean) {
  ctx.fillStyle = d.base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = d.accent;
  ctx.strokeStyle = d.accent;

  switch (d.pattern) {
    case "hoops": {
      const band = h * 0.075;
      for (let y = h * 0.3; y < h; y += band * 2) ctx.fillRect(0, y, w, band);
      break;
    }
    case "stripes": {
      const band = w * 0.07;
      for (let x = (w / 2) % (band * 2) - band / 2; x < w; x += band * 2) ctx.fillRect(x, 0, band, h);
      break;
    }
    case "pinstripe": {
      const gap = w * 0.035;
      for (let x = gap / 2; x < w; x += gap) ctx.fillRect(x, 0, w * 0.004, h);
      break;
    }
    case "sash": {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((back ? 1 : -1) * Math.PI * 0.24);
      ctx.fillRect(-w, -h * 0.07, w * 2, h * 0.14);
      ctx.restore();
      break;
    }
    case "chevron": {
      ctx.beginPath();
      const y0 = h * 0.34;
      ctx.moveTo(0, y0);
      ctx.lineTo(w / 2, y0 + h * 0.16);
      ctx.lineTo(w, y0);
      ctx.lineTo(w, y0 + h * 0.1);
      ctx.lineTo(w / 2, y0 + h * 0.26);
      ctx.lineTo(0, y0 + h * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "split": {
      // Wearer's left/right halves swap between front and back views.
      ctx.fillRect(back ? 0 : w / 2, 0, w / 2, h);
      break;
    }
    case "fade": {
      const g = ctx.createLinearGradient(0, h * 0.2, 0, h);
      g.addColorStop(0, d.base);
      g.addColorStop(1, d.accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Halftone dots through the transition, the way sublimated fades are drawn.
      ctx.fillStyle = d.base;
      const step = w / 46;
      for (let y = h * 0.35; y < h; y += step) {
        const t = (y - h * 0.35) / (h * 0.65);
        for (let x = (Math.floor(y / step) % 2) * (step / 2); x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.42 * (1 - t), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "marble": {
      const r = rand(back ? 77 : 41);
      ctx.lineCap = "round";
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        let x = r() * w;
        let y = r() * h;
        ctx.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          const cx = x + (r() - 0.5) * w * 0.5;
          const cy = y + (r() - 0.3) * h * 0.4;
          x += (r() - 0.5) * w * 0.4;
          y += (r() - 0.2) * h * 0.3;
          ctx.quadraticCurveTo(cx, cy, x, y);
        }
        ctx.globalAlpha = 0.35 + r() * 0.6;
        ctx.lineWidth = 2 + r() * w * 0.012;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "camo": {
      const r = rand(back ? 9 : 3);
      for (let i = 0; i < 70; i++) {
        const x = r() * w;
        const y = r() * h;
        const s = w * (0.02 + r() * 0.06);
        ctx.globalAlpha = 0.55 + r() * 0.45;
        ctx.fillStyle = r() > 0.5 ? d.accent : shade(d.base, -40);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) ctx.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    default:
      break;
  }

  // Collar and cuff trims: a band at the neckline and at the sleeve ends.
  ctx.fillStyle = d.trim;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.03, w * 0.13, h * (back ? 0.045 : 0.1), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d.base;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.01, w * 0.11, h * (back ? 0.03 : 0.085), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d.trim;
  ctx.fillRect(0, h * 0.27, w * 0.035, h * 0.12);
  ctx.fillRect(w * 0.965, h * 0.27, w * 0.035, h * 0.12);

  // Fabric depth: a soft vignette so flat colours read as cloth, not plastic.
  const v = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.15, w / 2, h * 0.5, w * 0.75);
  v.addColorStop(0, "rgba(255,255,255,0.05)");
  v.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/**
 * next/font serves Archivo under a hashed family name; the canvas needs that
 * exact name. Read once from the body's computed style.
 */
let fontFamily = "Archivo, 'Arial Narrow', sans-serif";
export function syncCanvasFont() {
  if (typeof document === "undefined") return;
  const computed = getComputedStyle(document.body).fontFamily;
  if (computed) fontFamily = computed;
}

function setFont(ctx: Ctx, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  // Condensed athletic lettering where the browser supports canvas font-stretch.
  if ("fontStretch" in ctx) (ctx as Ctx & { fontStretch: string }).fontStretch = "condensed";
}

function fitText(ctx: Ctx, text: string, maxWidth: number, startSize: number, weight = 800) {
  let size = startSize;
  setFont(ctx, weight, size);
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    setFont(ctx, weight, size);
  }
  return size;
}

function drawCrest(ctx: Ctx, d: JerseyDesign, cx: number, cy: number, size: number) {
  ctx.save();
  if (d.crest) {
    const img = d.crest;
    const iw = "naturalWidth" in img ? img.naturalWidth : img.width;
    const ih = "naturalHeight" in img ? img.naturalHeight : img.height;
    const scale = Math.min(size / iw, size / ih);
    ctx.drawImage(img, cx - (iw * scale) / 2, cy - (ih * scale) / 2, iw * scale, ih * scale);
  } else {
    // A neutral placeholder crest so the layout reads correctly.
    ctx.fillStyle = d.textColor;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    if (d.crestShape === "circle") {
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - size * 0.42, cy - size * 0.45);
      ctx.lineTo(cx + size * 0.42, cy - size * 0.45);
      ctx.lineTo(cx + size * 0.42, cy + size * 0.05);
      ctx.quadraticCurveTo(cx + size * 0.42, cy + size * 0.38, cx, cy + size * 0.52);
      ctx.quadraticCurveTo(cx - size * 0.42, cy + size * 0.38, cx - size * 0.42, cy + size * 0.05);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = d.base;
    setFont(ctx, 800, size * 0.3);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FC", cx, cy + size * 0.02);
  }
  ctx.restore();
}

/** Render a design into a canvas (created if not supplied). */
export function renderJersey(design: JerseyDesign, target?: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = target ?? document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const W = CANVAS_W / 2;
  const H = CANVAS_H;

  // FRONT (left half)
  ctx.save();
  drawPattern(ctx, design, W, H, false);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (design.sponsor.trim()) {
    // Outlined in the trim colour so it stays legible on any band of the pattern.
    const size = fitText(ctx, design.sponsor.toUpperCase(), W * 0.44, W * 0.08);
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, size * 0.16);
    ctx.strokeStyle = design.trim;
    ctx.strokeText(design.sponsor.toUpperCase(), W / 2, H * 0.5);
    ctx.fillStyle = design.textColor;
    ctx.fillText(design.sponsor.toUpperCase(), W / 2, H * 0.5);
  }
  // Crest on the wearer's left chest = viewer's right.
  drawCrest(ctx, design, W * 0.62, H * 0.3, W * 0.085);
  if (design.houseMark) {
    ctx.fillStyle = design.textColor;
    ctx.globalAlpha = 0.85;
    ctx.save();
    ctx.translate(W * 0.385, H * 0.3);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-W * 0.025, -W * 0.004, W * 0.05, W * 0.008);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  if (design.number.trim()) {
    const size = fitText(ctx, design.number, W * 0.1, W * 0.065);
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = design.trim;
    ctx.strokeText(design.number, W * 0.62, H * 0.68);
    ctx.fillStyle = design.textColor;
    ctx.fillText(design.number, W * 0.62, H * 0.68);
  }
  ctx.restore();

  // BACK (right half)
  ctx.save();
  ctx.translate(W, 0);
  drawPattern(ctx, design, W, H, true);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = design.textColor;
  if (design.name.trim()) {
    const size = fitText(ctx, design.name.toUpperCase(), W * 0.36, W * 0.065);
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = design.trim;
    ctx.strokeText(design.name.toUpperCase(), W / 2, H * 0.27);
    ctx.fillText(design.name.toUpperCase(), W / 2, H * 0.27);
  }
  if (design.number.trim()) {
    fitText(ctx, design.number, W * 0.36, W * 0.24, 800);
    ctx.lineWidth = W * 0.006;
    ctx.strokeStyle = design.trim;
    ctx.strokeText(design.number, W / 2, H * 0.52);
    ctx.fillText(design.number, W / 2, H * 0.52);
  }
  ctx.restore();

  return canvas;
}
