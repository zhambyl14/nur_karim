import type { Metadata } from "next";
import { Landmark, ShieldCheck, TicketPercent, Timer } from "lucide-react";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { formatCard, normalizeCard } from "@/lib/format";
import { CopyButton } from "@/components/ui/interactive";
import { IconBadge, InfoCard, InfoLayout, InfoSteps } from "@/components/home/info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("info.payment.meta.title"),
    description: t("info.payment.meta.description"),
    alternates: { canonical: "/payment" },
  };
}

export default async function PaymentPage() {
  const [{ t, locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const card = settings.payment_card?.trim() ?? "";
  const note = localized(settings, "payment_note", locale).trim();

  const details = [
    { label: t("info.payment.details.bank"), value: settings.payment_bank?.trim() },
    { label: t("info.payment.details.recipient"), value: settings.payment_recipient?.trim() },
  ].filter((row): row is { label: string; value: string } => !!row.value);

  return (
    <InfoLayout t={t} current="payment" title={t("info.payment.title")} lead={t("info.payment.lead")}>
      <section className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-[18px] bg-navy-2 p-5 text-white sm:p-7">
          <span className="absolute -right-12 -top-12 size-44 rotate-45 rounded-[30px] border border-gold/30" aria-hidden />
          <h2 className="relative flex items-center gap-3 font-serif text-xl font-semibold sm:text-2xl">
            <Landmark className="size-6 text-gold" aria-hidden />
            {t("info.payment.details.title")}
          </h2>
          {card && (
            <div className="relative mt-5">
              <div className="text-[11px] font-bold uppercase tracking-[.18em] text-white/55">{t("info.payment.details.card")}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="font-serif text-[28px] font-semibold tracking-wide sm:text-[32px]">{formatCard(card)}</span>
                <CopyButton
                  value={normalizeCard(card)}
                  label={t("info.payment.details.copy")}
                  variant="soft"
                />
              </div>
            </div>
          )}
          {details.length > 0 && (
            <dl className="relative mt-5 grid gap-3 border-t border-white/15 pt-5 sm:grid-cols-2">
              {details.map((row) => (
                <div key={row.label}>
                  <dt className="text-[11px] font-bold uppercase tracking-[.18em] text-white/55">{row.label}</dt>
                  <dd className="mt-1 text-[15px] font-bold">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="relative mt-5 rounded-xl bg-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/85">
            {note || t("info.payment.details.note")}
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5">
          <InfoCard className="flex gap-4">
            <IconBadge>
              <Timer className="size-5" aria-hidden />
            </IconBadge>
            <div>
              <h2 className="text-[16px] font-bold text-ink">{t("info.payment.autoCancel.title")}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                {t("info.payment.autoCancel.text", { hours: settings.order_auto_cancel_hours })}
              </p>
            </div>
          </InfoCard>
          <InfoCard className="flex gap-4">
            <IconBadge>
              <ShieldCheck className="size-5" aria-hidden />
            </IconBadge>
            <div>
              <h2 className="text-[16px] font-bold text-ink">{t("info.payment.safety.title")}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t("info.payment.safety.text")}</p>
            </div>
          </InfoCard>
        </div>
      </section>

      <InfoSteps
        title={t("info.payment.steps.title")}
        steps={(["s1", "s2", "s3", "s4"] as const).map((key) => ({
          title: t(`info.payment.steps.${key}.title`),
          text: t(`info.payment.steps.${key}.text`),
        }))}
      />

      <InfoCard className="flex gap-4">
        <IconBadge>
          <TicketPercent className="size-5" aria-hidden />
        </IconBadge>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{t("info.payment.promo.title")}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t("info.payment.promo.text")}</p>
        </div>
      </InfoCard>
    </InfoLayout>
  );
}
