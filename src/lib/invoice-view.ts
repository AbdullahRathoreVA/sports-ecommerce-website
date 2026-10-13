/**
 * The one shape every invoice rendering uses — the web page, the admin view
 * and the PDF — so all three always show the same numbers and wording.
 * No server imports here: client components may import the type.
 */

export type InvoiceView = {
  number: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "VOID";
  overdue: boolean;
  issueDate: string;
  dueDate: string | null;
  poNumber: string | null;
  currency: string;
  company: {
    name: string;
    tagline: string;
    founder: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    taxId: string;
  };
  bill: { name: string; company: string | null; email: string; phone: string | null; address: string | null };
  origin: string;
  shipVia: string | null;
  deliveryTime: string | null;
  orderNumber: string | null;
  items: { description: string; details: string | null; quantity: number; unitCents: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxBasisPoints: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  paymentTerms: string;
  bankDetails: string;
  notes: string | null;
};

export const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const STATUS_LABEL: Record<InvoiceView["status"], string> = {
  DRAFT: "Draft",
  SENT: "Awaiting payment",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  VOID: "Void",
};
