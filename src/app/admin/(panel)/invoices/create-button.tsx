"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { invoiceForOrder } from "./actions";

export function CreateInvoiceButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await invoiceForOrder(orderId);
        if (r.ok && r.id) router.push(`/admin/invoices/${r.id}`);
      })}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create invoice
    </button>
  );
}
