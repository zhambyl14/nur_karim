import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatDateTime, formatPrice, storeDateKey } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ChipLink } from "@/components/ui/chip";
import { Avatar, EmptyState, Pagination } from "@/components/ui/misc";
import type { Dictionary } from "@/i18n/kk";

const PAGE_SIZE = 50;
const ENTITIES = [
  "books",
  "orders",
  "promotions",
  "promo_codes",
  "banners",
  "genres",
  "store_settings",
  "reviews",
  "profiles",
  "entitlements",
] as const;
type Entity = (typeof ENTITIES)[number];

type LogRow = {
  id: number;
  entity: string;
  entity_id: string | null;
  label: string;
  action: "insert" | "update" | "delete";
  changes: Record<string, [unknown, unknown]>;
  created_at: string;
  actor: { full_name: string; phone: string } | null;
};

function entityHref(entity: string, id: string | null): string | null {
  switch (entity) {
    case "books":
    case "entitlements":
      return id ? `/admin/books/${id}` : "/admin/books";
    case "orders":
      return id ? `/admin/orders/${id}` : "/admin/orders";
    case "profiles":
      return id ? `/admin/customers/${id}` : "/admin/customers";
    case "promotions":
      return "/admin/promotions";
    case "promo_codes":
      return "/admin/promo-codes";
    case "banners":
      return "/admin/banners";
    case "genres":
      return "/admin/genres";
    case "store_settings":
      return "/admin/settings";
    case "reviews":
      return "/admin/reviews";
    default:
      return null;
  }
}

function formatValue(field: string, value: unknown, dict: Dictionary, locale: "kk" | "ru"): string {
  const a = dict.admin.activity;
  if (value === null || value === undefined || value === "") return a.empty_value;
  if (typeof value === "boolean") return value ? a.yes : a.no;
  if (typeof value === "number" && /price|amount|total|threshold/.test(field)) return formatPrice(value);
  if (field === "status" && typeof value === "string") {
    return (dict.status.order as Record<string, string>)[value] ?? value;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value, locale);
  if (Array.isArray(value)) return value.length ? value.join(", ") : a.empty_value;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
  return String(value);
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.activity.title") };
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ t, dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const entityParam = typeof params.entity === "string" ? params.entity : "";
  const entity = (ENTITIES as readonly string[]).includes(entityParam) ? (entityParam as Entity) : null;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const supabase = await createSupabaseServer();
  let query = supabase
    .from("audit_log")
    .select("id, entity, entity_id, label, action, changes, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, phone)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (entity) query = query.eq("entity", entity);
  const { data, count } = await query;
  const rows = (data ?? []) as unknown as LogRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const a = dict.admin.activity;
  const fieldLabel = (key: string) => (a.fields as Record<string, string>)[key] ?? key;
  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    if (entity) sp.set("entity", entity);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/activity${qs ? `?${qs}` : ""}`;
  };

  // group by store-local day
  const groups: { day: string; items: LogRow[] }[] = [];
  for (const row of rows) {
    const day = storeDateKey(row.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }

  return (
    <div>
      <AdminPageHeader title={t("admin.activity.title")} description={t("admin.activity.description")} />

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <ChipLink href="/admin/activity" active={!entity} size="sm">
          {t("admin.activity.all")}
        </ChipLink>
        {ENTITIES.map((e) => (
          <ChipLink key={e} href={`/admin/activity?entity=${e}`} active={entity === e} size="sm">
            {a.filters[e]}
          </ChipLink>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState icon={<History className="size-6" />} title={t("admin.activity.empty")} description={t("admin.activity.emptyHint")} />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-faint">
                {formatDate(`${group.day}T12:00:00+05:00`, locale)}
              </h2>
              <ol className="divide-y divide-line-soft overflow-hidden rounded-[18px] border border-line bg-card">
                {group.items.map((row) => {
                  const href = entityHref(row.entity, row.entity_id);
                  const entityName = (a.entities as Record<string, string>)[row.entity] ?? row.entity;
                  const changes = Object.entries(row.changes ?? {});
                  const shown = changes.slice(0, 4);
                  return (
                    <li key={row.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                      <Avatar name={row.actor?.full_name || row.actor?.phone || "?"} size={34} tone="soft" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
                          <span className="font-bold text-ink">{row.actor?.full_name || row.actor?.phone || a.unknownActor}</span>
                          <span className="text-muted">{a.actions[row.action]}</span>
                          <span className="text-muted">{entityName.toLocaleLowerCase(locale === "kk" ? "kk" : "ru")}</span>
                          {href && row.action !== "delete" ? (
                            <Link href={href} className="font-semibold text-wine-ink hover:underline">
                              {row.entity === "store_settings" ? "" : row.label}
                            </Link>
                          ) : (
                            <span className="font-semibold text-ink-2">{row.entity === "store_settings" ? "" : row.label}</span>
                          )}
                          <span className="ml-auto shrink-0 text-xs text-faint">{formatDateTime(row.created_at, locale)}</span>
                        </div>
                        {row.action === "update" && shown.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {shown.map(([field, pair]) => (
                              <li key={field} className="max-w-full rounded-lg bg-subtle px-2.5 py-1 text-xs text-ink-2">
                                <span className="font-semibold">{fieldLabel(field)}:</span>{" "}
                                <span className="text-faint line-through decoration-faint/60">
                                  {formatValue(field, pair?.[0], dict, locale)}
                                </span>{" "}
                                → <span className="font-semibold text-ink">{formatValue(field, pair?.[1], dict, locale)}</span>
                              </li>
                            ))}
                            {changes.length > shown.length && (
                              <li className="rounded-lg px-2 py-1 text-xs text-faint">
                                {t("admin.activity.moreChanges", { count: changes.length - shown.length })}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefForPage={hrefFor}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next") }}
          />
        </div>
      )}
    </div>
  );
}
