import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Download, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { BookFilters, type BookFilterState } from "@/components/admin/books/book-filters";
import { BookList } from "@/components/admin/books/book-list";
import { ADMIN_BOOK_COLUMNS, ADMIN_BOOK_SORTS, type AdminBookRow, type AdminBookSort } from "@/components/admin/books/types";
import { LOW_STOCK } from "./schema";

const PAGE_SIZE = 30;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.books.title") };
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminBooksPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const { t } = await getI18n();
  const supabase = await createSupabaseServer();

  const sortParam = one(sp.sort);
  const filters: BookFilterState = {
    q: one(sp.q).slice(0, 120),
    genre: one(sp.genre) === "none" || UUID_RE.test(one(sp.genre)) ? one(sp.genre) : "",
    format: ["paper", "ebook"].includes(one(sp.format)) ? one(sp.format) : "",
    status: ["published", "draft"].includes(one(sp.status)) ? one(sp.status) : "",
    sort: (ADMIN_BOOK_SORTS as readonly string[]).includes(sortParam) ? sortParam : "new",
    low: one(sp.low) === "1",
    sale: one(sp.sale) === "1",
    demo: one(sp.demo) === "1",
    nopages: one(sp.nopages) === "1",
  };
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(sp.page), 10) || 1));

  let query = supabase.from("catalog_books").select(ADMIN_BOOK_COLUMNS, { count: "exact" });
  const text = filters.q.replace(/[,()"]/g, " ").trim().toLocaleLowerCase("kk");
  if (text) {
    const digits = text.replace(/[\s-]/g, "");
    const pattern = `%${likeEscape(text)}%`;
    if (/^\d{1,7}$/.test(text)) query = query.or(`catalog_no.eq.${text},search_text.ilike.${pattern}`);
    else if (/^\d{9,13}x?$/.test(digits)) query = query.or(`isbn.ilike.%${digits}%,search_text.ilike.${pattern}`);
    else query = query.ilike("search_text", pattern);
  }
  if (filters.genre === "none") query = query.is("genre_id", null);
  else if (filters.genre) query = query.eq("genre_id", filters.genre);
  if (filters.format === "paper") query = query.eq("paper_enabled", true);
  if (filters.format === "ebook") query = query.eq("ebook_enabled", true);
  if (filters.status) query = query.eq("is_published", filters.status === "published");
  if (filters.low) query = query.eq("paper_enabled", true).lte("stock", LOW_STOCK);
  if (filters.sale) query = query.gt("discount_pct", 0);
  if (filters.demo) query = query.eq("is_demo", true);
  if (filters.nopages) query = query.eq("ebook_enabled", true).eq("ebook_page_count", 0);

  const sort = filters.sort as AdminBookSort;
  if (sort === "title") query = query.order("title");
  else if (sort === "stock") query = query.order("paper_enabled", { ascending: false }).order("stock").order("title");
  else if (sort === "sold") query = query.order("sold_count", { ascending: false }).order("title");
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const head = () => supabase.from("books").select("id", { count: "exact", head: true });

  const [list, genresRes, total, published, low, noPages] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("genres").select("id, name_kk, name_ru, is_active").order("sort_order").order("name_kk"),
    head(),
    head().eq("is_published", true),
    head().eq("paper_enabled", true).lte("stock", LOW_STOCK),
    head().eq("ebook_enabled", true).eq("ebook_page_count", 0),
  ]);

  const books = (list.data ?? []) as unknown as AdminBookRow[];
  const found = list.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(found / PAGE_SIZE));
  const totalCount = total.count ?? 0;
  const anyFilter =
    !!filters.q || !!filters.genre || !!filters.format || !!filters.status || filters.low || filters.sale || filters.demo || filters.nopages;

  const hrefFor = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      const v = one(value);
      if (v && key !== "page") params.set(key, v);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/admin/books?${qs}` : "/admin/books";
  };

  const tiles = [
    { label: t("admin.books.summary.total"), value: totalCount, href: "/admin/books", active: !anyFilter },
    {
      label: t("admin.books.summary.published"),
      value: published.count ?? 0,
      href: "/admin/books?status=published",
      active: filters.status === "published" && !filters.low && !filters.nopages,
    },
    {
      label: t("admin.books.summary.drafts"),
      value: totalCount - (published.count ?? 0),
      href: "/admin/books?status=draft",
      active: filters.status === "draft" && !filters.low && !filters.nopages,
    },
    {
      label: t("admin.books.summary.lowStock"),
      hint: (low.count ?? 0) > 0 ? t("admin.books.summary.lowStockHint") : t("admin.books.summary.allGood"),
      value: low.count ?? 0,
      href: "/admin/books?low=1&sort=stock",
      active: filters.low,
      accent: (low.count ?? 0) > 0,
    },
    {
      label: t("admin.books.summary.noPages"),
      hint: (noPages.count ?? 0) > 0 ? t("admin.books.summary.noPagesHint") : t("admin.books.summary.allGood"),
      value: noPages.count ?? 0,
      href: "/admin/books?nopages=1",
      active: filters.nopages,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <AdminPageHeader
        title={t("admin.books.title")}
        description={t("admin.books.subtitle")}
        actions={
          <>
            {/* a CSV file from a route handler: plain download link, not client navigation */}
            <a
              href="/admin/books/export"
              download
              className={buttonVariants({ variant: "outline", className: "hidden sm:inline-flex" })}
              title={t("admin.books.exportHint")}
            >
              <Download className="size-4" /> {t("admin.books.export")}
            </a>
            <Link href="/admin/books/new" className={buttonVariants({ className: "hidden sm:inline-flex" })}>
              <Plus className="size-4" /> {t("admin.books.add")}
            </Link>
          </>
        }
      />

      <div className="no-scrollbar -mx-4 mb-5 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            aria-current={tile.active ? "page" : undefined}
            className={cn(
              "min-w-[150px] shrink-0 rounded-[18px] border p-4 transition hover:-translate-y-0.5",
              tile.accent ? "border-wine-line bg-wine-soft" : "border-line bg-card",
              tile.active && "ring-2 ring-primary/25",
            )}
          >
            <div className={cn("text-xs font-semibold", tile.accent ? "text-wine-ink" : "text-muted")}>{tile.label}</div>
            <div className={cn("mt-1.5 font-serif text-[26px] font-semibold leading-none", tile.accent ? "text-wine-ink" : "text-ink")}>
              {formatNumber(tile.value)}
            </div>
            {tile.hint && (
              <div className={cn("mt-1.5 text-[11.5px] font-semibold", tile.accent ? "text-wine-ink" : "text-faint")}>{tile.hint}</div>
            )}
          </Link>
        ))}
      </div>

      <BookFilters filters={filters} genres={genresRes.data ?? []} />

      {list.error ? (
        <EmptyState title={t("admin.books.widgets.loadError")} description={t("common.errorPage.text")} />
      ) : books.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          {anyFilter ? (
            <EmptyState
              title={t("admin.books.empty.filteredTitle")}
              description={t("admin.books.empty.filteredText")}
              action={
                <Link href="/admin/books" className={buttonVariants({ variant: "outline" })}>
                  {t("admin.books.filters.reset")}
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="size-6" />}
              title={t("admin.books.empty.title")}
              description={t("admin.books.empty.text")}
              action={
                <Link href="/admin/books/new" className={buttonVariants()}>
                  <Plus className="size-4" /> {t("admin.books.add")}
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-muted" aria-live="polite">
            {t("admin.books.filters.found", { count: found })}
          </p>
          <BookList books={books} />
          <Pagination
            className="mt-6"
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => hrefFor({ page: p > 1 ? String(p) : null })}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next") }}
          />
        </>
      )}

      {/* Phone: floating «+» above the tab bar */}
      <Link
        href="/admin/books/new"
        aria-label={t("admin.books.add")}
        className="fixed right-4 z-30 grid size-14 place-items-center rounded-[18px] bg-wine text-white shadow-lift transition active:scale-95 sm:hidden bottom-[calc(62px+max(12px,env(safe-area-inset-bottom)))]"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}
