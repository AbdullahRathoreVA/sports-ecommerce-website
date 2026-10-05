import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";
import { isEventName, SERVER_ONLY_EVENTS } from "@/lib/analytics/events";
import {
  classifyBrowser,
  classifyChannel,
  classifyDevice,
  classifyOs,
  dailyVisitorId,
  isValidId,
  normalisePath,
  referrerHost,
} from "@/lib/analytics/classify";
import { siteUrl } from "@/config/site";

export const runtime = "nodejs";

/**
 * First-party event collector.
 *
 * Always answers 204: a beacon must never surface an error to a visitor, and
 * telling a scraper "rejected" teaches it how to tune its payload. Problems
 * are logged server-side.
 */

const eventSchema = z.object({
  name: z.string().max(40),
  path: z.string().max(200),
  productId: z.string().max(40).optional(),
  category: z.string().max(60).optional(),
  label: z.string().max(120).optional(),
  value: z.number().int().min(0).max(10_000_000).optional(),
  props: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
  ts: z.number(),
});

const bodySchema = z.object({
  sid: z.string(),
  vid: z.string().nullable(),
  landing: z
    .object({
      referrer: z.string().max(500).nullable(),
      utm: z.record(z.string(), z.string().max(80)),
    })
    .nullable()
    .optional(),
  events: z.array(eventSchema).max(25),
});

export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    const ip = clientIp(request.headers);
    if (!hit(`t:${ip}`, 600, 60 * 60 * 1000).ok) return noContent;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isValidId(parsed.data.sid)) return noContent;
    const { sid, landing } = parsed.data;

    const ua = request.headers.get("user-agent") ?? "";
    const device = classifyDevice(ua);
    // Bots are counted separately and excluded from every visitor figure.
    const isBot = device === "bot";
    const country = request.headers.get("x-vercel-ip-country") ?? null;
    const vid =
      parsed.data.vid && isValidId(parsed.data.vid)
        ? parsed.data.vid
        : dailyVisitorId(ip, ua, process.env.AUTH_SECRET ?? "dev-salt");

    const events = parsed.data.events
      .filter((e) => isEventName(e.name) && !SERVER_ONLY_EVENTS.has(e.name))
      .map((e) => ({ ...e, path: normalisePath(e.path) }))
      .filter((e): e is typeof e & { path: string } => e.path !== null);
    if (events.length === 0) return noContent;

    const now = new Date();
    const pageViews = events.filter((e) => e.name === "page_view").length;
    const lastPath = events[events.length - 1]!.path;

    // Visitor: create on first sight; count sessions.
    const existingVisitor = await db.visitor.findUnique({ where: { id: vid }, select: { id: true } });
    const existingSession = await db.session.findUnique({ where: { id: sid }, select: { id: true } });

    if (!existingVisitor) {
      await db.visitor.upsert({ where: { id: vid }, update: { lastSeenAt: now }, create: { id: vid, country } });
    }

    if (!existingSession) {
      const selfHost = new URL(siteUrl).hostname;
      const ref = referrerHost(landing?.referrer, selfHost);
      const utm = landing?.utm ?? {};
      // Upsert: two beacons from a brand-new tab can race here.
      await db.session.upsert({
        where: { id: sid },
        update: { lastSeenAt: now, lastPath, pageViews: { increment: pageViews } },
        create: {
          id: sid,
          visitorId: vid,
          landingPath: events[0]!.path,
          lastPath,
          pageViews,
          referrerHost: ref,
          channel: classifyChannel(ref, utm.utm_source, utm.utm_medium),
          utmSource: utm.utm_source ?? null,
          utmMedium: utm.utm_medium ?? null,
          utmCampaign: utm.utm_campaign ?? null,
          device,
          browser: classifyBrowser(ua),
          os: classifyOs(ua),
          country,
          isReturning: Boolean(existingVisitor),
          isBot,
        },
      });
      if (existingVisitor) {
        await db.visitor.update({
          where: { id: vid },
          data: { lastSeenAt: now, sessions: { increment: 1 } },
        });
      }
    } else {
      await db.session.update({
        where: { id: sid },
        data: { lastSeenAt: now, lastPath, pageViews: { increment: pageViews } },
      });
      await db.visitor.update({ where: { id: vid }, data: { lastSeenAt: now } }).catch(() => undefined);
    }

    // Heartbeats only keep the session "live"; they are not stored as events.
    const rows = events
      .filter((e) => e.name !== "heartbeat")
      .map((e) => ({
        sessionId: sid,
        visitorId: vid,
        name: e.name,
        path: e.path,
        productId: e.productId ?? null,
        category: e.category ?? null,
        label: e.label ?? null,
        value: e.value ?? null,
        props: e.props ?? undefined,
        // Clamp client clocks: never in the future, never older than 10 min.
        createdAt: new Date(Math.min(now.getTime(), Math.max(e.ts, now.getTime() - 600_000))),
      }));
    if (rows.length) await db.event.createMany({ data: rows });
  } catch (error) {
    console.error("[t] collector failed", error);
  }
  return noContent;
}
