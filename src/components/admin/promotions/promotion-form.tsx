"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { confirmDialog } from "@/components/ui/interactive";
import { FormSection, SaveBar } from "@/components/admin/catalog/form-parts";
import { DateTimeRange, dateRangeError, type DateRangeValue } from "@/components/admin/catalog/datetime-range";
import { fromAlmatyInput } from "@/components/admin/catalog/schedule";
import { SCHEDULE_TONE, scheduleStatus } from "@/components/admin/catalog/schedule";
import type { PromotionRule } from "@/components/admin/catalog/pricing";
import type { GenreOption } from "@/components/admin/catalog/types";
import { deletePromotion, savePromotion } from "@/app/admin/promotions/actions";
import { DiscountFields, ScopeFields, parseWhole, validDiscount, type RuleDraft } from "./rule-fields";
import { PromotionPreview } from "./promotion-preview";

export type PromotionFormValues = RuleDraft & {
  title_kk: string;
  title_ru: string;
  dates: DateRangeValue;
  is_active: boolean;
};

export function PromotionForm({
  promotionId,
  initial,
  genres,
  otherRules,
}: {
  promotionId: string | null;
  initial: PromotionFormValues;
  genres: GenreOption[];
  otherRules: PromotionRule[];
}) {
  const { t, dict, te } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const fieldText = (code?: string) =>
    code ? ((dict.admin.promotions.validation as Record<string, string>)[code] ?? te(code)) : undefined;
  const errorText = (code: string) => (dict.admin.promotions.errors as Record<string, string>)[code] ?? te(code);

  const set = (patch: Partial<PromotionFormValues>) => {
    setValue((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key === "books" ? "book_ids" : key === "discount_type" ? "discount_value" : key];
      if ("dates" in patch) delete next.ends_at;
      return next;
    });
  };

  const discount = parseWhole(value.discount_value);
  const startsAt = fromAlmatyInput(value.dates.start);
  const endsAt = fromAlmatyInput(value.dates.end);
  const status =
    startsAt === undefined || endsAt === undefined
      ? null
      : scheduleStatus({ is_active: value.is_active, starts_at: startsAt, ends_at: endsAt });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!value.title_kk.trim()) local.title_kk = "REQUIRED";
    if (!validDiscount(value.discount_type, discount)) {
      local.discount_value = value.discount_type === "percent" ? "VALUE_PERCENT" : "VALUE_FIXED";
    }
    if (value.scope === "genre" && !value.genre_id) local.genre_id = "GENRE_REQUIRED";
    if (value.scope === "books" && value.books.length === 0) local.book_ids = "BOOKS_REQUIRED";
    if (dateRangeError(value.dates)) local.ends_at = "DATE_INVALID";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error(errorText("VALIDATION"));
      return;
    }
    startTransition(async () => {
      const result = await savePromotion(promotionId, {
        title_kk: value.title_kk,
        title_ru: value.title_ru,
        discount_type: value.discount_type,
        discount_value: discount ?? 0,
        scope: value.scope,
        genre_id: value.scope === "genre" ? value.genre_id || null : null,
        book_ids: value.scope === "books" ? value.books.map((b) => b.id) : [],
        format_scope: value.format_scope,
        starts_at: startsAt ?? null,
        ends_at: endsAt ?? null,
        is_active: value.is_active,
      }).catch(() => null);
      if (!result) return void toast.error(errorText("generic"));
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(errorText(result.error));
        return;
      }
      toast.success(promotionId ? t("admin.promotions.toasts.saved") : t("admin.promotions.toasts.created"));
      router.push("/admin/promotions");
      router.refresh();
    });
  };

  const remove = async () => {
    if (!promotionId) return;
    const ok = await confirmDialog({
      title: t("admin.promotions.confirmDelete.title"),
      text: t("admin.promotions.confirmDelete.text", { title: value.title_kk || t("admin.promotions.untitled") }),
      confirmText: t("admin.promotions.confirmDelete.confirm"),
      danger: true,
    });
    if (!ok) return;
    startDelete(async () => {
      const result = await deletePromotion(promotionId).catch(() => null);
      if (!result?.ok) return void toast.error(errorText(result?.error ?? "generic"));
      toast.success(t("admin.promotions.toasts.deleted"));
      router.push("/admin/promotions");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="pb-24 lg:pb-0">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          <FormSection title={t("admin.promotions.form.sections.name")} description={t("admin.promotions.form.titleHint")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("admin.promotions.form.titleKk")} htmlFor="promo-title-kk" error={fieldText(errors.title_kk)} required>
                <Input
                  id="promo-title-kk"
                  value={value.title_kk}
                  maxLength={120}
                  placeholder={t("admin.promotions.form.titleKkPlaceholder")}
                  invalid={!!errors.title_kk}
                  onChange={(e) => set({ title_kk: e.target.value })}
                />
              </Field>
              <Field label={t("admin.promotions.form.titleRu")} htmlFor="promo-title-ru" error={fieldText(errors.title_ru)}>
                <Input
                  id="promo-title-ru"
                  value={value.title_ru}
                  maxLength={120}
                  placeholder={t("admin.promotions.form.titleRuPlaceholder")}
                  onChange={(e) => set({ title_ru: e.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title={t("admin.promotions.form.sections.discount")}>
            <DiscountFields value={value} onChange={set} error={fieldText(errors.discount_value)} />
          </FormSection>

          <FormSection title={t("admin.promotions.form.sections.scope")}>
            <ScopeFields
              value={value}
              onChange={set}
              genres={genres}
              genreError={fieldText(errors.genre_id)}
              booksError={fieldText(errors.book_ids)}
            />
          </FormSection>

          <FormSection
            title={t("admin.promotions.form.sections.period")}
            action={status && <Badge tone={SCHEDULE_TONE[status]} dot>{t(`admin.promotions.common.statuses.${status}`)}</Badge>}
          >
            <DateTimeRange value={value.dates} onChange={(dates) => set({ dates })} error={fieldText(errors.ends_at ?? errors.starts_at)} />
            <div className="rounded-2xl border border-line bg-card-2 p-4">
              <Switch
                id="promo-active"
                checked={value.is_active}
                onChange={(is_active) => set({ is_active })}
                label={t("admin.promotions.form.active")}
                description={t("admin.promotions.form.activeHint")}
              />
            </div>
          </FormSection>

          {promotionId && (
            <FormSection title={t("admin.promotions.form.sections.danger")} description={t("admin.promotions.form.dangerText")}>
              <div>
                <Button variant="danger" onClick={() => void remove()} loading={deleting} leftIcon={<Trash2 className="size-4" />}>
                  {t("common.actions.delete")}
                </Button>
              </div>
            </FormSection>
          )}
          <SaveBar status={status ? t(`admin.promotions.common.statuses.${status}`) : null}>
            <Button variant="outline" onClick={() => router.push("/admin/promotions")} disabled={pending} className="hidden sm:inline-flex">
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" loading={pending} disabled={deleting}>
              {promotionId ? t("admin.promotions.form.save") : t("admin.promotions.form.create")}
            </Button>
          </SaveBar>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
          <FormSection title={t("admin.promotions.form.sections.preview")}>
            <PromotionPreview
              scope={value.scope}
              genreId={value.genre_id}
              bookIds={value.books.map((b) => b.id)}
              formatScope={value.format_scope}
              discountType={value.discount_type}
              discountValue={validDiscount(value.discount_type, discount) ? discount : null}
              otherRules={otherRules}
            />
          </FormSection>
          <div className="rounded-[18px] border border-line bg-info-soft p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-info">
              <Info className="size-4 shrink-0" aria-hidden />
              {t("admin.promotions.bestPriceTitle")}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t("admin.promotions.bestPriceText")}</p>
          </div>
        </aside>
      </div>

    </form>
  );
}
