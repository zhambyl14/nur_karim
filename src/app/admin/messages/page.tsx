import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCheck, MessageCircle, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { ConversationList, type ConversationListItem } from "@/components/messages/conversation-list";

const PAGE_SIZE = 30;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.messages.metaTitle") };
}

function param(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const [{ t, locale }, sp, supabase] = await Promise.all([getI18n(), searchParams, createSupabaseServer()]);

  const q = param(sp, "q").trim().slice(0, 60);
  const unreadOnly = param(sp, "filter") === "unread";
  const page = Math.max(1, Number.parseInt(param(sp, "page"), 10) || 1);

  let query = supabase
    .from("conversations")
    .select(
      "id, subject, book_id, order_id, last_message_at, last_message_preview, last_sender_is_admin, admin_unread, books(title, author, cover_url, cover_palette), orders(order_number), profiles!inner(full_name, phone)",
      { count: "exact" },
    )
    .order("last_message_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (unreadOnly) query = query.gt("admin_unread", 0);
  if (q) {
    // PostgREST filter syntax: strip characters that have a meaning there
    const text = q.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
    let digits = q.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("7")) digits = `8${digits.slice(1)}`;
    const filters = [text ? `full_name.ilike.*${text}*` : null, digits.length >= 3 ? `phone.ilike.*${digits}*` : null].filter(
      Boolean,
    );
    if (filters.length) query = query.or(filters.join(","), { referencedTable: "profiles" });
  }

  const { data, count, error } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const items: ConversationListItem[] = (data ?? []).map((c) => {
    const kind = c.book_id ? "book" : c.order_id ? "order" : "general";
    const client = c.profiles;
    return {
      id: c.id,
      href: `/admin/messages/${c.id}`,
      eyebrow: [client?.full_name?.trim() || t("admin.messages.noName"), formatPhone(client?.phone)].filter(Boolean).join(" · "),
      title:
        kind === "book"
          ? (c.books?.title ?? c.subject)
          : kind === "order"
            ? t("admin.messages.orderSubject", { number: c.orders ? `#${c.orders.order_number}` : c.subject })
            : t("admin.messages.generalSubject"),
      preview: c.last_message_preview,
      lastFromMe: c.last_sender_is_admin,
      lastMessageAt: c.last_message_at,
      unread: c.admin_unread,
      kind,
      book: c.books,
    };
  });

  const qs = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { q: q || null, filter: unreadOnly ? "unread" : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/admin/messages?${s}` : "/admin/messages";
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center rounded-full px-4 text-[13px] font-bold transition",
      active ? "bg-primary text-on-primary" : "border border-line bg-card text-ink-2 hover:bg-subtle",
    );

  return (
    <div>
      <AdminPageHeader
        title={t("admin.messages.title")}
        description={count !== null ? t("admin.messages.total", { count: count ?? 0 }) : t("admin.messages.description")}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/admin/messages" className="relative w-full sm:max-w-sm" role="search">
          {unreadOnly && <input type="hidden" name="filter" value="unread" />}
          <label htmlFor="admin-messages-search" className="sr-only">
            {t("admin.messages.searchLabel")}
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            id="admin-messages-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("admin.messages.searchPlaceholder")}
            className="h-11 w-full rounded-[13px] border border-line bg-card-2 pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-faint focus:border-wine-line focus:ring-2 focus:ring-wine/15"
          />
        </form>
        <nav className="flex gap-2" aria-label={t("admin.messages.title")}>
          <Link href={qs({ filter: null, page: null })} className={chip(!unreadOnly)} aria-current={!unreadOnly ? "page" : undefined}>
            {t("admin.messages.filters.all")}
          </Link>
          <Link href={qs({ filter: "unread", page: null })} className={chip(unreadOnly)} aria-current={unreadOnly ? "page" : undefined}>
            {t("admin.messages.filters.unread")}
          </Link>
        </nav>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={<AlertTriangle className="size-6" aria-hidden />}
            title={t("messages.chat.loadError")}
            action={
              <Link href={qs({})} className={buttonVariants({ variant: "outline" })}>
                {t("common.actions.retry")}
              </Link>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState
            icon={q ? <Search className="size-6" aria-hidden /> : unreadOnly ? <CheckCheck className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
            title={q ? t("admin.messages.empty.searchTitle") : unreadOnly ? t("admin.messages.empty.unreadTitle") : t("admin.messages.empty.title")}
            description={q ? t("admin.messages.empty.searchText") : unreadOnly ? t("admin.messages.empty.unreadText") : t("admin.messages.empty.text")}
          />
        </div>
      ) : (
        <>
          <ConversationList items={items} locale={locale} t={t} youLabel={t("admin.messages.you")} />
          <Pagination
            className="mt-6"
            page={page}
            totalPages={totalPages}
            hrefForPage={(p) => qs({ page: p > 1 ? String(p) : null })}
            labels={{ prev: t("common.pagination.prev"), next: t("common.pagination.next") }}
          />
        </>
      )}
    </div>
  );
}
