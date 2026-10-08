import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer, safeNext } from "@/lib/customer-auth";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Log in · Client portal" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentCustomer()) redirect(safeNext(next));
  return (
    <AuthShell
      title="Welcome back"
      intro="Log in to track orders, see QC photos and manage your quotes."
      footer={
        <>
          New to Alrobel?{" "}
          <Link href="/account/signup" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(next)} />
    </AuthShell>
  );
}
