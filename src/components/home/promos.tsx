import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, CreditCard, Mailbox, Truck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { StoreSettings } from "@/types/app";

/** Gift box drawn with CSS: bordeaux box, gold ribbon, diamond bow */
function GiftArt() {
  return (
    <div className="relative mx-auto h-[190px] w-[220px]" aria-hidden>
      <span className="absolute left-3 top-6 size-3 rotate-45 border border-gold/70" />
      <span className="absolute right-4 top-2 size-2 rotate-45 bg-gold/80" />
      <span className="absolute bottom-8 left-0 size-2 rotate-45 bg-wine/50" />
      <span className="absolute bottom-3 right-1 size-3.5 rotate-45 border border-wine/40" />
      {/* bow */}
      <span className="absolute left-1/2 top-[22px] size-9 -translate-x-[110%] rotate-45 rounded-[6px] border-[5px] border-gold" />
      <span className="absolute left-1/2 top-[22px] size-9 translate-x-[10%] rotate-45 rounded-[6px] border-[5px] border-gold" />
      {/* lid */}
      <span className="absolute left-1/2 top-[58px] h-9 w-[168px] -translate-x-1/2 rounded-[8px] bg-wine-hover shadow-[0_6px_14px_rgb(var(--nk-shadow-color)/.25)]" />
      {/* box */}
      <span className="absolute left-1/2 top-[90px] h-[96px] w-[148px] -translate-x-1/2 rounded-b-[10px] bg-wine" />
      {/* ribbon */}
      <span className="absolute left-1/2 top-[58px] h-[128px] w-[18px] -translate-x-1/2 bg-gold" />
      <span className="absolute left-1/2 top-[124px] h-[14px] w-[148px] -translate-x-1/2 bg-gold/90" />
      <span className="absolute left-1/2 top-[50px] size-4 -translate-x-1/2 rotate-45 bg-gold ring-4 ring-gold/30" />
    </div>
  );
}

export function GiftPromo({ t }: { t: TFunction }) {
  const points = [t("home.gift.point1"), t("home.gift.point2"), t("home.gift.point3")];
  return (
    <section aria-labelledby="home-gift" className="nk-container">
      <div className="relative grid overflow-hidden rounded-[24px] border border-line bg-card md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="relative p-6 sm:p-10 lg:p-12">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-7 bg-gold" aria-hidden />
            <span className="text-[11px] font-bold tracking-[.22em] text-wine-ink">{t("home.gift.label")}</span>
          </div>
          <h2 id="home-gift" className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[34px]">
            {t("home.gift.title")}
          </h2>
          <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-muted sm:text-[15px]">{t("home.gift.text")}</p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-sm font-semibold text-ink-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-wine-soft text-wine-ink">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <Link href="/gifts" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-7" })}>
            {t("home.gift.cta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="relative flex items-center justify-center bg-wine-soft px-6 py-8 md:py-0">
          <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-gold/60 to-transparent md:block" aria-hidden />
          <GiftArt />
        </div>
      </div>
    </section>
  );
}

export function EbookPromo({ t, count }: { t: TFunction; count: number }) {
  return (
    <section aria-labelledby="home-ebook-promo" className="nk-container">
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] bg-wine p-6 text-white sm:p-10 md:flex-row md:items-center md:justify-between lg:px-12">
        <span
          className="pointer-events-none absolute -right-16 top-1/2 size-[260px] -translate-y-1/2 rotate-45 border border-white/15"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-4 top-1/2 size-[170px] -translate-y-1/2 rotate-45 border border-gold/30"
          aria-hidden
        />
        <div className="relative max-w-[680px]">
          <h2 id="home-ebook-promo" className="font-serif text-[22px] font-semibold leading-snug sm:text-[28px]">
            {t("home.ebookPromo.title")}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/75 sm:text-sm">{t("home.ebookPromo.text")}</p>
        </div>
        <Link
          href={count > 0 ? "/catalog?format=ebook" : "/catalog"}
          className={buttonVariants({ variant: "light", size: "lg", className: "relative w-full sm:w-auto" })}
        >
          {count > 0 ? t("home.ebookPromo.cta", { count }) : t("home.ebookPromo.ctaEmpty")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export function InfoStrip({ t, settings }: { t: TFunction; settings: StoreSettings }) {
  const items = [
    {
      icon: Truck,
      title: t("home.info.courierTitle"),
      text: t("home.info.courierText", { price: formatPrice(settings.delivery_astana_price) }),
      href: "/delivery",
    },
    {
      icon: Mailbox,
      title: t("home.info.kazpostTitle"),
      text: t("home.info.kazpostText", { price: formatPrice(settings.delivery_kazpost_price) }),
      href: "/delivery",
    },
    {
      icon: CreditCard,
      title: t("home.info.paymentTitle"),
      text: t("home.info.paymentText", { bank: settings.payment_bank }),
      href: "/payment",
    },
    {
      icon: BookOpenCheck,
      title: t("home.info.ebookTitle"),
      text: t("home.info.ebookText"),
      href: "/payment",
    },
  ];
  return (
    <section aria-labelledby="home-info" className="nk-container">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="home-info" className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-ink sm:text-[28px]">
          {t("home.info.title")}
        </h2>
        {settings.free_delivery_threshold !== null && settings.free_delivery_threshold > 0 && (
          <span className="rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
            {t("home.info.freeDelivery", { amount: formatPrice(settings.free_delivery_threshold) })}
          </span>
        )}
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {items.map(({ icon: Icon, title, text, href }, i) => (
          <li key={title}>
            <Link
              href={href}
              className={cn(
                "group flex h-full gap-4 rounded-[18px] border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift",
              )}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl",
                  i === 3 ? "bg-wine-soft text-wine-ink" : "bg-subtle text-ink",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{title}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
