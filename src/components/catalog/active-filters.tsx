import Link from "next/link";
import { X } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { BOOK_LANGUAGE_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import type { Genre } from "@/types/app";
import { catalogHref, hasAnyFilter, type CatalogParams } from "./params";

/** Removable chips for every active filter + «Тазарту» */
export async function ActiveFilters({ params, genres }: { params: CatalogParams; genres: Genre[] }) {
  if (!hasAnyFilter(params)) return null;
  const { t, locale } = await getI18n();
  const genre = params.genre ? genres.find((g) => g.slug === params.genre) : undefined;

  const chips: { key: string; label: string; href: string }[] = [];
  if (params.q) chips.push({ key: "q", label: t("catalog.active.search", { q: params.q }), href: catalogHref(params, { q: undefined }) });
  if (params.genre)
    chips.push({
      key: "genre",
      label: genre ? (locale === "ru" ? genre.name_ru : genre.name_kk) : params.genre,
      href: catalogHref(params, { genre: undefined }),
    });
  if (params.format)
    chips.push({
      key: "format",
      label: params.format === "ebook" ? t("catalog.filters.formatEbook") : t("catalog.filters.formatPaper"),
      href: catalogHref(params, { format: undefined }),
    });
  if (params.author) chips.push({ key: "author", label: params.author, href: catalogHref(params, { author: undefined }) });
  if (params.language)
    chips.push({
      key: "lang",
      label: BOOK_LANGUAGE_LABELS[params.language][locale],
      href: catalogHref(params, { language: undefined }),
    });
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const label =
      params.minPrice !== undefined && params.maxPrice !== undefined
        ? t("catalog.active.priceRange", { min: formatPrice(params.minPrice), max: formatPrice(params.maxPrice) })
        : params.minPrice !== undefined
          ? t("catalog.active.priceFrom", { price: formatPrice(params.minPrice) })
          : t("catalog.active.priceTo", { price: formatPrice(params.maxPrice) });
    chips.push({ key: "price", label, href: catalogHref(params, { minPrice: undefined, maxPrice: undefined }) });
  }
  if (params.sale) chips.push({ key: "sale", label: t("catalog.filters.sale"), href: catalogHref(params, { sale: undefined }) });
  if (params.inStock)
    chips.push({ key: "stock", label: t("catalog.filters.inStock"), href: catalogHref(params, { inStock: undefined }) });

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("catalog.active.label")} role="group">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          aria-label={t("catalog.active.remove", { label: chip.label })}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-card py-1.5 pl-3.5 pr-2 text-[12.5px] font-semibold text-ink-2 transition hover:border-wine-line hover:text-wine-ink"
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" aria-hidden />
        </Link>
      ))}
      <Link
        href={catalogHref({ sort: params.sort })}
        scroll={false}
        className="px-2 py-1.5 text-[12.5px] font-bold text-wine-ink hover:underline"
      >
        {t("catalog.active.clear")}
      </Link>
    </div>
  );
}
