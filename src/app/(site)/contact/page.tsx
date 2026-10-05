import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FileText, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings, whatsappLink } from "@/lib/settings";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to our sales team about custom teamwear, racing suits, leather jackets and gloves — by WhatsApp, email or our contact form.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [s, { product }] = await Promise.all([getSettings(), searchParams]);
  const wa = whatsappLink(s, `Hi ${s.brand.name}, I have a question.`);
  const address = [s.contact.addressLine, s.contact.city, s.contact.country].filter(Boolean).join(", ");
  const methods = [
    wa && { icon: MessageCircle, label: "WhatsApp", value: "Chat with sales", href: wa, track: "whatsapp_click" },
    s.contact.email && { icon: Mail, label: "Email", value: s.contact.email, href: `mailto:${s.contact.email}`, track: "email_click" },
    s.contact.phone && { icon: Phone, label: "Phone", value: s.contact.phone, href: `tel:${s.contact.phone.replace(/\s+/g, "")}`, track: "phone_click" },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string; track: string }[];

  return (
    <div className="container-x grid gap-10 pb-28 pt-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pb-24 lg:pt-14">
      <div>
        <p className="eyebrow text-accent">Contact</p>
        <h1 className="font-display mt-3 text-[clamp(2.6rem,9vw,4.6rem)]">Talk to the factory.</h1>
        <p className="mt-4 max-w-md text-muted">
          Questions about a product, a sample or a custom run? Message us and a person from our sales team will reply.
        </p>
        <ul className="mt-8 space-y-3">
          {methods.map((m) => (
            <li key={m.label}>
              <a href={m.href} data-track={m.track} data-track-label={`Contact page ${m.label}`} className="flex items-center gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-4 transition-colors hover:border-accent">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                  <m.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm text-muted">{m.label}</span>
                  <span className="block font-semibold">{m.value}</span>
                </span>
              </a>
            </li>
          ))}
          <li>
            <Link href="/quote" data-track="quote_start" data-track-label="Contact page" className="flex items-center gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-4 transition-colors hover:border-accent">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <FileText className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm text-muted">Ready to order?</span>
                <span className="block font-semibold">Request a quote</span>
              </span>
            </Link>
          </li>
        </ul>
        <dl className="mt-8 space-y-3 text-sm text-muted">
          {s.contact.responseTime && (
            <div className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
              <dd>{s.contact.responseTime}</dd>
            </div>
          )}
          {s.contact.hours && (
            <div className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
              <dd>{s.contact.hours}</dd>
            </div>
          )}
          {address && (
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
              <dd>
                {address}
                {s.contact.mapsUrl && (
                  <>
                    {" "}
                    · <a href={s.contact.mapsUrl} className="text-accent underline" rel="noopener">Map</a>
                  </>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <ContactForm productSlug={product?.slice(0, 80)} />
    </div>
  );
}
