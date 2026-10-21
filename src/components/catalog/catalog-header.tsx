import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Large outlined eight-point rosette used as a quiet page ornament */
function RosetteOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none" stroke="currentColor">
      <rect x="45" y="45" width="110" height="110" strokeWidth="1.2" />
      <rect x="45" y="45" width="110" height="110" strokeWidth="1.2" transform="rotate(45 100 100)" />
      <rect x="62" y="62" width="76" height="76" strokeWidth=".8" />
      <rect x="62" y="62" width="76" height="76" strokeWidth=".8" transform="rotate(45 100 100)" />
      <circle cx="100" cy="100" r="30" strokeWidth=".8" />
      <circle cx="100" cy="100" r="92" strokeWidth=".8" />
      <circle cx="100" cy="100" r="84" strokeWidth=".5" strokeDasharray="2 5" />
      <rect x="95" y="95" width="10" height="10" fill="currentColor" stroke="none" transform="rotate(45 100 100)" />
    </svg>
  );
}

/**
 * Catalog page heading: eyebrow with a diamond, serif title, book count and a short
 * description of the current section, over a faint girih lattice and a gold rosette.
 */
export function CatalogHeader({
  eyebrow,
  title,
  count,
  intro,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  count: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative isolate overflow-hidden rounded-[22px] border border-line bg-card shadow-card", className)}>
      <div aria-hidden className="nk-girih absolute inset-y-0 right-0 -z-10 w-[70%] bg-gold opacity-[.16] dark:opacity-[.12]" />
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[70%] bg-gradient-to-r from-card via-card/70 to-transparent" />
      <RosetteOutline className="absolute -right-10 top-1/2 -z-10 size-[190px] -translate-y-1/2 text-gold opacity-25 sm:right-6 sm:opacity-60 sm:size-[210px] lg:right-12 lg:size-[230px]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-wine-ink">
          <span className="nk-diamond size-[7px]" aria-hidden />
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="min-w-0 font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.015em] text-ink [overflow-wrap:anywhere] sm:text-[36px] lg:text-[42px]">
            {title}
          </h1>
          <span className="inline-flex items-center rounded-full border border-line bg-card-2 px-2.5 py-1 text-xs font-bold text-ink-2">
            {count}
          </span>
        </div>
        {intro && (
          <p className="mt-3 max-w-[30rem] text-[13.5px] leading-relaxed text-muted sm:max-w-[36rem] sm:text-[15px] lg:max-w-[40rem]">
            {intro}
          </p>
        )}
      </div>
    </header>
  );
}
