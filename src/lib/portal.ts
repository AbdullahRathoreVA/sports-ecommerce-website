import type { LeadStatus, OrderStatus } from "@prisma/client";

/** Customer-facing wording for internal statuses (the admin keeps the precise ones). */

export const ORDER_STEPS = ["Placed", "Confirmed", "In production", "Shipped", "Delivered"] as const;

export function orderStep(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "CONFIRMED":
    case "PROCESSING":
      return 1;
    case "MANUFACTURING":
      return 2;
    case "SHIPPED":
      return 3;
    case "DELIVERED":
      return 4;
    default:
      return -1; // cancelled / refunded
  }
}

export const ORDER_LABEL: Record<OrderStatus, string> = {
  PENDING: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Preparing",
  MANUFACTURING: "In production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const LEAD_LABEL: Record<LeadStatus, { label: string; tone: "new" | "active" | "quoted" | "won" | "closed" }> = {
  NEW: { label: "Received", tone: "new" },
  CONTACTED: { label: "In discussion", tone: "active" },
  QUALIFIED: { label: "In discussion", tone: "active" },
  QUOTED: { label: "Quote sent", tone: "quoted" },
  NEGOTIATING: { label: "In discussion", tone: "active" },
  WON: { label: "Order confirmed", tone: "won" },
  LOST: { label: "Closed", tone: "closed" },
};

export const TONE_CLASS: Record<"new" | "active" | "quoted" | "won" | "closed" | "warn", string> = {
  new: "bg-sky-50 text-sky-800 ring-sky-200",
  active: "bg-amber-50 text-amber-800 ring-amber-200",
  quoted: "bg-violet-50 text-violet-800 ring-violet-200",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  closed: "bg-surface-2 text-muted ring-black/10",
  warn: "bg-red-50 text-red-700 ring-red-200",
};
