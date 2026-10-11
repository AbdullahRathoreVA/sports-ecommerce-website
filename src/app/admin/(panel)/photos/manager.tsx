"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, Loader2, Star, Trash2, X } from "lucide-react";
import { ImageUploader, type Uploaded } from "@/components/admin/uploader";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";
import { assignPhoto, deletePhoto, makeMainPhoto, type PhotoResult } from "./actions";

export type PhotoRow = {
  key: string;
  url: string;
  kind: "product" | "category" | "post" | "upload";
  id: string;
  where: string;
  group: string;
  main?: boolean;
  width?: number | null;
  height?: number | null;
};
export type Option = { id: string; label: string; group?: string };

type Target = { type: "product"; productId: string; main: boolean } | { type: "category"; categoryId: string } | { type: "post"; postId: string };

function Where({ products, categories, posts, onChoose, busy, cta }: { products: Option[]; categories: Option[]; posts: Option[]; onChoose: (t: Target) => void; busy: boolean; cta: string }) {
  const [type, setType] = useState<"product" | "category" | "post">("product");
  const [productId, setProductId] = useState("");
  const [main, setMain] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [postId, setPostId] = useState("");
  const groups = useMemo(() => [...new Set(products.map((p) => p.group ?? ""))], [products]);
  const ready = (type === "product" && productId) || (type === "category" && categoryId) || (type === "post" && postId);
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Where should this photo go?</p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["product", "On a product"],
            ["category", "Category card (home page)"],
            ["post", "Buyer guide cover"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setType(k)} aria-pressed={type === k} className={cn("h-9 rounded-full border px-3.5 text-sm font-medium", type === k ? "border-accent bg-accent/15 text-fg" : "hairline text-muted hover:text-fg")}>
            {l}
          </button>
        ))}
      </div>
      {type === "product" && (
        <>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass} aria-label="Product">
            <option value="">Choose the product…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {products.filter((p) => (p.group ?? "") === g).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={main} onChange={(e) => setMain(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> Make it the main photo (shown first, and on the product card)
          </label>
        </>
      )}
      {type === "category" && (
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass} aria-label="Category">
          <option value="">Choose the category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      {type === "post" && (
        <select value={postId} onChange={(e) => setPostId(e.target.value)} className={inputClass} aria-label="Buyer guide">
          <option value="">Choose the guide…</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => onChoose(type === "product" ? { type, productId, main } : type === "category" ? { type, categoryId } : { type, postId })}
        className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} {cta}
      </button>
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<PhotoResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  return { pending, msg, run, setMsg };
}

export function PhotoManager({ photos, products, categories, posts }: { photos: PhotoRow[]; products: Option[]; categories: Option[]; posts: Option[] }) {
  const [pending, setPending] = useState<Uploaded[]>([]);
  const [filter, setFilter] = useState("All");
  const [moving, setMoving] = useState<PhotoRow | null>(null);
  const place = useAction();
  const lib = useAction();
  const groups = useMemo(() => ["All", ...[...new Set(photos.map((p) => p.group))]], [photos]);
  const shown = filter === "All" ? photos : photos.filter((p) => p.group === filter);

  return (
    <div className="space-y-8">
      {/* 1. Upload, then choose where */}
      <section className="rounded-[var(--radius-card)] border hairline bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Add photos</h2>
        <p className="mt-1 text-sm text-muted">Upload one or more photos (JPG, PNG or WebP, up to 4 MB). Then choose where each one goes on the website.</p>
        <ImageUploader className="mt-4" label="Upload photos" onUploaded={(u) => setPending((p) => [...p, u])} />
        {pending.length > 0 && (
          <ul className="mt-5 space-y-4">
            {pending.map((u, i) => (
              <li key={u.id + i} className="grid gap-4 rounded-xl border border-accent/40 bg-white/[0.02] p-4 sm:grid-cols-[160px_1fr]">
                <span className="relative aspect-square w-40 overflow-hidden rounded-lg bg-white">
                  <Image src={u.url} alt="" fill sizes="160px" className="object-contain" />
                </span>
                <div>
                  <Where
                    products={products}
                    categories={categories}
                    posts={posts}
                    busy={place.pending}
                    cta="Put it on the website"
                    onChoose={(t) => place.run(() => assignPhoto({ url: u.url, width: u.width, height: u.height, target: t }), () => setPending((p) => p.filter((_, j) => j !== i)))}
                  />
                  <button type="button" onClick={() => setPending((p) => p.filter((_, j) => j !== i))} className="mt-3 text-sm text-muted underline hover:text-fg">
                    Not now — keep it in the library
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {place.msg && <p className={cn("mt-3 text-sm", place.msg.ok ? "text-emerald-300" : "text-red-300")}>{place.msg.text}</p>}
      </section>

      {/* 2. Library */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">All photos on the website</h2>
            <p className="mt-1 text-sm text-muted">{photos.length} photos. Make one the main photo, move it, or delete it.</p>
          </div>
          {lib.msg && <p className={cn("text-sm", lib.msg.ok ? "text-emerald-300" : "text-red-300")}>{lib.msg.text}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button key={g} type="button" onClick={() => setFilter(g)} aria-pressed={filter === g} className={cn("h-9 rounded-full border px-3.5 text-sm font-medium", filter === g ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
              {g} <span className="opacity-60">{g === "All" ? photos.length : photos.filter((p) => p.group === g).length}</span>
            </button>
          ))}
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((p) => (
            <li key={p.key} className="overflow-hidden rounded-xl border hairline bg-surface">
              <a href={p.url} target="_blank" rel="noopener" className="relative block aspect-square bg-white">
                <Image src={p.url} alt="" fill sizes="(min-width:1280px) 18vw, (min-width:640px) 30vw, 45vw" className="object-contain" />
                {p.main && <span className="absolute left-2 top-2 rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Main</span>}
              </a>
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-muted">{p.where}</p>
                <div className="mt-2 flex items-center gap-1">
                  {p.kind === "product" && !p.main && (
                    <button type="button" title="Make main photo" aria-label="Make main photo" disabled={lib.pending} onClick={() => lib.run(() => makeMainPhoto(p.id))} className="grid h-8 w-8 place-items-center rounded-lg border hairline text-subtle hover:text-amber-300">
                      <Star className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  <button type="button" title="Move / use somewhere else" aria-label="Move" onClick={() => setMoving(p)} className="grid h-8 w-8 place-items-center rounded-lg border hairline text-subtle hover:text-fg">
                    <ArrowRightLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Delete from the website"
                    aria-label="Delete"
                    disabled={lib.pending}
                    onClick={() => confirm(`Delete this photo from the website?\n\n${p.where}`) && lib.run(() => deletePhoto({ kind: p.kind, id: p.id }))}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-lg border hairline text-subtle hover:border-red-400/50 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Move dialog */}
      {moving && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Move photo">
          <div className="w-full max-w-lg rounded-xl border hairline bg-surface p-5">
            <div className="flex items-start gap-4">
              <span className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image src={moving.url} alt="" fill sizes="96px" className="object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">Now on: {moving.where}</p>
                <p className="mt-1 text-xs text-subtle">{moving.kind === "product" ? "Moving takes it off this product and puts it in the new place." : "The photo is added to the new place; it stays where it is too."}</p>
              </div>
              <button type="button" onClick={() => setMoving(null)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4">
              <Where
                products={products}
                categories={categories}
                posts={posts}
                busy={lib.pending}
                cta="Move it here"
                onChoose={(t) =>
                  lib.run(
                    () => assignPhoto({ url: moving.url, width: moving.width ?? null, height: moving.height ?? null, target: t, fromProductImageId: moving.kind === "product" ? moving.id : undefined }),
                    () => setMoving(null),
                  )
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
