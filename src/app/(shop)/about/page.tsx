import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, Gift, Languages, MapPinned, ShieldCheck, TabletSmartphone } from "lucide-react";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { buttonVariants } from "@/components/ui/button";
import { IconBadge, InfoCard, InfoLayout } from "@/components/home/info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("info.about.meta.title"),
    description: t("info.about.meta.description"),
    alternates: { canonical: "/about" },
  };
}

const VALUE_ICONS = {
  v1: BookMarked,
  v2: Languages,
  v3: TabletSmartphone,
  v4: MapPinned,
} as const;

export default async function AboutPage() {
  const [{ t, locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const quote = localized(settings, "hero_quote", locale).trim();

  return (
    <InfoLayout
      t={t}
      current="about"
      title={t("info.about.title")}
      lead={t("info.about.lead")}
      heroExtra={
        quote ? (
          <figure className="mt-7 max-w-[760px] border-l-2 border-gold pl-5 sm:mt-9">
            <figcaption className="text-[11px] font-bold tracking-[.22em] text-gold">{t("info.about.hadithLabel")}</figcaption>
            <blockquote className="mt-2 font-serif text-[20px] italic leading-snug text-white sm:text-[26px]">{quote}</blockquote>
          </figure>
        ) : null
      }
    >
      <InfoCard title={t("info.about.mission.title")}>
        <p className="max-w-3xl text-[15px] leading-relaxed text-ink-2">{t("info.about.mission.text")}</p>
      </InfoCard>

      <section aria-labelledby="about-values">
        <h2 id="about-values" className="mb-4 font-serif text-[22px] font-semibold text-ink sm:text-[28px]">
          {t("info.about.values.title")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {(["v1", "v2", "v3", "v4"] as const).map((key) => {
            const Icon = VALUE_ICONS[key];
            return (
              <li key={key} className="rounded-[18px] border border-line bg-card p-5 sm:p-6">
                <IconBadge>
                  <Icon className="size-5" aria-hidden />
                </IconBadge>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{t(`info.about.values.${key}.title`)}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t(`info.about.values.${key}.text`)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <InfoCard className="flex gap-4">
          <IconBadge>
            <ShieldCheck className="size-5" aria-hidden />
          </IconBadge>
          <div>
            <h2 className="text-[16px] font-bold text-ink">{t("info.about.trust.title")}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{t("info.about.trust.text")}</p>
          </div>
        </InfoCard>

        {settings.gift_enabled && (
          <section className="relative overflow-hidden rounded-[18px] bg-navy-2 p-5 text-white sm:p-7">
            <span className="absolute -right-8 -top-8 size-32 rotate-45 rounded-[22px] border border-gold/40" aria-hidden />
            <span className="absolute bottom-0 right-16 top-0 w-3 bg-wine/80" aria-hidden />
            <div className="relative flex gap-4 pr-20 sm:pr-24">
              <Gift className="mt-1 size-7 shrink-0 text-gold" aria-hidden />
              <div>
                <h2 className="text-[16px] font-bold">{t("info.about.gifts.title")}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/75">{t("info.about.gifts.text")}</p>
                <Link href="/gifts" className={buttonVariants({ variant: "light", size: "sm", className: "mt-4" })}>
                  {t("info.about.gifts.action")}
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/catalog" className={buttonVariants({ variant: "primary", size: "lg" })}>
          {t("info.about.cta")}
        </Link>
      </div>
    </InfoLayout>
  );
}
