"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { saveSettings } from "@/app/admin/settings/actions";
import { collectErrors, settingsSchema, type FieldErrors, type SettingsField } from "@/app/admin/settings/schema";
import type { StoreSettings } from "@/types/app";
import type { TKey } from "@/lib/i18n/translate";

type BoolField = "gift_enabled" | "ebook_watermark" | "telegram_notify_admins";
type TextField = Exclude<SettingsField, BoolField>;
type Values = { [K in SettingsField]: K extends BoolField ? boolean : string };

function toValues(s: StoreSettings): Values {
  const str = (v: string | number | null) => (v === null ? "" : String(v));
  return {
    store_name: s.store_name,
    contact_phone: s.contact_phone,
    contact_email: str(s.contact_email),
    address_kk: s.address_kk,
    address_ru: s.address_ru,
    instagram_url: str(s.instagram_url),
    telegram_url: str(s.telegram_url),
    whatsapp_phone: str(s.whatsapp_phone),
    payment_card: s.payment_card,
    payment_recipient: s.payment_recipient,
    payment_bank: s.payment_bank,
    payment_note_kk: s.payment_note_kk,
    payment_note_ru: s.payment_note_ru,
    delivery_astana_price: str(s.delivery_astana_price),
    delivery_kazpost_price: str(s.delivery_kazpost_price),
    free_delivery_threshold: str(s.free_delivery_threshold),
    gift_enabled: s.gift_enabled,
    gift_wrap_price: str(s.gift_wrap_price),
    ebook_max_devices: str(s.ebook_max_devices),
    ebook_pages_per_10min: str(s.ebook_pages_per_10min),
    ebook_watermark: s.ebook_watermark,
    hero_label_kk: s.hero_label_kk,
    hero_label_ru: s.hero_label_ru,
    hero_quote_kk: s.hero_quote_kk,
    hero_quote_ru: s.hero_quote_ru,
    hero_sub_kk: s.hero_sub_kk,
    hero_sub_ru: s.hero_sub_ru,
    order_auto_cancel_hours: str(s.order_auto_cancel_hours),
    telegram_notify_admins: s.telegram_notify_admins,
  };
}

function Section({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-[18px] border border-line bg-card p-5 sm:p-6">
      <h2 id={id} className="font-serif text-lg font-semibold text-ink">
        {title}
      </h2>
      <p className="mb-5 mt-1 text-[13px] text-muted">{hint}</p>
      {children}
    </section>
  );
}

