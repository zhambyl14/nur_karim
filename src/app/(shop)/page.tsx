import type { Metadata } from "next";
import Link from "next/link";
import { searchBooks } from "@/lib/data/books";
import { getCatalogStats, getGenres, getSettings } from "@/lib/data/common";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { Hero } from "@/components/home/hero";
import { BannerCarousel, type HomeBanner } from "@/components/home/banner-carousel";
import { BookShelf } from "@/components/home/book-shelf";
import { GenreGrid } from "@/components/home/genre-grid";
import { EbookPromo, GiftPromo, HowToOrder, ValueProps } from "@/components/home/promos";
import type { BookCardData } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: t("home.meta.title") },
    description: t("home.meta.description"),
    alternates: { canonical: "/" },
  };
}

async function getActiveBanners(locale: "kk" | "ru"): Promise<HomeBanner[]> {
  const supabase = await createSupabaseServer();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("home banners failed", error);
    return [];
  }
  return (data ?? [])
    .filter((b) => !!b.image_url)
    .map((b) => ({
      id: b.id,
      title: localized(b, "title", locale),
      subtitle: localized(b, "subtitle", locale),
      button: localized(b, "button", locale),
      linkUrl: b.link_url?.trim() || null,
      imageUrl: b.image_url,
      imageMobileUrl: b.image_mobile_url?.trim() || null,
      textTheme: b.text_theme === "dark" ? "dark" : "light",
      overlay: b.overlay,
    }));
}

/** Number of published books per genre slug (for the genre tiles) */
async function getGenreCounts(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("catalog_books").select("genre_slug").eq("is_published", true);
  if (error) {
    console.error("home genre counts failed", error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.genre_slug) counts[row.genre_slug] = (counts[row.genre_slug] ?? 0) + 1;
  }
  return counts;
}

function uniqueBooks(lists: BookCardData[][], limit: number): BookCardData[] {
  const seen = new Set<string>();
  const out: BookCardData[] = [];
  for (const book of lists.flat()) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    out.push(book);
    if (out.length >= limit) break;
  }
  return out;
}

