import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LogoMark } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [admin, settings, { next }] = await Promise.all([getCurrentAdmin().catch(() => null), getSettings(), searchParams]);
  if (admin) redirect("/admin");
  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="pointer-events-none fixed inset-0 volt-glow opacity-60" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="flex items-center gap-3">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="font-display text-2xl leading-none">{settings.brand.name}</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-subtle">Admin control centre</p>
          </div>
        </div>
        <div className="mt-8 rounded-[var(--radius-card)] border hairline bg-surface p-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Authorised staff only. Activity is logged.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
