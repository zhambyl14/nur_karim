import Link from "next/link";
import { ArrowRight, BookOpenCheck, MonitorSmartphone, TabletSmartphone, Zap } from "lucide-react";
import { BookCard } from "@/components/book/book-card";
import { buttonVariants } from "@/components/ui/button";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { BookCardData } from "@/types/app";
import { Octagram } from "./ornament";

/**
 * Home «Е-кітап» showcase: its own navy panel, so e-books never mix with the
 * paper shelves. Phones: header, swipe row of e-book cards, button.
 * Laptops: header + button on the left, a grid of e-book cards on the right.
 */
export function EbookShowcase({ t, books, total }: { t: TFunction; books: BookCardData[]; total: number }) {
  if (books.length === 0) return null;
  const points = [
    { icon: Zap, text: t("home.ebookShowcase.point1") },
    { icon: MonitorSmartphone, text: t("home.ebookShowcase.point2") },
    { icon: BookOpenCheck, text: t("home.ebookShowcase.point3") },
  ];

  return (
    <section aria-labelledby="home-ebooks" className="nk-container">
      <div className="nk-hero-bg relative isolate overflow-hidden rounded-[28px] text-white shadow-lift">
        <div
          className="nk-girih pointer-events-none absolute inset-0 -z-10 opacity-[.10] [mask-image:radial-gradient(120%_90%_at_0%_0%,#000,transparent_70%)]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-6 -top-10 -z-10 select-none font-serif text-[180px] font-semibold leading-none text-white/[0.04] sm:text-[240px] lg:text-[300px]"
          aria-hidden
        >
          E
        </span>
        <div className="nk-hairline-gold absolute inset-x-10 top-0 h-px opacity-70" aria-hidden />

        <div className="grid gap-6 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:grid-rows-[1fr_auto] lg:gap-x-10 lg:gap-y-6 lg:p-10 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:p-12">
          {/* header */}
          <div className="lg:col-start-1 lg:row-start-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-gold">
              <TabletSmartphone className="size-3.5" aria-hidden />
              {t("home.ebookShowcase.badge")}
            </span>
            <h2
              id="home-ebooks"
              className="mt-4 font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-white sm:text-[34px] lg:text-[38px]"
            >
              {t("home.ebookShowcase.title")}
            </h2>
            <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-white/75 sm:text-sm">
              {t("home.ebookShowcase.text")}
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[13px] font-semibold text-white/90">
                  <span className="relative grid size-9 shrink-0 place-items-center text-gold">
                    <Octagram className="absolute inset-0 size-full text-gold/60" strokeWidth={1.6} />
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* e-book cards */}
          <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center xl:grid-cols-4">
            {books.slice(0, 8).map((book, i) => (
              <li
                key={book.id}
                className={cn(
                  "w-[44%] max-w-[200px] shrink-0 snap-start text-ink sm:w-auto sm:max-w-none",
                  i < 3 ? "sm:block" : "sm:hidden",
                  i < 4 ? "xl:block" : "xl:hidden",
                )}
              >
                <BookCard book={book} only="ebook" className="h-full" />
              </li>
            ))}
          </ul>

          {/* button */}
          <div className="lg:col-start-1 lg:row-start-2 lg:self-end">
            <Link
              href="/catalog?format=ebook"
              className={buttonVariants({ variant: "light", size: "lg", className: "w-full sm:w-auto" })}
            >
              {t("home.ebookShowcase.cta", { count: total })}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
