import { resolveRange } from "./range";

export type AdminSearchParams = { range?: string; from?: string; to?: string; data?: string; page?: string; q?: string; status?: string; flag?: string };

/** Shared parsing for admin report pages: range + demo-data toggle + link builder. */
export function adminParams(pathname: string, sp: AdminSearchParams) {
  const range = resolveRange(sp);
  const includeDemo = sp.data !== "real";
  const href = (patch: Partial<Record<keyof AdminSearchParams, string | null>>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  return { range, includeDemo, href, demoHref: (d: boolean) => href({ data: d ? null : "real" }) };
}
