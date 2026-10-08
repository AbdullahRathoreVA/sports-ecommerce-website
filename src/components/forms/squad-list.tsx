"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileUp, Users } from "lucide-react";
import { breakdownText, parseRoster, ROSTER_TEMPLATE, type Player, type RosterResult } from "@/lib/roster";
import { cn } from "@/lib/utils";

/**
 * "Paste your squad list": names, numbers and sizes from Excel, Google Sheets,
 * a CSV or a WhatsApp message. Shows a live preview with the size breakdown
 * and flags duplicate numbers before the quote is sent.
 */
export function SquadList({ onApply, applied }: { onApply: (r: RosterResult | null) => void; applied: Player[] }) {
  const [open, setOpen] = useState(applied.length > 0);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => parseRoster(text), [text]);
  const has = result.players.length > 0;
  const isApplied = applied.length > 0 && applied.length === result.players.length;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-black/[0.06]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-white">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            Squad list <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">Saves time</span>
          </span>
          <span className="block text-sm text-muted">
            {applied.length ? `${applied.length} players added — sizes counted for you` : "Paste names, numbers and sizes — we count the sizes for you"}
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-subtle transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="border-t hairline p-4 sm:p-5">
          <label htmlFor="roster" className="text-sm font-medium">
            Copy from Excel / Google Sheets, or type one player per line
          </label>
          <textarea
            id="roster"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={20000}
            spellCheck={false}
            placeholder={"Ali Khan, 10, M\nSara Ahmed, 7, S\nJohn Smith, 23, XL"}
            className="mt-2 w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-paper p-3 font-mono text-[14px] outline-none focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f && f.size < 200_000) setText(await f.text());
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
              <FileUp className="h-4 w-4" aria-hidden /> Upload CSV
            </button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(ROSTER_TEMPLATE)}`} download="squad-list-template.csv" className="inline-flex items-center gap-1.5 font-medium text-muted hover:text-fg">
              <Download className="h-4 w-4" aria-hidden /> Template
            </a>
          </div>

          {has && (
            <div className="mt-5 space-y-4">
              <div>
                <p className="label text-[0.62rem] text-subtle">Size breakdown · {result.players.length} players</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {result.breakdown.map((b) => (
                    <li key={b.size} className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white tabular-nums">
                      {b.size} <span className="text-white/50">×</span> {b.count}
                    </li>
                  ))}
                </ul>
              </div>
              {(result.duplicateNumbers.length > 0 || result.missingSize > 0) && (
                <ul className="space-y-1.5 rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                  {result.duplicateNumbers.length > 0 && (
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Number{result.duplicateNumbers.length > 1 ? "s" : ""} used twice: {result.duplicateNumbers.map((n) => `#${n}`).join(", ")}
                    </li>
                  )}
                  {result.missingSize > 0 && (
                    <li className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {result.missingSize} player{result.missingSize > 1 ? "s have" : " has"} no size — we&apos;ll ask you
                    </li>
                  )}
                </ul>
              )}
              <div className="max-h-56 overflow-auto rounded-md ring-1 ring-black/[0.06]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-ink text-left text-white">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">No.</th>
                      <th className="px-3 py-2 font-semibold">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y hairline">
                    {result.players.map((p, i) => (
                      <tr key={i} className={cn(result.duplicateNumbers.includes(p.number) && "bg-amber-50")}>
                        <td className="px-3 py-1.5">{p.name || <span className="text-subtle">—</span>}</td>
                        <td className="px-3 py-1.5 font-mono">{p.number || <span className="text-subtle">—</span>}</td>
                        <td className="px-3 py-1.5 font-semibold">{p.size || <span className="font-normal text-amber-700">?</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onApply(result)}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  {isApplied ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Users className="h-4 w-4" aria-hidden />}
                  {isApplied ? "Added to your request" : `Use these ${result.players.length} players`}
                </button>
                {applied.length > 0 && (
                  <button type="button" onClick={() => onApply(null)} className="text-sm text-muted underline hover:text-fg">
                    Remove squad list
                  </button>
                )}
                <p className="text-xs text-subtle">Sets the quantity to {result.players.length} and the sizes to {breakdownText(result.breakdown) || "—"}.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
