"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Uploaded = { id: string; url: string; width: number | null; height: number | null };

/**
 * Uploads images to /api/admin/upload. Large photos are downscaled in the
 * browser first (max 2000px, WebP) so phone photos from the factory floor
 * upload quickly and fit the 4 MB limit.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export function ImageUploader({ onUploaded, label = "Upload photos", multiple = true, className }: { onUploaded: (u: Uploaded, file: File) => void | Promise<void>; label?: string; multiple?: boolean; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, 12);
    setBusy(list.length);
    for (const original of list) {
      try {
        const file = await prepareImage(original);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        await onUploaded(data as Uploaded, original);
      } catch (e) {
        setError(`${original.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className={className}>
      <label
        className={cn(
          "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/12 p-4 text-center text-sm transition-colors hover:border-accent",
          busy > 0 && "pointer-events-none opacity-70",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handle(e.dataTransfer.files);
        }}
      >
        {busy > 0 ? <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden /> : <ImageUp className="h-6 w-6 text-accent" aria-hidden />}
        <span className="font-semibold">{busy > 0 ? `Uploading ${busy}…` : label}</span>
        <span className="text-xs text-subtle">JPG, PNG or WebP · drag & drop or tap · resized automatically</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} className="sr-only" onChange={(e) => void handle(e.target.files)} />
      </label>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
}
