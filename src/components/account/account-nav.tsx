"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Gift, Heart, LayoutGrid, MessageCircle, Package, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useSession } from "@/components/session";
import { CountBubble } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

/** Desktop sidebar + phone horizontal tabs for the /account area */
export function AccountNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { user, counters } = useSession();

  const items = [
    { href: "/account", label: t("nav.account"), icon: LayoutGrid, exact: true },
    { href: "/account/orders", label: t("nav.orders"), icon: Package, count: counters.orders_active },
    { href: "/account/library", label: t("nav.myBooks"), icon: BookOpen },
    { href: "/account/messages", label: t("nav.messages"), icon: MessageCircle, count: counters.unread_messages },
    { href: "/account/gifts", label: t("nav.myGifts"), icon: Gift, count: counters.gifts_waiting },
    { href: "/account/favorites", label: t("nav.favorites"), icon: Heart },
    { href: "/account/settings", label: t("nav.settings"), icon: Settings },
  ];
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* phone / tablet: scrollable tabs */}
      <nav className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 lg:hidden" aria-label={t("nav.account")}>
        {items.map(({ href, label, count, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition",
              isActive(href, exact) ? "bg-primary text-on-primary" : "border border-line bg-card text-ink-2",
            )}
          >
            {label}
            {!!count && <CountBubble count={count} />}
          </Link>
        ))}
      </nav>

      {/* laptop: sidebar */}
      <aside className="sticky top-[100px] hidden self-start lg:block">
        {user && (
          <div className="mb-4 flex items-center gap-3 rounded-[18px] border border-line bg-card p-4">
            <Avatar name={user.fullName || user.phone} size={46} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-ink">{user.fullName || formatPhone(user.phone)}</div>
              <div className="truncate text-xs text-muted">{formatPhone(user.phone)}</div>
            </div>
          </div>
        )}
        <nav className="flex flex-col gap-1 rounded-[18px] border border-line bg-card p-2" aria-label={t("nav.account")}>
          {items.map(({ href, label, icon: Icon, count, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition",
                isActive(href, exact) ? "bg-wine-soft font-bold text-wine-ink" : "font-semibold text-ink-2 hover:bg-subtle hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" />
              <span className="flex-1">{label}</span>
              {!!count && <CountBubble count={count} />}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
