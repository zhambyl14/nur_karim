"use client";

import Link from "next/link";
import { useId } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Field, Input, RadioCard, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { BookPicker } from "@/components/admin/catalog/book-picker";
import type { GenreOption, PickerBook } from "@/components/admin/catalog/types";
import type { DiscountType, FormatScope, PromoScope } from "@/types/app";
import { MAX_FIXED_DISCOUNT } from "./schema";

export type RuleDraft = {
  discount_type: DiscountType;
  discount_value: string;
  scope: PromoScope;
  genre_id: string;
  books: PickerBook[];
  format_scope: FormatScope;
};

/** Parsed discount value or null when the input is empty / not a whole number */
export function parseWhole(value: string): number | null {
  const v = value.replace(/\s/g, "");
  if (!/^\d{1,9}$/.test(v)) return null;
  return Number(v);
}

export function validDiscount(type: DiscountType, value: number | null): value is number {
  if (value === null) return false;
  return type === "percent" ? value >= 1 && value <= 95 : value >= 1 && value <= MAX_FIXED_DISCOUNT;
}

/** Discount type (percent / fixed) and value */
export function DiscountFields({
  value,
  onChange,
  error,
}: {
  value: RuleDraft;
  onChange: (patch: Partial<RuleDraft>) => void;
  error?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const percent = value.discount_type === "percent";
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
      <div className="min-w-0">
        <div className="mb-2 text-[13px] font-bold text-ink-2">{t("admin.promotions.common.discountType")}</div>
        <Segmented<DiscountType>
          ariaLabel={t("admin.promotions.common.discountType")}
          value={value.discount_type}
          onChange={(discount_type) => onChange({ discount_type })}
          options={[
            { value: "percent", label: t("admin.promotions.common.discountTypes.percent") },
            { value: "fixed", label: t("admin.promotions.common.discountTypes.fixed") },
          ]}
        />
        <p className="mt-2 text-xs text-muted">{t(`admin.promotions.common.discountTypesHint.${value.discount_type}`)}</p>
      </div>
      <Field
        label={t("admin.promotions.common.value")}
        htmlFor={`${id}-value`}
        hint={percent ? t("admin.promotions.form.valueHintPercent") : t("admin.promotions.form.valueHintFixed")}
        error={error}
        required
      >
        <Input
          id={`${id}-value`}
          inputMode="numeric"
          autoComplete="off"
          value={value.discount_value}
          maxLength={percent ? 2 : 8}
          invalid={!!error}
          onChange={(e) => onChange({ discount_value: e.target.value.replace(/[^\d]/g, "") })}
          rightSlot={<span className="pr-3 text-sm font-bold text-muted">{percent ? "%" : "₸"}</span>}
          className="font-serif text-lg font-semibold"
        />
      </Field>
    </div>
  );
}

/** Which books (all / genre / chosen books) and which formats */
export function ScopeFields({
  value,
  onChange,
  genres,
  genreError,
  booksError,
}: {
  value: RuleDraft;
  onChange: (patch: Partial<RuleDraft>) => void;
  genres: GenreOption[];
  genreError?: string;
  booksError?: string;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const scopes: PromoScope[] = ["all", "genre", "books"];
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[13px] font-bold text-ink-2">{t("admin.promotions.common.scope")}</legend>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
          {scopes.map((scope) => (
            <RadioCard
              key={scope}
              name={`${id}-scope`}
              value={scope}
              checked={value.scope === scope}
              onChange={() => onChange({ scope })}
              title={t(`admin.promotions.common.scopes.${scope}`)}
              description={t(`admin.promotions.common.scopesHint.${scope}`)}
              className="p-3.5"
            />
          ))}
        </div>
      </fieldset>

      {value.scope === "genre" && (
        <Field
          label={t("admin.promotions.common.genre")}
          htmlFor={`${id}-genre`}
          error={genreError}
          hint={
            <Link href="/admin/genres" className="font-semibold text-wine-ink hover:underline">
              {t("admin.nav.genres")}
            </Link>
          }
          required
        >
          <Select
            id={`${id}-genre`}
            value={value.genre_id}
            invalid={!!genreError}
            onChange={(e) => onChange({ genre_id: e.target.value })}
          >
            <option value="">{t("admin.promotions.common.chooseGenre")}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {locale === "ru" ? g.name_ru : g.name_kk}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {value.scope === "books" && (
        <div>
          <BookPicker value={value.books} onChange={(books) => onChange({ books })} invalid={!!booksError} />
          {booksError && <p className="mt-1.5 text-xs font-semibold text-danger">{booksError}</p>}
        </div>
      )}

      <div>
        <div className="mb-2 text-[13px] font-bold text-ink-2">{t("admin.promotions.common.format")}</div>
        <Segmented<FormatScope>
          ariaLabel={t("admin.promotions.common.format")}
          value={value.format_scope}
          onChange={(format_scope) => onChange({ format_scope })}
          options={[
            { value: "any", label: t("admin.promotions.common.formatsShort.any") },
            { value: "paper", label: t("admin.promotions.common.formatsShort.paper") },
            { value: "ebook", label: t("admin.promotions.common.formatsShort.ebook") },
          ]}
        />
      </div>
    </div>
  );
}
