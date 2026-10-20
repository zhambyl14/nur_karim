import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime, formatPrice, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { PromoCodeForm } from "@/components/admin/promotions/promo-code-form";
import { toAlmatyInput } from "@/components/admin/catalog/schedule";
import type { PickerBook } from "@/components/admin/catalog/types";
import { loadGenreOptions } from "@/app/admin/books/data";

type Params = Promise<{ id: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USAGE_LIMIT = 50;

async function loadCode(id: string) {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("promo_codes")
    .select("*, promo_code_books(books(id, catalog_no, title, author, cover_url, cover_palette, is_published))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { t } = await getI18n();
  const code = await loadCode(id);
  return { title: code?.code ?? t("admin.promoCodes.form.editTitle") };
}

export default async function EditPromoCodePage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;
  const { t, locale } = await getI18n();
  const code = await loadCode(id);
  if (!code) notFound();

  const supabase = await createSupabaseServer();
  const [genres, usesResult, totalsResult] = await Promise.all([
    loadGenreOptions(),
    supabase
      .from("promo_code_uses")
      .select("id, discount, created_at, orders(id, order_number, total, contact_name, contact_phone)")
      .eq("promo_code_id", code.id)
      .order("created_at", { ascending: false })
      .limit(USAGE_LIMIT),
    supabase.from("promo_code_uses").select("discount", { count: "exact" }).eq("promo_code_id", code.id).limit(10000),
  ]);
  const uses = usesResult.data ?? [];
  const usesCount = totalsResult.count ?? uses.length;
  const totalDiscount = (totalsResult.data ?? []).reduce((sum, u) => sum + u.discount, 0);
  const books: PickerBook[] = (code.promo_code_books ?? [])
    .map((pb) => pb.books)
    .filter((b): b is PickerBook => !!b)
    .sort((a, b) => a.title.localeCompare(b.title));

  const usage = (
    <section className="rounded-[18px] border border-line bg-card p-4 sm:p-5">
      <h2 className="text-base font-bold text-ink">{t("admin.promoCodes.form.sections.usage")}</h2>
      {usesResult.error ? (
        <p className="mt-3 text-sm text-muted">{t("admin.books.widgets.loadError")}</p>
      ) : uses.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
          {t("admin.promoCodes.usage.empty")}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            {t("admin.promoCodes.usage.total", { count: usesCount, amount: formatPrice(totalDiscount) })}
          </p>
          <ul className="mt-3 divide-y divide-line-soft">
            {uses.map((use) => (
              <li key={use.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  {use.orders ? (
                    <Link href={`/admin/orders/${use.orders.id}`} className="text-[13px] font-bold text-wine-ink hover:underline">
                      {t("admin.promoCodes.usage.order")} {orderNo(use.orders.order_number)}
                    </Link>
                  ) : (
                    <span className="text-[13px] font-bold text-ink">{t("admin.promoCodes.usage.order")}</span>
                  )}
                  {use.orders && (
                    <div className="truncate text-xs text-muted">
                      {use.orders.contact_name} · {formatPhone(use.orders.contact_phone)}
                    </div>
                  )}
                  <div className="text-[11px] text-faint">{formatDateTime(use.created_at, locale)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-serif text-sm font-semibold text-wine-ink">−{formatPrice(use.discount)}</div>
                  {use.orders && <div className="text-[11px] text-muted">{formatPrice(use.orders.total)}</div>}
                </div>
              </li>
            ))}
          </ul>
          {usesCount > uses.length && (
            <p className="mt-2 text-center text-xs text-faint">{t("admin.promoCodes.usage.more", { count: uses.length })}</p>
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-[1240px]">
      <AdminPageHeader
        title={<span className="font-mono tracking-[.04em]">{code.code}</span>}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {t("admin.promoCodes.form.editTitle")}
            {code.is_demo && <Badge tone="neutral">{t("admin.promoCodes.demo")}</Badge>}
          </span>
        }
        backHref="/admin/promo-codes"
        backLabel={t("admin.promoCodes.form.back")}
      />
      <PromoCodeForm
        codeId={code.id}
        genres={genres}
        usedCount={Math.max(code.used_count, usesCount)}
        usage={usage}
        initial={{
          code: code.code,
          description: code.description,
          discount_type: code.discount_type,
          discount_value: String(code.discount_value),
          scope: code.scope,
          genre_id: code.genre_id ?? "",
          books,
          format_scope: code.format_scope,
          min_order_amount: String(code.min_order_amount),
          max_uses: code.max_uses?.toString() ?? "",
          per_user_limit: code.per_user_limit?.toString() ?? "",
          dates: { start: toAlmatyInput(code.starts_at), end: toAlmatyInput(code.ends_at) },
          is_active: code.is_active,
        }}
      />
    </div>
  );
}
