import type { Metadata } from "next";
import Link from "next/link";
import { searchBooks } from "@/lib/data/books";
import { getCatalogStats, getGenres, getSettings } from "@/lib/data/common";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { GenreChips } from "@/components/catalog/genre-chips";
import { Hero } from "@/components/home/hero";
import { BannerCarousel, type HomeBanner } from "@/components/home/banner-carousel";
import { BookShelf } from "@/components/home/book-shelf";
import { EbookPromo, GiftPromo, InfoStrip } from "@/components/home/promos";
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

/** Three books for the hero stack: the book of the week first, then different cover colors when possible */
function pickCovers(candidates: BookCardData[]): BookCardData[] {
  const [first, ...rest] = candidates;
  if (!first) return [];
  const picked = [first];
  const palettes = new Set([first.cover_url ? -1 : first.cover_palette % 4]);
  for (const book of rest) {
    if (picked.length >= 3) break;
    const key = book.cover_url ? -1 : book.cover_palette % 4;
    if (key !== -1 && palettes.has(key)) continue;
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
  const [settings, stats, genres, banners, newBooks, sale, ebooks, popular, featured] = await Promise.all([
    getSettings(),
    getCatalogStats(),
    getGenres(),
    getActiveBanners(locale),
    searchBooks({ sort: "new", pageSize: 10 }),
    searchBooks({ sale: true, sort: "popular", pageSize: 10 }),
    searchBooks({ format: "ebook", sort: "popular", pageSize: 10 }),
    searchBooks({ sort: "popular", pageSize: 10 }),
    searchBooks({ featured: true, sort: "popular", pageSize: 3 }),
  ]);

  const bookOfWeek = featured.items[0] ?? popular.items[0] ?? null;
  const covers = pickCovers(
    uniqueBooks([bookOfWeek ? [bookOfWeek] : [], featured.items, newBooks.items, popular.items], 30),
  );
  const catalogEmpty = newBooks.total === 0;

  return (
    <div className="pb-6">
      <Hero
        t={t}
        label={localized(settings, "hero_label", locale)}
        quote={localized(settings, "hero_quote", locale)}
        sub={localized(settings, "hero_sub", locale)}
        stats={stats}
        covers={covers}
        featured={bookOfWeek}
      />

      <div className="flex flex-col gap-12 pt-14 sm:gap-16 sm:pt-12 lg:gap-20 lg:pt-14">
        {banners.length > 0 && (
          <div className="nk-container -mb-2 sm:-mb-4">
            <BannerCarousel banners={banners} />
          </div>
        )}

        {genres.length > 0 && (
          <div className="nk-container">
            <h2 className="sr-only">{t("home.genres.title")}</h2>
            <GenreChips
              ariaLabel={t("home.genres.title")}
              genres={genres}
              locale={locale}
              allLabel={t("home.genres.all")}
              allHref="/catalog"
              allActive
              hrefFor={(slug) => `/catalog?genre=${encodeURIComponent(slug)}`}
              ebook={stats.ebooks > 0 ? { label: t("home.genres.ebooks"), href: "/catalog?format=ebook", active: false } : undefined}
            />
          </div>
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
            <BookShelf
              id="home-new"
              title={t("home.sections.newBooks")}
              href="/catalog?sort=new"
              linkLabel={t("home.sections.showAll")}
              books={newBooks.items}
              priority
            />
            <BookShelf
              id="home-sale"
              title={t("home.sections.sale")}
              meta={t("catalog.count", { count: sale.total })}
              href="/catalog?sale=1"
              linkLabel={t("home.sections.showAll")}
              books={sale.items}
            />
            <GiftPromo t={t} />
            <BookShelf
              id="home-ebooks"
              title={t("home.sections.ebooks")}
              meta={t("catalog.count", { count: ebooks.total })}
              href="/catalog?format=ebook"
              linkLabel={t("home.sections.showAll")}
              books={ebooks.items}
            />
            <BookShelf
              id="home-popular"
              title={t("home.sections.popular")}
              href="/catalog?sort=popular"
              linkLabel={t("home.sections.showAll")}
              books={popular.items}
            />
          </>
        )}

        <EbookPromo t={t} count={stats.ebooks} />
        <InfoStrip t={t} settings={settings} />
      </div>
    </div>
  );
}
