import type { Metadata, Viewport } from "next";
import { Exo_2, Inter, IBM_Plex_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/config/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Wordmark face for the Alrobel logo (wide, heavy, sporty).
const exo = Exo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["normal", "italic"],
  variable: "--font-exo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = `${s.brand.name} — ${s.brand.tagline}`;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${s.brand.name}` },
    description: s.brand.description,
    applicationName: s.brand.name,
    openGraph: {
      type: "website",
      siteName: s.brand.name,
      title,
      description: s.brand.description,
      url: siteUrl,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description: s.brand.description },
    alternates: { canonical: "/" },
    formatDetection: { telephone: false },
    // The review demo (placeholder brand, demo prices) stays out of search
    // engines until SITE_INDEXABLE=true is set on the real domain.
    robots: process.env.SITE_INDEXABLE === "true" ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${exo.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
