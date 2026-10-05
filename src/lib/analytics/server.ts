import "server-only";
import { db } from "@/lib/db";
import { isValidId } from "@/lib/analytics/classify";
import type { EventName } from "@/lib/analytics/events";

/**
 * Record a server-authoritative event (purchase, quote_submit, ...) against
 * the visitor's session. Silently skipped when the session is unknown — the
 * business record (order, lead) is the source of truth, this is attribution.
 */
export async function recordServerEvent(
  sessionId: string | null | undefined,
  name: EventName,
  data: { path: string; productId?: string | null; label?: string; value?: number; props?: Record<string, string | number | boolean> },
) {
  if (!sessionId || !isValidId(sessionId)) return;
  try {
    const session = await db.session.findUnique({ where: { id: sessionId }, select: { visitorId: true } });
    if (!session) return;
    await db.event.create({
      data: {
        sessionId,
        visitorId: session.visitorId,
        name,
        path: data.path,
        productId: data.productId ?? null,
        label: data.label ?? null,
        value: data.value ?? null,
        props: data.props,
      },
    });
  } catch (error) {
    console.error("[analytics] server event failed", name, error);
  }
}
