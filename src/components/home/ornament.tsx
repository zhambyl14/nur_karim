import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Outline of an 8-point star (two overlapping squares) in a 0..100 box */
const STAR_POINTS = Array.from({ length: 16 }, (_, i) => {
  const angle = (Math.PI / 8) * i - Math.PI / 2;
  const radius = i % 2 === 0 ? 48 : 48 * 0.7654;
  return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/** Thin 8-point star frame (stroke = currentColor), used behind genre icons and numbers */
export function Octagram({ className, strokeWidth = 2.2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("pointer-events-none", className)} aria-hidden fill="none">
      <polygon points={STAR_POINTS} stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
      <rect x="21" y="21" width="58" height="58" stroke="currentColor" strokeWidth={strokeWidth * 0.5} opacity=".45" transform="rotate(45 50 50)" />
    </svg>
  );
}

/** Pointed (mihrab) arch drawn with two gold hairlines, used behind the hero covers */
export function ArchOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 400" className={cn("pointer-events-none", className)} aria-hidden fill="none" preserveAspectRatio="xMidYMax meet">
      <path d="M14 400V178C14 98 82 44 150 8c68 36 136 90 136 170v222" stroke="currentColor" strokeWidth="1.2" />
      <path d="M34 400V184c0-68 56-114 116-146 60 32 116 78 116 146v216" stroke="currentColor" strokeWidth=".8" opacity=".55" />
      <path d="M150 8v-8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Small diamond divider: line ◆ line */
export function DiamondRule({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)} aria-hidden>
      <span className="h-px flex-1 bg-current opacity-40" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current opacity-40" />
    </span>
  );
}

/** Eyebrow label with a gold hairline (as in the design: «— ХАДИС») */
export function Eyebrow({ children, className, tone = "page" }: { children: ReactNode; className?: string; tone?: "page" | "navy" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="h-px w-7 bg-gold" aria-hidden />
      <span
        className={cn(
          "text-[11px] font-bold uppercase tracking-[.2em]",
          tone === "navy" ? "text-gold" : "text-wine-ink",
        )}
      >
        {children}
      </span>
    </div>
  );
}
