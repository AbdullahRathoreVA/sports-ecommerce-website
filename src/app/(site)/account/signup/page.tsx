import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { AuthShell } from "../auth-shell";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Create an account · Client portal" };

export default async function SignupPage() {
  if (await getCurrentCustomer()) redirect("/account");
  return (
    <AuthShell
      title="Create your account"
      intro="Free for teams, clubs, schools and brands. Takes a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/account/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
