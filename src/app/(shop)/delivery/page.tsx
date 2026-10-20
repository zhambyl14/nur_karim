import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Clock, Gift, Mail, TabletSmartphone, Truck } from "lucide-react";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/format";
import { DiamondList, IconBadge, InfoCard, InfoLayout, InfoSteps } from "@/components/home/info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("info.delivery.meta.title"),
    description: t("info.delivery.meta.description"),
    alternates: { canonical: "/delivery" },
  };
}

function MethodCard({
  icon,
  title,
  price,
  time,
  points,
  accent,
}: {
  icon: ReactNode;
  title: string;
  price: string;
  time: string;
  points: string[];
  accent?: boolean;
}) {
  return (
    <article className="flex flex-col rounded-[18px] border border-line bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <IconBadge>{icon}</IconBadge>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-chip px-3 py-1.5 text-[12px] font-bold text-ink-2">
          <Clock className="size-3.5" aria-hidden />
          {time}
        </span>
      </div>
      <h2 className="mt-4 text-[17px] font-bold text-ink">{title}</h2>
      <div className={accent ? "mt-1 font-serif text-[26px] font-semibold text-wine-ink" : "mt-1 font-serif text-[26px] font-semibold text-ink"}>
        {price}
      </div>
      <div className="my-4 h-px bg-line" aria-hidden />
      <DiamondList items={points} />
    </article>
  );
}

export default async function DeliveryPage() {
  const [{ t }, settings] = await Promise.all([getI18n(), getSettings()]);
  const free = settings.free_delivery_threshold;

  return (
    <InfoLayout
      t={t}
      current="delivery"
      title={t("info.delivery.title")}
      lead={t("info.delivery.lead")}
      heroExtra={
        free && free > 0 ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-2 text-[13px] font-semibold text-gold">
            <Gift className="size-4" aria-hidden />
            {t("info.delivery.free", { amount: formatPrice(free) })}
          </p>
        ) : null
      }
    >
      <div className="grid gap-4 md:grid-cols-3 sm:gap-5">
        <MethodCard
          icon={<Truck className="size-5" aria-hidden />}
          title={t("info.delivery.courier.title")}
          price={t("info.delivery.courier.price", { price: formatPrice(settings.delivery_astana_price) })}
          time={t("info.delivery.courier.time")}
          points={[
            t("info.delivery.courier.points.p1"),
            t("info.delivery.courier.points.p2"),
            t("info.delivery.courier.points.p3"),
          ]}
        />
        <MethodCard
          icon={<Mail className="size-5" aria-hidden />}
          title={t("info.delivery.kazpost.title")}
          price={t("info.delivery.kazpost.price", { price: formatPrice(settings.delivery_kazpost_price) })}
          time={t("info.delivery.kazpost.time")}
          points={[
            t("info.delivery.kazpost.points.p1"),
            t("info.delivery.kazpost.points.p2"),
            t("info.delivery.kazpost.points.p3"),
          ]}
        />
        <MethodCard
          accent
          icon={<TabletSmartphone className="size-5" aria-hidden />}
          title={t("info.delivery.ebook.title")}
          price={t("info.delivery.ebook.price")}
          time={t("info.delivery.ebook.time")}
          points={[
            t("info.delivery.ebook.points.p1"),
            t("info.delivery.ebook.points.p2"),
            t("info.delivery.ebook.points.p3"),
          ]}
        />
      </div>

      <InfoSteps
        title={t("info.delivery.steps.title")}
        steps={(["s1", "s2", "s3", "s4"] as const).map((key) => ({
          title: t(`info.delivery.steps.${key}.title`),
          text: t(`info.delivery.steps.${key}.text`),
        }))}
      />

      <InfoCard title={t("info.delivery.faq.title")}>
        <div className="divide-y divide-line">
          {([1, 2, 3, 4] as const).map((n) => (
            <details key={n} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                {t(`info.delivery.faq.q${n}`)}
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-chip text-lg leading-none text-muted transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="pb-4 pr-10 text-sm leading-relaxed text-muted">{t(`info.delivery.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </InfoCard>
    </InfoLayout>
  );
}
