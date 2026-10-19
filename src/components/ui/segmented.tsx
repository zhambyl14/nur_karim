"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  sublabel?: ReactNode;
  disabled?: boolean;
};

/** Segmented control from the design (format switch, tabs on «Менің кітаптарым») */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("grid gap-1 rounded-[14px] bg-subtle p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[10px] text-left transition disabled:cursor-not-allowed disabled:opacity-45",
              size === "sm" ? "px-3 py-2 text-center text-[13px]" : "px-3 py-2.5",
              active ? "bg-card text-ink shadow-[0_2px_6px_rgb(16_34_63/0.08)]" : "text-muted hover:text-ink",
            )}
          >
            <span className={cn("block font-bold", size === "sm" ? "text-[13px]" : "text-[13px]")}>{option.label}</span>
            {option.sublabel && (
              <span className={cn("mt-0.5 block text-xs font-semibold", active ? "text-muted" : "text-faint")}>
                {option.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
