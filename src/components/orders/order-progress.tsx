import { Check } from "lucide-react";
import { ORDER_FLOW_DIGITAL, ORDER_FLOW_PAPER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/app";

/** Index of the current step in the client flow (-1 for cancelled) */
export function progressStep(status: OrderStatus, hasPaper: boolean): { flow: OrderStatus[]; index: number } {
  const flow = hasPaper ? ORDER_FLOW_PAPER : ORDER_FLOW_DIGITAL;
  let index = flow.indexOf(status);
  if (index < 0 && status === "paid") index = flow.length - 2; // digital orders jump paid → delivered
  if (status === "cancelled") index = -1;
  return { flow, index };
}

/** Big tracker on the order page */
export function OrderProgress({
  status,
  hasPaper,
  labels,
  ariaLabel,
}: {
  status: OrderStatus;
  hasPaper: boolean;
  labels: Record<OrderStatus, string>;
  ariaLabel: string;
}) {
  const { flow, index } = progressStep(status, hasPaper);
  return (
    <ol aria-label={ariaLabel} className="flex items-start">
      {flow.map((step, i) => {
        const done = i < index || (i === index && step === "delivered");
        const current = i === index && !done;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute right-1/2 top-[13px] h-[3px] w-full -translate-y-1/2 rounded-full",
                  i <= index ? "bg-primary" : "bg-line",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-[26px] place-items-center rounded-full border-2 text-[11px] font-extrabold",
                done
                  ? "border-primary bg-primary text-on-primary"
                  : current
                    ? "border-wine bg-card text-wine-ink ring-4 ring-wine/15"
                    : "border-line bg-card text-faint",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "mt-2 px-0.5 text-[10.5px] font-bold leading-tight sm:text-xs",
                current ? "text-wine-ink" : done ? "text-ink" : "text-faint",
              )}
            >
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact 3-segment bar from the design's order card */
export function OrderMiniBar({ status, hasPaper }: { status: OrderStatus; hasPaper: boolean }) {
  const { flow, index } = progressStep(status, hasPaper);
  const ratio = index < 0 ? 0 : (index + (status === "delivered" ? 1 : 0.5)) / flow.length;
  const filled = status === "cancelled" ? 0 : Math.max(1, Math.round(ratio * 3));
  return (
    <div className="flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full",
            i < filled ? (status === "delivered" ? "bg-success" : "bg-primary") : "bg-line",
          )}
        />
      ))}
    </div>
  );
}
