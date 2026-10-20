import Link from "next/link";
import { Search, X } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { catalogHref, type CatalogParams } from "./params";

/** GET search form that keeps the other filters (works without JavaScript) */
export async function CatalogSearch({ params, className }: { params: CatalogParams; className?: string }) {
  const { t } = await getI18n();
  const hidden: [string, string | undefined][] = [
    ["genre", params.genre],
    ["format", params.format],
    ["author", params.author],
    ["lang", params.language],
    ["sale", params.sale ? "1" : undefined],
    ["stock", params.inStock ? "1" : undefined],
    ["min", params.minPrice !== undefined ? String(params.minPrice) : undefined],
    ["max", params.maxPrice !== undefined ? String(params.maxPrice) : undefined],
    ["sort", params.sort],
  ];

  return (
    <form action="/catalog" method="get" role="search" className={cn("relative", className)}>
      {hidden.map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      <label htmlFor="catalog-q" className="sr-only">
        {t("catalog.searchLabel")}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" aria-hidden />
      <input
        id="catalog-q"
        key={params.q ?? ""}
        type="search"
        name="q"
        defaultValue={params.q ?? ""}
        maxLength={100}
        enterKeyHint="search"
        placeholder={t("catalog.searchPlaceholder")}
        className="h-[50px] w-full rounded-[13px] border border-line bg-card pl-11 pr-24 text-sm font-medium text-ink placeholder:text-faint transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
        {params.q && (
          <Link
            href={catalogHref(params, { q: undefined })}
            scroll={false}
            aria-label={t("catalog.searchClear")}
            className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-subtle hover:text-ink"
          >
            <X className="size-4" />
          </Link>
        )}
        <button
          type="submit"
          className="h-[38px] rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-on-primary transition hover:bg-primary-hover"
        >
          {t("common.actions.search")}
        </button>
      </div>
    </form>
  );
}
