"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, RadioCard, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ChipButton } from "@/components/ui/chip";
import { Segmented } from "@/components/ui/segmented";
import { confirmDialog } from "@/components/ui/interactive";
import { Counter, FormSection, SaveBar } from "@/components/admin/catalog/form-parts";
import { ImageUploader } from "@/components/admin/catalog/image-uploader";
import { randomSuffix } from "@/components/admin/catalog/image-upload";
import { DateTimeRange, dateRangeError, type DateRangeValue } from "@/components/admin/catalog/datetime-range";
import { SCHEDULE_TONE, fromAlmatyInput, scheduleStatus } from "@/components/admin/catalog/schedule";
import { deleteBanner, saveBanner } from "@/app/admin/banners/actions";
import { BannerSlide } from "./banner-slide";

export type BannerFormValues = {
  title_kk: string;
  title_ru: string;
  subtitle_kk: string;
  subtitle_ru: string;
  button_kk: string;
  button_ru: string;
  link_url: string;
  image_url: string | null;
  image_mobile_url: string | null;
  text_theme: "light" | "dark";
  overlay: boolean;
  dates: DateRangeValue;
  is_active: boolean;
};

type Lang = "kk" | "ru";

const LIMITS = { title: 120, subtitle: 240, button: 40 } as const;
const DESKTOP_SIZE = { maxWidth: 2400, maxHeight: 1200, quality: 0.85 };
const MOBILE_SIZE = { maxWidth: 1200, maxHeight: 1200, quality: 0.85 };

function validLink(v: string): boolean {
  const s = v.trim();
  return s === "" || /^https?:\/\/[^\s]+$/i.test(s) || (/^\/[^\s]*$/.test(s) && !s.startsWith("//") && !s.startsWith("/\\"));
}

function bannerPath() {
  return `${Date.now()}-${randomSuffix()}.webp`;
}

