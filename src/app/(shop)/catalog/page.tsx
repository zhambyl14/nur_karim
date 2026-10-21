import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, SearchX } from "lucide-react";
import { searchBooks } from "@/lib/data/books";
import { getGenres } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { CATALOG_PAGE_SIZE } from "@/lib/constants";
import { BookGrid } from "@/components/book/book-card";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { ActiveFilters } from "@/components/catalog/active-filters";
import { CatalogHeader } from "@/components/catalog/catalog-header";
import { CatalogSearch } from "@/components/catalog/catalog-search";
import { DesktopFilters, MobileFilters } from "@/components/catalog/catalog-filters";
import { GenreChips } from "@/components/catalog/genre-chips";
import { SortSelect } from "@/components/catalog/sort-select";
import { catalogHref, hasAnyFilter, parseCatalogParams, type RawSearchParams } from "@/components/catalog/params";
import type { TKey } from "@/lib/i18n/translate";

/** Short description under the heading for each genre (slugs from the genres table) */
const GENRE_INTRO: Record<string, TKey> = {
  akida: "catalog.genreIntro.akida",
  fikh: "catalog.genreIntro.fikh",
  patualar: "catalog.genreIntro.patualar",
  sira: "catalog.genreIntro.sira",
  hadis: "catalog.genreIntro.hadis",
  tarbie: "catalog.genreIntro.tarbie",
  tarikh: "catalog.genreIntro.tarikh",
  ekonomika: "catalog.genreIntro.ekonomika",
  til: "catalog.genreIntro.til",
  uagyz: "catalog.genreIntro.uagyz",
  entsiklopediya: "catalog.genreIntro.entsiklopediya",
  dini: "catalog.genreIntro.dini",
};

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams.then(parseCatalogParams)]);
  const title = params.q
    ? t("catalog.meta.titleSearch", { q: params.q })
    : params.author
      ? t("catalog.meta.titleAuthor", { author: params.author })
      : params.format === "ebook"
        ? t("catalog.meta.titleEbooks")
        : t("catalog.meta.title");
  return {
    title,
    description: t("catalog.meta.description"),
    alternates: { canonical: "/catalog" },
    // search results and deep filter combinations should not be indexed
    robots: params.q || params.page ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = parseCatalogParams(await searchParams);
  const page = params.page ?? 1;
  const [{ t, locale }, genres, { items, total }] = await Promise.all([
    getI18n(),
    getGenres(),
    searchBooks({ ...params, page, pageSize: CATALOG_PAGE_SIZE }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  // a page past the end (old link, fewer books now): go to the last page
  if (items.length === 0 && total > 0 && page > totalPages) {
    redirect(catalogHref(params, { page: totalPages > 1 ? totalPages : undefined }));
  }
  const popular = items.length === 0 ? (await searchBooks({ sort: "popular", pageSize: 5 })).items : [];
  const stateKey = catalogHref(params);

  const genre = params.genre ? genres.find((g) => g.slug === params.genre) : undefined;
  const genreName = genre ? (locale === "ru" ? genre.name_ru : genre.name_kk) : undefined;
  const title = params.author
    ? t("catalog.titleAuthor", { author: params.author })
    : params.format === "ebook"
      ? t("catalog.titleEbooks")
      : (genreName ?? t("catalog.title"));
  const intro = params.q
    ? t("catalog.introSearch", { q: params.q })
    : params.author
      ? t("catalog.introAuthor")
      : params.format === "ebook"
        ? t("catalog.introEbooks")
        : genre && GENRE_INTRO[genre.slug]
          ? t(GENRE_INTRO[genre.slug])
          : t("catalog.intro");
  const ebooksOnlyEmpty = items.length === 0 && params.format === "ebook" && !params.q;

  return (
    <div className="nk-container py-6 sm:py-8 lg:py-10">
      <CatalogHeader
        eyebrow={genreName || params.author || params.format === "ebook" ? t("catalog.title") : t("catalog.eyebrow")}
        title={title}
        count={t("catalog.count", { count: total })}
        intro={intro}
      />

      <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 lg:mt-6">
        <CatalogSearch params={params} className="col-span-2 sm:min-w-0 sm:flex-1" />
        <MobileFilters key={`m-${stateKey}`} params={params} className="lg:hidden" />
        <SortSelect params={params} className="sm:w-[230px] sm:shrink-0" />
      </div>

      <GenreChips
        className="mt-4"
        ariaLabel={t("catalog.genresLabel")}
        genres={genres}
        locale={locale}
        activeSlug={params.genre}
        allLabel={t("catalog.allGenres")}
        allHref={catalogHref(params, { genre: undefined })}
        allActive={!params.genre}
        hrefFor={(slug) => catalogHref(params, { genre: slug })}
        ebook={{
          label: t("catalog.ebooksChip"),
          href: catalogHref(params, { format: params.format === "ebook" ? undefined : "ebook" }),
          active: params.format === "ebook",
        }}
      />

      <div className="mt-4">
        <ActiveFilters params={params} genres={genres} />
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="hidden lg:block">
          <DesktopFilters key={`d-${stateKey}`} params={params} />
        </div>

        <section aria-label={t("catalog.results")} className="min-w-0">
          {items.length > 0 ? (
            <>
              <BookGrid books={items} priorityCount={4} className="lg:grid-cols-3 xl:grid-cols-4" />
              <Pagination
                className="mt-10"
                page={page}
                totalPages={totalPages}
                hrefForPage={(p) => catalogHref(params, { page: p })}
                labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next"), nav: t("common.pagination.label") }}
              />
              {totalPages > 1 && (
                <p className="mt-3 text-center text-xs font-semibold text-faint">
                  {t("catalog.pageOf", { page, total: totalPages })}
                </p>
              )}
            </>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-line bg-card shadow-card">
              <EmptyState
                className="relative isolate"
                icon={ebooksOnlyEmpty ? <BookOpen className="size-6" /> : <SearchX className="size-6" />}
                title={ebooksOnlyEmpty ? t("catalog.empty.ebooksTitle") : t("catalog.empty.title")}
                description={
                  ebooksOnlyEmpty
                    ? t("catalog.empty.ebooksText")
                    : params.q
                      ? t("catalog.empty.textSearch", { q: params.q })
                      : t("catalog.empty.text")
                }
                action={
                  ebooksOnlyEmpty ? (
                    <Link href={catalogHref(params, { format: "paper" })} className={buttonVariants({ variant: "ink" })}>
                      {t("catalog.empty.ebooksAction")}
                    </Link>
                  ) : hasAnyFilter(params) ? (
                    <Link href={catalogHref({ sort: params.sort })} className={buttonVariants({ variant: "ink" })}>
                      {t("catalog.empty.reset")}
                    </Link>
                  ) : undefined
                }
              />
              {(genres.length > 0 || popular.length > 0) && (
                <div className="border-t border-line-soft bg-card-2 px-4 pb-6 pt-6 sm:px-6">
                  {genres.length > 0 && (
                    <>
                      <h2 className="mb-3 text-sm font-bold text-ink">{t("catalog.empty.suggestions")}</h2>
                      <GenreChips
                        ariaLabel={t("catalog.empty.suggestions")}
                        genres={genres}
                        locale={locale}
                        allLabel={t("catalog.allGenres")}
                        allHref="/catalog"
                        allActive={false}
                        hrefFor={(slug) => catalogHref({}, { genre: slug })}
                        ebook={{ label: t("catalog.ebooksChip"), href: "/catalog?format=ebook", active: false }}
                      />
                    </>
                  )}
                  {popular.length > 0 && (
                    <>
                      <h2 className="mb-4 mt-8 font-serif text-xl font-semibold text-ink">{t("catalog.empty.popular")}</h2>
                      <BookGrid books={popular} className="lg:grid-cols-3 xl:grid-cols-5" />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
