/**
 * One decision for every 3D scene on the site. Every device with WebGL gets
 * the live 3D (the owner wants it everywhere); only data-saver mode, very slow
 * networks or no WebGL fall back to the photoreal still. `deviceQuality`
 * then picks the render resolution so weaker devices stay smooth.
 */
export type DeviceTier = "3d" | "lite";

let cached: DeviceTier | null = null;

export function deviceTier(): DeviceTier {
  if (cached) return cached;
  if (typeof window === "undefined") return "lite";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  const params = new URLSearchParams(location.search);
  if (params.has("3d")) return (cached = "3d"); // force for testing / screenshots
  if (params.has("lite")) return (cached = "lite");
  const reasons = [nav.connection?.saveData, nav.connection?.effectiveType === "2g" || nav.connection?.effectiveType === "slow-2g"];
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  cached = webgl && !reasons.some(Boolean) ? "3d" : "lite";
  return cached;
}

/** Render resolution budget: only low-memory / few-core devices draw fewer pixels; phones and computers get crisp output. */
export function deviceQuality(): "high" | "low" {
  if (typeof window === "undefined") return "low";
  const nav = navigator as Navigator & { deviceMemory?: number };
  // Modern phones have the GPU for sharp output; only genuinely weak hardware renders softer.
  // Memory only: iPhones under-report CPU cores, which wrongly marked them as weak (blurry 3D).
  const weak = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
  return weak ? "low" : "high";
}
