import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { FINDER_KINDS, webSearchAvailable } from "@/lib/admin/lead-finder";
import { Finder } from "./finder";

export const metadata: Metadata = { title: "Lead finder" };

export default async function LeadFinderPage() {
  await requireAdminPage("manageLeads");
  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All leads
      </Link>
      <PageHeader
        title="Lead finder"
        description="Find real football clubs, schools, sports shops, motorbike dealers, karting tracks and gyms in any city — with the phone, email and website the map has for them. Save the good ones as leads and send the ready-made first message."
      />
      <Finder kinds={Object.entries(FINDER_KINDS).map(([k, v]) => ({ key: k, label: v.label }))} web={webSearchAvailable()} />
    </>
  );
}
export const maxDuration = 60;
