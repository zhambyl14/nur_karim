"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Info, Power, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { confirmDialog, CopyButton } from "@/components/ui/interactive";
import { Counter, FormSection, SaveBar } from "@/components/admin/catalog/form-parts";
import { DateTimeRange, dateRangeError, type DateRangeValue } from "@/components/admin/catalog/datetime-range";
import { SCHEDULE_TONE, fromAlmatyInput, scheduleStatus } from "@/components/admin/catalog/schedule";
import type { GenreOption } from "@/components/admin/catalog/types";
import { deletePromoCode, savePromoCode } from "@/app/admin/promo-codes/actions";
import { DiscountFields, ScopeFields, parseWhole, validDiscount, type RuleDraft } from "./rule-fields";
import { PROMO_CODE_RE } from "./schema";
import { discountText } from "./format";

export type PromoCodeFormValues = RuleDraft & {
  code: string;
  description: string;
  min_order_amount: string;
  max_uses: string;
  per_user_limit: string;
  dates: DateRangeValue;
  is_active: boolean;
};

// no 0/O and 1/I so codes are easy to dictate and type
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `NK${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

export function PromoCodeForm({
  codeId,
  initial,
  genres,
  usedCount = 0,
  usage,
}: {
  codeId: string | null;
  initial: PromoCodeFormValues;
  genres: GenreOption[];
  usedCount?: number;
  /** usage history rendered on the server */
  usage?: ReactNode;
}) {
  const { t, dict, te } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const fieldText = (code?: string) =>
    code ? ((dict.admin.promoCodes.validation as Record<string, string>)[code] ?? te(code)) : undefined;
  const errorText = (code: string) => (dict.admin.promoCodes.errors as Record<string, string>)[code] ?? te(code);

  const set = (patch: Partial<PromoCodeFormValues>) => {
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
  const code = value.code.trim().toUpperCase();

  const optionalNumber = (raw: string) => (raw.trim() === "" ? null : parseWhole(raw));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!code) local.code = "REQUIRED";
    else if (!PROMO_CODE_RE.test(code)) local.code = "CODE_INVALID";
    if (!validDiscount(value.discount_type, discount)) {
      local.discount_value = value.discount_type === "percent" ? "VALUE_PERCENT" : "VALUE_FIXED";
    }
    if (value.scope === "genre" && !value.genre_id) local.genre_id = "GENRE_REQUIRED";
    if (value.scope === "books" && value.books.length === 0) local.book_ids = "BOOKS_REQUIRED";
    const minOrder = value.min_order_amount.trim() === "" ? 0 : parseWhole(value.min_order_amount);
    if (minOrder === null) local.min_order_amount = "NUMBER_INVALID";
    const maxUses = optionalNumber(value.max_uses);
    if (value.max_uses.trim() && !maxUses) local.max_uses = "NUMBER_INVALID";
    const perUser = optionalNumber(value.per_user_limit);
    if (value.per_user_limit.trim() && !perUser) local.per_user_limit = "NUMBER_INVALID";
    if (value.description.length > 300) local.description = "TOO_LONG";
    if (dateRangeError(value.dates)) local.ends_at = "DATE_INVALID";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error(errorText("VALIDATION"));
      return;
    }
    startTransition(async () => {
      const result = await savePromoCode(codeId, {
        code,
        description: value.description,
        min_order_amount: minOrder ?? 0,
        max_uses: maxUses,
        per_user_limit: perUser,
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
      toast.success(codeId ? t("admin.promoCodes.toasts.saved") : t("admin.promoCodes.toasts.created"));
      if (codeId) router.refresh();
      else router.push(`/admin/promo-codes/${result.id}`);
    });
  };

  const remove = async () => {
    if (!codeId) return;
    const used = usedCount > 0;
    const ok = await confirmDialog(
      used
        ? {
            title: t("admin.promoCodes.confirmDeactivate.title"),
            text: t("admin.promoCodes.confirmDeactivate.text", { code: initial.code }),
            confirmText: t("admin.promoCodes.confirmDeactivate.confirm"),
          }
        : {
            title: t("admin.promoCodes.confirmDelete.title"),
            text: t("admin.promoCodes.confirmDelete.text", { code: initial.code }),
            confirmText: t("admin.promoCodes.confirmDelete.confirm"),
            danger: true,
          },
    );
    if (!ok) return;
    startDelete(async () => {
      const result = await deletePromoCode(codeId).catch(() => null);
      if (!result?.ok) return void toast.error(errorText(result?.error ?? "generic"));
      if (result.deactivated) {
        toast.success(t("admin.promoCodes.toasts.deactivated"));
        setValue((v) => ({ ...v, is_active: false }));
        router.refresh();
        return;
      }
      toast.success(t("admin.promoCodes.toasts.deleted"));
      router.push("/admin/promo-codes");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="pb-24 lg:pb-0">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          <FormSection title={t("admin.promoCodes.form.sections.code")}>
            <Field label={t("admin.promoCodes.form.code")} htmlFor="pc-code" hint={t("admin.promoCodes.form.codeHint")} error={fieldText(errors.code)} required>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    id="pc-code"
                    value={value.code}
                    maxLength={32}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={t("admin.promoCodes.form.codePlaceholder")}
                    invalid={!!errors.code}
                    onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                    className="font-mono text-base font-bold tracking-[.08em]"
                  />
                </div>
                <Button
                  variant="outline"
                  className="h-[50px] shrink-0"
                  onClick={() => set({ code: generateCode() })}
                  leftIcon={<Shuffle className="size-4" />}
                  aria-label={t("admin.promoCodes.form.generate")}
                >
                  <span className="hidden sm:inline">{t("admin.promoCodes.form.generate")}</span>
                </Button>
              </div>
            </Field>
            <Field
              label={t("admin.promoCodes.form.description")}
              htmlFor="pc-description"
              hint={
                <span className="flex justify-between gap-3">
                  <span>{t("admin.promoCodes.form.descriptionHint")}</span>
                  <Counter value={value.description} max={300} />
                </span>
              }
              error={fieldText(errors.description)}
            >
              <Input
                id="pc-description"
                value={value.description}
                maxLength={300}
                placeholder={t("admin.promoCodes.form.descriptionPlaceholder")}
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>
          </FormSection>

          <FormSection title={t("admin.promoCodes.form.sections.discount")}>
            <DiscountFields value={value} onChange={set} error={fieldText(errors.discount_value)} />
          </FormSection>

          <FormSection title={t("admin.promoCodes.form.sections.scope")}>
            <ScopeFields
              value={value}
              onChange={set}
              genres={genres}
              genreError={fieldText(errors.genre_id)}
              booksError={fieldText(errors.book_ids)}
            />
          </FormSection>

          <FormSection title={t("admin.promoCodes.form.sections.conditions")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("admin.promoCodes.form.minOrder")} htmlFor="pc-min" hint={t("admin.promoCodes.form.minOrderHint")} error={fieldText(errors.min_order_amount)}>
                <Input
                  id="pc-min"
                  inputMode="numeric"
                  value={value.min_order_amount}
                  maxLength={8}
                  invalid={!!errors.min_order_amount}
                  onChange={(e) => set({ min_order_amount: e.target.value.replace(/[^\d]/g, "") })}
                  rightSlot={<span className="pr-3 text-sm font-bold text-muted">₸</span>}
                />
              </Field>
              <Field label={t("admin.promoCodes.form.maxUses")} htmlFor="pc-max" hint={t("admin.promoCodes.form.maxUsesHint")} error={fieldText(errors.max_uses)}>
                <Input
                  id="pc-max"
                  inputMode="numeric"
                  value={value.max_uses}
                  maxLength={7}
                  placeholder="∞"
                  invalid={!!errors.max_uses}
                  onChange={(e) => set({ max_uses: e.target.value.replace(/[^\d]/g, "") })}
                />
              </Field>
              <Field label={t("admin.promoCodes.form.perUser")} htmlFor="pc-per-user" hint={t("admin.promoCodes.form.perUserHint")} error={fieldText(errors.per_user_limit)}>
                <Input
                  id="pc-per-user"
                  inputMode="numeric"
                  value={value.per_user_limit}
                  maxLength={7}
                  placeholder="∞"
                  invalid={!!errors.per_user_limit}
                  onChange={(e) => set({ per_user_limit: e.target.value.replace(/[^\d]/g, "") })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title={t("admin.promoCodes.form.sections.period")}
            action={status && <Badge tone={SCHEDULE_TONE[status]} dot>{t(`admin.promotions.common.statuses.${status}`)}</Badge>}
          >
            <DateTimeRange value={value.dates} onChange={(dates) => set({ dates })} error={fieldText(errors.ends_at ?? errors.starts_at)} />
            <div className="rounded-2xl border border-line bg-card-2 p-4">
              <Switch
                id="pc-active"
                checked={value.is_active}
                onChange={(is_active) => set({ is_active })}
                label={t("admin.promoCodes.form.active")}
                description={t("admin.promoCodes.form.activeHint")}
              />
            </div>
          </FormSection>

          {codeId && (
            <FormSection
              title={t("admin.promoCodes.form.sections.danger")}
              description={usedCount > 0 ? t("admin.promoCodes.form.dangerUsedText") : t("admin.promoCodes.form.dangerText")}
            >
              <div>
                {usedCount > 0 ? (
                  <Button variant="outline" onClick={() => void remove()} loading={deleting} disabled={!initial.is_active} leftIcon={<Power className="size-4" />}>
                    {t("admin.promoCodes.form.deactivate")}
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => void remove()} loading={deleting} leftIcon={<Trash2 className="size-4" />}>
                    {t("common.actions.delete")}
                  </Button>
                )}
              </div>
            </FormSection>
          )}

          <SaveBar status={status ? t(`admin.promotions.common.statuses.${status}`) : null}>
            <Button variant="outline" onClick={() => router.push("/admin/promo-codes")} disabled={pending} className="hidden sm:inline-flex">
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" loading={pending} disabled={deleting}>
              {codeId ? t("admin.promoCodes.form.save") : t("admin.promoCodes.form.create")}
            </Button>
          </SaveBar>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
          {code && PROMO_CODE_RE.test(code) && (
            <div className="relative overflow-hidden rounded-[18px] bg-navy p-5 text-white">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-gold">{t("admin.promoCodes.form.code")}</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-2xl font-bold tracking-[.1em]">{code}</span>
                <CopyButton value={code} variant="soft" size="icon-sm" label={t("admin.promoCodes.copyCode", { code })} />
              </div>
              {validDiscount(value.discount_type, discount) && (
                <div className="mt-3 font-serif text-xl font-semibold text-white/90">
                  {discountText(value.discount_type, discount)}
                </div>
              )}
              {codeId && (
                <div className="mt-2 text-xs font-semibold text-white/60">{t("admin.promoCodes.form.usedInfo", { count: usedCount })}</div>
              )}
            </div>
          )}
          {usage}
          <div className="rounded-[18px] border border-line bg-info-soft p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-info">
              <Info className="size-4 shrink-0" aria-hidden />
              {t("admin.promoCodes.howTitle")}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t("admin.promoCodes.howText")}</p>
          </div>
        </aside>
      </div>
    </form>
  );
}
