"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { deleteChat, leadFromChat } from "../actions";
import { cn } from "@/lib/utils";

export function ChatActions({ chatId, leadId, leadNumber, canCreate }: { chatId: string; leadId: string | null; leadNumber: string | null; canCreate: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {leadId ? (
        <Link href={`/admin/leads/${leadId}`} className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink">
          Open lead {leadNumber}
        </Link>
      ) : canCreate ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await leadFromChat(chatId);
              if (r.ok && r.id) router.push(`/admin/leads/${r.id}`);
              else if (!r.ok) setErr(r.error);
            })
          }
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />} Save as a lead
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!armed) return setArmed(true);
          start(async () => {
            const r = await deleteChat(chatId);
            if (r.ok) router.push("/admin/chats");
            else setErr(r.error);
          });
        }}
        className={cn("inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-semibold", armed ? "border-red-400/60 bg-red-500/10 text-red-200" : "hairline text-muted hover:text-fg")}
      >
        <Trash2 className="h-4 w-4" aria-hidden /> {armed ? "Tap again to delete" : "Delete chat"}
      </button>
      {err && <p className="w-full text-sm text-red-300">{err}</p>}
    </div>
  );
}
