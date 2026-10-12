"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { newLeadNumber } from "@/lib/refs";
import { FINDER_KINDS, findOnMap, findOnWeb, outreachMessage, type Candidate, type FinderKind } from "@/lib/admin/lead-finder";

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const kinds = Object.keys(FINDER_KINDS) as [FinderKind, ...FinderKind[]];

const searchSchema = z.object({
  kind: z.enum(kinds),
  place: z.string().trim().min(2, "Type a city or area").max(120),
  radiusKm: z.coerce.number().min(2).max(50),
});

export type FinderResult = Candidate & { saved: string | null; message: string };

export async function searchLeads(input: z.input<typeof searchSchema>): Promise<{ ok: true; where: string; results: FinderResult[]; web: number } | { ok: false; error: string }> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to use the lead finder." };
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the search." };
  const { kind, place, radiusKm } = parsed.data;
  const [map, web] = await Promise.all([findOnMap(kind, place, radiusKm), findOnWeb(kind, place).catch(() => [])]);
  if ("error" in map) return { ok: false, error: map.error };
  const all = [...map.results, ...web.filter((w) => !map.results.some((m) => m.website && w.website && m.website.includes(w.website.replace(/^https:\/\//, ""))))];
  // Mark businesses already in the pipeline.
  const existing = await db.lead.findMany({ where: { source: "LEAD_FINDER" }, select: { id: true, meta: true, website: true, phone: true } });
  const savedId = (c: Candidate) =>
    existing.find((l) => (l.meta as { osmId?: string } | null)?.osmId === c.osmId || (c.website && l.website === c.website) || (c.phone && l.phone === c.phone))?.id ?? null;
  await audit(admin, "lead_finder.search", "Lead", null, { kind, place, radiusKm, found: all.length });
  return { ok: true, where: map.where, web: web.length, results: all.map((c) => ({ ...c, saved: savedId(c), message: outreachMessage(c) })) };
}

const candidateSchema = z.object({
  osmId: z.string().max(80),
  osmUrl: z.string().max(400),
  name: z.string().trim().min(1).max(160),
  kind: z.enum(kinds),
  phone: z.string().max(60).nullable(),
  email: z.string().max(160).nullable(),
  website: z.string().max(400).nullable(),
  social: z.string().max(400).nullable(),
  address: z.string().max(300).nullable(),
  city: z.string().max(100).nullable(),
  country: z.string().max(8).nullable(),
});

/** Save a found business as a lead (status New, source Lead finder). */
export async function saveFoundLead(input: z.input<typeof candidateSchema>, query: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That result couldn't be saved." };
  const c = parsed.data;
  const dupe = await db.lead.findFirst({ where: { source: "LEAD_FINDER", OR: [{ meta: { path: ["osmId"], equals: c.osmId } }, ...(c.website ? [{ website: c.website }] : [])] }, select: { id: true } });
  if (dupe) return { ok: true, id: dupe.id };
  const email = c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ? c.email : null;
  const lead = await db.lead.create({
    data: {
      leadNumber: newLeadNumber(),
      source: "LEAD_FINDER",
      status: "NEW",
      name: c.name,
      company: c.name,
      email,
      phone: c.phone,
      website: c.website ?? c.social,
      city: c.city,
      country: c.country,
      preferredChannel: email ? "email" : c.phone ? "whatsapp" : "email",
      productName: FINDER_KINDS[c.kind].label,
      message: `Found with the lead finder (${FINDER_KINDS[c.kind].label}, ${query}). Not contacted yet.`,
      meta: { origin: "Lead finder", kind: c.kind, osmId: c.osmId, osmUrl: c.osmUrl, address: c.address, query, addedBy: admin.email },
      assignedToId: admin.id,
    },
    select: { id: true },
  });
  await audit(admin, "lead_finder.save", "Lead", lead.id, { name: c.name });
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/leads");
  return { ok: true, id: lead.id };
}
