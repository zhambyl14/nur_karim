import Image from "next/image";
import { cn } from "@/lib/utils";
import { coverPalette } from "@/lib/constants";

type CoverSize = "xs" | "sm" | "md" | "lg" | "xl";

const TYPO: Record<CoverSize, { pad: string; inset: string; label: string; title: string; author: string }> = {
  xs: { pad: "p-[7px]", inset: "inset-[4px]", label: "hidden", title: "text-[clamp(5px,11cqw,9px)] leading-[1.15]", author: "hidden" },
  sm: { pad: "px-3 py-3.5", inset: "inset-[6px]", label: "text-[7px]", title: "text-[clamp(11px,10cqw,15px)] leading-[1.18]", author: "text-[9px]" },
  md: { pad: "px-4 py-[18px]", inset: "inset-2", label: "text-[8px]", title: "text-[clamp(13px,10cqw,19px)] leading-[1.18]", author: "text-[10px]" },
  lg: { pad: "px-[22px] py-[26px]", inset: "inset-[10px]", label: "text-[9px]", title: "text-[clamp(17px,10.5cqw,26px)] leading-[1.12]", author: "text-[11px]" },
  xl: { pad: "px-7 py-8", inset: "inset-3", label: "text-[10px]", title: "text-[clamp(20px,10.5cqw,32px)] leading-[1.1]", author: "text-[13px]" },
};

const SIZES_ATTR: Record<CoverSize, string> = {
  xs: "64px",
  sm: "(max-width: 640px) 45vw, 180px",
  md: "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px",
  lg: "(max-width: 640px) 60vw, 320px",
  xl: "(max-width: 640px) 80vw, 420px",
};

/**
 * Book cover: uploaded image, or the typographic cover from the design
 * (palette background, thin inner frame, «NUR KARIM», title in Lora, author).
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
  const typo = TYPO[size];
  return (
    <div
      className={cn(
        "@container relative aspect-[3/4] w-full overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/10",
        rounded && (size === "xs" ? "rounded-[2px_6px_6px_2px]" : "rounded-[4px_9px_9px_4px]"),
        className,
      )}
      style={{
        background: p.bg,
        color: p.fg,
        boxShadow: "inset 6px 0 10px -6px rgba(0,0,0,.35)",
      }}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes={SIZES_ATTR[size]}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className={cn("absolute inset-0 flex flex-col justify-between", typo.pad)}>
          <div className={cn("pointer-events-none absolute border", typo.inset)} style={{ borderColor: p.frame }} />
          <div className={cn("font-sans font-bold tracking-[.24em] opacity-65", typo.label)}>NUR KARIM</div>
          <div className={cn("font-serif font-medium [overflow-wrap:anywhere] [text-wrap:balance]", typo.title)}>{title}</div>
          <div className={cn("truncate font-sans font-medium opacity-65", typo.author)}>{author}</div>
        </div>
      )}
      {/* spine shadow over images too */}
      {coverUrl && <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent" />}
      {ebookBadge && (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/92 px-2 py-1 text-[9px] font-extrabold tracking-[.06em] text-[#7d1a35]">
          {ebookBadge}
        </span>
      )}
      {!!discountPct && discountPct > 0 && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#7d1a35] px-2 py-1 text-[10px] font-extrabold text-white shadow">
          −{discountPct}%
        </span>
      )}
    </div>
  );
}
