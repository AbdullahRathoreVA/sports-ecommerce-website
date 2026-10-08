import type { Metadata } from "next";
import { requireCustomerPage } from "@/lib/customer-auth";
import { PortalNav } from "../portal-nav";
import { PasswordForm, ProfileForm } from "../forms";

export const metadata: Metadata = { title: "Profile & security · Client portal" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const c = await requireCustomerPage("/account/profile");
  return (
    <>
      <header className="on-dark relative -mt-[calc(var(--header-h)+12px)] bg-ink pt-[calc(var(--header-h)+12px)] text-white">
        <div className="container-x py-10 lg:py-14">
          <p className="label text-accent">Client portal</p>
          <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.2rem)]">Profile &amp; security</h1>
        </div>
      </header>
      <div className="container-x pb-28 pt-8 lg:pb-24">
        <PortalNav active="profile" />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-black/[0.06] sm:p-8">
            <h2 className="font-display text-xl">Your details</h2>
            <p className="mt-1 text-sm text-muted">Used on your quotes, invoices and shipping labels.</p>
            <div className="mt-6">
              <ProfileForm initial={{ name: c.name, company: c.company, phone: c.phone, country: c.country, email: c.email }} />
            </div>
          </section>
          <section className="rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-black/[0.06] sm:p-8">
            <h2 className="font-display text-xl">Password</h2>
            <p className="mt-1 text-sm text-muted">Changing it signs you out on every other device.</p>
            <div className="mt-6">
              <PasswordForm />
            </div>
            <p className="mt-6 border-t hairline pt-4 text-sm text-muted">
              Email: <strong className="text-fg">{c.email}</strong> · {c.verified ? "verified" : "not verified yet"}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
