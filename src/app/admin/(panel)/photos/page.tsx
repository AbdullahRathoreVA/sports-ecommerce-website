import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { PhotoManager, type Option, type PhotoRow } from "./manager";

export const metadata: Metadata = { title: "Photos" };
export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  await requireAdminPage("manageProducts");
  const [productImages, categories, posts, products, uploads] = await Promise.all([
    db.productImage.findMany({
      where: { source: { not: "retired" } },
      orderBy: [{ product: { position: "asc" } }, { position: "asc" }],
      select: { id: true, url: true, position: true, width: true, height: true, product: { select: { id: true, name: true, status: true, category: { select: { name: true } } } } },
    }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true, image: true, published: true } }),
    db.post.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, coverImage: true } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ category: { position: "asc" } }, { position: "asc" }], select: { id: true, name: true, status: true, category: { select: { name: true } } } }),
    // Admin uploads only (customers' chat attachments are private to their enquiry).
    db.mediaAsset.findMany({ where: { NOT: { uploadedBy: "visitor" } }, orderBy: { createdAt: "desc" }, select: { id: true, width: true, height: true, createdAt: true } }),
  ]);

  // The main photo is the lowest position per product.
  const firstByProduct = new Map<string, string>();
  for (const im of productImages) if (!firstByProduct.has(im.product.id)) firstByProduct.set(im.product.id, im.id);

  const used = new Set<string>([...productImages.map((i) => i.url), ...categories.flatMap((c) => (c.image ? [c.image] : [])), ...posts.flatMap((p) => (p.coverImage ? [p.coverImage] : []))]);

  const photos: PhotoRow[] = [
    ...productImages.map((im) => ({
      key: `p-${im.id}`,
      url: im.url,
      kind: "product" as const,
      id: im.id,
      where: `${im.product.name}${im.product.status !== "ACTIVE" ? " (hidden product)" : ""} · photo ${im.position + 1}`,
      group: im.product.category.name,
      main: firstByProduct.get(im.product.id) === im.id,
      width: im.width,
      height: im.height,
    })),
    ...categories.flatMap((c) => (c.image ? [{ key: `c-${c.id}`, url: c.image, kind: "category" as const, id: c.id, where: `Category card: ${c.name}${c.published ? "" : " (hidden)"}`, group: "Category cards" }] : [])),
    ...posts.flatMap((p) => (p.coverImage ? [{ key: `g-${p.id}`, url: p.coverImage, kind: "post" as const, id: p.id, where: `Guide cover: ${p.title}`, group: "Guide covers" }] : [])),
    ...uploads
      .filter((u) => !used.has(`/uploads/${u.id}`))
      .map((u) => ({ key: `u-${u.id}`, url: `/uploads/${u.id}`, kind: "upload" as const, id: u.id, where: `Not on the website yet · uploaded ${u.createdAt.toLocaleDateString("en-GB")}`, group: "Not used yet", width: u.width, height: u.height })),
  ];

  const productOptions: Option[] = products.map((p) => ({ id: p.id, label: `${p.name}${p.status !== "ACTIVE" ? " (hidden)" : ""}`, group: p.category.name }));
  return (
    <>
      <PageHeader title="Photos" description="Every photo on the website in one place. Upload new ones, choose where they go, make one the main photo, move or delete." />
      <PhotoManager
        photos={photos}
        products={productOptions}
        categories={categories.map((c) => ({ id: c.id, label: `${c.name}${c.published ? "" : " (hidden)"}` }))}
        posts={posts.map((p) => ({ id: p.id, label: p.title }))}
      />
    </>
  );
}
