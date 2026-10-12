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

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/**
 * Runs `cb` after the page has finished loading, `delay` ms have passed and the browser is idle —
 * for preparing below-the-fold work before the visitor scrolls to it. Returns a cancel function.
 */
export function afterSettled(cb: () => void, delay = 1500): () => void {
  const w = window as IdleWindow;
  let timer = 0;
  let idle = 0;
  let done = false;
  const go = () => {
    timer = window.setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => !done && cb(), { timeout: 2000 });
      else if (!done) cb();
    }, delay);
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    done = true;
    window.removeEventListener("load", go);
    clearTimeout(timer);
    if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
  };
}
