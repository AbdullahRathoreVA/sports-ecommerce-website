import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCustomerPage } from "@/lib/customer-auth";
import { getSettings, whatsappLink } from "@/lib/settings";
import { AuthShell } from "../auth-shell";
import { VerifyForm } from "../forms";
import { logOut } from "../actions";

export const metadata: Metadata = { title: "Verify your email · Client portal" };

export default async function VerifyPage() {
  const customer = await requireCustomerPage("/account/verify");
  if (customer.verified) redirect("/account");
  const settings = await getSettings();
  const wa = whatsappLink(settings, `Hi, please verify my Alrobel client portal account: ${customer.email}`);
  return (
    <AuthShell
      title="Check your inbox"
      intro={`We sent a 6-digit code to ${customer.email}. Enter it to unlock your quotes and orders.`}
      footer={
        <div className="space-y-3">
          <p>
            No email?{" "}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="font-semibold text-accent hover:underline">
                Message us on WhatsApp
              </a>
            ) : (
              <a href="/contact" className="font-semibold text-accent hover:underline">
                Contact our team
              </a>
            )}{" "}
            and we&apos;ll verify you.
          </p>
          <form action={logOut}>
            <button type="submit" className="text-xs text-subtle underline hover:text-fg">
              Use a different email
            </button>
          </form>
        </div>
      }
    >
      <VerifyForm />
      <a href="/account" className="mt-5 block text-center text-sm text-muted hover:text-fg">
        Skip for now — go to my portal
      </a>
    </AuthShell>
  );
}
