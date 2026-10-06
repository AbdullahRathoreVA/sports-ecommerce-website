import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // The admin keeps the dark palette; the public site is light with dark sections.
  return <div className="tone-dark min-h-svh bg-ink text-fg">{children}</div>;
}
