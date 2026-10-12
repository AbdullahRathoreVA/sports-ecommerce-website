import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ManualLeadForm } from "./form";

export const metadata: Metadata = { title: "Add a lead" };

export default async function NewLeadPage() {
  await requireAdminPage("manageLeads");
  const products = await db.product.findMany({ where: { status: "ACTIVE" }, select: { name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All leads
      </Link>
      <PageHeader title="Add a lead" description="Someone messaged on WhatsApp, called, met you at a trade show or was referred? Add them here so every enquiry lives in one pipeline." />
      <ManualLeadForm products={products.map((p) => p.name)} />
    </>
  );
}
