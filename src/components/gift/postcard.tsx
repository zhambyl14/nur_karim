import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { GiftCardTheme } from "@/types/app";
import { POSTCARD_THEMES, type Ornament } from "./themes";

/**
 * Gift postcard («ашықхат»). Like the typographic book covers it is an
 * illustration with a fixed brand palette, identical in light and dark mode.
 * Pure markup (no hooks), so it renders in Server and Client Components.
 */
export function Postcard({
  theme,
  headline,
  to,
  message,
  placeholder,
  from,
  ariaLabel,
  size = "md",
  className,
  children,
}: {
  theme: GiftCardTheme;
  /** e.g. «Туған күніңмен!» */
  headline: string;
  /** e.g. «Құрметті Әлия» */
  to?: string | null;
  message?: string | null;
  /** shown in a muted style when there is no message yet */
  placeholder?: string;
  /** e.g. «Сыйлаушы: Айдана» or «Жасырын дос» */
  from?: string | null;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  const p = POSTCARD_THEMES[theme] ?? POSTCARD_THEMES.classic;
  const style = {
    background: p.bg,
    color: p.fg,
    "--pc-accent": p.accent,
    "--pc-muted": p.muted,
    "--pc-frame": p.frame,
  } as CSSProperties;
  const text = message?.trim();

  return (
    <figure
      role="img"
      aria-label={ariaLabel}
      style={style}
      className={cn(
        "relative isolate overflow-hidden rounded-[22px] shadow-[0_18px_40px_rgb(11_24_48/0.22)]",
        size === "sm" ? "aspect-[4/3] p-4" : size === "md" ? "p-6 sm:p-7" : "p-7 sm:p-10",
        className,
      )}
    >
      <OrnamentLayer ornament={p.ornament} />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute rounded-[16px] border",
          size === "sm" ? "inset-2" : "inset-3",
        )}
        style={{ borderColor: "var(--pc-frame)" }}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span
            className="text-[9px] font-extrabold uppercase tracking-[0.28em]"
            style={{ color: "var(--pc-accent)" }}
          >
            Nur Karim
          </span>
          <span className={cn("leading-none", size === "sm" ? "text-xl sm:text-2xl" : "text-4xl sm:text-5xl")} aria-hidden>
            {p.emoji}
          </span>
        </div>
        <div
          className={cn(
            "font-serif font-semibold leading-[1.12] tracking-[-0.01em]",
            size === "sm" ? "mt-1 line-clamp-3 shrink-0 text-[13.5px] sm:text-[17px]" : size === "md" ? "mt-3 text-[26px] sm:text-[30px]" : "mt-4 text-[30px] sm:text-[40px]",
          )}
        >
          {headline}
        </div>
        <div className={cn("flex items-center gap-2", size === "sm" ? "my-2 sm:my-3" : "my-3")} aria-hidden>
          <span className="h-px w-10" style={{ background: "var(--pc-accent)" }} />
          <span className="size-1.5 rotate-45" style={{ background: "var(--pc-accent)" }} />
          <span className="h-px flex-1 opacity-40" style={{ background: "var(--pc-accent)" }} />
        </div>
        {size !== "sm" && (
          <>
            {to && <div className="text-sm font-bold">{to}</div>}
            <p
              className={cn(
                "mt-2 whitespace-pre-line break-words font-serif italic leading-relaxed",
                size === "lg" ? "text-[17px] sm:text-[19px]" : "text-[15px] sm:text-base",
              )}
              style={text ? undefined : { color: "var(--pc-muted)" }}
            >
              {text || placeholder}
            </p>
            {from && (
              <div className="mt-5 text-right text-[13px] font-semibold" style={{ color: "var(--pc-muted)" }}>
                — {from}
              </div>
            )}
          </>
        )}
        {children}
      </div>
    </figure>
  );
}

