import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBookBySlug, getRelatedBooks, isFavoriteBook } from "@/lib/data/books";
import { getSettings } from "@/lib/data/common";
import { getSessionUserId } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { BOOK_LANGUAGE_LABELS, DEFAULT_OG_IMAGE, type BookLanguage } from "@/lib/constants";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { RatingStars } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/book/favorite-button";
import { BookGallery } from "@/components/book-page/gallery";
import { PurchasePanel } from "@/components/book-page/purchase-panel";
import { BookDescription } from "@/components/book-page/description";
import { ShareButton } from "@/components/book-page/share-button";
import { BackButton } from "@/components/book-page/back-button";
import { BookShelf } from "@/components/home/book-shelf";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import type { CatalogBook } from "@/types/app";

type Props = { params: Promise<{ slug: string }> };

function languageLabel(code: string, locale: "kk" | "ru"): string {
  return code in BOOK_LANGUAGE_LABELS ? BOOK_LANGUAGE_LABELS[code as BookLanguage][locale] : code;
}

/** Lowest price a visitor can pay right now (for SEO / JSON-LD) */
function offerPrice(book: CatalogBook): number | null {
  const prices = [
    book.paper_enabled ? book.paper_final_price : null,
    book.ebook_available ? book.ebook_final_price : null,
  ].filter((p): p is number => typeof p === "number");
  return prices.length ? Math.min(...prices) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [book, { t, locale }] = await Promise.all([getBookBySlug(decodeURIComponent(slug)), getI18n()]);
  if (!book || !book.is_published) return { title: t("common.notFoundPage.title"), robots: { index: false } };
  const description =
    localized(book, "description", locale).replace(/\s+/g, " ").slice(0, 180).trim() ||
    t("book.meta.description", { title: book.title, author: book.author, price: formatPrice(offerPrice(book)) });
  const title = book.author ? `${book.title} — ${book.author}` : book.title;
  return {
    title,
    description,
    alternates: { canonical: `/books/${book.slug}` },
    openGraph: {
      type: "book",
      title,
      description,
      url: `/books/${book.slug}`,
      isbn: book.isbn ?? undefined,
      tags: book.tags,
      images: book.cover_url ? [{ url: book.cover_url, alt: book.title }] : [DEFAULT_OG_IMAGE],
    },
    twitter: { card: book.cover_url ? "summary" : "summary_large_image", title, description, images: [book.cover_url ?? DEFAULT_OG_IMAGE.url] },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const book = await getBookBySlug(decodeURIComponent(slug));
  if (!book || !book.is_published) notFound();

  const userId = await getSessionUserId();
  const [{ t, locale }, settings, favorite, related] = await Promise.all([
    getI18n(),
    getSettings(),
    isFavoriteBook(userId, book.id),
    getRelatedBooks(book, 10),
  ]);

  const genre = locale === "ru" ? book.genre_name_ru : book.genre_name_kk;
  const description = localized(book, "description", locale);
  const authorHref = `/catalog?author=${encodeURIComponent(book.author)}`;
  const ebookBadge = book.ebook_available ? t("common.format.ebookBadge") : null;
  const rating = Number(book.rating_avg);
  const price = offerPrice(book);
  const inStock = (book.paper_enabled && book.stock > 0) || book.ebook_available;

  type DetailRow = { label: string; value: React.ReactNode };
  const detailRows: (DetailRow | null)[] = [
    { label: t("book.details.catalogNo"), value: `№ ${book.catalog_no}` },
    genre && book.genre_slug
      ? {
          label: t("book.details.genre"),
          value: (
            <Link href={`/catalog?genre=${encodeURIComponent(book.genre_slug)}`} className="text-wine-ink hover:underline">
              {genre}
            </Link>
          ),
        }
      : null,
    book.author
      ? {
          label: t("book.details.author"),
          value: (
            <Link href={authorHref} className="text-wine-ink hover:underline">
              {book.author}
            </Link>
          ),
        }
      : null,
    book.publisher ? { label: t("book.details.publisher"), value: book.publisher } : null,
    book.publish_year ? { label: t("book.details.year"), value: String(book.publish_year) } : null,
    book.pages ? { label: t("book.details.pages"), value: String(book.pages) } : null,
    book.isbn ? { label: t("book.details.isbn"), value: book.isbn } : null,
    book.cover_type === "hard" || book.cover_type === "soft"
      ? { label: t("book.details.coverType"), value: t(`book.coverTypes.${book.cover_type}`) }
      : null,
    book.language ? { label: t("book.details.language"), value: languageLabel(book.language, locale) } : null,
    {
      label: t("book.details.formats"),
      value: [book.paper_enabled && t("common.format.paperBook"), book.ebook_available && t("common.format.ebookBook")]
        .filter(Boolean)
        .join(", ") || "—",
    },
  ];
  const details = detailRows.filter((row): row is DetailRow => row !== null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: book.author ? { "@type": "Person", name: book.author } : undefined,
    url: `${env.siteUrl}/books/${book.slug}`,
    image: book.cover_url ?? undefined,
    description: description.slice(0, 500) || undefined,
    isbn: book.isbn ?? undefined,
    numberOfPages: book.pages ?? undefined,
    publisher: book.publisher ? { "@type": "Organization", name: book.publisher } : undefined,
    datePublished: book.publish_year ? String(book.publish_year) : undefined,
    inLanguage: book.language || undefined,
    genre: genre ?? undefined,
    bookFormat: [
      book.paper_enabled && (book.cover_type === "soft" ? "https://schema.org/Paperback" : "https://schema.org/Hardcover"),
      book.ebook_available && "https://schema.org/EBook",
    ].filter(Boolean),
    aggregateRating:
      book.rating_count > 0
        ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: book.rating_count, bestRating: 5, worstRating: 1 }
        : undefined,
    offers:
      price !== null
        ? {
            "@type": "Offer",
            price,
            priceCurrency: "KZT",
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${env.siteUrl}/books/${book.slug}`,
            seller: { "@type": "Organization", name: settings.store_name || "Nur Karim" },
          }
        : undefined,
  };

  const purchase = (
    <PurchasePanel
      book={book}
      perks={{
        delivery: book.paper_enabled
          ? t("book.perks.delivery", {
              astana: formatPrice(settings.delivery_astana_price),
              kazpost: formatPrice(settings.delivery_kazpost_price),
            })
          : null,
        gift: settings.gift_enabled,
      }}
    />
  );

  return (
    <div className="pb-[92px] md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* phone: navy header with the cover (design 1c) */}
      <div className="nk-hero-bg md:hidden">
        <div className="nk-container flex items-center justify-between pt-4">
          <BackButton />
          <div className="flex gap-2">
            <ShareButton title={book.title} path={`/books/${book.slug}`} variant="glass" />
            <FavoriteButton bookId={book.id} slug={book.slug} initialFavorite={favorite} variant="glass" />
          </div>
        </div>
        <BookGallery
          className="mx-auto w-[min(58vw,240px)] pb-12 pt-5"
          tone="navy"
          title={book.title}
          author={book.author}
          coverUrl={book.cover_url}
          palette={book.cover_palette}
          images={book.images}
          discountPct={book.discount_pct}
          ebookBadge={ebookBadge}
        />
      </div>

      <div className="relative -mt-7 rounded-t-[28px] bg-page md:mt-0 md:rounded-none">
        <div className="nk-container pt-6 md:pt-8 lg:pt-10">
          <nav aria-label={t("book.breadcrumb")} className="mb-6 hidden md:block">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-muted">
              <li>
                <Link href="/catalog" className="hover:text-ink">
                  {t("nav.catalog")}
                </Link>
              </li>
              {genre && book.genre_slug && (
                <li className="flex items-center gap-1.5">
                  <ChevronRight className="size-3.5 text-faint" aria-hidden />
                  <Link href={`/catalog?genre=${encodeURIComponent(book.genre_slug)}`} className="hover:text-ink">
                    {genre}
                  </Link>
                </li>
              )}
              <li className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="size-3.5 text-faint" aria-hidden />
                <span className="truncate text-ink" aria-current="page">
                  {book.title}
                </span>
              </li>
            </ol>
          </nav>

          <div className="grid gap-y-7 [grid-template-areas:'info'_'buy'_'about'] md:grid-cols-[250px_minmax(0,1fr)] md:gap-x-8 md:[grid-template-areas:'cover_info'_'cover_buy'_'cover_about'] lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:gap-x-10 lg:[grid-template-areas:'cover_info_buy'_'cover_about_buy'] xl:grid-cols-[340px_minmax(0,1fr)_360px]">
            <div className="hidden [grid-area:cover] md:block">
              <div className="sticky top-[100px]">
                <BookGallery
                  title={book.title}
                  author={book.author}
                  coverUrl={book.cover_url}
                  palette={book.cover_palette}
                  images={book.images}
                  discountPct={book.discount_pct}
                  ebookBadge={ebookBadge}
                />
              </div>
            </div>

            <header className="min-w-0 [grid-area:info]">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-wine-ink">
                {t("book.catalogNo", { no: book.catalog_no })}
                {genre && ` · ${genre}`}
              </p>
              <h1 className="mt-2 font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink sm:text-[34px] lg:text-[40px]">
                {book.title}
              </h1>
              <p className="mt-2 text-[15px] text-muted">
                {book.author && (
                  <>
                    <span className="sr-only">{t("book.byAuthor")}: </span>
                    <Link href={authorHref} className="font-semibold text-ink-2 underline-offset-4 hover:text-wine-ink hover:underline">
                      {book.author}
                    </Link>
                  </>
                )}
                {book.pages ? `${book.author ? " · " : ""}${t("book.pagesCount", { count: book.pages })}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {book.rating_count > 0 ? (
                  <a href="#reviews" className="inline-flex items-center gap-2" aria-label={t("book.ratingLabel", { value: rating.toFixed(1) })}>
                    <RatingStars value={rating} size={16} />
                    <span className="text-sm font-bold text-ink">{rating.toFixed(1)}</span>
                    <span className="text-sm font-semibold text-muted underline-offset-4 hover:underline">
                      {t("book.reviewsLink", { count: book.rating_count })}
                    </span>
                  </a>
                ) : (
                  <a href="#reviews" className="text-sm font-semibold text-muted hover:text-ink">
                    {t("book.noRating")}
                  </a>
                )}
                <div className="hidden gap-2 md:flex">
                  <ShareButton title={book.title} path={`/books/${book.slug}`} />
                  <FavoriteButton bookId={book.id} slug={book.slug} initialFavorite={favorite} />
                </div>
              </div>
            </header>

            <div className="min-w-0 [grid-area:buy]">
              <div className="lg:sticky lg:top-[100px]">{purchase}</div>
            </div>

            <div className="min-w-0 space-y-8 [grid-area:about]">
              <section aria-labelledby="book-about">
                <h2 id="book-about" className="mb-3 font-serif text-xl font-semibold text-ink">
                  {t("book.about")}
                </h2>
                <BookDescription text={description} />
              </section>

              {book.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {book.tags.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/catalog?q=${encodeURIComponent(tag)}`}
                        className="inline-flex rounded-full bg-chip px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:bg-wine-soft hover:text-wine-ink"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <section aria-labelledby="book-details" className="rounded-[18px] border border-line bg-card p-5">
                <h2 id="book-details" className="mb-3 text-base font-bold text-ink">
                  {t("book.details.title")}
                </h2>
                <dl className="divide-y divide-line-soft text-sm">
                  {details.map((row) => (
                    <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 py-2.5">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="break-words font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>

          <div className="mt-14 lg:mt-20">
            <ReviewsSection bookId={book.id} slug={book.slug} userId={userId} />
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-14 pb-4 lg:mt-20">
            <BookShelf
              id="related-books"
              title={t("book.related.title")}
              href={book.genre_slug ? `/catalog?genre=${encodeURIComponent(book.genre_slug)}` : book.author ? authorHref : "/catalog"}
              linkLabel={t("home.sections.showAll")}
              books={related}
            />
          </div>
        )}
      </div>
    </div>
  );
}
