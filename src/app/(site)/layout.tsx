import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { DemoBanner } from "@/components/site/demo-banner";
import { Tracker } from "@/components/analytics/tracker";
import { RevealObserver } from "@/components/ui/reveal";
import { CartProvider } from "@/components/cart/cart-context";
import { AssistantLauncher } from "@/components/assistant/launcher";
import { getSettings } from "@/lib/settings";
import { JsonLd, organizationSchema, websiteSchema } from "@/components/seo/json-ld";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <JsonLd data={[organizationSchema(settings), websiteSchema(settings)]} />
      <DemoBanner />
      <Header />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      {/* Room for the floating quote/chat dock on phones. */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom))] bg-ink lg:hidden" aria-hidden />
      <AssistantLauncher brandName={settings.brand.name} whatsapp={settings.contact.whatsapp} email={settings.contact.email} />
      <Tracker />
      <RevealObserver />
    </CartProvider>
  );
}
