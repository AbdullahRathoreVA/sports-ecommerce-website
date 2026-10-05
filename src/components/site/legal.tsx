export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl pb-28 pt-10 lg:pb-24 lg:pt-14">
      <h1 className="font-display text-[clamp(2.6rem,9vw,4.2rem)]">{title}</h1>
      <p className="mt-3 text-sm text-subtle">Last updated {updated}</p>
      <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </div>
  );
}
