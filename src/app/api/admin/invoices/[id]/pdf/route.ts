import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { loadInvoice, toView } from "@/lib/invoices";
import { getSettings } from "@/lib/settings";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

/** Admin preview of any invoice PDF (drafts included). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("manageOrders");
  } catch (e) {
    if (e instanceof AuthError) return new NextResponse("Not allowed", { status: e.status });
    throw e;
  }
  const { id } = await params;
  const [inv, settings] = await Promise.all([loadInvoice({ id }), getSettings()]);
  if (!inv) return new NextResponse("Not found", { status: 404 });
  const pdf = await renderInvoicePdf(toView(inv, settings));
  const download = new URL(request.url).searchParams.get("download");
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${inv.invoiceNumber}.pdf"`, "Cache-Control": "no-store" },
  });
}