/** Three books for the hero stack: the book of the week first, then real photo covers / different colors */
function pickCovers(candidates: BookCardData[]): BookCardData[] {
  const [first, ...rest] = candidates;
  if (!first) return [];
  const picked = [first];
  const palettes = new Set([first.cover_url ? -1 : first.cover_palette % 4]);
  // real cover photos look best in the fan, take them first
  for (const book of rest) {
    if (picked.length >= 3) break;
    if (book.cover_url) picked.push(book);
  }
  for (const book of rest) {
    if (picked.length >= 3) break;
    if (picked.includes(book)) continue;
    const key = book.cover_palette % 4;
    if (palettes.has(key)) continue;
    palettes.add(key);
    picked.push(book);
  }
  for (const book of rest) {
    if (picked.length >= 3) break;
    if (!picked.includes(book)) picked.push(book);
  }
  return picked;
}

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const [settings, stats, genres, banners, genreCounts, newBooks, sale, ebooks, featured] = await Promise.all([
    getSettings(),
    getCatalogStats(),
    getGenres(),
    getActiveBanners(locale),
    getGenreCounts(),
    searchBooks({ sort: "new", pageSize: 10 }),
    searchBooks({ sale: true, sort: "popular", pageSize: 10 }),
    searchBooks({ format: "ebook", sort: "popular", pageSize: 10 }),
    searchBooks({ featured: true, sort: "popular", pageSize: 10 }),
  ]);

  // Two biggest genres get their own shelves
  const genreName = (slug: string) => {
    const g = genres.find((x) => x.slug === slug);
    return g ? (locale === "ru" ? g.name_ru : g.name_kk) : slug;
  };
  const topGenres = genres
    .map((g) => g.slug)
    .filter((slug) => (genreCounts[slug] ?? 0) >= 4)
    .sort((a, b) => (genreCounts[b] ?? 0) - (genreCounts[a] ?? 0))
    .slice(0, 2);
  const genreShelves = await Promise.all(topGenres.map((slug) => searchBooks({ genre: slug, sort: "popular", pageSize: 10 })));

  const bookOfWeek = featured.items[0] ?? newBooks.items[0] ?? null;
  const covers = pickCovers(uniqueBooks([bookOfWeek ? [bookOfWeek] : [], featured.items, newBooks.items], 30));
  const giftBook = featured.items.find((b) => b.cover_url && b.id !== bookOfWeek?.id) ?? featured.items[1] ?? null;
  const catalogEmpty = newBooks.total === 0;
  const quickLinks = [...genres]
    .sort((a, b) => (genreCounts[b.slug] ?? 0) - (genreCounts[a.slug] ?? 0))
    .slice(0, 4)
    .filter((g) => (genreCounts[g.slug] ?? 0) > 0)
    .map((g) => ({ href: `/catalog?genre=${encodeURIComponent(g.slug)}`, label: locale === "ru" ? g.name_ru : g.name_kk }));

  return (
    <div className="pb-8">
      <Hero
        t={t}
        label={localized(settings, "hero_label", locale)}
        quote={localized(settings, "hero_quote", locale)}
        sub={localized(settings, "hero_sub", locale)}
        stats={stats}
        genreCount={genres.length}
        quickLinks={quickLinks}
        covers={covers}
        featured={bookOfWeek}
      />

      <ValueProps t={t} settings={settings} />

      <div className="flex flex-col gap-14 pt-12 sm:gap-16 sm:pt-14 lg:gap-24 lg:pt-20">
        {banners.length > 0 && (
          <div className="nk-container">
            <BannerCarousel banners={banners} />
          </div>
        )}

        {genres.length > 0 && !catalogEmpty && (
          <GenreGrid t={t} genres={genres} counts={genreCounts} locale={locale} total={stats.books || newBooks.total} />
        )}

        {catalogEmpty ? (
          <div className="nk-container">
            <div className="rounded-[18px] border border-line bg-card">
              <EmptyState
                title={t("home.empty.title")}
                description={t("home.empty.text")}
                action={
                  <Link href="/contacts" className={buttonVariants({ variant: "ink" })}>
                    {t("home.empty.contacts")}
                  </Link>
                }
              />
            </div>
          </div>
        ) : (
          <>
            {featured.items.length >= 3 && (
              <BookShelf
                id="home-featured"
                eyebrow={t("home.sections.featuredEyebrow")}
                title={t("home.sections.featured")}
                href="/catalog?sort=popular"
                linkLabel={t("home.sections.showAll")}
                books={featured.items}
                priority
              />
            )}
            <BookShelf
              id="home-new"
              eyebrow={t("home.sections.newEyebrow")}
              title={t("home.sections.newBooks")}
              href="/catalog?sort=new"
              linkLabel={t("home.sections.showAll")}
              books={newBooks.items}
              priority={featured.items.length < 3}
            />
            <BookShelf
              id="home-sale"
              eyebrow={t("home.sections.saleEyebrow")}
              title={t("home.sections.sale")}
              meta={t("catalog.count", { count: sale.total })}
              href="/catalog?sale=1"
              linkLabel={t("home.sections.showAll")}
              books={sale.items}
            />
            {settings.gift_enabled && <GiftPromo t={t} book={giftBook} />}
            {topGenres.map((slug, i) => (
              <BookShelf
                key={slug}
                id={`home-genre-${slug}`}
                eyebrow={t("home.sections.genreEyebrow")}
                title={genreName(slug)}
                meta={t("catalog.count", { count: genreShelves[i].total })}
                href={`/catalog?genre=${encodeURIComponent(slug)}`}
                linkLabel={t("home.sections.showAll")}
                books={genreShelves[i].items}
              />
            ))}
            {ebooks.items.length >= 3 && (
              <BookShelf
                id="home-ebooks"
                eyebrow={t("home.sections.ebooksEyebrow")}
                title={t("home.sections.ebooks")}
                meta={t("catalog.count", { count: ebooks.total })}
                href="/catalog?format=ebook"
                linkLabel={t("home.sections.showAll")}
                books={ebooks.items}
              />
            )}
          </>
        )}

        <HowToOrder t={t} settings={settings} />
        <EbookPromo t={t} count={stats.ebooks} />
      </div>
    </div>
  );
}
