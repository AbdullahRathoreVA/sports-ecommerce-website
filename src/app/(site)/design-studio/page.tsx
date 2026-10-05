import type { Metadata } from "next";
import { getAllProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { DesignStudio } from "@/components/studio/design-studio";

export const metadata: Metadata = {
  title: "Design Studio — Design Your Kit in 3D",
  description: "Design a sublimated football kit in 3D: choose a pattern, colours, sponsor, names and numbers, add your crest, and send it to our factory for a quote.",
  alternates: { canonical: "/design-studio" },
};

export default async function DesignStudioPage() {
  const [products, settings] = await Promise.all([getAllProducts(), getSettings()]);
  return (
    <div className="container-x pb-10 pt-0 lg:pb-20 lg:pt-8">
      <header className="hidden lg:mb-6 lg:block">
        <p className="eyebrow text-accent">Design Studio</p>
        <h1 className="font-display mt-2 text-5xl">Design your kit in 3D</h1>
      </header>
      <h1 className="sr-only lg:hidden">Design your kit in 3D</h1>
      <DesignStudio
        products={products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name, moq: p.moq }))}
        whatsapp={settings.contact.whatsapp}
        responseTime={settings.contact.responseTime}
      />
    </div>
  );
}
