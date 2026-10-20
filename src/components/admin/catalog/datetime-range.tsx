"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Field, Input } from "@/components/ui/field";
import { ChipButton } from "@/components/ui/chip";
import { fromAlmatyInput, toAlmatyInput } from "./schedule";

export type DateRangeValue = { start: string; end: string };

/** Client-side check of a datetime range; returns the error message key or null */
export function dateRangeError(value: DateRangeValue): "invalid" | "endBeforeStart" | null {
  const start = fromAlmatyInput(value.start);
  const end = fromAlmatyInput(value.end);
  if (start === undefined || end === undefined) return "invalid";
  if (start && end && new Date(end) <= new Date(start)) return "endBeforeStart";
  return null;
}

/**
 * Start / end datetime inputs in Asia/Almaty (UTC+5). Values are
 * "YYYY-MM-DDTHH:mm" strings; empty start = immediately, empty end = no end.
 */
export function DateTimeRange({
  value,
  onChange,
  error,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** server-side error (already translated) */
  error?: string | null;
}) {
  const { t } = useI18n();
  const id = useId();
  const localError = dateRangeError(value);
  const endError =
    localError === "endBeforeStart"
      ? t("admin.books.widgets.dates.endBeforeStart")
      : localError === "invalid"
        ? t("admin.books.widgets.dates.invalid")
        : error;

  const preset = (days: number) => {
    const startIso = fromAlmatyInput(value.start) ?? new Date().toISOString();
    const startDate = new Date(startIso);
    if (!value.start) startDate.setUTCMinutes(0, 0, 0);
    const end = new Date(startDate.getTime() + days * 86_400_000);
    onChange({ start: value.start || toAlmatyInput(startDate.toISOString()), end: toAlmatyInput(end.toISOString()) });
  };

  const clearButton = (field: keyof DateRangeValue) =>
    value[field] ? (
      <button
        type="button"
        onClick={() => onChange({ ...value, [field]: "" })}
        className="grid size-9 place-items-center rounded-lg text-faint transition hover:bg-subtle hover:text-ink"
        aria-label={`${t("admin.books.widgets.dates.clear")}: ${
          field === "start" ? t("admin.books.widgets.dates.start") : t("admin.books.widgets.dates.end")
        }`}
      >
        <X className="size-4" />
      </button>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("admin.books.widgets.dates.start")}
          htmlFor={`${id}-start`}
          hint={t("admin.books.widgets.dates.noStart")}
        >
          <Input
            id={`${id}-start`}
            type="datetime-local"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            rightSlot={clearButton("start")}
            invalid={localError === "invalid" && !!value.start}
          />
        </Field>
        <Field
          label={t("admin.books.widgets.dates.end")}
          htmlFor={`${id}-end`}
          hint={t("admin.books.widgets.dates.noEnd")}
          error={endError}
        >
          <Input
            id={`${id}-end`}
            type="datetime-local"
            value={value.end}
            min={value.start || undefined}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            rightSlot={clearButton("end")}
            invalid={!!endError}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">{t("admin.books.widgets.dates.presetsLabel")}:</span>
        <ChipButton size="sm" onClick={() => preset(7)}>
          {t("admin.books.widgets.dates.presetWeek")}
        </ChipButton>
        <ChipButton size="sm" onClick={() => preset(14)}>
          {t("admin.books.widgets.dates.presetTwoWeeks")}
        </ChipButton>
        <ChipButton size="sm" onClick={() => preset(30)}>
          {t("admin.books.widgets.dates.presetMonth")}
        </ChipButton>
      </div>
      <p className="text-xs text-faint">{t("admin.books.widgets.dates.timezone")}</p>
    </div>
  );
}
