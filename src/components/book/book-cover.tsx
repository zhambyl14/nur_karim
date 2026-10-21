import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { coverPalette } from "@/lib/constants";

type CoverSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES_ATTR: Record<CoverSize, string> = {
  xs: "64px",
  sm: "(max-width: 640px) 45vw, 180px",
  md: "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px",
  lg: "(max-width: 640px) 60vw, 320px",
  xl: "(max-width: 640px) 80vw, 420px",
};

/**
 * Bookbinding look per palette (cloth gradient, foil colour). Keyed by the palette
 * name from COVER_PALETTES so the admin palette picker keeps working unchanged.
 */
const BINDING: Record<string, { cloth: string; foil: string; foilSoft: string; spine: string; weave: string }> = {
  navy: {
    cloth:
      "radial-gradient(120% 70% at 28% 12%, rgba(64,98,156,.38), transparent 62%), linear-gradient(162deg, #16305a 0%, #10223f 48%, #0a1730 100%)",
    foil: "#d4b06a",
    foilSoft: "rgba(212,176,106,.62)",
    spine: "linear-gradient(90deg, rgba(0,0,0,.42), rgba(0,0,0,.12) 70%, rgba(255,255,255,.07))",
    weave: "rgba(255,255,255,.022)",
  },
  wine: {
    cloth:
      "radial-gradient(120% 70% at 28% 12%, rgba(196,72,104,.34), transparent 62%), linear-gradient(162deg, #8f2240 0%, #7d1a35 48%, #5a1026 100%)",
    foil: "#e5c486",
    foilSoft: "rgba(229,196,134,.6)",
    spine: "linear-gradient(90deg, rgba(0,0,0,.4), rgba(0,0,0,.1) 70%, rgba(255,255,255,.08))",
    weave: "rgba(255,255,255,.025)",
  },
  cream: {
    cloth:
      "radial-gradient(120% 70% at 28% 12%, rgba(255,255,255,.7), transparent 62%), linear-gradient(162deg, #f1eadb 0%, #e7dcc6 52%, #d8c9aa 100%)",
    foil: "#7d1a35",
    foilSoft: "rgba(125,26,53,.5)",
    spine: "linear-gradient(90deg, rgba(60,30,10,.24), rgba(60,30,10,.06) 70%, rgba(255,255,255,.35))",
    weave: "rgba(90,60,20,.03)",
  },
  ink: {
    cloth:
      "radial-gradient(120% 70% at 28% 12%, rgba(120,120,150,.22), transparent 62%), linear-gradient(162deg, #26262f 0%, #18181f 50%, #0f0f14 100%)",
    foil: "#d4b06a",
    foilSoft: "rgba(212,176,106,.6)",
    spine: "linear-gradient(90deg, rgba(0,0,0,.5), rgba(0,0,0,.14) 70%, rgba(255,255,255,.06))",
    weave: "rgba(255,255,255,.02)",
  },
};

/**
 * Title size in container-width units, so the whole cover scales as one piece at every size.
 * Limited by the longest word (no mid-word breaks) and by the total length (fits the frame).
 */
function titleFontSize(title: string, size: CoverSize): string {
  const words = title.trim().split(/\s+/);
  const longest = Math.max(1, ...words.map((w) => w.length));
  const total = Math.max(1, title.trim().length);
  const cap = size === "xs" ? 13 : size === "xl" ? 10.5 : 11.5;
  const byWord = 70 / (0.58 * longest);
  const byLength = Math.sqrt(3800 / total);
  return `${Math.max(6, Math.min(cap, byWord, byLength)).toFixed(2)}cqw`;
}

