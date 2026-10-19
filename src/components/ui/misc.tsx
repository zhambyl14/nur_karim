import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2, Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("nk-skeleton rounded-xl", className)} aria-hidden />;
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-muted", className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      {label && <span className="text-sm font-semibold">{label}</span>}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="relative mb-5 grid size-16 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[14px] bg-wine-soft" aria-hidden />
        <span className="relative text-wine-ink">{icon ?? <span className="nk-diamond" />}</span>
      </div>
      <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Price in Lora with an optional struck-through original price */
export function Price({
  amount,
  original,
  className,
  originalClassName,
}: {
  amount: number | null | undefined;
  original?: number | null;
  className?: string;
  originalClassName?: string;
}) {
  const showOriginal = typeof original === "number" && typeof amount === "number" && original > amount;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={cn("font-serif font-semibold text-ink", showOriginal && "text-wine-ink", className)}>
        {formatPrice(amount)}
      </span>
      {showOriginal && (
        <span className={cn("text-xs font-semibold text-faint line-through", originalClassName)}>
          {formatPrice(original)}
        </span>
      )}
    </span>
  );
}

export function RatingStars({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`${value.toFixed(1)} / 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = rounded >= i ? 1 : rounded >= i - 0.5 ? 0.5 : 0;
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-line-strong" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: fill === 1 ? size : size / 2 }}>
                  <Star className="text-gold" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {typeof count === "number" && <span className="text-xs font-semibold text-muted">({count})</span>}
    </span>
  );
}

export function Avatar({
  name,
  size = 40,
  className,
  tone = "navy",
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  tone?: "navy" | "soft";
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold",
        tone === "navy" ? "border border-white/15 bg-navy-3 text-white" : "bg-chip text-primary dark:text-ink",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Server-friendly pagination built from links */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
  labels,
  className,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  labels: { prev: string; next: string };
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const item = "grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-bold transition";
  return (
    <nav className={cn("flex items-center justify-center gap-1.5", className)} aria-label="pagination">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={cn(item, "border border-line bg-card text-ink hover:bg-subtle")} aria-label={labels.prev}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "border border-line bg-card text-faint opacity-50")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && sorted[i - 1] !== p - 1 && <span className="px-1 text-faint">…</span>}
          {p === page ? (
            <span className={cn(item, "bg-primary text-on-primary")} aria-current="page">
              {p}
            </span>
          ) : (
            <Link href={hrefForPage(p)} className={cn(item, "border border-line bg-card text-ink hover:bg-subtle")}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={cn(item, "border border-line bg-card text-ink hover:bg-subtle")} aria-label={labels.next}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "border border-line bg-card text-faint opacity-50")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

/** Progress bar (gold on navy in «Оқып жатырсыз», navy elsewhere) */
export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-[5px] overflow-hidden rounded-full bg-subtle", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-gold transition-[width] duration-500", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
