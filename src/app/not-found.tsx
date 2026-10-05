import Link from "next/link";

export default function NotFound() {
  return (
    <main className="on-dark grid min-h-svh place-items-center bg-ink px-4 text-white">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="font-display mt-3 text-6xl">Off the grid.</h1>
        <p className="mt-4 text-white/70">That page doesn&apos;t exist — or it moved. Try the catalogue, or tell us what you were looking for.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/products" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink">
            Browse products
          </Link>
          <Link href="/" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/20 px-6 font-semibold">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
