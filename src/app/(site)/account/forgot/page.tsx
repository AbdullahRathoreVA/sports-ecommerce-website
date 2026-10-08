import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Reset password · Client portal" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      intro="We'll email you a 6-digit code to set a new one."
      footer={
        <Link href="/account/login" className="font-semibold text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
