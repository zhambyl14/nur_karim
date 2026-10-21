import Link from "next/link";
import { Search, Star } from "lucide-react";
import { BookCover } from "@/components/book/book-cover";
import { formatNumber, formatPrice } from "@/lib/format";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { BookCardData } from "@/types/app";

/** Price shown for a book card: paper if it can be bought, otherwise the e-book */
function cardPrice(book: BookCardData): number | null {
  if (book.paper_enabled && book.stock > 0 && book.paper_final_price !== null) return book.paper_final_price;
  if (book.ebook_available && book.ebook_final_price !== null) return book.ebook_final_price;
  return book.min_price;
}

/** Navy hero from design 1a / 1c: hadith, search, stats, stacked covers + «Аптаның кітабы» */
export function Hero({
  t,
  label,
  quote,
  sub,
  stats,
  covers,
  featured,
}: {
  t: TFunction;
  label: string;
  quote: string;
  sub: string;
  stats: { books: number; ebooks: number };
  covers: BookCardData[];
  featured: BookCardData | null;
}) {
  const [front, left, right] = covers;

  return (
    <section className="nk-hero-bg relative text-white">
      <h1 className="sr-only">{t("home.meta.title")}</h1>
      <div className="nk-container relative grid items-center gap-10 pt-7 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pb-20 lg:pt-20">
        <div className="min-w-0">
          {label && (
            <div className="mb-4 flex items-center gap-3 sm:mb-6">
              <span className="h-px w-7 bg-gold" aria-hidden />
              <span className="text-[11px] font-bold tracking-[.22em] text-gold">{label}</span>
            </div>
          )}
          <p className="max-w-[640px] font-serif text-[24px] font-normal italic leading-[1.25] tracking-[-0.01em] text-balance-nk sm:text-[38px] lg:text-[46px] lg:leading-[1.18]">
            {quote}
          </p>
          {sub && <p className="mt-3 max-w-[520px] text-[13px] leading-relaxed text-white/70 sm:mt-5 sm:text-[15px]">{sub}</p>}

          <form
            action="/catalog"
            method="get"
            role="search"
            className="relative z-10 -mb-7 mt-5 flex h-[56px] items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-[0_18px_40px_rgba(11,24,48,.35)] focus-within:ring-2 focus-within:ring-gold sm:mb-0 sm:mt-8 sm:h-[62px] sm:max-w-[590px] sm:pl-5"
          >
            <label htmlFor="hero-q" className="sr-only">
              {t("home.hero.searchLabel")}
            </label>
            <Search className="size-[18px] shrink-0 text-[#8a92a3]" aria-hidden />
            <input
              id="hero-q"
              type="search"
              name="q"
              maxLength={100}
              enterKeyHint="search"
              placeholder={t("home.hero.searchPlaceholder")}
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#121a2b] placeholder:text-[#8a92a3] focus:outline-none sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              className="h-full shrink-0 rounded-xl bg-wine px-4 text-[13px] font-bold text-white transition hover:bg-wine-hover sm:px-6 sm:text-sm"
            >
              {t("home.hero.searchButton")}
            </button>
          </form>

          <dl className="mt-9 hidden max-w-[590px] grid-cols-3 sm:grid">
            {[
              { value: formatNumber(stats.books), label: t("home.hero.statBooks") },
              ...(stats.ebooks > 0 ? [{ value: formatNumber(stats.ebooks), label: t("home.hero.statEbooks") }] : []),
              { value: t("home.hero.statDeliveryValue"), label: t("home.hero.statDelivery") },
            ].map((stat, i) => (
              <div key={stat.label} className={cn("min-w-0 pr-4", i > 0 && "border-l border-white/15 pl-6")}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-serif text-[28px] font-semibold leading-none">{stat.value}</dd>
                <dd className="mt-1.5 text-xs font-medium text-white/60">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {front && (
          <div className="relative hidden h-[420px] lg:block" aria-label={t("home.hero.coversLabel")} role="group">
            <div className="absolute left-1/2 top-1/2 h-[360px] w-[270px] -translate-x-1/2 -translate-y-1/2">
              {left && (
                <Link
                  href={`/books/${left.slug}`}
                  aria-label={left.title}
                  className="absolute left-[-150px] top-[34px] block w-[230px] -rotate-[9deg] shadow-[0_24px_50px_rgba(0,0,0,.45)] transition duration-300 hover:-rotate-[6deg] hover:-translate-y-1"
                >
                  <BookCover title={left.title} author={left.author} coverUrl={left.cover_url} palette={left.cover_palette} size="lg" />
                </Link>
              )}
              {right && (
                <Link
                  href={`/books/${right.slug}`}
                  aria-label={right.title}
                  className="absolute right-[-150px] top-[44px] block w-[230px] rotate-[9deg] shadow-[0_24px_50px_rgba(0,0,0,.45)] transition duration-300 hover:rotate-[6deg] hover:-translate-y-1"
                >
                  <BookCover title={right.title} author={right.author} coverUrl={right.cover_url} palette={right.cover_palette} size="lg" />
                </Link>
              )}
              <Link
                href={`/books/${front.slug}`}
                aria-label={front.title}
                className="absolute inset-0 z-10 block rotate-[3deg] shadow-[0_30px_60px_rgba(0,0,0,.5)] transition duration-300 hover:rotate-[1deg] hover:-translate-y-1"
              >
                <BookCover title={front.title} author={front.author} coverUrl={front.cover_url} palette={front.cover_palette} size="xl" priority />
              </Link>
            </div>

            {featured && (
              <Link
                href={`/books/${featured.slug}`}
                className="absolute bottom-2 left-[8%] z-20 flex max-w-[300px] animate-float items-center gap-3 rounded-2xl bg-white p-3 pr-5 text-[#121a2b] shadow-[0_18px_40px_rgba(0,0,0,.35)] transition hover:scale-[1.02]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6e9ec] text-[#7d1a35]">
                  <Star className="size-4" fill="currentColor" strokeWidth={0} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold">{t("home.hero.bookOfWeek")}</span>
                  <span className="block truncate text-xs text-[#5d6678]">
                    {featured.title}
                    {cardPrice(featured) !== null && ` · ${formatPrice(cardPrice(featured))}`}
                  </span>
                </span>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export { cardPrice };
