"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { addLeadNote, updateLead } from "../actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST"] as const;
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function LeadControls({ leadId, status, assignedToId, team }: { leadId: string; status: string; assignedToId: string | null; team: { id: string; name: string }[] }) {
  const router = useRouter();
  const [s, setS] = useState({ status, assignedToId });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await updateLead(leadId, { status: s.status as (typeof STAGES)[number], assignedToId: s.assignedToId });
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Stage</legend>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((st) => (
            <button key={st} type="button" aria-pressed={s.status === st} onClick={() => setS({ ...s, status: st })} className={cn("h-9 rounded-full border px-3 text-sm font-medium", s.status === st ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
              {label(st)}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="lc-owner" className="mb-1.5 block text-sm font-medium">Owner</label>
        <select id="lc-owner" value={s.assignedToId ?? ""} onChange={(e) => setS({ ...s, assignedToId: e.target.value || null })} className={inputClass}>
          <option value="">Unassigned</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent font-semibold text-accent-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
      </button>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </form>
  );
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addLeadNote(leadId, note);
          if (r.ok) {
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor="lnote" className="sr-only">Add a note</label>
      <input id="lnote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="Call summary, price discussed, next step…" className={inputClass} />
      <button disabled={pending || !note.trim()} className="h-12 shrink-0 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50">Add</button>
    </form>
  );
}
