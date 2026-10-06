import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock, FileText, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
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
    <>
      <PageHero
        eyebrow="Get in touch / Alrobel Sportswear"
        title="Contact our team"
        intro="Questions about a product, a sample or a custom run? Message us and a person from our sales team will reply."
        meta={[
          { label: "Support", value: s.contact.responseTime ? "Fast replies" : "Sales team" },
          { label: "Channels", value: wa ? "Email & WhatsApp" : "Email & form" },
          { label: "Location", value: [s.contact.city, s.contact.country].filter(Boolean).join(", ") || "Pakistan" },
          { label: "Business", value: "B2B & wholesale" },
        ]}
      />
      <div className="container-x grid gap-10 pb-28 pt-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <p className="label text-accent">Direct contact</p>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-tight">Let&apos;s talk sportswear.</h2>
          <p className="mt-2 text-muted">For orders and approvals, email keeps a written record for both of us.</p>
          <ul className="mt-8 border-t hairline">
            {methods.map((m) => (
              <li key={m.label} className="border-b hairline">
                <a href={m.href} data-track={m.track} data-track-label={`Contact page ${m.label}`} className="group flex items-center gap-4 py-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full border hairline">
                    <m.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="flex-1">
                    <span className="block text-xs text-muted">{m.label}</span>
                    <span className="block font-semibold">{m.value}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-fg" aria-hidden />
                </a>
              </li>
            ))}
            <li className="border-b hairline">
              <Link href="/quote" data-track="quote_start" data-track-label="Contact page" className="group flex items-center gap-4 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-full border hairline">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block text-xs text-muted">Ready to order?</span>
                  <span className="block font-semibold">Request a quote</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-subtle transition-colors group-hover:text-fg" aria-hidden />
              </Link>
            </li>
          </ul>
          <dl className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
            {address && (
              <div>
                <dt className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4" aria-hidden /> Office address
                </dt>
                <dd className="mt-1.5 text-muted">
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
            {(s.contact.hours || s.contact.responseTime) && (
              <div>
                <dt className="flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" aria-hidden /> Business hours
                </dt>
                <dd className="mt-1.5 text-muted">{s.contact.hours || s.contact.responseTime}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-30px_rgba(0,0,0,0.25)] sm:p-8">
          <p className="label text-accent">Your project</p>
          <h2 className="mt-4 text-[clamp(1.6rem,3.5vw,2.1rem)] font-semibold tracking-tight">Send us a message</h2>
          <p className="mt-2 text-sm text-muted">Fill out the form and we&apos;ll get back to you by email.</p>
          <div className="mt-6">
            <ContactForm productSlug={product?.slice(0, 80)} />
          </div>
        </div>
      </div>
    </>
  );
}
