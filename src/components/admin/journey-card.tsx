import { Eye, Footprints, Globe2, MapPin, MonitorSmartphone } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { countryLabel } from "@/lib/admin/insights";
import type { Journey } from "@/lib/admin/journey";

const when = (d: Date) => d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** "What this person did on the website" — shown on a lead, a chat and an interested visitor. */
export function JourneyCard({ journey, title = "Their visit to the website" }: { journey: Journey | null; title?: string }) {
  if (!journey) {
    return (
      <Card title={title}>
        <p className="text-sm text-muted">No website visit is linked — this lead was added by hand or came before visit tracking.</p>
      </Card>
    );
  }
  const j = journey;
  return (
    <Card title={title} action={<span className="text-xs text-subtle">{j.visits} visit{j.visits === 1 ? "" : "s"} · {j.pageViews} pages</span>}>
      <ul className="grid gap-3 text-sm sm:grid-cols-2">
        <li className="flex gap-2.5">
          <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-xs text-subtle">Came from</span>
            {j.cameFrom}
          </span>
        </li>
        <li className="flex gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-xs text-subtle">Location</span>
            {[j.city, j.country ? countryLabel(j.country) : null].filter(Boolean).join(", ") || "Unknown"}
          </span>
        </li>
        <li className="flex gap-2.5">
          <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-xs text-subtle">Device</span>
            <span className="capitalize">{j.device}</span>
            {j.browser ? ` · ${j.browser}` : ""}
          </span>
        </li>
        <li className="flex gap-2.5">
          <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            <span className="block text-xs text-subtle">First / last seen</span>
            {when(j.firstSeen)} → {when(j.lastSeen)}
          </span>
        </li>
      </ul>
      {j.products.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Products they looked at</p>
          <ul className="flex flex-wrap gap-1.5">
            {j.products.map((p) => (
              <li key={p.name} className="inline-flex items-center gap-1.5 rounded-full border hairline px-2.5 py-1 text-xs">
                <Eye className="h-3.5 w-3.5 text-accent" aria-hidden /> {p.name}
                {p.views > 1 && <span className="font-mono text-subtle">×{p.views}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {j.steps.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-accent hover:underline">Every step, in order ({j.steps.length})</summary>
          <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {j.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-28 shrink-0 font-mono text-xs text-subtle">{s.at.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="min-w-0">
                  <span className="font-medium">{s.what}</span>
                  {s.detail ? <span className="text-muted"> · {s.detail}</span> : null}
                  <span className="block truncate font-mono text-xs text-subtle">{s.path}</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </Card>
  );
}
