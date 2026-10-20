"use client";

import { useId, useState } from "react";
import { BadgePercent, Check, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { QuotePromo } from "@/types/app";

/**
 * «Промокод — Қолдану» box from the design. The code is validated only by
 * quote_cart: this component shows the result of the current quote.
 */
export function PromoField({
  code,
  promo,
  checking,
  onApply,
  onRemove,
  className,
}: {
  /** currently applied code ("" = none) */
  code: string;
  /** promo part of the latest quote */
  promo: QuotePromo | null | undefined;
  checking: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
  className?: string;
}) {
  const { t, te } = useI18n();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  if (code) {
    const result = promo && promo.code === code.toUpperCase() ? promo : null;
    const valid = result?.valid === true;
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-[14px] border px-4 py-3.5",
          valid ? "border-success/30 bg-success-soft" : result ? "border-danger/30 bg-danger-soft" : "border-line bg-card",
          className,
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
            valid ? "bg-success text-white dark:text-page" : result ? "bg-danger text-white dark:text-page" : "bg-subtle text-muted",
          )}
          aria-hidden
        >
          {checking || !result ? (
            <Loader2 className="size-4 animate-spin" />
          ) : valid ? (
            <Check className="size-4" />
          ) : (
            <X className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-ink">
            {checking || !result
              ? t("cart.promo.checking")
              : valid
                ? t("cart.promo.applied", { code: result.code })
                : t("cart.promo.invalid", { code: result.code })}
          </div>
          {result && !checking && (
            <div className={cn("mt-0.5 text-[13px] font-semibold", valid ? "text-success" : "text-danger")}>
              {result.valid
                ? `${result.discount_type === "percent" ? `${t("cart.promo.percent", { value: result.discount_value })} · ` : ""}${t("cart.promo.saved", { amount: formatPrice(result.discount) })}`
                : te(result.error, { amount: formatNumber(result.min_order_amount ?? 0) })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("cart.promo.remove")}
          className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-card hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[14px] border border-dashed border-line-strong px-4 py-3.5 text-[13px] font-semibold text-muted transition hover:border-wine-line hover:bg-card",
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <BadgePercent className="size-4 text-faint" aria-hidden />
          {t("cart.promo.label")}
        </span>
        <span className="font-bold text-wine-ink">{t("cart.promo.apply")}</span>
      </button>
    );
  }

  return (
    <form
      className={cn("rounded-[14px] border border-dashed border-line-strong bg-card p-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const value = draft.trim();
        if (value) onApply(value);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("cart.promo.inputLabel")}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          placeholder={t("cart.promo.placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="h-11 flex-1 uppercase tracking-wide"
        />
        <Button type="submit" variant="ink" className="h-11" disabled={!draft.trim()}>
          {t("cart.promo.apply")}
        </Button>
      </div>
    </form>
  );
}
