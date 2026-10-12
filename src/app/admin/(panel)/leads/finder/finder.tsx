"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe, Loader2, Mail, MapPin, MessageCircle, Phone, Plus, Search } from "lucide-react";
import { saveFoundLead, searchLeads, type FinderResult } from "./actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const RADII = [5, 10, 25, 50];

export function Finder({ kinds, web }: { kinds: { key: string; label: string }[]; web: boolean }) {
  const [kind, setKind] = useState(kinds[0]!.key);
  const [place, setPlace] = useState("");
  const [radius, setRadius] = useState(10);
  const [onlyReachable, setOnlyReachable] = useState(true);
  const [res, setRes] = useState<{ where: string; results: FinderResult[]; web: number; query: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const shown = res ? res.results.filter((r) => !onlyReachable || r.email || r.phone || r.website || r.social) : [];

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-5 lg:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          startSearch(async () => {
            const r = await searchLeads({ kind: kind as never, place, radiusKm: radius });
            if (r.ok) setRes({ where: r.where, results: r.results, web: r.web, query: `${place}, ${radius} km` });
            else {
              setErr(r.error);
              setRes(null);
            }
          });
        }}
      >
        <div className="lg:col-span-3">
          <p className="mb-1.5 text-sm font-medium">Who are you looking for?</p>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)} className={cn("h-9 rounded-full border px-3 text-sm font-medium", kind === k.key ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="lf-place" className="mb-1.5 block text-sm font-medium">City or area</label>
          <input id="lf-place" required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Manchester, UK · Milan, Italy · Dallas, Texas" className={inputClass} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Within</p>
          <div className="flex gap-1.5">
            {RADII.map((r) => (
              <button key={r} type="button" aria-pressed={radius === r} onClick={() => setRadius(r)} className={cn("h-12 flex-1 rounded-[var(--radius-control)] border text-sm font-semibold", radius === r ? "border-accent bg-accent/15" : "hairline text-muted")}>
                {r} km
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={searching} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink disabled:opacity-70 lg:w-auto">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />} Find
          </button>
        </div>
        <p className="text-xs text-subtle lg:col-span-3">
          Results come from OpenStreetMap — real places, with the contact details people have added to the map.{" "}
          {web ? "Web search is on too." : "Add a TAVILY_API_KEY in Vercel to also search the wider web."}
        </p>
      </form>

      {err && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</p>}

      {res && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg">{shown.length}</span> of {res.results.length} found near <span className="text-fg">{res.where.split(",").slice(0, 3).join(",")}</span>
              {res.web > 0 && ` · ${res.web} from the web`}
            </p>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyReachable} onChange={(e) => setOnlyReachable(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> Only ones with contact details
            </label>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center text-sm text-muted">Nothing with contact details here. Untick the filter, widen the radius, or try a nearby city.</p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {shown.map((r) => {
                const digits = r.phone?.replace(/[^\d]/g, "");
                return (
                  <li key={r.osmId} className="rounded-[var(--radius-card)] border hairline bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{r.name}</p>
                        {r.address && (
                          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {r.address}
                          </p>
                        )}
                      </div>
                      {r.saved ? (
                        <Link href={`/admin/leads/${r.saved}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 text-sm font-semibold text-emerald-300">
                          <Check className="h-4 w-4" aria-hidden /> Saved
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={saving === r.osmId}
                          onClick={async () => {
                            setSaving(r.osmId);
                            const out = await saveFoundLead(r, res.query);
                            setSaving(null);
                            if (out.ok) setRes({ ...res, results: res.results.map((x) => (x.osmId === r.osmId ? { ...x, saved: out.id } : x)) });
                            else setErr(out.error);
                          }}
                          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink disabled:opacity-70"
                        >
                          {saving === r.osmId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Save as lead
                        </button>
                      )}
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                      {r.email && (
                        <li>
                          <a href={`mailto:${r.email}?subject=${encodeURIComponent("Custom kits from Alrobel Sportswear")}&body=${encodeURIComponent(r.message)}`} className="inline-flex items-center gap-1.5 rounded-full border hairline px-2.5 py-1 hover:border-accent">
                            <Mail className="h-3.5 w-3.5 text-accent" aria-hidden /> {r.email}
                          </a>
                        </li>
                      )}
                      {r.phone && (
                        <li>
                          <a href={`tel:${r.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 rounded-full border hairline px-2.5 py-1 hover:border-accent">
                            <Phone className="h-3.5 w-3.5 text-accent" aria-hidden /> {r.phone}
                          </a>
                        </li>
                      )}
                      {digits && digits.length > 8 && (
                        <li>
                          <a href={`https://wa.me/${digits}?text=${encodeURIComponent(r.message)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border hairline px-2.5 py-1 hover:border-[#1fae4b]">
                            <MessageCircle className="h-3.5 w-3.5 text-[#1fae4b]" aria-hidden /> WhatsApp
                          </a>
                        </li>
                      )}
                      {(r.website || r.social) && (
                        <li>
                          <a href={(r.website ?? r.social)!} target="_blank" rel="noopener nofollow" className="inline-flex max-w-[240px] items-center gap-1.5 truncate rounded-full border hairline px-2.5 py-1 hover:border-accent">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden /> <span className="truncate">{(r.website ?? r.social)!.replace(/^https?:\/\/(www\.)?/, "")}</span>
                          </a>
                        </li>
                      )}
                      <li>
                        <a href={r.osmUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-1 py-1 text-xs text-subtle hover:text-fg">
                          map <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </li>
                    </ul>
                    <button type="button" onClick={() => setOpen(open === r.osmId ? null : r.osmId)} className="mt-3 text-xs font-semibold text-accent hover:underline">
                      {open === r.osmId ? "Hide first message" : "First message to send"}
                    </button>
                    {open === r.osmId && (
                      <div className="mt-2 rounded-xl bg-white/[0.04] p-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{r.message}</p>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(r.message);
                              setCopied(r.osmId);
                              setTimeout(() => setCopied(null), 2000);
                            } catch {
                              /* clipboard blocked */
                            }
                          }}
                          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border hairline px-2.5 text-xs font-semibold"
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden /> {copied === r.osmId ? "Copied" : "Copy"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