/** Eight-point star rosette (two squares + rings), drawn in the foil colour */
function Rosette({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" stroke={color}>
      <rect x="9" y="9" width="22" height="22" strokeWidth="1.3" />
      <rect x="9" y="9" width="22" height="22" strokeWidth="1.3" transform="rotate(45 20 20)" />
      <circle cx="20" cy="20" r="7.2" strokeWidth="1" />
      <circle cx="20" cy="20" r="2.4" fill={color} stroke="none" />
      <path d="M20 1.5v3.5M20 35v3.5M1.5 20H5M35 20h3.5" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Book cover: uploaded image, or a typographic cover styled as a cloth-bound book
 * (spine hinge, double foil frame with corner diamonds, faint girih pattern,
 * rosette, title in Lora with balanced lines, author, «NUR KARIM» imprint).
 */
export function BookCover({
  title,
  author,
  coverUrl,
  palette = 0,
  size = "md",
  ebookBadge,
  discountPct,
  priority,
  className,
  rounded = true,
}: {
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  palette?: number | null;
  size?: CoverSize;
  /** text of the badge, e.g. «E-КІТАП»; omit to hide */
  ebookBadge?: string | null;
  discountPct?: number | null;
  priority?: boolean;
  className?: string;
  rounded?: boolean;
}) {
  const p = coverPalette(palette);
  const b = BINDING[p.name] ?? BINDING.navy;
  const tiny = size === "xs";
  const badgeText = "text-[clamp(7px,4.6cqw,11px)] px-[0.75em] py-[0.4em] leading-none";

  return (
    <div
      className={cn(
        "@container relative aspect-[3/4] w-full overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/10",
        rounded && (tiny ? "rounded-[2px_5px_5px_2px]" : "rounded-[3px_8px_8px_3px]"),
        className,
      )}
      style={{ background: coverUrl ? p.bg : b.cloth, color: p.fg }}
    >
      {coverUrl ? (
        <Image src={coverUrl} alt={title} fill sizes={SIZES_ATTR[size]} priority={priority} className="object-cover" />
      ) : (
        <>
          {/* cloth weave */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, ${b.weave} 0 1px, transparent 1px 2px), repeating-linear-gradient(90deg, ${b.weave} 0 1px, transparent 1px 2px)`,
            }}
          />
          {/* faint embossed girih lattice inside the frame */}
          <div
            aria-hidden
            className="nk-cover-girih pointer-events-none absolute left-[14cqw] right-[9cqw] top-[9cqw] bottom-[9cqw] opacity-[.085]"
            style={{ backgroundColor: b.foil }}
          />
          {/* double foil frame with corner diamonds */}
          <svg
            aria-hidden
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            fill="none"
          >
            <rect x="33" y="18" width="249" height="364" stroke={b.foilSoft} strokeWidth={tiny ? 0.6 : 1} vectorEffect="non-scaling-stroke" />
            {!tiny && (
              <rect x="40" y="25" width="235" height="350" stroke={b.foilSoft} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            )}
            {!tiny &&
              [
                [33, 18],
                [282, 18],
                [33, 382],
                [282, 382],
              ].map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" fill={b.foil} transform={`rotate(45 ${x} ${y})`} />
              ))}
          </svg>
          {/* spine and hinge groove */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[7.5cqw]" style={{ background: b.spine }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[7.5cqw] w-px bg-black/20" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[calc(7.5cqw+1px)] w-px bg-white/10" />

          <div
            className={cn(
              "absolute flex flex-col items-center text-center",
              "left-[15cqw] right-[10cqw] top-[10cqw] bottom-[9cqw]",
            )}
          >
            <Rosette className={cn("shrink-0", tiny ? "mt-[3cqw] w-[15cqw]" : "mt-[4cqw] w-[13cqw]")} color={b.foil} />
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center py-[4cqw]">
              <div
                className={cn(
                  "font-serif font-semibold leading-[1.16] tracking-[-0.005em] [overflow-wrap:break-word] [text-wrap:balance]",
                  tiny ? "line-clamp-4" : "line-clamp-7",
                )}
                style={{ fontSize: titleFontSize(title, size) } as CSSProperties}
              >
                {title}
              </div>
              {!tiny && (
                <>
                  <div aria-hidden className="mt-[5cqw] flex w-[38cqw] items-center gap-[2cqw]" style={{ color: b.foil }}>
                    <span className="h-px flex-1 bg-current opacity-70" />
                    <span className="size-[2.6cqw] rotate-45 bg-current" />
                    <span className="h-px flex-1 bg-current opacity-70" />
                  </div>
                  {author && (
                    <div className="mt-[4.5cqw] line-clamp-2 font-sans text-[clamp(7px,5cqw,15px)] font-semibold leading-[1.3] tracking-[.02em] opacity-80">
                      {author}
                    </div>
                  )}
                </>
              )}
            </div>
            {!tiny && (
              <div
                className="shrink-0 font-sans text-[clamp(5.5px,3.3cqw,11px)] font-bold tracking-[.32em] opacity-75"
                style={{ color: b.foil }}
              >
                NUR KARIM
              </div>
            )}
          </div>
        </>
      )}
      {/* spine shadow and soft sheen over photos too */}
      {coverUrl && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[6cqw] bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-[6cqw] w-px bg-white/15" />
        </>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(115deg, rgba(255,255,255,.09) 0%, transparent 32%, transparent 70%, rgba(0,0,0,.12) 100%)" }}
      />
      {ebookBadge && !tiny && (
        <span
          className={cn(
            "absolute right-[6%] top-[5%] rounded-full bg-white/95 font-extrabold tracking-[.06em] text-[#7d1a35] shadow-sm",
            badgeText,
          )}
        >
          {ebookBadge}
        </span>
      )}
      {!!discountPct && discountPct > 0 && (
        <span className="absolute left-[10%] top-[5%] rounded-full bg-[#7d1a35] px-[0.7em] py-[0.4em] text-[clamp(7px,5cqw,12px)] font-extrabold leading-none text-white shadow ring-1 ring-white/20">
          −{discountPct}%
        </span>
      )}
    </div>
  );
}
