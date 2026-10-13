import { NextResponse } from "next/server";
import { verifyInvoiceToken } from "@/lib/refs";
import { loadInvoice, toView } from "@/lib/invoices";
import { getSettings } from "@/lib/settings";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

/** The customer's invoice as a PDF. Only the signed link from their email opens it. */
export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const invoiceNumber = decodeURIComponent(number).toUpperCase();
  const url = new URL(request.url);
  if (!verifyInvoiceToken(invoiceNumber, url.searchParams.get("t"))) return new NextResponse("Not found", { status: 404 });
  const [inv, settings] = await Promise.all([loadInvoice({ invoiceNumber }), getSettings()]);
  if (!inv || inv.status === "DRAFT") return new NextResponse("Not found", { status: 404 });
  const pdf = await renderInvoicePdf(toView(inv, settings));
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${inv.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
