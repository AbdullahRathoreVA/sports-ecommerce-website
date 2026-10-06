import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** Link preview (WhatsApp, Facebook, LinkedIn, iMessage): Alrobel logo + slogan. */
export const alt = "Alrobel Sportswear — Your vision. Our creation. Custom sportswear manufacturer, Sialkot, Pakistan.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Open-licence (OFL) font files, bundled so the preview matches the logo's weight.
const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));

export default async function OpenGraphImage() {
  const [exo, exoItalic, inter, interMed] = await Promise.all([font("exo-2-800.woff"), font("exo-2-700-italic.woff"), font("inter-700.woff"), font("inter-500.woff")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b0c0e", padding: "64px 72px", color: "#fff", position: "relative" }}>
        <div style={{ position: "absolute", right: -60, top: -40, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(circle, rgba(225,29,38,0.35), rgba(225,29,38,0) 70%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="120" height="96" viewBox="0 0 120 96">
            <path d="M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z" fill="#ffffff" />
            <path d="M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z" fill="#e11d26" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Exo 2", fontSize: 64, fontWeight: 800, letterSpacing: 2, lineHeight: 1 }}>ALROBEL</div>
            <div style={{ fontFamily: "Exo 2", fontSize: 22, fontWeight: 700, letterSpacing: 12, color: "#e11d26", marginTop: 8, fontStyle: "italic" }}>SPORTS WEAR</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Inter", fontSize: 100, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>Your vision.</div>
          <div style={{ fontFamily: "Inter", fontSize: 100, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05, color: "#e11d26" }}>Our creation.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter", fontWeight: 500, fontSize: 24, color: "rgba(255,255,255,0.7)", letterSpacing: 3 }}>
          <span>CUSTOM SPORTSWEAR MANUFACTURER</span>
          <span>SIALKOT · PAKISTAN</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Exo 2", data: exo, weight: 800, style: "normal" },
        { name: "Exo 2", data: exoItalic, weight: 700, style: "italic" },
        { name: "Inter", data: inter, weight: 700, style: "normal" },
        { name: "Inter", data: interMed, weight: 500, style: "normal" },
      ],
    },
  );
}
