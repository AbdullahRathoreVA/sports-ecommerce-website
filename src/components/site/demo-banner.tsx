import { getSettings } from "@/lib/settings";

/** Honest labelling for the client-review build. Off at go-live (Admin → Content). */
export async function DemoBanner() {
  const s = await getSettings();
  if (!s.demoMode) return null;
  return (
    <div className="on-dark bg-ink-2">
      <p className="container-x py-2 text-center text-[12.5px] leading-snug text-muted">
        <span className="mr-1.5 inline-block rounded-sm bg-accent px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider text-accent-ink">Preview</span>
        Prices and some product photos are placeholders until the factory confirms them.
      </p>
    </div>
  );
}
