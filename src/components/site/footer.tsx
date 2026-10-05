import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings, whatsappLink } from "@/lib/settings";
import { footerNav } from "@/config/site";
import { Logo } from "@/components/ui/logo";

export async function Footer() {
  const s = await getSettings();
  const wa = whatsappLink(s);
  const address = [s.contact.addressLine, s.contact.city, s.contact.country].filter(Boolean).join(", ");
  const socials = Object.entries(s.social).filter(([, url]) => Boolean(url));

  return (
    <footer className="on-dark relative overflow-hidden bg-ink text-white">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr] lg:py-20">
        <div>
          <Logo name={s.brand.name} />
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">{s.brand.description}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {wa && (
              <li>
                <a href={wa} className="inline-flex items-center gap-2.5 text-white/80 hover:text-white" data-track="whatsapp_click" data-track-label="Footer WhatsApp">
                  <MessageCircle className="h-4 w-4 text-[#25d366]" aria-hidden /> WhatsApp
                </a>
              </li>
            )}
            {s.contact.email && (
              <li>
                <a href={`mailto:${s.contact.email}`} className="inline-flex items-center gap-2.5 text-white/80 hover:text-white" data-track="email_click">
                  <Mail className="h-4 w-4 text-accent" aria-hidden /> {s.contact.email}
                </a>
              </li>
            )}
            {s.contact.phone && (
              <li>
                <a href={`tel:${s.contact.phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-2.5 text-white/80 hover:text-white" data-track="phone_click">
                  <Phone className="h-4 w-4 text-accent" aria-hidden /> {s.contact.phone}
                </a>
              </li>
            )}
            {address && (
              <li className="inline-flex items-start gap-2.5 text-white/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {address}
              </li>
            )}
          </ul>
          {s.contact.responseTime && <p className="mt-6 text-xs text-white/45">{s.contact.responseTime}</p>}
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {footerNav.map((col) => (
            <div key={col.title}>
              <p className="eyebrow text-white/40">{col.title}</p>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-9 items-center text-[15px] text-white/70 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {s.brand.name}. Manufactured in our own factory.
          </p>
          {socials.length > 0 && (
            <ul className="flex gap-4">
              {socials.map(([network, url]) => (
                <li key={network}>
                  <a href={url} rel="noopener" className="capitalize hover:text-white">
                    {network}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Spacer so the mobile action bar never covers the last footer row. */}
      <div className="h-[calc(var(--mobile-bar-h)+env(safe-area-inset-bottom))] lg:hidden" aria-hidden />
    </footer>
  );
}
