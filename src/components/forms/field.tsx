import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-[var(--radius-control)] border border-white/12 bg-surface px-3.5 text-[16px] text-fg outline-none transition-colors placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-fg">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Choice({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border px-3.5 py-2 text-[15px] transition-colors",
        checked ? "border-accent bg-accent/10 text-fg" : "border-white/12 bg-surface hover:border-white/35",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="h-4 w-4 accent-[var(--color-accent)]" />
      {children}
    </label>
  );
}