/** Small decorative SVG per theme (corner illustration) */
function OrnamentLayer({ ornament }: { ornament: Ornament }) {
  const common = "pointer-events-none absolute -z-10";
  switch (ornament) {
    case "frame":
      return (
        <svg aria-hidden className={cn(common, "-right-10 -top-10 size-48 opacity-30")} viewBox="0 0 100 100">
          <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" fill="none" stroke="var(--pc-accent)" strokeWidth="1" />
          <rect x="32" y="32" width="36" height="36" transform="rotate(45 50 50)" fill="var(--pc-accent)" opacity=".35" />
        </svg>
      );
    case "confetti":
      return (
        <svg aria-hidden className={cn(common, "inset-0 size-full opacity-60")} viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
          {[
            [160, 18, 0],
            [180, 44, 30],
            [140, 34, 60],
            [24, 120, 20],
            [186, 110, 80],
            [120, 12, 45],
            [12, 20, 10],
          ].map(([x, y, r], i) => (
            <rect key={i} x={x} y={y} width="6" height="3" rx="1" transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? "var(--pc-accent)" : "#ffffff"} opacity={i % 2 ? 0.9 : 0.5} />
          ))}
          <circle cx="170" cy="76" r="2.4" fill="var(--pc-accent)" />
          <circle cx="40" cy="104" r="2" fill="#ffffff" opacity=".5" />
        </svg>
      );
    case "petals":
      return (
        <svg aria-hidden className={cn(common, "-bottom-6 -right-6 size-40 opacity-35")} viewBox="0 0 100 100">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="50" cy="30" rx="10" ry="20" fill="var(--pc-accent)" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="6" fill="var(--pc-accent)" />
        </svg>
      );
    case "stars":
      return (
        <svg aria-hidden className={cn(common, "inset-0 size-full opacity-70")} viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice">
          {[
            [168, 26, 5],
            [150, 60, 3],
            [186, 92, 4],
            [30, 118, 3],
            [120, 18, 2.5],
          ].map(([x, y, s], i) => (
            <path
              key={i}
              d={`M${x} ${y - s * 2} L${x + s / 2} ${y - s / 2} L${x + s * 2} ${y} L${x + s / 2} ${y + s / 2} L${x} ${y + s * 2} L${x - s / 2} ${y + s / 2} L${x - s * 2} ${y} L${x - s / 2} ${y - s / 2} Z`}
              fill="var(--pc-accent)"
            />
          ))}
        </svg>
      );
    case "crescent":
      return (
        <svg aria-hidden className={cn(common, "-right-4 -top-4 size-40 opacity-40")} viewBox="0 0 100 100">
          <path d="M62 18a32 32 0 1 0 20 52A26 26 0 1 1 62 18Z" fill="var(--pc-accent)" />
          <circle cx="30" cy="22" r="1.6" fill="var(--pc-accent)" />
          <circle cx="18" cy="48" r="1.2" fill="var(--pc-accent)" />
          <circle cx="44" cy="10" r="1" fill="var(--pc-accent)" />
        </svg>
      );
    case "books":
      return (
        <svg aria-hidden className={cn(common, "-bottom-2 -right-2 size-36 opacity-30")} viewBox="0 0 100 100">
          <rect x="18" y="40" width="14" height="52" rx="2" fill="var(--pc-accent)" />
          <rect x="36" y="28" width="12" height="64" rx="2" fill="currentColor" opacity=".7" />
          <rect x="52" y="36" width="16" height="56" rx="2" fill="var(--pc-accent)" opacity=".7" />
          <rect x="70" y="30" width="12" height="62" rx="2" transform="rotate(12 76 61)" fill="currentColor" opacity=".5" />
        </svg>
      );
    case "hearts":
      return (
        <svg aria-hidden className={cn(common, "-right-3 -top-3 size-40 opacity-30")} viewBox="0 0 100 100">
          <path d="M50 82 20 52a17 17 0 0 1 30-22 17 17 0 0 1 30 22Z" fill="var(--pc-accent)" />
          <path d="M22 26 14 18a5 5 0 0 1 8-6 5 5 0 0 1 8 6Z" fill="var(--pc-accent)" opacity=".7" />
        </svg>
      );
    case "leaves":
      return (
        <svg aria-hidden className={cn(common, "-bottom-4 -right-4 size-44 opacity-35")} viewBox="0 0 100 100">
          <path d="M20 90C30 50 60 30 92 22 84 56 60 82 20 90Z" fill="none" stroke="var(--pc-accent)" strokeWidth="1.5" />
          <path d="M20 90 92 22" stroke="var(--pc-accent)" strokeWidth="1" />
          {[30, 45, 60, 75].map((x) => (
            <path key={x} d={`M${x} ${100 - x * 0.95} l8 -2`} stroke="var(--pc-accent)" strokeWidth="1" />
          ))}
        </svg>
      );
  }
}
