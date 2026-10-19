import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_TONE } from "@/lib/constants";
import type { OrderStatus } from "@/types/app";

export type BadgeTone =
  | "neutral"
  | "wine"
  | "violet"
  | "gold"
  | "info"
  | "success"
  | "danger"
  | "navy"
  | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-chip text-ink-2",
  wine: "bg-wine-soft text-wine-ink",
  violet: "bg-violet-soft text-violet",
  gold: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  navy: "bg-primary text-on-primary",
  outline: "border border-line text-muted",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({
  status,
  label,
  className,
}: {
  status: OrderStatus;
  label: string;
  className?: string;
}) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} className={className}>
      {label}
    </Badge>
  );
}

/** Small counter bubble for nav items */
export function CountBubble({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1.5 text-[10.5px] font-extrabold leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
