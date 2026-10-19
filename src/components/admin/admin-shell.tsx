"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookOpen,
  History,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Package,
  Settings,
  Star,
  Store,
  Tags,
  TicketPercent,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { ThemeToggle, LocaleSwitch } from "@/components/layout/controls";
import type { AdminCounters, SessionUser } from "@/types/app";
import type { TKey } from "@/lib/i18n/translate";

type NavItem = {
  href: string;
  key: TKey;
  icon: ReactNode;
  count?: number;
  exact?: boolean;
};

function useNav(counters: AdminCounters): NavItem[] {
  return [
    { href: "/admin", key: "admin.nav.overview", icon: <LayoutGrid className="size-[18px]" />, exact: true },
    {
      href: "/admin/orders",
      key: "admin.nav.orders",
      icon: <Package className="size-[18px]" />,
      count: counters.pending_payment + counters.payment_review + counters.to_ship,
    },
    { href: "/admin/books", key: "admin.nav.books", icon: <BookOpen className="size-[18px]" />, count: counters.low_stock || undefined },
    { href: "/admin/genres", key: "admin.nav.genres", icon: <Tags className="size-[18px]" /> },
    { href: "/admin/promotions", key: "admin.nav.promotions", icon: <BadgePercent className="size-[18px]" /> },
    { href: "/admin/promo-codes", key: "admin.nav.promoCodes", icon: <TicketPercent className="size-[18px]" /> },
    { href: "/admin/banners", key: "admin.nav.banners", icon: <ImageIcon className="size-[18px]" /> },
    {
      href: "/admin/messages",
      key: "admin.nav.messages",
      icon: <MessageCircle className="size-[18px]" />,
      count: counters.unread_messages,
    },
    { href: "/admin/reviews", key: "admin.nav.reviews", icon: <Star className="size-[18px]" /> },
    { href: "/admin/customers", key: "admin.nav.customers", icon: <Users className="size-[18px]" /> },
    { href: "/admin/settings", key: "admin.nav.settings", icon: <Settings className="size-[18px]" /> },
    { href: "/admin/activity", key: "admin.nav.activity", icon: <History className="size-[18px]" /> },
  ];
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({
  user,
  counters,
  children,
}: {
  user: SessionUser;
  counters: AdminCounters;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const nav = useNav(counters);
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [nav[0], nav[1], nav[2], nav[9]]; // overview, orders, books, customers
  const moreItems = nav.filter((item) => !tabs.includes(item));
  const moreCount = moreItems.reduce((n, i) => n + (i.count ?? 0), 0);

  return (
    <div className="min-h-dvh bg-page lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto bg-navy px-[18px] py-[26px] text-white lg:flex">
        <div className="flex items-center gap-2.5 px-2.5 pb-6">
          <Logo tone="light" size="md" href="/admin" />
          <span className="ml-auto rounded-md bg-gold-soft px-[7px] py-1 text-[9px] font-extrabold tracking-[.1em] text-gold">
            {t("admin.nav.badge")}
          </span>
        </div>
        {nav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[11px] px-3.5 py-3 text-sm transition",
                active ? "bg-wine font-bold text-white" : "font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <span className={active ? "text-white" : "text-white/55"}>{item.icon}</span>
              <span className="flex-1">{t(item.key)}</span>
              {!!item.count && (
                <span className="rounded-full bg-white/[0.14] px-2 py-px text-xs font-bold text-white">{item.count}</span>
              )}
            </Link>
          );
        })}
        <div className="mt-auto space-y-3 pt-6">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            <LocaleSwitch />
          </div>
          <Link
            href="/"
            className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-3.5 text-xs font-bold text-white/85 hover:bg-white/10"
          >
            <Store className="size-4" /> {t("admin.nav.toStore")}
          </Link>
          <div className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.06] p-3.5">
            <Avatar name={user.fullName || user.phone} size={34} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{user.fullName || user.phone}</div>
              <div className="text-[11px] font-medium text-white/50">{t("admin.nav.role")}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone / tablet top bar */}
        <div className="sticky top-0 z-40 flex h-[60px] items-center gap-2 border-b border-white/[0.08] bg-navy px-4 text-white lg:hidden">
          <Logo tone="light" size="sm" href="/admin" />
          <span className="rounded-md bg-gold-soft px-[7px] py-1 text-[9px] font-extrabold tracking-[.1em] text-gold">
            {t("admin.nav.badge")}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="size-9" />
            <LocaleSwitch className="h-9" />
            <Link
              href="/"
              aria-label={t("admin.nav.toStore")}
              className="grid size-9 place-items-center rounded-full border border-white/15 text-white/85"
            >
              <Store className="size-4" />
            </Link>
          </div>
        </div>

        <main className="px-4 pb-28 pt-5 sm:px-6 lg:px-9 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Phone bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-card/95 px-2 pt-2 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {tabs.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 text-[10.5px]",
                active ? "font-bold text-wine-ink" : "font-semibold text-faint",
              )}
            >
              {item.icon}
              <span className="truncate">{item.key === "admin.nav.orders" ? t("admin.nav.ordersShort") : t(item.key)}</span>
              {!!item.count && (
                <span className="absolute -top-1 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-wine px-1 text-[9px] font-extrabold text-white">
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="relative flex flex-col items-center gap-1 text-[10.5px] font-semibold text-faint"
        >
          <MoreHorizontal className="size-[18px]" />
          {t("admin.nav.more")}
          {moreCount > 0 && (
            <span className="absolute -top-1 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-wine px-1 text-[9px] font-extrabold text-white">
              {moreCount}
            </span>
          )}
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t("admin.nav.more")} closeLabel={t("common.actions.close")}>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-line p-3.5 text-sm font-bold",
                isActive(pathname, item) ? "border-wine bg-wine-soft text-wine-ink" : "bg-card text-ink",
              )}
            >
              <span className="text-muted">{item.icon}</span>
              <span className="flex-1">{t(item.key)}</span>
              {!!item.count && <span className="rounded-full bg-wine px-2 text-xs text-white">{item.count}</span>}
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