export function BannerForm({ bannerId, initial }: { bannerId: string | null; initial: BannerFormValues }) {
  const { t, dict, te, locale } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<Lang>(locale);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const persisted = [initial.image_url, initial.image_mobile_url].filter((u): u is string => !!u);

  const fieldText = (code?: string) =>
    code ? ((dict.admin.banners.validation as Record<string, string>)[code] ?? te(code)) : undefined;
  const errorText = (code: string) => (dict.admin.banners.errors as Record<string, string>)[code] ?? te(code);

  const set = (patch: Partial<BannerFormValues>) => {
    setValue((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key];
      if ("dates" in patch) delete next.ends_at;
      return next;
    });
  };

  const startsAt = fromAlmatyInput(value.dates.start);
  const endsAt = fromAlmatyInput(value.dates.end);
  const status =
    startsAt === undefined || endsAt === undefined
      ? null
      : scheduleStatus({ is_active: value.is_active, starts_at: startsAt, ends_at: endsAt });

  const pick = (field: "title" | "subtitle" | "button") => {
    const own = value[`${field}_${lang}`].trim();
    return own || value[`${field}_${lang === "kk" ? "ru" : "kk"}`].trim();
  };
  const slide = {
    title: pick("title"),
    subtitle: pick("subtitle"),
    button: pick("button"),
    hasLink: value.link_url.trim() !== "",
    imageUrl: value.image_url,
    imageMobileUrl: value.image_mobile_url,
    textTheme: value.text_theme,
    overlay: value.overlay,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!value.image_url) local.image_url = "IMAGE_REQUIRED";
    if (!validLink(value.link_url)) local.link_url = "LINK_INVALID";
    if (dateRangeError(value.dates)) local.ends_at = "DATE_INVALID";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error(errorText("VALIDATION"));
      return;
    }
    startTransition(async () => {
      const result = await saveBanner(bannerId, {
        title_kk: value.title_kk,
        title_ru: value.title_ru,
        subtitle_kk: value.subtitle_kk,
        subtitle_ru: value.subtitle_ru,
        button_kk: value.button_kk,
        button_ru: value.button_ru,
        link_url: value.link_url.trim(),
        image_url: value.image_url ?? "",
        image_mobile_url: value.image_mobile_url,
        text_theme: value.text_theme,
        overlay: value.overlay,
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
      toast.success(bannerId ? t("admin.banners.toasts.saved") : t("admin.banners.toasts.created"));
      router.push("/admin/banners");
      router.refresh();
    });
  };

  const remove = async () => {
    if (!bannerId) return;
    const ok = await confirmDialog({
      title: t("admin.banners.confirmDelete.title"),
      text: t("admin.banners.confirmDelete.text", { title: value.title_kk || value.title_ru || t("admin.banners.untitled") }),
      confirmText: t("admin.banners.confirmDelete.confirm"),
      danger: true,
    });
    if (!ok) return;
    startDelete(async () => {
      const result = await deleteBanner(bannerId).catch(() => null);
      if (!result?.ok) return void toast.error(errorText(result?.error ?? "generic"));
      toast.success(t("admin.banners.toasts.deleted"));
      router.push("/admin/banners");
      router.refresh();
    });
  };

  const textField = (field: "title" | "subtitle" | "button", label: string) => {
    const key = `${field}_${lang}` as const;
    const placeholderKey =
      field === "title"
        ? lang === "kk" ? "admin.banners.form.titlePlaceholder" : "admin.banners.form.titlePlaceholderRu"
        : field === "subtitle"
          ? lang === "kk" ? "admin.banners.form.subtitlePlaceholder" : "admin.banners.form.subtitlePlaceholderRu"
          : lang === "kk" ? "admin.banners.form.buttonPlaceholder" : "admin.banners.form.buttonPlaceholderRu";
    return (
      <Field
        label={label}
        htmlFor={`banner-${key}`}
        error={fieldText(errors[key])}
        hint={
          <span className="flex justify-between gap-3">
            <span>{field === "button" ? t("admin.banners.form.buttonHint") : null}</span>
            <Counter value={value[key]} max={LIMITS[field]} />
          </span>
        }
      >
        <Input
          id={`banner-${key}`}
          lang={lang}
          value={value[key]}
          maxLength={LIMITS[field]}
          placeholder={t(placeholderKey)}
          onChange={(e) => set({ [key]: e.target.value } as Partial<BannerFormValues>)}
        />
      </Field>
    );
  };

  return (
    <form onSubmit={submit} noValidate className="pb-24 lg:pb-0">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4">
          <FormSection title={t("admin.banners.form.sections.images")}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="mb-1.5 text-[13px] font-bold text-ink-2">
                  {t("admin.banners.form.desktopImage")} <span className="text-wine-ink">*</span>
                </div>
                <ImageUploader
                  id="banner-image"
                  value={value.image_url}
                  onChange={(image_url) => set({ image_url })}
                  bucket="banners"
                  makePath={bannerPath}
                  size={DESKTOP_SIZE}
                  aspectClassName="aspect-[8/3]"
                  recommended="1600×600"
                  persistedUrls={persisted}
                  previewAlt={t("admin.banners.form.desktopImage")}
                  invalid={!!errors.image_url}
                  compact
                />
                <p className={errors.image_url ? "mt-1.5 text-xs font-semibold text-danger" : "mt-1.5 text-xs text-muted"}>
                  {errors.image_url ? fieldText(errors.image_url) : t("admin.banners.form.desktopHint")}
                </p>
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 text-[13px] font-bold text-ink-2">{t("admin.banners.form.mobileImage")}</div>
                <ImageUploader
                  id="banner-image-mobile"
                  value={value.image_mobile_url}
                  onChange={(image_mobile_url) => set({ image_mobile_url })}
                  bucket="banners"
                  makePath={bannerPath}
                  size={MOBILE_SIZE}
                  aspectClassName="aspect-square max-sm:aspect-[16/10]"
                  recommended="900×900"
                  persistedUrls={persisted}
                  previewAlt={t("admin.banners.form.mobileImage")}
                  compact
                />
                <p className="mt-1.5 text-xs text-muted">{t("admin.banners.form.mobileHint")}</p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title={t("admin.banners.form.sections.texts")}
            description={t("admin.banners.form.textsHint")}
            action={
              <Segmented<Lang>
                size="sm"
                ariaLabel={t("admin.banners.preview.language")}
                value={lang}
                onChange={setLang}
                options={[
                  { value: "kk", label: "ҚАЗ" },
                  { value: "ru", label: "РУС" },
                ]}
              />
            }
          >
            <p className="text-xs font-bold uppercase tracking-[.08em] text-faint">
              {lang === "kk" ? t("admin.banners.form.kk") : t("admin.banners.form.ru")}
            </p>
            {textField("title", t("admin.banners.form.titleLabel"))}
            {textField("subtitle", t("admin.banners.form.subtitleLabel"))}
            {textField("button", t("admin.banners.form.buttonLabel"))}
          </FormSection>

          <FormSection title={t("admin.banners.form.sections.link")}>
            <Field label={t("admin.banners.form.linkUrl")} htmlFor="banner-link" hint={t("admin.banners.form.linkHint")} error={fieldText(errors.link_url)}>
              <Input
                id="banner-link"
                type="text"
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
                value={value.link_url}
                maxLength={500}
                placeholder={t("admin.banners.form.linkPlaceholder")}
                invalid={!!errors.link_url}
                onChange={(e) => set({ link_url: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">{t("admin.banners.form.linkSuggestions")}:</span>
              <ChipButton size="sm" onClick={() => set({ link_url: "/catalog" })}>
                {t("admin.banners.form.linkCatalog")}
              </ChipButton>
              <ChipButton size="sm" onClick={() => set({ link_url: "/catalog?format=ebook" })}>
                {t("admin.banners.form.linkEbooks")}
              </ChipButton>
              <ChipButton size="sm" onClick={() => set({ link_url: "/catalog?sort=popular" })}>
                {t("admin.banners.form.linkPopular")}
              </ChipButton>
            </div>
          </FormSection>

          <FormSection title={t("admin.banners.form.sections.look")}>
            <fieldset>
              <legend className="mb-2 text-[13px] font-bold text-ink-2">{t("admin.banners.form.textTheme")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  name="banner-theme"
                  value="light"
                  checked={value.text_theme === "light"}
                  onChange={() => set({ text_theme: "light" })}
                  title={t("admin.banners.form.themeLight")}
                  description={t("admin.banners.form.themeLightHint")}
                  className="p-3.5"
                />
                <RadioCard
                  name="banner-theme"
                  value="dark"
                  checked={value.text_theme === "dark"}
                  onChange={() => set({ text_theme: "dark" })}
                  title={t("admin.banners.form.themeDark")}
                  description={t("admin.banners.form.themeDarkHint")}
                  className="p-3.5"
                />
              </div>
            </fieldset>
            <div className="rounded-2xl border border-line bg-card-2 p-4">
              <Switch
                id="banner-overlay"
                checked={value.overlay}
                onChange={(overlay) => set({ overlay })}
                label={t("admin.banners.form.overlay")}
                description={t("admin.banners.form.overlayHint")}
              />
            </div>
          </FormSection>

          <FormSection
            title={t("admin.banners.form.sections.period")}
            action={status && <Badge tone={SCHEDULE_TONE[status]} dot>{t(`admin.promotions.common.statuses.${status}`)}</Badge>}
          >
            <DateTimeRange value={value.dates} onChange={(dates) => set({ dates })} error={fieldText(errors.ends_at ?? errors.starts_at)} />
            <div className="rounded-2xl border border-line bg-card-2 p-4">
              <Switch
                id="banner-active"
                checked={value.is_active}
                onChange={(is_active) => set({ is_active })}
                label={t("admin.banners.form.active")}
                description={t("admin.banners.form.activeHint")}
              />
            </div>
          </FormSection>

          {bannerId && (
            <FormSection title={t("admin.banners.form.sections.danger")} description={t("admin.banners.form.dangerText")}>
              <div>
                <Button variant="danger" onClick={() => void remove()} loading={deleting} leftIcon={<Trash2 className="size-4" />}>
                  {t("common.actions.delete")}
                </Button>
              </div>
            </FormSection>
          )}

          <SaveBar status={status ? t(`admin.promotions.common.statuses.${status}`) : null}>
            <Button variant="outline" onClick={() => router.push("/admin/banners")} disabled={pending} className="hidden sm:inline-flex">
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" loading={pending} disabled={deleting}>
              {bannerId ? t("admin.banners.form.save") : t("admin.banners.form.create")}
            </Button>
          </SaveBar>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-6">
          <FormSection title={t("admin.banners.form.sections.preview")}>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                <Monitor className="size-3.5" aria-hidden /> {t("admin.banners.preview.desktop")}
              </div>
              <BannerSlide content={slide} device="desktop" emptyText={t("admin.banners.preview.empty")} />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                <Smartphone className="size-3.5" aria-hidden /> {t("admin.banners.preview.phone")}
              </div>
              <div className="mx-auto max-w-[300px] rounded-[30px] border-[6px] border-navy bg-page p-2">
                <BannerSlide content={slide} device="phone" emptyText={t("admin.banners.preview.empty")} />
              </div>
            </div>
          </FormSection>
        </aside>
      </div>
    </form>
  );
}
