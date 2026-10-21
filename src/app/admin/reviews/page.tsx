import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { ReviewCard, type AdminReview } from "@/components/admin/reviews/review-card";

const PAGE_SIZE = 20;
const FILTERS = ["all", "hidden", "low", "replied", "unreplied"] as const;
type Filter = (typeof FILTERS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.reviews.title") };
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ t, locale }, sp, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);
  const filter: Filter = (FILTERS as readonly string[]).includes(one(sp.filter)) ? (one(sp.filter) as Filter) : "all";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(sp.page), 10) || 1));
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("reviews")
    .select(
      "id, rating, body, author_name, is_hidden, admin_reply, admin_reply_at, created_at, updated_at, user_id, book_id, books(title, author, slug, cover_url, cover_palette), profiles(full_name, phone)",
      { count: "exact" },
    );
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (filter === "low") query = query.lte("rating", 3);
  if (filter === "replied") query = query.not("admin_reply", "is", null);
  if (filter === "unreplied") query = query.is("admin_reply", null);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);

  const reviews = ((data ?? []) as unknown as Omit<AdminReview, "created_label" | "reply_label">[]).map((r) => ({
    ...r,
    created_label: formatDate(r.created_at, locale, { month: "short" }),
    reply_label: formatDate(r.admin_reply_at, locale, { month: "short" }),
  }));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (f: Filter, p = 1) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/reviews?${qs}` : "/admin/reviews";
  };

  return (
    <div className="mx-auto max-w-[960px]">
      <AdminPageHeader title={t("admin.reviews.title")} description={t("admin.reviews.description")} />

      <nav aria-label={t("common.actions.filter")} className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <ChipLink key={f} href={href(f)} active={filter === f}>
            {t(`admin.reviews.filters.${f}`)}
          </ChipLink>
        ))}
      </nav>

      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("common.errorPage.title")} description={t("common.errorPage.text")} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState icon={<MessageSquare className="size-6" />} title={t("admin.reviews.empty")} description={t("admin.reviews.emptyHint")} />
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold text-muted" aria-live="polite">
            {t("admin.reviews.total", { count: total })}
          </p>
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={`${r.id}:${r.updated_at}`} review={r} />
            ))}
          </div>
          <Pagination
            className="mt-6"
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => href(filter, p)}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next"), nav: t("common.pagination.label") }}
          />
        </>
      )}
    </div>
  );
}
