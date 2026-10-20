import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { LibraryTabs } from "@/components/library/library-tabs";
import {
  EbookRow,
  OrderMiniRow,
  ReadingNowCard,
  type LibraryBook,
  type LibraryOrder,
} from "@/components/library/library-parts";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("library.metaTitle") };
}

const ORDERS_SHOWN = 20;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/account/library");
  const [{ t, locale }, sp, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);

  const [entitlementsRes, progressRes, ordersRes] = await Promise.all([
    supabase
      .from("entitlements")
      .select("book_id, source, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.from("reading_progress").select("book_id, page, updated_at").eq("user_id", profile.id),
    supabase
      .from("orders")
      .select("id, order_number, status, created_at, total, delivery_method, order_items(quantity)", { count: "exact" })
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(ORDERS_SHOWN),
  ]);

  const entitlements = entitlementsRes.data ?? [];
  // Owned books may be hidden from the catalog later: read them with the
  // service role, strictly limited to this user's own entitlements.
  const bookIds = entitlements.map((e) => e.book_id);
  const { data: bookRows, error: booksError } = bookIds.length
    ? await createSupabaseAdmin()
        .from("books")
        .select("id, slug, title, author, cover_url, cover_palette, ebook_page_count")
        .in("id", bookIds)
    : { data: [], error: null };

  const progress = new Map((progressRes.data ?? []).map((p) => [p.book_id, p]));
  const booksById = new Map((bookRows ?? []).map((b) => [b.id, b]));

  const books: LibraryBook[] = entitlements.flatMap((e) => {
    const b = booksById.get(e.book_id);
    if (!b) return [];
    const saved = progress.get(e.book_id);
    return [
      {
        id: b.id,
        slug: b.slug,
        title: b.title,
        author: b.author,
        coverUrl: b.cover_url,
        coverPalette: b.cover_palette,
        pageCount: b.ebook_page_count,
        source: e.source as LibraryBook["source"],
        page: saved ? Math.min(saved.page, Math.max(1, b.ebook_page_count)) : null,
      },
    ];
  });

  const readingNow = books
    .filter((b) => b.page !== null && b.pageCount > 0 && b.page < b.pageCount)
    .sort((a, b) => (progress.get(b.id)?.updated_at ?? "").localeCompare(progress.get(a.id)?.updated_at ?? ""))[0];

  const orders: LibraryOrder[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    number: o.order_number,
    status: o.status,
    createdAt: o.created_at,
    total: o.total,
    items: o.order_items.reduce((sum, item) => sum + item.quantity, 0),
    digital: o.delivery_method === "digital",
  }));
  const orderCount = ordersRes.count ?? orders.length;
  const loadFailed = Boolean(entitlementsRes.error || booksError);

  const sinceYear = new Date(profile.created_at).getFullYear();
  const name = profile.full_name?.trim() || profile.phone;

  const ebooksPanel = loadFailed ? (
    <div className="rounded-[18px] border border-line bg-card">
      <EmptyState
        icon={<AlertTriangle className="size-6" aria-hidden />}
        title={t("common.states.error")}
        action={
          <Link href="/account/library" className={buttonVariants({ variant: "outline" })}>
            {t("common.actions.retry")}
          </Link>
        }
      />
    </div>
  ) : books.length === 0 ? (
    <div className="rounded-[18px] border border-line bg-card">
      <EmptyState
        icon={<BookOpen className="size-6" aria-hidden />}
        title={t("library.empty.title")}
        description={t("library.empty.text")}
        action={
          <Link href="/catalog?format=ebook" className={buttonVariants({ variant: "primary" })}>
            {t("library.empty.cta")}
          </Link>
        }
      />
    </div>
  ) : (
    <div className="space-y-4">
      {readingNow && (
        <div className="max-w-2xl">
          <ReadingNowCard book={readingNow} t={t} />
        </div>
      )}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {books.map((book) => (
          <EbookRow key={book.id} book={book} t={t} />
        ))}
      </ul>
    </div>
  );

  const ordersPanel = ordersRes.error ? (
    <div className="rounded-[18px] border border-line bg-card">
      <EmptyState icon={<AlertTriangle className="size-6" aria-hidden />} title={t("common.states.error")} />
    </div>
  ) : orders.length === 0 ? (
    <div className="rounded-[18px] border border-line bg-card">
      <EmptyState
        icon={<Package className="size-6" aria-hidden />}
        title={t("library.orders.empty")}
        description={t("library.orders.emptyText")}
        action={
          <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
            {t("library.orders.toCatalog")}
          </Link>
        }
      />
    </div>
  ) : (
    <div>
      <ul className="grid gap-2.5 md:grid-cols-2">
        {orders.map((order) => (
          <OrderMiniRow key={order.id} order={order} t={t} locale={locale} />
        ))}
      </ul>
      {orderCount > orders.length && (
        <div className="mt-4 text-center">
          <Link href="/account/orders" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("library.orders.all")}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <section>
      <div className="flex items-center gap-3">
        <Avatar name={name} size={48} />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink">{name}</p>
          <p className="text-xs font-medium text-muted">
            {profile.role === "admin"
              ? t("library.roleAdmin", { year: sinceYear })
              : t("library.roleClient", { year: sinceYear })}
          </p>
        </div>
      </div>
      <h1 className="mt-5 font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink sm:mt-6 sm:text-[34px]">
        {t("library.title")}
      </h1>
      <div className="mt-4">
        <LibraryTabs
          initialTab={sp.tab === "orders" ? "orders" : "ebooks"}
          ebookCount={books.length}
          orderCount={orderCount}
          ebooks={ebooksPanel}
          orders={ordersPanel}
        />
      </div>
    </section>
  );
}
