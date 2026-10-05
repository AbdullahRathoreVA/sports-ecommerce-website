"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { deleteProduct, saveProduct, type ProductInput } from "../actions";
import { ImageUploader } from "@/components/admin/uploader";
import { inputClass } from "@/components/forms/field";
import { cn, slugify } from "@/lib/utils";

export type ProductFormValue = Omit<ProductInput, "subtitle" | "videoUrl" | "specSheetUrl" | "seoTitle" | "seoDesc"> & {
  subtitle: string;
  videoUrl: string;
  specSheetUrl: string;
  seoTitle: string;
  seoDesc: string;
};

const area = cn(inputClass, "h-auto py-2.5 leading-relaxed");

/** Cents ⇄ the decimal string an admin types ("12.50"). */
const toMoney = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(/\.00$/, ""));
const fromMoney = (s: string) => {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};
const toInt = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : NaN;
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border hairline bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-subtle">{hint}</span>}
    </label>
  );
}

function LinesField({ id, label, hint, value, onChange, rows = 4 }: { id: string; label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <div>
      <Label htmlFor={id} hint={hint ?? "One per line"}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
        }}
        className={area}
      />
    </div>
  );
}

export function ProductForm({ id, initial, categories, usage }: { id: string | null; initial: ProductFormValue; categories: { id: string; name: string }[]; usage: { orders: number; leads: number } | null }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [money, setMoney] = useState({ price: toMoney(initial.priceCents), sale: toMoney(initial.salePriceCents), sample: toMoney(initial.samplePriceCents) });
  const [nums, setNums] = useState({ stock: initial.stock?.toString() ?? "", ltMin: initial.leadTimeMinDays?.toString() ?? "", ltMax: initial.leadTimeMaxDays?.toString() ?? "" });
  const [tiers, setTiers] = useState(initial.priceTiers.map((t) => ({ minQty: String(t.minQty), price: toMoney(t.unitCents) })));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; field?: string } | null>(null);
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const err = (f: string) => (msg && !msg.ok && msg.field?.startsWith(f) ? msg.text : null);

  function submit() {
    setMsg(null);
    const priceCents = fromMoney(money.price);
    const salePriceCents = fromMoney(money.sale);
    const samplePriceCents = fromMoney(money.sample);
    const priceTiers = tiers.filter((t) => t.minQty.trim() || t.price.trim()).map((t) => ({ minQty: Number(t.minQty), unitCents: fromMoney(t.price) ?? NaN }));
    const stock = toInt(nums.stock);
    const leadTimeMinDays = toInt(nums.ltMin);
    const leadTimeMaxDays = toInt(nums.ltMax);
    const bad = [priceCents, salePriceCents, samplePriceCents, stock, leadTimeMinDays, leadTimeMaxDays].some((n) => Number.isNaN(n)) || priceTiers.some((t) => !Number.isInteger(t.minQty) || Number.isNaN(t.unitCents));
    if (bad) {
      setMsg({ ok: false, text: "Check the numbers — prices like 12.50, quantities and days as whole numbers." });
      return;
    }
    const input: ProductInput = { ...v, priceCents, salePriceCents, samplePriceCents, priceTiers, stock, leadTimeMinDays, leadTimeMaxDays };
    start(async () => {
      const r = await saveProduct(id, input);
      if (!r.ok) {
        setMsg({ ok: false, text: r.error, field: r.field });
        return;
      }
      setMsg({ ok: true, text: r.message ?? "Saved." });
      if (!id) router.replace(`/admin/products/${r.id}`);
      else router.refresh();
    });
  }

  const moveImage = (i: number, d: -1 | 1) => {
    const next = [...v.images];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    set("images", next);
  };

  return (
    <form
      className="grid gap-6 pb-28 xl:grid-cols-[1fr_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <div className="space-y-6">
        <Section title="Basics">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="p-name">Product name</Label>
              <input
                id="p-name"
                value={v.name}
                maxLength={120}
                aria-invalid={Boolean(err("name"))}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((p) => ({ ...p, name, ...(slugTouched ? {} : { slug: slugify(name) }) }));
                }}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="p-slug" hint="Page address">URL slug</Label>
              <div className="flex items-center rounded-[var(--radius-control)] border border-white/12 bg-surface focus-within:border-accent">
                <span className="pl-3.5 text-sm text-subtle">/products/</span>
                <input
                  id="p-slug"
                  value={v.slug}
                  maxLength={100}
                  aria-invalid={Boolean(err("slug"))}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                  className="h-12 min-w-0 flex-1 bg-transparent pr-3.5 text-[16px] outline-none"
                />
              </div>
              {id && v.slug !== initial.slug && <p className="mt-1 text-xs text-amber-200">Changing the address breaks links already shared to the old one.</p>}
            </div>
            <div>
              <Label htmlFor="p-sku">SKU</Label>
              <input id="p-sku" value={v.sku} maxLength={40} aria-invalid={Boolean(err("sku"))} onChange={(e) => set("sku", e.target.value.toUpperCase())} className={cn(inputClass, "font-mono")} />
            </div>
            <div>
              <Label htmlFor="p-cat">Category</Label>
              <select id="p-cat" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-sub" hint="Optional">Subtitle</Label>
              <input id="p-sub" value={v.subtitle} maxLength={160} onChange={(e) => set("subtitle", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <Label htmlFor="p-summary" hint={`${v.summary.length}/400`}>Summary</Label>
            <textarea id="p-summary" rows={2} maxLength={400} value={v.summary} aria-invalid={Boolean(err("summary"))} onChange={(e) => set("summary", e.target.value)} className={area} />
            <p className="mt-1 text-xs text-subtle">Shown on product cards and used by the AI assistant. One or two plain sentences.</p>
          </div>
          <div>
            <Label htmlFor="p-desc" hint="Markdown: **bold**, - lists, ## headings">Description</Label>
            <textarea id="p-desc" rows={10} maxLength={20000} value={v.description} aria-invalid={Boolean(err("description"))} onChange={(e) => set("description", e.target.value)} className={area} />
          </div>
        </Section>

        <Section title="Photos" hint="The first photo is the main image. Real factory photos convert far better than renders.">
          {err("images") && <p className="text-sm text-red-300">{err("images")}</p>}
          <ImageUploader
            label="Upload product photos"
            onUploaded={(u, file) =>
              setV((p) => ({
                ...p,
                images: [...p.images, { url: u.url, width: u.width, height: u.height, source: "client", alt: p.name ? `${p.name} — ${file.name.replace(/\.\w+$/, "").replace(/[-_]+/g, " ")}` : "" }],
              }))
            }
          />
          {v.images.length > 0 && (
            <ul className="space-y-3">
              {v.images.map((img, i) => (
                <li key={`${img.url}-${i}`} className="flex gap-3 rounded-xl border hairline p-2.5">
                  <span className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Main</span>}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label htmlFor={`alt-${i}`} className="sr-only">Photo description</label>
                    <input
                      id={`alt-${i}`}
                      value={img.alt}
                      maxLength={200}
                      placeholder="Describe the photo (for Google and screen readers)"
                      onChange={(e) => set("images", v.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                      className={cn(inputClass, "h-10 text-sm")}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move earlier" className="grid h-8 w-8 place-items-center rounded-lg border hairline disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden /></button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Move later" className="grid h-8 w-8 place-items-center rounded-lg border hairline disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden /></button>
                      <button type="button" onClick={() => set("images", v.images.filter((_, j) => j !== i))} aria-label="Remove photo" className="grid h-8 w-8 place-items-center rounded-lg border hairline text-subtle hover:text-red-300"><Trash2 className="h-4 w-4" aria-hidden /></button>
                      {img.source === "placeholder" && <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">placeholder</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pricing & ordering" hint="Leave prices empty for quote-only products. Prices are per piece.">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">How customers buy it</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["QUOTE", "Quote only", "Bulk / OEM — customer requests a quote"],
                  ["BOTH", "Sample + quote", "Buy a sample online, quote for bulk"],
                  ["CART", "Buy online", "Fixed price, add to cart"],
                ] as const
              ).map(([mode, title, desc]) => (
                <label key={mode} className={cn("cursor-pointer rounded-xl border p-3 text-sm", v.purchaseMode === mode ? "border-accent bg-accent/[0.06]" : "hairline")}>
                  <input type="radio" name="mode" value={mode} checked={v.purchaseMode === mode} onChange={() => set("purchaseMode", mode)} className="sr-only" />
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{desc}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-4">
            <div>
              <Label htmlFor="p-cur">Currency</Label>
              <select id="p-cur" value={v.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
                {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="p-price" hint={v.purchaseMode === "QUOTE" ? "“From” price" : undefined}>Price</Label>
              <input id="p-price" inputMode="decimal" value={money.price} aria-invalid={Boolean(err("priceCents"))} onChange={(e) => setMoney({ ...money, price: e.target.value })} placeholder="On request" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-sale" hint="Optional">Sale price</Label>
              <input id="p-sale" inputMode="decimal" value={money.sale} aria-invalid={Boolean(err("salePriceCents"))} onChange={(e) => setMoney({ ...money, sale: e.target.value })} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-sample" hint="Optional">Sample price</Label>
              <input id="p-sample" inputMode="decimal" value={money.sample} onChange={(e) => setMoney({ ...money, sample: e.target.value })} placeholder="No samples" className={inputClass} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Quantity price breaks</p>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <label htmlFor={`tq-${i}`} className="sr-only">Minimum quantity</label>
                  <input id={`tq-${i}`} inputMode="numeric" value={t.minQty} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} placeholder="From qty" className={cn(inputClass, "h-11")} />
                  <span className="shrink-0 text-sm text-subtle">pcs →</span>
                  <label htmlFor={`tp-${i}`} className="sr-only">Unit price</label>
                  <input id={`tp-${i}`} inputMode="decimal" value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="Unit price" className={cn(inputClass, "h-11")} />
                  <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} aria-label="Remove price break" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle hover:text-red-300"><X className="h-4 w-4" aria-hidden /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setTiers([...tiers, { minQty: "", price: "" }])} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-medium text-muted hover:text-fg">
              <Plus className="h-4 w-4" aria-hidden /> Add price break
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-4">
            <div>
              <Label htmlFor="p-moq">MOQ (pcs)</Label>
              <input id="p-moq" inputMode="numeric" value={String(v.moq)} onChange={(e) => set("moq", Number(e.target.value.replace(/\D/g, "")) || 1)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-ltmin">Lead time from</Label>
              <input id="p-ltmin" inputMode="numeric" value={nums.ltMin} onChange={(e) => setNums({ ...nums, ltMin: e.target.value })} placeholder="days" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-ltmax">to</Label>
              <input id="p-ltmax" inputMode="numeric" value={nums.ltMax} aria-invalid={Boolean(err("leadTimeMaxDays"))} onChange={(e) => setNums({ ...nums, ltMax: e.target.value })} placeholder="days" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-stock" hint="Optional">Stock</Label>
              <input id="p-stock" inputMode="numeric" value={nums.stock} onChange={(e) => setNums({ ...nums, stock: e.target.value })} placeholder="Made to order" className={inputClass} />
            </div>
          </div>
        </Section>

        <Section title="Specifications" hint="These power the spec table, the product finder and the AI assistant's answers — keep them factual.">
          <div className="space-y-2">
            {v.specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <label htmlFor={`sl-${i}`} className="sr-only">Spec name</label>
                <input id={`sl-${i}`} value={s.label} maxLength={60} placeholder="e.g. Fabric weight" onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={cn(inputClass, "h-11 w-2/5")} />
                <label htmlFor={`sv-${i}`} className="sr-only">Spec value</label>
                <input id={`sv-${i}`} value={s.value} maxLength={300} placeholder="e.g. 140–160 gsm" onChange={(e) => set("specs", v.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={cn(inputClass, "h-11")} />
                <button type="button" onClick={() => set("specs", v.specs.filter((_, j) => j !== i))} aria-label="Remove spec" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-subtle hover:text-red-300"><X className="h-4 w-4" aria-hidden /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("specs", [...v.specs, { label: "", value: "" }])} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-medium text-muted hover:text-fg">
              <Plus className="h-4 w-4" aria-hidden /> Add spec
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <LinesField id="p-mat" label="Materials" value={v.materials} onChange={(x) => set("materials", x)} />
            <LinesField id="p-cust" label="Customisation options" value={v.customizations} onChange={(x) => set("customizations", x)} />
            <LinesField id="p-feat" label="Key features" value={v.features} onChange={(x) => set("features", x)} />
            <LinesField id="p-sizes" label="Sizes" value={v.sizes} onChange={(x) => set("sizes", x)} hint="One per line, e.g. S" />
            <LinesField id="p-uses" label="Sports / use cases" value={v.useCases} onChange={(x) => set("useCases", x)} hint="Used by the product finder" />
            <LinesField id="p-tags" label="Search tags" value={v.tags} onChange={(x) => set("tags", x)} hint="Words buyers search for" />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Colours</p>
            <div className="flex flex-wrap gap-2">
              {v.colors.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border hairline py-1 pl-1 pr-1.5">
                  <label className="sr-only" htmlFor={`ch-${i}`}>Colour</label>
                  <input id={`ch-${i}`} type="color" value={c.hex} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  <label className="sr-only" htmlFor={`cn-${i}`}>Colour name</label>
                  <input id={`cn-${i}`} value={c.name} maxLength={40} onChange={(e) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="w-24 bg-transparent text-sm outline-none" />
                  <button type="button" onClick={() => set("colors", v.colors.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`} className="text-subtle hover:text-red-300"><X className="h-3.5 w-3.5" aria-hidden /></button>
                </span>
              ))}
              <button type="button" onClick={() => set("colors", [...v.colors, { name: "Black", hex: "#111111" }])} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-medium text-muted hover:text-fg">
                <Plus className="h-4 w-4" aria-hidden /> Add colour
              </button>
            </div>
          </div>
        </Section>

        <Section title="Search engines" hint="Optional — the product name and summary are used when these are empty.">
          <div>
            <Label htmlFor="p-seot" hint={`${v.seoTitle.length}/70`}>SEO title</Label>
            <input id="p-seot" value={v.seoTitle} maxLength={70} placeholder={v.name} onChange={(e) => set("seoTitle", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="p-seod" hint={`${v.seoDesc.length}/170`}>Meta description</Label>
            <textarea id="p-seod" rows={2} maxLength={170} value={v.seoDesc} placeholder={v.summary} onChange={(e) => set("seoDesc", e.target.value)} className={area} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-video" hint="Optional">Video path</Label>
              <input id="p-video" value={v.videoUrl} placeholder="/media/clips/press.mp4" aria-invalid={Boolean(err("videoUrl"))} onChange={(e) => set("videoUrl", e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="p-sheet" hint="Optional">Spec sheet link</Label>
              <input id="p-sheet" value={v.specSheetUrl} placeholder="https://…" aria-invalid={Boolean(err("specSheetUrl"))} onChange={(e) => set("specSheetUrl", e.target.value)} className={inputClass} />
            </div>
          </div>
        </Section>
      </div>

      <aside className="space-y-6">
        <Section title="Visibility">
          <div className="grid grid-cols-3 gap-1.5">
            {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={v.status === s} onClick={() => set("status", s)} className={cn("h-10 rounded-lg border text-sm font-medium", v.status === s ? "border-white bg-white text-ink" : "hairline text-muted")}>
                {s === "ACTIVE" ? "Live" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <p className="text-xs text-subtle">{v.status === "ACTIVE" ? "Visible on the site, in search and to the AI assistant." : v.status === "DRAFT" ? "Hidden — only admins can see it." : "Hidden, kept for order history."}</p>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> Feature on the homepage
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={v.isDemo} onChange={(e) => set("isDemo", e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>Starter content <span className="block text-xs text-subtle">Untick once real photos, prices and lead times are in.</span></span>
          </label>
          <div>
            <Label htmlFor="p-pos" hint="Lower shows first">Sort order</Label>
            <input id="p-pos" inputMode="numeric" value={String(v.position)} onChange={(e) => set("position", Number(e.target.value.replace(/\D/g, "")) || 0)} className={inputClass} />
          </div>
        </Section>
        {id && (
          <Section title="Danger zone">
            {usage && (usage.orders > 0 || usage.leads > 0) && (
              <p className="text-sm text-muted">
                On {usage.orders} order line{usage.orders === 1 ? "" : "s"} and {usage.leads} enquir{usage.leads === 1 ? "y" : "ies"}.
              </p>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const archiving = Boolean(usage?.orders);
                if (!confirm(archiving ? "This product is on existing orders, so it will be archived (hidden) instead of deleted. Continue?" : "Delete this product permanently?")) return;
                start(async () => {
                  const r = await deleteProduct(id);
                  if (r.ok) router.replace("/admin/products");
                  else setMsg({ ok: false, text: r.error });
                });
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-red-400/30 text-sm font-semibold text-red-300 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> {usage?.orders ? "Archive product" : "Delete product"}
            </button>
          </Section>
        )}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-ink-2/95 px-4 py-3 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {msg && (
            <p className={cn("mr-auto line-clamp-2 text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink disabled:opacity-70">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {id ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}
