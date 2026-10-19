import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipStyle = {
  active?: boolean;
  /** bordeaux tint with a diamond (used for «Электронды кітаптар») */
  accent?: boolean;
  size?: "sm" | "md";
  className?: string;
};

function chipClass({ active, accent, size = "md", className }: ChipStyle) {
  return cn(
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full font-semibold transition",
    size === "sm" ? "px-3.5 py-2 text-xs" : "px-4 py-2.5 text-[13px]",
    accent
      ? cn("bg-wine-soft font-bold text-wine-ink", active && "ring-2 ring-wine/40")
      : active
        ? "bg-primary text-on-primary"
        : "border border-line bg-card text-ink-2 hover:border-line-strong hover:text-ink",
    className,
  );
}

export function ChipLink({
  href,
  children,
  scroll = false,
  ...style
}: ChipStyle & { href: string; children: ReactNode; scroll?: boolean }) {
  return (
    <Link href={href} scroll={scroll} className={chipClass(style)} aria-current={style.active ? "page" : undefined}>
      {style.accent && <span className="nk-diamond size-[7px]" aria-hidden />}
      {children}
    </Link>
  );
}

export function ChipButton({
  onClick,
  children,
  ...style
}: ChipStyle & { onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={chipClass(style)} aria-pressed={style.active}>
      {style.accent && <span className="nk-diamond size-[7px]" aria-hidden />}
      {children}
    </button>
  );
}
