/**
 * Instant response while a server-rendered page (products, contact, quote…)
 * is on its way: the dark hero band and a content skeleton appear the moment
 * a link is clicked, so the site never looks frozen.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="on-dark relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)]">
        <div className="loading-bar absolute inset-x-0 top-0 h-0.5" aria-hidden />
        <div className="container-x py-14 lg:py-20">
          <div className="skeleton h-3 w-40 rounded" />
          <div className="skeleton mt-6 h-12 w-3/4 max-w-xl rounded-md lg:h-16" />
          <div className="skeleton mt-4 h-4 w-2/3 max-w-md rounded" />
        </div>
      </div>
      <div className="container-x grid grid-cols-2 gap-4 py-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-card)] border hairline bg-surface">
            <div className="skeleton-light aspect-square" />
            <div className="space-y-2 p-4">
              <div className="skeleton-light h-3 w-1/2 rounded" />
              <div className="skeleton-light h-4 w-4/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
