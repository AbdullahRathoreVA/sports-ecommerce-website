import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/legal";

export const metadata: Metadata = { title: "Privacy notice", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Privacy notice" updated="October 2026">
      <p>
        This notice explains what {s.brand.name} collects through this website and why. It is written to be read; if anything is unclear,
        contact us.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Enquiries and orders:</strong> the details you type into our forms (name, email, phone, company, country, delivery address
          and your requirements), so we can reply, quote and fulfil orders.
        </li>
        <li>
          <strong>Assistant conversations:</strong> messages you send to the product assistant, so we can answer and improve answers. Don&apos;t
          share sensitive personal information in the chat.
        </li>
        <li>
          <strong>Website analytics:</strong> pages viewed and actions taken (for example &ldquo;added to cart&rdquo;), device type, browser and
          country. We use our own first-party analytics — no third-party trackers, no advertising cookies, and we do not store your IP address.
          A random identifier is kept in your browser&apos;s local storage to count returning visits; if your browser sends Global Privacy
          Control or Do Not Track, we don&apos;t keep one.
        </li>
      </ul>
      <h2>How we use it</h2>
      <p>To answer enquiries, prepare quotes, process and deliver orders, keep records we are required to keep, and understand which pages and products are useful so we can improve the site. We never sell your data.</p>
      <h2>Who we share it with</h2>
      <p>
        Only service providers that run the site for us (hosting, database, email delivery and AI processing for assistant answers) and
        carriers needed to deliver your order. They act on our instructions.
      </p>
      <h2>How long we keep it</h2>
      <p>Enquiries and order records for as long as needed for the business relationship and legal record-keeping; analytics in aggregate form.</p>
      <h2>Your rights</h2>
      <p>You can ask us for a copy of your data, to correct it or to delete it, by contacting us{s.contact.email ? ` at ${s.contact.email}` : " through the contact page"}.</p>
    </LegalPage>
  );
}
