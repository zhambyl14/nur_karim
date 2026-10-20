import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthStep = { icon: LucideIcon; title: string; text: string; label: string };

/** Numbered steps with small illustrations (Telegram → contact → password) */
export function AuthSteps({ steps, compact, className }: { steps: AuthStep[]; compact?: boolean; className?: string }) {
  return (
    <ol className={cn("grid gap-3", className)}>
      {steps.map(({ icon: Icon, title, text, label }, index) => (
        <li key={title} className="relative flex gap-4">
          {index < steps.length - 1 && (
            <span aria-hidden className="absolute left-[25px] top-[56px] h-[calc(100%-44px)] w-px bg-line" />
          )}
          <div className="relative grid size-[52px] shrink-0 place-items-center">
            <span aria-hidden className="absolute inset-[6px] rotate-45 rounded-[10px] bg-wine-soft" />
            <Icon className="relative size-5 text-wine-ink" aria-hidden />
            <span
              aria-hidden
              className="absolute -right-1 -top-1 grid size-[22px] place-items-center rounded-full bg-primary text-[11px] font-extrabold text-on-primary ring-2 ring-card"
            >
              {index + 1}
            </span>
          </div>
          <div className={cn("min-w-0 flex-1", compact ? "pb-2" : "pb-3")}>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-warning">{label}</div>
            <h3 className={cn("mt-0.5 text-ink", compact ? "text-sm font-semibold leading-snug" : "text-[15px] font-bold")}>{title}</h3>
            {!compact && <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
