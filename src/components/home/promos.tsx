import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, Gift, Mailbox, ShoppingBag, Truck, type LucideIcon } from "lucide-react";
import { BookCover } from "@/components/book/book-cover";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { BookCardData, StoreSettings } from "@/types/app";
import { DiamondRule, Eyebrow, Octagram } from "./ornament";

/* -------------------------------------------------------------------------- */
/* Value props: one card right under the hero (overlaps its bottom edge)      */
/* -------------------------------------------------------------------------- */

export function ValueProps({ t, settings }: { t: TFunction; settings: StoreSettings }) {
  const items: { icon: LucideIcon; title: string; text: string; href: string; accent?: boolean }[] = [
    {
      icon: Truck,
      title: t("home.values.courierTitle", { price: formatPrice(settings.delivery_astana_price) }),
      text: t("home.values.courierText"),
      href: "/delivery",
    },
    {
      icon: Mailbox,
      title: t("home.values.kazpostTitle", { price: formatPrice(settings.delivery_kazpost_price) }),
      text: t("home.values.kazpostText"),
      href: "/delivery",
    },
    {
      icon: CreditCard,
      title: t("home.values.paymentTitle"),
      text: t("home.values.paymentText", { bank: settings.payment_bank }),
      href: "/payment",
    },
    ...(settings.gift_enabled
      ? [{ icon: Gift, title: t("home.values.giftTitle"), text: t("home.values.giftText"), href: "/gifts", accent: true }]
      : []),
  ];
  const free = settings.free_delivery_threshold !== null && settings.free_delivery_threshold > 0;

  return (
    <section aria-label={t("home.values.label")} className="nk-container relative z-10 -mt-10 sm:-mt-12 lg:-mt-16">
      <ul
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line shadow-lift",
          items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {items.map(({ icon: Icon, title, text, href, accent }, i) => (
          <li key={href + i} className={cn("bg-card", items.length === 3 && i === 2 && "max-lg:col-span-2")}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-2.5 p-4 transition hover:bg-card-2 sm:flex-row sm:items-center sm:gap-3.5 sm:p-5 lg:p-6"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl sm:size-11",
                  accent ? "bg-wine text-white" : "bg-wine-soft text-wine-ink",
                )}
              >
                <Icon className="size-[18px] sm:size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold leading-snug text-ink sm:text-sm">{title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted sm:text-[13px]">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {free && (
        <p className="mt-3 text-center text-xs font-bold text-success">
          {t("home.values.freeDelivery", { amount: formatPrice(settings.free_delivery_threshold) })}
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* «Досыңа сыйла»: navy section, a real cover tied with a gold ribbon + card  */
/* -------------------------------------------------------------------------- */

function GiftArt({ t, book }: { t: TFunction; book: BookCardData | null }) {
  return (
    <div className="relative mx-auto h-[250px] w-[260px] sm:h-[300px] sm:w-[320px]" aria-hidden>
      <span className="absolute left-2 top-8 size-3 rotate-45 border border-gold/70" />
      <span className="absolute right-6 top-2 size-2 rotate-45 bg-gold/80" />
      <span className="absolute bottom-10 left-0 size-2 rotate-45 bg-gold/50" />

      {/* wrapped book */}
      <div className="absolute left-[18%] top-[6%] w-[46%] -rotate-[6deg] shadow-[0_24px_48px_rgba(0,0,0,.5)]">
        {book ? (
          <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} size="lg" />
        ) : (
          <div className="aspect-[3/4] rounded-[4px_9px_9px_4px] bg-wine" />
        )}
        <span className="absolute inset-y-0 left-[58%] w-3 bg-gradient-to-r from-[#b8914a] via-[#e3c584] to-[#b8914a] shadow-[0_0_6px_rgba(0,0,0,.3)]" />
        <span className="absolute inset-x-0 top-[38%] h-3 bg-gradient-to-b from-[#b8914a] via-[#e3c584] to-[#b8914a] shadow-[0_0_6px_rgba(0,0,0,.3)]" />
        <span className="absolute left-[58%] top-[38%] size-7 -translate-x-[30%] -translate-y-[60%] rotate-45 rounded-[5px] border-[4px] border-[#e3c584]" />
        <span className="absolute left-[58%] top-[38%] size-3 -translate-y-[10%] translate-x-[15%] rotate-45 bg-[#e3c584]" />
      </div>

      {/* postcard */}
      <div className="absolute bottom-[4%] right-[2%] w-[56%] rotate-[5deg] rounded-xl bg-[#fbf8f2] p-3.5 text-[#121a2b] shadow-[0_18px_40px_rgba(0,0,0,.45)] sm:p-4">
        <div className="absolute inset-1.5 rounded-lg border border-[#c8a35a]/60" />
        <div className="relative">
          <span className="mx-auto mb-2 block size-2.5 rotate-45 bg-[#7d1a35]" />
          <p className="text-center font-serif text-[13px] font-semibold leading-tight sm:text-[15px]">{t("home.gift.cardTo")}</p>
          <DiamondRule className="mx-auto my-2 w-3/4 text-[#c8a35a]" />
          <p className="text-center font-serif text-[11px] italic leading-snug text-[#5d6678] sm:text-xs">{t("home.gift.cardWish")}</p>
        </div>
      </div>
    </div>
  );
}

export function GiftPromo({ t, book }: { t: TFunction; book: BookCardData | null }) {
  const steps = [t("home.gift.step1"), t("home.gift.step2"), t("home.gift.step3")];
  return (
    <section aria-labelledby="home-gift" className="nk-container">
      <div className="nk-hero-bg relative grid overflow-hidden rounded-[24px] text-white ring-1 ring-gold/20 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
        <div className="nk-girih pointer-events-none absolute inset-0 opacity-[.1] [mask-image:linear-gradient(to_left,#000,transparent_75%)]" aria-hidden />
        <div className="relative order-2 p-6 pt-2 sm:p-10 md:order-1 lg:p-14">
          <Eyebrow tone="navy" className="mb-4">{t("home.gift.label")}</Eyebrow>
          <h2 id="home-gift" className="font-serif text-[27px] font-semibold leading-tight sm:text-[36px]">
            {t("home.gift.title")}
          </h2>
          <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-white/75 sm:text-[15px]">{t("home.gift.text")}</p>
          <ol className="mt-6 flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3.5 text-sm font-semibold text-white/90">
                <span className="relative grid size-8 shrink-0 place-items-center font-serif text-[13px] font-semibold text-gold">
                  <Octagram className="absolute inset-0 size-full text-gold/70" strokeWidth={3} />
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Link href="/gifts" className={buttonVariants({ variant: "primary", size: "lg", className: "mt-8 w-full sm:w-auto" })}>
            <Gift className="size-[18px]" aria-hidden />
            {t("home.gift.cta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="relative order-1 flex items-center justify-center px-6 pt-8 md:order-2 md:py-12">
          <GiftArt t={t} book={book} />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* E-books: bordeaux banner when there are e-books, quiet «soon» card if not  */
/* -------------------------------------------------------------------------- */

export function EbookPromo({ t, count }: { t: TFunction; count: number }) {
  if (count === 0) {
    return (
      <section aria-labelledby="home-ebook-promo" className="nk-container">
        <div className="flex flex-col gap-4 rounded-[20px] border border-dashed border-gold/60 bg-card p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
          <span className="relative grid size-14 shrink-0 place-items-center text-wine-ink">
            <Octagram className="absolute inset-0 size-full text-gold" />
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="home-ebook-promo" className="flex flex-wrap items-center gap-2.5 font-serif text-lg font-semibold text-ink sm:text-xl">
              {t("home.ebookPromo.soonTitle")}
              <span className="rounded-full bg-gold-soft px-2.5 py-1 font-sans text-[11px] font-bold uppercase tracking-[.08em] text-warning">
                {t("home.ebookPromo.soon")}
              </span>
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted sm:text-sm">{t("home.ebookPromo.soonText")}</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="home-ebook-promo" className="nk-container">
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-[24px] bg-wine p-6 text-white sm:p-10 md:flex-row md:items-center md:justify-between lg:px-12">
        <div className="nk-girih pointer-events-none absolute inset-0 opacity-[.12] [mask-image:linear-gradient(to_left,#000,transparent_60%)]" aria-hidden />
        <div className="relative max-w-[680px]">
          <h2 id="home-ebook-promo" className="font-serif text-[22px] font-semibold leading-snug sm:text-[28px]">
            {t("home.ebookPromo.title")}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/80 sm:text-sm">{t("home.ebookPromo.text")}</p>
        </div>
        <Link href="/catalog?format=ebook" className={buttonVariants({ variant: "light", size: "lg", className: "relative w-full sm:w-auto" })}>
          {t("home.ebookPromo.cta", { count })}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How to order: three steps + help card (WhatsApp / call)                    */
/* -------------------------------------------------------------------------- */

export function HowToOrder({ t, settings }: { t: TFunction; settings: StoreSettings }) {
  const steps = [
    { icon: ShoppingBag, title: t("home.steps.step1Title"), text: t("home.steps.step1Text") },
    { icon: CreditCard, title: t("home.steps.step2Title"), text: t("home.steps.step2Text", { bank: settings.payment_bank }) },
    {
      icon: Truck,
      title: t("home.steps.step3Title"),
      text: t("home.steps.step3Text", {
        astana: formatPrice(settings.delivery_astana_price),
        kazpost: formatPrice(settings.delivery_kazpost_price),
      }),
    },
  ];

  return (
    <section aria-labelledby="home-steps" className="nk-container">
      <Eyebrow className="mb-3">{t("home.steps.eyebrow")}</Eyebrow>
      <h2 id="home-steps" className="font-serif text-[24px] font-semibold tracking-[-0.01em] text-ink sm:text-[30px] lg:text-[34px]">
        {t("home.steps.title")}
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:gap-5">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="relative flex gap-4 overflow-hidden rounded-[18px] border border-line bg-card p-5 sm:flex-col sm:gap-5 lg:p-6">
            <span className="pointer-events-none absolute right-4 top-2 font-serif text-[72px] font-semibold leading-none text-gold/15" aria-hidden>
              {i + 1}
            </span>
            <span className="relative grid size-12 shrink-0 place-items-center text-wine-ink">
              <Octagram className="absolute inset-0 size-full text-gold" />
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <div className="relative min-w-0">
              <h3 className="text-[15px] font-bold text-ink">
                <span className="sr-only">{i + 1}. </span>
                {title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
