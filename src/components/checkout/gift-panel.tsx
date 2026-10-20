"use client";

import { useId, useState } from "react";
import { CalendarClock, EyeOff, Gift, MapPinned, PackageOpen, PenLine, Sparkles, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Field, Input, RadioCard, Switch, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/interactive";
import { Postcard } from "@/components/gift/postcard";
import { ThemePicker } from "@/components/gift/theme-picker";
import type { GiftCardTheme } from "@/types/app";

export const GIFT_MESSAGE_MAX = 600;

export type GiftDraft = {
  name: string;
  phone: string;
  theme: GiftCardTheme;
  message: string;
  anonymous: boolean;
  revealOn: boolean;
  /** datetime-local value (browser time) */
  revealAt: string;
  hidePrice: boolean;
  wrap: boolean;
  addressMode: "sender" | "recipient";
};

export const EMPTY_GIFT: GiftDraft = {
  name: "",
  phone: "",
  theme: "classic",
  message: "",
  anonymous: false,
  revealOn: false,
  revealAt: "",
  hidePrice: true,
  wrap: false,
  addressMode: "sender",
};

export type GiftErrors = Partial<Record<"name" | "phone" | "reveal" | "message", true>>;

/** yyyy-MM-ddTHH:mm in the browser's time zone */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function revealIso(draft: GiftDraft): string | null {
  if (!draft.revealOn || !draft.revealAt) return null;
  const d = new Date(draft.revealAt);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function validateGift(draft: GiftDraft, now: number): GiftErrors {
  const e: GiftErrors = {};
  if (!draft.name.trim()) e.name = true;
  const digits = draft.phone.replace(/\D/g, "");
  if (digits.length !== 11) e.phone = true;
  if (draft.message.length > GIFT_MESSAGE_MAX) e.message = true;
  if (draft.revealOn) {
    const d = new Date(draft.revealAt).getTime();
    if (!draft.revealAt || Number.isNaN(d) || d < now - 60_000 || d > now + 365 * 24 * 3600_000) e.reveal = true;
  }
  return e;
}

export function GiftPanel({
  value,
  onChange,
  errors,
  senderName,
  hasPaper,
  wrapAvailable,
  wrapPrice,
}: {
  value: GiftDraft;
  onChange: (patch: Partial<GiftDraft>) => void;
  errors: GiftErrors;
  senderName: string;
  hasPaper: boolean;
  wrapAvailable: boolean;
  wrapPrice: number;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  // bounds for the reveal date, fixed when the panel mounts
  const [bounds] = useState(() => {
    const now = new Date();
    const max = new Date(now.getTime() + 365 * 24 * 3600_000);
    return { min: toLocalInput(now), max: toLocalInput(max) };
  });

  const headline = t(`gift.headlines.${value.theme}`);
  const from = value.anonymous
    ? t("gift.postcard.anonymous")
    : t("gift.postcard.from", { name: senderName || t("gift.postcard.anonymous") });
  const revealDate = value.revealOn && value.revealAt && !errors.reveal ? new Date(value.revealAt) : null;

  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden rounded-[18px] bg-navy px-5 py-4 text-white">
        <span className="absolute -right-6 -top-6 size-24 rotate-45 border border-gold/30" aria-hidden />
        <div className="relative flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-wine" aria-hidden>
            <Gift className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="font-serif text-lg font-semibold">{t("checkout.gift.title")}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/70">{t("checkout.gift.lead")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("checkout.gift.friendName")}
          htmlFor={`${id}-name`}
          required
          error={errors.name ? t("checkout.gift.errors.name") : undefined}
        >
          <Input
            id={`${id}-name`}
            value={value.name}
            maxLength={120}
            invalid={errors.name}
            placeholder={t("checkout.gift.friendNamePlaceholder")}
            leftSlot={<UserRound className="size-4" />}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field
          label={t("checkout.gift.friendPhone")}
          htmlFor={`${id}-phone`}
          required
          error={errors.phone ? t("checkout.gift.errors.phone") : undefined}
          hint={t("checkout.gift.friendPhoneHint")}
        >
          <PhoneInput
            id={`${id}-phone`}
            autoComplete="off"
            value={value.phone}
            invalid={errors.phone}
            onChange={(v) => onChange({ phone: v })}
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold text-muted">{t("checkout.gift.theme")}</div>
        <ThemePicker value={value.theme} onChange={(theme) => onChange({ theme })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="grid gap-4">
          <Field
            label={t("checkout.gift.message")}
            htmlFor={`${id}-msg`}
            error={errors.message ? t("checkout.gift.errors.message") : undefined}
          >
            <Textarea
              id={`${id}-msg`}
              value={value.message}
              rows={5}
              maxLength={GIFT_MESSAGE_MAX}
              invalid={errors.message}
              placeholder={t("checkout.gift.messagePlaceholder")}
              onChange={(e) => onChange({ message: e.target.value })}
            />
            <div
              className={cn(
                "mt-1 text-right text-[11px] font-semibold",
                value.message.length > GIFT_MESSAGE_MAX - 40 ? "text-wine-ink" : "text-faint",
              )}
              aria-live="polite"
            >
              {t("checkout.gift.counter", { count: value.message.length })}
            </div>
          </Field>
        </div>
        <div className="lg:sticky lg:top-[100px]">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Sparkles className="size-3.5 text-gold" aria-hidden />
            {t("checkout.gift.preview")}
          </div>
          <Postcard
            key={value.theme}
            className="animate-scale-in"
            theme={value.theme}
            headline={headline}
            to={value.name.trim() ? t("gift.postcard.to", { name: value.name.trim() }) : null}
            message={value.message}
            placeholder={t("gift.postcard.placeholder")}
            from={from}
            ariaLabel={t("gift.postcard.aria", { theme: t(`gift.themes.${value.theme}`) })}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-line bg-card-2 p-4">
        <OptionRow icon={<EyeOff className="size-4" />}>
          <Switch
            id={`${id}-anon`}
            checked={value.anonymous}
            onChange={(anonymous) => onChange({ anonymous })}
            label={t("checkout.gift.anonymous")}
            description={t("checkout.gift.anonymousHint")}
          />
        </OptionRow>
        <OptionRow icon={<CalendarClock className="size-4" />}>
          <Switch
            id={`${id}-reveal`}
            checked={value.revealOn}
            onChange={(revealOn) => onChange({ revealOn })}
            label={t("checkout.gift.revealSwitch")}
            description={t("checkout.gift.revealSwitchHint")}
          />
          {value.revealOn && (
            <div className="mt-3 animate-fade-in">
              <Field
                label={t("checkout.gift.reveal")}
                htmlFor={`${id}-reveal-at`}
                error={errors.reveal ? t("checkout.gift.errors.reveal") : undefined}
                hint={t("checkout.gift.revealHint")}
              >
                <Input
                  id={`${id}-reveal-at`}
                  type="datetime-local"
                  value={value.revealAt}
                  min={bounds.min}
                  max={bounds.max}
                  invalid={errors.reveal}
                  onChange={(e) => onChange({ revealAt: e.target.value })}
                  className="sm:max-w-[280px]"
                />
              </Field>
              {revealDate && !Number.isNaN(revealDate.getTime()) && (
                <p className="mt-2 text-xs font-semibold text-wine-ink">
                  {t("orders.gift.revealAt", { date: formatDateTime(revealDate, locale) })}
                </p>
              )}
            </div>
          )}
        </OptionRow>
        <OptionRow icon={<PenLine className="size-4" />}>
          <Switch
            id={`${id}-price`}
            checked={value.hidePrice}
            onChange={(hidePrice) => onChange({ hidePrice })}
            label={t("checkout.gift.hidePrice")}
            description={t("checkout.gift.hidePriceHint")}
          />
        </OptionRow>
        {hasPaper && wrapAvailable && (
          <OptionRow icon={<PackageOpen className="size-4" />}>
            <Switch
              id={`${id}-wrap`}
              checked={value.wrap}
              onChange={(wrap) => onChange({ wrap })}
              label={t("checkout.gift.wrap")}
              description={t("checkout.gift.wrapHint", { price: formatPrice(wrapPrice) })}
            />
          </OptionRow>
        )}
      </div>

      {hasPaper && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
            <MapPinned className="size-4 text-wine-ink" aria-hidden />
            {t("checkout.gift.addressTitle")}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <RadioCard
              name={`${id}-addr-mode`}
              value="sender"
              checked={value.addressMode === "sender"}
              onChange={() => onChange({ addressMode: "sender" })}
              title={t("checkout.gift.addressSelf")}
              description={t("checkout.gift.addressSelfHint")}
            />
            <RadioCard
              name={`${id}-addr-mode`}
              value="recipient"
              checked={value.addressMode === "recipient"}
              onChange={() => onChange({ addressMode: "recipient" })}
              title={t("checkout.gift.addressFriend")}
              description={t("checkout.gift.addressFriendHint")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-wine-soft text-wine-ink" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