export function SettingsForm({
  settings,
  telegramConfigured,
  adminsWithTelegram,
  children,
}: {
  settings: StoreSettings;
  telegramConfigured: boolean;
  adminsWithTelegram: number;
  /** extra sections rendered after the form (demo data) */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const [initial, setInitial] = useState<Values>(() => toValues(settings));
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [previewLocale, setPreviewLocale] = useState<"kk" | "ru">("kk");
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => (Object.keys(values) as SettingsField[]).some((k) => values[k] !== initial[k]),
    [values, initial],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errorText = (key: SettingsField): string | undefined => {
    const e = errors[key];
    if (!e) return undefined;
    const known = ["required", "phone", "email", "url", "number", "range", "tooLong"];
    const code = known.includes(e.code) ? e.code : "number";
    return t(`admin.settings.errors.${code}` as TKey, { min: e.min, max: e.max });
  };

  const setField = (key: SettingsField, value: string | boolean) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const text = (
    key: TextField,
    label: TKey,
    opts: { hint?: TKey; type?: string; inputMode?: "numeric" | "tel" | "email" | "url"; required?: boolean; multiline?: boolean; placeholder?: string; className?: string } = {},
  ) => {
    const id = `set-${key}`;
    const common = {
      id,
      name: key,
      value: values[key] as string,
      invalid: !!errors[key],
      placeholder: opts.placeholder,
    };
    return (
      <Field
        label={t(label)}
        htmlFor={id}
        hint={opts.hint ? t(opts.hint) : undefined}
        error={errorText(key)}
        required={opts.required}
        className={opts.className}
      >
        {opts.multiline ? (
          <Textarea {...common} className="min-h-24" onChange={(e) => setField(key, e.target.value)} />
        ) : (
          <Input
            {...common}
            type={opts.type ?? "text"}
            inputMode={opts.inputMode}
            onChange={(e) => setField(key, e.target.value)}
          />
        )}
      </Field>
    );
  };

  const toggle = (key: BoolField, label: TKey, hint: TKey) => (
    <Switch
      id={`set-${key}`}
      checked={values[key] as boolean}
      onChange={(v) => setField(key, v)}
      label={t(label)}
      description={t(hint)}
    />
  );

  const submit = () => {
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error));
      toast.error(t("admin.settings.invalid"));
      const first = parsed.error.issues[0]?.path[0];
      if (typeof first === "string") document.getElementById(`set-${first}`)?.focus();
      return;
    }
    startTransition(async () => {
      const res = await saveSettings(values).catch(() => ({ ok: false as const, error: "network", fieldErrors: undefined }));
      if (res.ok) {
        setInitial(values);
        setErrors({});
        toast.success(t("admin.settings.saved"));
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error === "VALIDATION" ? t("admin.settings.invalid") : t(`errors.${res.error === "FORBIDDEN" ? "FORBIDDEN" : "generic"}`));
      }
    });
  };

  const hero = {
    label: values[`hero_label_${previewLocale}`] as string,
    quote: values[`hero_quote_${previewLocale}`] as string,
    sub: values[`hero_sub_${previewLocale}`] as string,
  };

  return (
    <div className="space-y-4">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <Section id="sec-store" title={t("admin.settings.sections.store")} hint={t("admin.settings.sections.storeHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("store_name", "admin.settings.fields.storeName", { required: true })}
            {text("contact_phone", "admin.settings.fields.contactPhone", { required: true, type: "tel", inputMode: "tel" })}
            {text("contact_email", "admin.settings.fields.contactEmail", { type: "email", inputMode: "email" })}
            {text("whatsapp_phone", "admin.settings.fields.whatsapp", { type: "tel", inputMode: "tel" })}
            {text("address_kk", "admin.settings.fields.addressKk")}
            {text("address_ru", "admin.settings.fields.addressRu")}
            {text("instagram_url", "admin.settings.fields.instagram", { type: "url", inputMode: "url", hint: "admin.settings.fields.urlHint" })}
            {text("telegram_url", "admin.settings.fields.telegram", { type: "url", inputMode: "url", placeholder: "https://t.me/…" })}
          </div>
        </Section>

        <Section id="sec-payment" title={t("admin.settings.sections.payment")} hint={t("admin.settings.sections.paymentHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("payment_card", "admin.settings.fields.paymentCard", { required: true, inputMode: "numeric", placeholder: "4400 0000 0000 0000", hint: "admin.settings.fields.paymentCardHint" })}
            {text("payment_bank", "admin.settings.fields.paymentBank", { required: true })}
            {text("payment_recipient", "admin.settings.fields.paymentRecipient", {
              hint: "admin.settings.fields.paymentRecipientHint",
              className: "sm:col-span-2",
            })}
            {text("payment_note_kk", "admin.settings.fields.paymentNoteKk", { multiline: true, hint: "admin.settings.fields.paymentNoteHint" })}
            {text("payment_note_ru", "admin.settings.fields.paymentNoteRu", { multiline: true })}
          </div>
        </Section>

        <Section id="sec-delivery" title={t("admin.settings.sections.delivery")} hint={t("admin.settings.sections.deliveryHint")}>
          <div className="grid gap-4 sm:grid-cols-3">
            {text("delivery_astana_price", "admin.settings.fields.astanaPrice", { type: "number", inputMode: "numeric" })}
            {text("delivery_kazpost_price", "admin.settings.fields.kazpostPrice", { type: "number", inputMode: "numeric" })}
            {text("free_delivery_threshold", "admin.settings.fields.freeThreshold", {
              type: "number",
              inputMode: "numeric",
              hint: "admin.settings.fields.freeThresholdHint",
            })}
          </div>
        </Section>

        <Section id="sec-gifts" title={t("admin.settings.sections.gifts")} hint={t("admin.settings.sections.giftsHint")}>
          <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
            {toggle("gift_enabled", "admin.settings.fields.giftEnabled", "admin.settings.fields.giftEnabledHint")}
            {text("gift_wrap_price", "admin.settings.fields.giftWrapPrice", { type: "number", inputMode: "numeric" })}
          </div>
        </Section>

        <Section id="sec-ebook" title={t("admin.settings.sections.ebook")} hint={t("admin.settings.sections.ebookHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("ebook_max_devices", "admin.settings.fields.maxDevices", {
              type: "number",
              inputMode: "numeric",
              hint: "admin.settings.fields.maxDevicesHint",
            })}
            {text("ebook_pages_per_10min", "admin.settings.fields.pagesPer10", {
              type: "number",
              inputMode: "numeric",
              hint: "admin.settings.fields.pagesPer10Hint",
            })}
            <div className="sm:col-span-2">
              {toggle("ebook_watermark", "admin.settings.fields.watermark", "admin.settings.fields.watermarkHint")}
            </div>
          </div>
        </Section>

        <Section id="sec-hero" title={t("admin.settings.sections.hero")} hint={t("admin.settings.sections.heroHint")}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("hero_label_kk", "admin.settings.fields.heroLabelKk", { required: true })}
              {text("hero_label_ru", "admin.settings.fields.heroLabelRu", { required: true })}
              {text("hero_quote_kk", "admin.settings.fields.heroQuoteKk", { required: true, multiline: true })}
              {text("hero_quote_ru", "admin.settings.fields.heroQuoteRu", { required: true, multiline: true })}
              {text("hero_sub_kk", "admin.settings.fields.heroSubKk", { multiline: true })}
              {text("hero_sub_ru", "admin.settings.fields.heroSubRu", { multiline: true })}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted">{t("admin.settings.preview.title")}</span>
                <Segmented
                  size="sm"
                  className="w-[200px]"
                  ariaLabel={t("admin.settings.preview.title")}
                  value={previewLocale}
                  onChange={setPreviewLocale}
                  options={[
                    { value: "kk", label: t("admin.settings.preview.kk") },
                    { value: "ru", label: t("admin.settings.preview.ru") },
                  ]}
                />
              </div>
              <div className="nk-hero-bg overflow-hidden rounded-[18px] p-6 text-white sm:p-8" aria-live="polite">
                {hero.label && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-px w-7 bg-gold" aria-hidden />
                    <span className="text-[11px] font-bold tracking-[.22em] text-gold">{hero.label}</span>
                  </div>
                )}
                <p className="break-words font-serif text-[22px] italic leading-[1.25] sm:text-[28px]">{hero.quote}</p>
                {hero.sub && <p className="mt-3 text-[13px] leading-relaxed text-white/70">{hero.sub}</p>}
              </div>
            </div>
          </div>
        </Section>

        <Section id="sec-orders" title={t("admin.settings.sections.orders")} hint={t("admin.settings.sections.ordersHint")}>
          <div className="sm:max-w-sm">
            {text("order_auto_cancel_hours", "admin.settings.fields.autoCancel", {
              type: "number",
              inputMode: "numeric",
              hint: "admin.settings.fields.autoCancelHint",
            })}
          </div>
        </Section>

        <Section id="sec-notify" title={t("admin.settings.sections.notifications")} hint={t("admin.settings.sections.notificationsHint")}>
          {toggle("telegram_notify_admins", "admin.settings.fields.notifyAdmins", "admin.settings.fields.notifyAdminsHint")}
          <div
            className={cn(
              "mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] font-semibold",
              telegramConfigured ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
            )}
          >
            {telegramConfigured ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span>{telegramConfigured ? t("admin.settings.telegram.configured") : t("admin.settings.telegram.notConfigured")}</span>
          </div>
          {adminsWithTelegram === 0 && <p className="mt-2 text-xs text-muted">{t("admin.settings.telegram.linkHint")}</p>}
        </Section>

        {/* Sticky save bar: sits above the phone tab bar, at the bottom of the viewport on laptops */}
        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 shadow-lift backdrop-blur-md transition",
              dirty ? "border-wine-line bg-card/95" : "border-line bg-card/90",
            )}
          >
            <p className={cn("min-w-0 text-[13px] font-semibold", dirty ? "text-wine-ink" : "text-muted")} aria-live="polite">
              {dirty ? t("admin.settings.unsaved") : t("admin.settings.upToDate")}
            </p>
            <div className="flex shrink-0 gap-2">
              {dirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setValues(initial);
                    setErrors({});
                  }}
                >
                  {t("admin.settings.discard")}
                </Button>
              )}
              <Button type="submit" size="sm" loading={pending} disabled={!dirty}>
                {pending ? t("admin.settings.saving") : t("admin.settings.save")}
              </Button>
            </div>
          </div>
        </div>
      </form>
      {children}
    </div>
  );
}
