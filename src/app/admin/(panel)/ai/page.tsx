import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { aiAvailable } from "@/lib/ai/provider";
import { PageHeader } from "@/components/admin/ui";
import { AnalystChat } from "./analyst-chat";

export const metadata: Metadata = { title: "AI analyst" };

export default async function AiAnalystPage() {
  await requireAdminPage("useAdminAi");
  return (
    <>
      <PageHeader title="AI analyst" description="Plain-language answers about your sales, leads, products and visitors — calculated from your own data." />
      <AnalystChat aiConfigured={aiAvailable()} />
    </>
  );
}
