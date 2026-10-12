import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { visitorJourney } from "@/lib/admin/journey";
import { JourneyCard } from "@/components/admin/journey-card";
import { countryLabel } from "@/lib/admin/insights";

export const metadata: Metadata = { title: "Visitor" };

export default async function VisitorPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await requireAdminPage("manageLeads");
  const { sessionId } = await params;
  const journey = await visitorJourney(sessionId);
  if (!journey) notFound();
  const chat = await db.aiConversation.findFirst({ where: { sessionId, kind: { not: "admin" } }, select: { id: true } });
  const where = [journey.city, journey.country ? countryLabel(journey.country) : null].filter(Boolean).join(", ") || "Unknown location";
  return (
    <>
      <Link href="/admin/leads/visitors" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Interested visitors
      </Link>
      <PageHeader title={`Visitor from ${where}`} description="Anonymous until they share their details. Everything below is what they did on the website.">
        {chat && (
          <Link href={`/admin/chats/${chat.id}`} className="inline-flex h-11 items-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink">
            Read their chat
          </Link>
        )}
      </PageHeader>
      <div className="max-w-3xl">
        <JourneyCard journey={journey} title="What they did" />
      </div>
    </>
  );
}
