import Link from "next/link";
import { Search, Star } from "lucide-react";
import { BookCover } from "@/components/book/book-cover";
import { formatNumber, formatPrice } from "@/lib/format";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { BookCardData } from "@/types/app";
import { ArchOutline, Eyebrow } from "./ornament";

/** Price shown for a book card: paper if it can be bought, otherwise the e-book */
function cardPrice(book: BookCardData): number | null {
  if (book.paper_enabled && book.stock > 0 && book.paper_final_price !== null) return book.paper_final_price;
  if (book.ebook_available && book.ebook_final_price !== null) return book.ebook_final_price;
  return book.min_price;
}

function CoverLink({ book, className, size, priority }: { book: BookCardData; className: string; size: "lg" | "xl"; priority?: boolean }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      aria-label={book.title}
      className={cn("absolute block rounded-[4px_9px_9px_4px] transition duration-300 ease-out", className)}
    >
      <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} palette={book.cover_palette} size={size} priority={priority} />
    </Link>
  );
}

/** Fanned stack of three covers inside a thin gold mihrab arch */
function CoverFan({ t, covers, featured }: { t: TFunction; covers: BookCardData[]; featured: BookCardData | null }) {
  const [front, left, right] = covers;
  if (!front) return null;
  const price = featured ? cardPrice(featured) : null;
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px] sm:h-[380px] lg:h-[470px]" role="group" aria-label={t("home.hero.coversLabel")}>
      <ArchOutline className="absolute bottom-6 left-1/2 h-[92%] -translate-x-1/2 text-gold/45" />
      <span className="absolute left-1/2 top-[30%] size-[220px] -translate-x-1/2 rounded-full bg-wine/40 blur-3xl sm:size-[300px]" aria-hidden />

      <div className="absolute left-1/2 top-[46%] w-[138px] -translate-x-1/2 -translate-y-1/2 sm:w-[180px] lg:top-1/2 lg:w-[250px]">
        <div className="relative aspect-[3/4]">
          {left && (
            <CoverLink
              book={left}
              size="lg"
              priority
              className="left-[-62%] top-[8%] w-[86%] -rotate-[10deg] opacity-95 shadow-[0_20px_40px_rgba(0,0,0,.45)] hover:-translate-y-1 hover:-rotate-[7deg]"
            />
          )}
          {right && (
            <CoverLink
              book={right}
              size="lg"
              priority
              className="right-[-62%] top-[11%] w-[86%] rotate-[10deg] opacity-95 shadow-[0_20px_40px_rgba(0,0,0,.45)] hover:-translate-y-1 hover:rotate-[7deg]"
            />
          )}
          <CoverLink
            book={front}
            size="xl"
            priority
            className="inset-0 z-10 rotate-[2deg] shadow-[0_28px_56px_rgba(0,0,0,.55)] hover:-translate-y-1.5 hover:rotate-0"
          />
        </div>
      </div>

      {featured && (
        <Link
          href={`/books/${featured.slug}`}
          className="absolute bottom-0 left-1/2 z-20 flex w-max max-w-[min(300px,92%)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 text-[#121a2b] shadow-[0_18px_40px_rgba(0,0,0,.4)] transition hover:-translate-y-0.5 lg:bottom-4 lg:left-[6%] lg:translate-x-0 lg:motion-safe:animate-float"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6e9ec] text-[#7d1a35]">
            <Star className="size-4" fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#7d1a35]">{t("home.hero.bookOfWeek")}</span>
            <span className="block truncate text-[13px] font-semibold">
              {featured.title}
              {price !== null && <span className="font-serif font-semibold text-[#5d6678]"> · {formatPrice(price)}</span>}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}

/** Navy hero: hadith from settings, search, quick genre links, stats, fanned covers */
export function Hero({
  t,
  label,
  quote,
  sub,
  stats,
  genreCount,
  quickLinks,
  covers,
  featured,
}: {
  t: TFunction;
  label: string;
  quote: string;
  sub: string;
  stats: { books: number; ebooks: number };
  genreCount: number;
  quickLinks: { href: string; label: string }[];
  covers: BookCardData[];
  featured: BookCardData | null;
}) {
  const statItems = [
    { value: formatNumber(stats.books), label: t("home.hero.statBooks") },
    stats.ebooks > 0
      ? { value: formatNumber(stats.ebooks), label: t("home.hero.statEbooks") }
      : { value: formatNumber(genreCount), label: t("home.hero.statGenres") },
    { value: t("home.hero.statDeliveryValue"), label: t("home.hero.statDelivery") },
  ];

  return (
    <section className="nk-hero-bg nk-home-motion relative overflow-hidden text-white">
      <h1 className="sr-only">{t("home.meta.title")}</h1>
      <div
        className="nk-girih pointer-events-none absolute inset-0 opacity-[.13] [mask-image:radial-gradient(70%_80%_at_80%_40%,#000,transparent)] max-lg:[mask-image:radial-gradient(90%_55%_at_50%_80%,#000,transparent)]"
        aria-hidden
      />
      <div className="nk-container relative grid items-center gap-6 pb-16 pt-7 sm:gap-8 sm:pb-20 sm:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 lg:pb-28 lg:pt-16">
        <div className="min-w-0">
          {label && <Eyebrow tone="navy" className="mb-4 sm:mb-6">{label}</Eyebrow>}
          <p className="max-w-[640px] font-serif text-[25px] font-normal italic leading-[1.28] tracking-[-0.01em] text-balance-nk sm:text-[38px] lg:text-[44px] lg:leading-[1.2]">
            {quote}
          </p>
          {sub && <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-white/70 sm:mt-5 sm:text-[15px]">{sub}</p>}

          <form
            action="/catalog"
            method="get"
            role="search"
            className="relative mt-6 flex h-[56px] items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-[0_18px_40px_rgba(3,8,20,.45)] ring-1 ring-gold/30 focus-within:ring-2 focus-within:ring-gold sm:mt-8 sm:h-[62px] sm:max-w-[590px] sm:pl-5"
          >
            <label htmlFor="hero-q" className="sr-only">
              {t("home.hero.searchLabel")}
            </label>
            <Search className="size-[18px] shrink-0 text-[#5d6678]" aria-hidden />
            <input
              id="hero-q"
              type="search"
              name="q"
              maxLength={100}
              enterKeyHint="search"
              placeholder={t("home.hero.searchPlaceholder")}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#121a2b] placeholder:text-[#6b7385] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              className="h-full shrink-0 rounded-xl bg-wine px-4 text-[13px] font-bold text-white transition hover:bg-wine-hover focus-visible:outline-offset-[-4px] sm:px-6 sm:text-sm"
            >
              {t("home.hero.searchButton")}
            </button>
          </form>

          {quickLinks.length > 0 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar max-sm:-mx-4 max-sm:px-4">
              <span className="shrink-0 text-xs font-semibold text-white/55">{t("home.hero.popular")}</span>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-9 shrink-0 items-center rounded-full border border-white/15 bg-white/[0.06] px-3.5 text-[12.5px] font-semibold text-white/85 transition hover:border-gold/60 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <dl className="mt-9 hidden max-w-[590px] grid-cols-3 sm:grid">
            {statItems.map((stat, i) => (
              <div key={stat.label} className={cn("flex min-w-0 flex-col-reverse pr-4", i > 0 && "border-l border-white/15 pl-6")}>
                <dt className="mt-1.5 text-xs font-medium text-white/60">{stat.label}</dt>
                <dd className="font-serif text-[30px] font-semibold leading-none text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <CoverFan t={t} covers={covers} featured={featured} />
      </div>
      <div className="nk-hairline-gold absolute inset-x-0 bottom-0 opacity-40" aria-hidden />
    </section>
  );
}

export { cardPrice };
