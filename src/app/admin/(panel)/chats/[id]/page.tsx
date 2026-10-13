import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, UserRound } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/admin/ui";
import { visitorJourney } from "@/lib/admin/journey";
import { JourneyCard } from "@/components/admin/journey-card";
import { contactFromChat } from "@/lib/admin/chat-contact";
import { ChatActions } from "./chat-actions";

export const metadata: Metadata = { title: "Chat" };

type Msg = { role: string; content: string };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("manageLeads");
  const { id } = await params;
  const chat = await db.aiConversation.findUnique({ where: { id } });
  if (!chat || chat.kind === "admin") notFound();
  const msgs = (Array.isArray(chat.messages) ? (chat.messages as Msg[]) : []).filter((m) => m && typeof m.content === "string");
  const [journey, lead, contact] = await Promise.all([
    visitorJourney(chat.sessionId),
    db.lead.findFirst({ where: { OR: [...(chat.leadId ? [{ id: chat.leadId }] : []), ...(chat.sessionId ? [{ sessionId: chat.sessionId }] : [])] }, select: { id: true, leadNumber: true, name: true } }),
    contactFromChat(msgs),
  ]);

  return (
    <>
      <Link href="/admin/chats" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All chats
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat · {msgs.length} messages</h1>
          <p className="mt-1 text-sm text-muted">
            {chat.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} → {chat.updatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · answered by {chat.engine}
          </p>
        </div>
        <ChatActions chatId={chat.id} leadId={lead?.id ?? null} leadNumber={lead?.leadNumber ?? null} canCreate={Boolean(contact.email || contact.phone)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Conversation">
          <ol className="space-y-3">
            {msgs.map((m, i) => (
              <li key={i} className={m.role === "user" ? "ml-6 flex gap-2 rounded-xl bg-white/[0.06] p-3 text-sm sm:ml-12" : "mr-6 flex gap-2 rounded-xl bg-accent/[0.06] p-3 text-sm sm:mr-12"}>
                {m.role === "user" ? <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden /> : <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />}
                <span className="whitespace-pre-wrap break-words">{m.content}</span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-6">
          {(contact.email || contact.phone) && (
            <Card title="Contact they shared">
              <ul className="space-y-1 text-sm">
                {contact.email && <li>{contact.email}</li>}
                {contact.phone && <li>{contact.phone}</li>}
              </ul>
            </Card>
          )}
          <JourneyCard journey={journey} title="What they did on the website" />
        </div>
      </div>
    </>
  );
}
