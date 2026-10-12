import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { HELP, HELP_SECTIONS } from "@/lib/admin/help";
import { HelpAsk } from "./ask";

export const metadata: Metadata = { title: "Help" };

export default async function HelpPage() {
  await requireAdminPage("viewDashboard");
  return (
    <>
      <PageHeader title="Help" description="How everything in the admin works, in plain words. Ask a question in any language — English, Urdu or Roman Urdu — or read the guide below." />
      <HelpAsk topics={HELP.map((t) => ({ id: t.id, title: t.title }))} />
      <div className="mt-8 space-y-6">
        {HELP_SECTIONS.map((section) => (
          <section key={section} className="rounded-[var(--radius-card)] border hairline bg-surface">
            <h2 className="border-b hairline px-5 py-3 text-sm font-semibold">{section}</h2>
            <ul className="divide-y divide-white/5">
              {HELP.filter((t) => t.section === section).map((t) => (
                <li key={t.id} id={`help-${t.id}`} className="scroll-mt-24">
                  <details className="group px-5 py-3">
                    <summary className="cursor-pointer list-none">
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-medium group-open:text-accent">{t.title}</span>
                          <span className="block text-sm text-muted">{t.summary}</span>
                        </span>
                        <span className="mt-1 text-subtle transition-transform group-open:rotate-45" aria-hidden>+</span>
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
                      {t.body.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                      {t.steps && (
                        <ol className="list-decimal space-y-1 pl-5">
                          {t.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      )}
                      {t.notes?.map((n, i) => (
                        <p key={i} className="rounded-lg bg-amber-400/10 p-2.5 text-sm text-amber-100">{n}</p>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
export const maxDuration = 30;
