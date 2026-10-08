import type { Metadata } from "next";

// Private pages: never indexed, never cached (see proxy.ts).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
