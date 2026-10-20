"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

/** Card section of an admin form: title, optional description and action */
export function FormSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-[18px] border border-line bg-card p-4 sm:p-[22px]", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * Save bar: fixed above the admin phone tab bar, sticky at the bottom of the
 * form column on laptops. Pages using it add `pb-24 lg:pb-0` to their form.
 */
export function SaveBar({
  status,
  children,
}: {
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 border-t border-line bg-card/95 px-4 py-2.5 backdrop-blur-md",
        "bottom-[calc(46px+max(12px,env(safe-area-inset-bottom)))]",
        "lg:sticky lg:bottom-4 lg:mt-6 lg:rounded-[18px] lg:border lg:px-5 lg:py-3 lg:shadow-lift",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-xs font-semibold text-muted sm:text-[13px]">{status}</div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

/** Up / down buttons for manual ordering */
export function OrderButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
  upLabel,
  downLabel,
  disabled,
}: {
  onUp: () => void;
  onDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  upLabel: string;
  downLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Button variant="outline" size="icon-sm" className="h-7 w-8" onClick={onUp} disabled={disabled || disableUp} aria-label={upLabel}>
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        className="h-7 w-8"
        onClick={onDown}
        disabled={disabled || disableDown}
        aria-label={downLabel}
      >
        <ArrowDown className="size-3.5" />
      </Button>
    </div>
  );
}

/** Character counter shown under textareas */
export function Counter({ value, max }: { value: string; max: number }) {
  const { t } = useI18n();
  const over = value.length > max;
  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", over ? "text-danger" : "text-faint")}>
      {t("admin.books.form.counter", { count: value.length, max })}
    </span>
  );
}
