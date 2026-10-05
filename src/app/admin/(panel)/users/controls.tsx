"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { changeOwnPassword, createUser, resetPassword, signOutEverywhere, updateUser, type UserResult } from "./actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const ROLE_HELP: Record<string, string> = {
  OWNER: "Everything, including admin users",
  ADMIN: "Everything except admin users",
  SALES: "Orders, leads, customers, analytics, AI analyst",
  EDITOR: "Products and site content",
};

function Secret({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 rounded-xl border border-accent/40 bg-accent/[0.06] p-3">
      <p className="text-xs text-muted">Temporary password — shown only once. Send it privately and ask them to change it after signing in.</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-ink px-3 py-2 font-mono text-sm">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-ink"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<UserResult | null>(null);
  const run = (fn: () => Promise<UserResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });
  return { pending, result, run };
}

function Feedback({ result }: { result: UserResult | null }) {
  if (!result) return null;
  return (
    <>
      <p className={cn("mt-2 text-sm", result.ok ? "text-emerald-300" : "text-red-300")} role="status">{result.ok ? result.message : result.error}</p>
      {result.ok && result.password && <Secret value={result.password} />}
    </>
  );
}

export function NewUserForm() {
  const [f, setF] = useState({ name: "", email: "", role: "SALES" as "OWNER" | "ADMIN" | "SALES" | "EDITOR" });
  const { pending, result, run } = useAction();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createUser(f));
      }}
    >
      <div>
        <label htmlFor="nu-name" className="mb-1.5 block text-sm font-medium">Name</label>
        <input id="nu-name" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} className={cn(inputClass, "h-11")} required />
      </div>
      <div>
        <label htmlFor="nu-email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input id="nu-email" type="email" value={f.email} maxLength={160} onChange={(e) => setF({ ...f, email: e.target.value })} className={cn(inputClass, "h-11")} required />
      </div>
      <div>
        <label htmlFor="nu-role" className="mb-1.5 block text-sm font-medium">Role</label>
        <select id="nu-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })} className={cn(inputClass, "h-11")}>
          {Object.keys(ROLE_HELP).map((r) => (
            <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <button disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Add user
      </button>
      <p className="text-xs text-subtle sm:col-span-4">{ROLE_HELP[f.role]}</p>
      <div className="sm:col-span-4">
        <Feedback result={result} />
      </div>
    </form>
  );
}

export function UserRowControls({ id, role, active, isSelf }: { id: string; role: string; active: boolean; isSelf: boolean }) {
  const { pending, result, run } = useAction();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`role-${id}`} className="sr-only">Role</label>
        <select id={`role-${id}`} defaultValue={role} disabled={pending} onChange={(e) => run(() => updateUser(id, { role: e.target.value as "SALES" }))} className="h-9 rounded-lg border hairline bg-surface px-2 text-sm">
          {Object.keys(ROLE_HELP).map((r) => (
            <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button type="button" disabled={pending} onClick={() => confirm("Generate a new password? Their current password stops working.") && run(() => resetPassword(id))} className="h-9 rounded-lg border hairline px-3 text-xs font-medium text-muted hover:text-fg">
          Reset password
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => signOutEverywhere(id))} className="h-9 rounded-lg border hairline px-3 text-xs font-medium text-muted hover:text-fg">
          Sign out everywhere
        </button>
        {!isSelf && (
          <button type="button" disabled={pending} onClick={() => confirm(active ? "Deactivate this account? They lose access immediately." : "Reactivate this account?") && run(() => updateUser(id, { active: !active }))} className={cn("h-9 rounded-lg px-3 text-xs font-semibold", active ? "text-red-300 hover:bg-red-400/10" : "text-emerald-300 hover:bg-emerald-400/10")}>
            {active ? "Deactivate" : "Reactivate"}
          </button>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-subtle" aria-hidden />}
      </div>
      <Feedback result={result} />
    </div>
  );
}

export function ChangePasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<UserResult | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changeOwnPassword(cur, next);
          setResult(r);
          if (r.ok) setTimeout(() => (window.location.href = "/admin/login"), 1500);
        });
      }}
    >
      <div>
        <label htmlFor="cp-cur" className="mb-1.5 block text-sm font-medium">Current password</label>
        <input id="cp-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} className={cn(inputClass, "h-11")} required />
      </div>
      <div>
        <label htmlFor="cp-new" className="mb-1.5 block text-sm font-medium">New password</label>
        <input id="cp-new" type="password" autoComplete="new-password" minLength={12} value={next} onChange={(e) => setNext(e.target.value)} className={cn(inputClass, "h-11")} required />
      </div>
      <button disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white px-5 text-sm font-semibold text-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Change password
      </button>
      <p className="text-xs text-subtle sm:col-span-3">At least 12 characters, with letters and numbers. You&apos;ll be signed out everywhere.</p>
      {result && <p className={cn("text-sm sm:col-span-3", result.ok ? "text-emerald-300" : "text-red-300")} role="status">{result.ok ? result.message : result.error}</p>}
    </form>
  );
}
