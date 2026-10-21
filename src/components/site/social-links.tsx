import type { SiteSettings } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The company's own social profiles as visible buttons (footer, Contact,
 * About). Only networks filled in under admin → Content & settings show.
 * Icons are simple line glyphs (the icon library no longer ships brand marks).
 */
const NETWORKS: { key: keyof SiteSettings["social"]; label: string; icon: React.ReactNode }[] = [
  {
    key: "instagram",
    label: "Instagram",
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
  },
  { key: "facebook", label: "Facebook", icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <path d="M2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  { key: "tiktok", label: "TikTok", icon: <path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" /> },
  {
    key: "youtube",
    label: "YouTube",
    icon: (
      <>
        <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </>
    ),
  },
];

export function SocialLinks({ social, tone = "light", className }: { social: SiteSettings["social"]; tone?: "light" | "dark"; className?: string }) {
  const links = NETWORKS.filter((n) => social[n.key]);
  if (!links.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2.5", className)} aria-label="Follow us">
      {links.map((n) => (
        <li key={n.key}>
          <a
            href={social[n.key]}
            target="_blank"
            rel="noopener"
            data-track="social_click"
            data-track-label={n.label}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              tone === "dark" ? "bg-white/10 text-white hover:bg-accent" : "border hairline bg-surface text-fg hover:border-accent hover:text-accent",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
              {n.icon}
            </svg>
            {n.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
