import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Gift, Heart, LayoutDashboard, MessageCircle, Package, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { Avatar } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { WelcomeBanner } from "@/components/account/welcome-banner";
import { TelegramStatusCard } from "@/components/account/telegram-status-card";
import {
  ContinueReadingCard,
  LatestOrderCard,
  ShortcutTile,
  StatTile,
  type LatestOrder,
} from "@/components/account/overview-cards";
import type { OrderStatus, UserCounters } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("account.meta.overview") };
}

type ReadingRow = {
  book_id: string;
  page: number;
  page_count: number;
  books: { title: string; author: string; cover_url: string | null; cover_palette: number } | null;
};

type OrderRow = {
  order_number: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  has_paper: boolean;
  order_items: { quantity: number }[];
};

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireUser("/account");
  const { t } = await getI18n();
  const { welcome } = await searchParams;
  const supabase = await createSupabaseServer();

  const [countersRes, ebooksRes, readingRes, orderRes] = await Promise.all([
    supabase.rpc("my_counters"),
    supabase.from("entitlements").select("book_id", { count: "exact", head: true }).eq("user_id", profile.id),
    supabase
      .from("reading_progress")
      .select("book_id, page, page_count, books(title, author, cover_url, cover_palette)")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("order_number, status, total, created_at, has_paper, order_items(quantity)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const counters: UserCounters = {
    unread_messages: 0,
    gifts_waiting: 0,
    orders_active: 0,
    ...((countersRes.data as Partial<UserCounters> | null) ?? {}),
  };
  const ebooks = ebooksRes.count ?? 0;
  const reading = readingRes.data as ReadingRow | null;
  const orderRow = orderRes.data as OrderRow | null;
  const latestOrder: LatestOrder | null = orderRow
    ? {
        order_number: orderRow.order_number,
        status: orderRow.status,
        total: orderRow.total,
        created_at: orderRow.created_at,
        has_paper: orderRow.has_paper,
        items: orderRow.order_items.reduce((sum, item) => sum + item.quantity, 0),
      }
    : null;

  const firstName = profile.full_name.trim().split(/\s+/)[0] ?? "";
  const memberYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Almaty" }).format(
    new Date(profile.created_at),
  );

  const shortcuts = [
    { href: "/account/orders", icon: Package, title: t("nav.orders"), description: t("account.shortcuts.orders"), count: counters.orders_active },
    { href: "/account/library", icon: BookOpen, title: t("nav.myBooks"), description: t("account.shortcuts.library") },
    { href: "/account/messages", icon: MessageCircle, title: t("nav.messages"), description: t("account.shortcuts.messages"), count: counters.unread_messages },
    { href: "/account/gifts", icon: Gift, title: t("nav.myGifts"), description: t("account.shortcuts.gifts"), count: counters.gifts_waiting },
    { href: "/account/favorites", icon: Heart, title: t("nav.favorites"), description: t("account.shortcuts.favorites") },
    { href: "/account/settings", icon: Settings, title: t("nav.settings"), description: t("account.shortcuts.settings") },
  ];

  return (
    <div className="grid gap-5 sm:gap-6">
      {welcome === "1" && <WelcomeBanner />}

      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={profile.full_name || profile.phone} size={56} className="lg:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[32px]">
            {firstName ? t("account.overview.greeting", { name: firstName }) : t("account.overview.greetingNoName")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <span className="lg:hidden">{formatPhone(profile.phone)} · </span>
            {t("account.overview.memberSince", { year: memberYear })}
          </p>
        </div>
        {profile.role === "admin" && (
          <Link href="/admin" className={buttonVariants({ variant: "ink", size: "sm" })}>
            <LayoutDashboard className="size-4" aria-hidden />
            {t("account.overview.adminLink")}
          </Link>
        )}
      </header>

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">
          {t("account.stats.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile href="/account/orders" icon={Package} label={t("account.stats.activeOrders")} value={counters.orders_active} highlight={counters.orders_active > 0} />
          <StatTile href="/account/library" icon={BookOpen} label={t("account.stats.ebooks")} value={ebooks} />
          <StatTile href="/account/gifts" icon={Gift} label={t("account.stats.gifts")} value={counters.gifts_waiting} highlight={counters.gifts_waiting > 0} />
          <StatTile href="/account/messages" icon={MessageCircle} label={t("account.stats.messages")} value={counters.unread_messages} highlight={counters.unread_messages > 0} />
        </div>
      </section>

      <div className={reading?.books ? "grid gap-4 xl:grid-cols-2" : "grid gap-4"}>
        {reading?.books && (
          <ContinueReadingCard
            bookId={reading.book_id}
            title={reading.books.title}
            author={reading.books.author}
            coverUrl={reading.books.cover_url}
            palette={reading.books.cover_palette}
            page={reading.page}
            pageCount={reading.page_count}
          />
        )}
        <LatestOrderCard order={latestOrder} />
      </div>

      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
          {t("account.shortcuts.title")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => (
            <ShortcutTile key={item.href} {...item} />
          ))}
        </div>
      </section>

      <TelegramStatusCard telegramId={profile.telegram_id} telegramUsername={profile.telegram_username} />
    </div>
  );
}
