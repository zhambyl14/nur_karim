import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenCheck,
  CalendarClock,
  ChevronDown,
  CreditCard,
  EyeOff,
  Gift,
  Heart,
  MailOpen,
  MapPinned,
  PackageOpen,
  PenLine,
  Search,
} from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getSettings } from "@/lib/data/common";
import { searchBooks } from "@/lib/data/books";
import { DEFAULT_OG_IMAGE, GIFT_CARD_THEMES } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { BookGrid } from "@/components/book/book-card";
import { Postcard } from "@/components/gift/postcard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("gift.landing.metaTitle"),
    description: t("gift.landing.metaDescription"),
    alternates: { canonical: "/gifts" },
    openGraph: { title: t("gift.landing.metaTitle"), description: t("gift.landing.metaDescription"), images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function GiftsLandingPage() {
  const [{ t }, settings, popular] = await Promise.all([
    getI18n(),
    getSettings(),
    searchBooks({ sort: "popular", pageSize: 10 }).catch(() => ({ items: [], total: 0 })),
  ]);

  const steps = [
    { icon: Search, title: t("gift.landing.steps.one"), text: t("gift.landing.steps.oneText") },
    { icon: PenLine, title: t("gift.landing.steps.two"), text: t("gift.landing.steps.twoText") },
    { icon: CreditCard, title: t("gift.landing.steps.three"), text: t("gift.landing.steps.threeText") },
    { icon: MailOpen, title: t("gift.landing.steps.four"), text: t("gift.landing.steps.fourText") },
  ];
  const features = [
    { icon: MapPinned, title: t("gift.landing.features.address"), text: t("gift.landing.features.addressText") },
    { icon: CalendarClock, title: t("gift.landing.features.reveal"), text: t("gift.landing.features.revealText") },
    { icon: BookOpenCheck, title: t("gift.landing.features.ebook"), text: t("gift.landing.features.ebookText") },
    {
      icon: PackageOpen,
      title: t("gift.landing.features.wrap"),
      text:
        settings.gift_wrap_price > 0
          ? t("gift.landing.features.wrapText", { price: formatPrice(settings.gift_wrap_price) })
          : t("gift.landing.features.wrapTextNoPrice"),
    },
    { icon: EyeOff, title: t("gift.landing.features.anonymous"), text: t("gift.landing.features.anonymousText") },
    { icon: Heart, title: t("gift.landing.features.thanks"), text: t("gift.landing.features.thanksText") },
  ];
  const faq = (["1", "2", "3", "4", "5"] as const).map((n) => ({
    q: t(`gift.landing.faq.q${n}`),
    a: t(`gift.landing.faq.a${n}`),
  }));

  return (
    <>
      {/* hero */}
      <section className="nk-hero-bg relative overflow-hidden bg-navy text-white">
        <span className="absolute -right-24 top-10 size-72 rotate-45 border border-gold/20" aria-hidden />
        <span className="absolute -right-10 top-28 size-40 rotate-45 bg-wine/80" aria-hidden />
        <div className="nk-container relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-20">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{t("gift.landing.eyebrow")}</div>
            <h1 className="mt-4 font-serif text-[36px] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-[52px]">
              {t("gift.landing.title")}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-base">{t("gift.landing.lead")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/catalog" className={buttonVariants({ variant: "primary", size: "lg" })}>
                <Gift className="size-[18px]" aria-hidden />
                {t("gift.landing.cta")}
              </Link>
              <a href="#how" className={buttonVariants({ variant: "glass", size: "lg" })}>
                {t("gift.landing.ctaSecondary")}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[440px]">
            <Postcard
              size="md"
              className="relative z-10 rotate-[-3deg] animate-float"
              theme="birthday"
              headline={t("gift.headlines.birthday")}
              to={t("gift.postcard.to", { name: t("gift.landing.sampleName") })}
              message={t("gift.landing.sampleMessage")}
              from={t("gift.postcard.from", { name: t("gift.landing.sampleSender") })}
              ariaLabel={t("gift.postcard.aria", { theme: t("gift.themes.birthday") })}
            />
            <div className="absolute -bottom-6 -left-4 z-0 w-[70%] rotate-[6deg] opacity-80" aria-hidden>
              <Postcard size="sm" theme="classic" headline={t("gift.headlines.classic")} />
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="nk-container scroll-mt-24 py-12 sm:py-16">
        <SectionTitle title={t("gift.landing.stepsTitle")} />
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={i} className="relative rounded-[20px] border border-line bg-card p-5">
              <span className="absolute right-4 top-3 font-serif text-[40px] font-semibold leading-none text-line-strong" aria-hidden>
                {i + 1}
              </span>
              <span className="grid size-11 place-items-center rounded-xl bg-wine-soft text-wine-ink" aria-hidden>
                <s.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* postcard themes */}
      <section className="bg-subtle py-12 sm:py-16">
        <div className="nk-container">
          <SectionTitle title={t("gift.landing.themesTitle")} />
          <p className="mt-2 max-w-2xl text-sm text-muted">{t("gift.landing.themesText")}</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {GIFT_CARD_THEMES.map((theme) => (
              <li key={theme}>
                <Postcard
                  size="sm"
                  theme={theme}
                  headline={t(`gift.headlines.${theme}`)}
                  ariaLabel={t("gift.postcard.aria", { theme: t(`gift.themes.${theme}`) })}
                  className="transition hover:-translate-y-1"
                />
                <div className="mt-2 text-center text-[13px] font-bold text-ink-2">{t(`gift.themes.${theme}`)}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* features */}
      <section className="nk-container py-12 sm:py-16">
        <SectionTitle title={t("gift.landing.featuresTitle")} />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <li key={i} className="flex gap-4 rounded-[20px] border border-line bg-card p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-on-primary" aria-hidden>
                <f.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-ink">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* popular gift books */}
      {popular.items.length > 0 && (
        <section className="nk-container pb-12 sm:pb-16">
          <SectionTitle
            title={t("gift.landing.popularTitle")}
            action={
              <Link href="/catalog?sort=popular" className="text-sm font-bold text-wine-ink hover:underline">
                {t("gift.landing.popularAction")} →
              </Link>
            }
          />
          <div className="mt-6">
            <BookGrid books={popular.items} />
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="nk-container pb-12 sm:pb-16">
        <SectionTitle title={t("gift.landing.faqTitle")} />
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-card">
          {faq.map((item, i) => (
            <details key={i} className="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-ink">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="nk-container pb-14 sm:pb-20">
        <div className="relative overflow-hidden rounded-[28px] bg-wine px-6 py-10 text-center text-white sm:py-14">
          <span className="absolute -left-10 -top-10 size-40 rotate-45 border border-white/15" aria-hidden />
          <span className="absolute -bottom-12 -right-8 size-36 rotate-45 border border-gold/30" aria-hidden />
          <h2 className="relative font-serif text-[28px] font-semibold sm:text-[36px]">{t("gift.landing.finalTitle")}</h2>
          <p className="relative mt-2 text-white/75">{t("gift.landing.finalText")}</p>
          <Link href="/catalog" className={buttonVariants({ variant: "light", size: "lg", className: "relative mt-6" })}>
            <Gift className="size-[18px]" aria-hidden />
            {t("gift.landing.cta")}
          </Link>
        </div>
      </section>
    </>
  );
}
