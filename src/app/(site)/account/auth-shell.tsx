import { CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";

const PERKS = [
  "Track every order from fabric to your door",
  "See QC photos before your kits ship",
  "All your quotes and designs in one place",
  "Reorder last season's kit in a few clicks",
];

/** Split layout for login / sign-up: brand panel left, form card right. */
export function AuthShell({ title, intro, children, footer }: { title: string; intro: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)]">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-accent/20 blur-[120px]" aria-hidden />
      <div className="container-x relative grid gap-10 pb-28 pt-10 lg:grid-cols-[1fr_520px] lg:items-center lg:gap-16 lg:py-20">
        <p className="label text-accent lg:hidden">Client portal / Alrobel Sportswear</p>
        <div className="on-dark hidden text-white lg:block">
          <p className="label text-accent">Client portal / Alrobel Sportswear</p>
          <h2 className="font-display mt-5 max-w-lg text-[clamp(2.6rem,5vw,4rem)] leading-[0.95]">
            Your kits.
            <br />
            <span className="text-accent">Your workspace.</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] text-white/75">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-hidden /> {p}
              </li>
            ))}
          </ul>
          <div className="mt-12 flex items-center gap-3 text-sm text-white/45">
            <LogoMark className="h-6" /> Factory direct from Sialkot, Pakistan
          </div>
        </div>
        <div className="-mt-4 rounded-[var(--radius-card)] bg-paper p-6 text-fg shadow-2xl sm:p-9 lg:mt-0">
          <h1 className="font-display text-[2rem] leading-tight">{title}</h1>
          <p className="mt-2 text-[15px] text-muted">{intro}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 border-t hairline pt-5 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
