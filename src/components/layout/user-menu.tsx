"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Gift, Heart, LayoutDashboard, LogOut, MessageCircle, Package, Settings, User } from "lucide-react";
import { useSession } from "@/components/session";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { formatPhone } from "@/lib/phone";
import { Avatar, } from "@/components/ui/misc";
import { CountBubble } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";

export function UserMenu({ tone = "glass" }: { tone?: "glass" | "plain" }) {
  const { t } = useI18n();
  const router = useRouter();
  const { user, counters } = useSession();

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-bold transition",
          tone === "glass" ? "border border-white/20 text-white hover:bg-white/10" : "border border-line bg-card text-ink hover:bg-subtle",
        )}
      >
        {t("nav.login")}
      </Link>
    );
  }

  const badge = counters.unread_messages + counters.gifts_waiting;
  const items: { href: string; label: string; icon: React.ReactNode; count?: number }[] = [
    { href: "/account", label: t("nav.account"), icon: <User className="size-4" /> },
    { href: "/account/orders", label: t("nav.orders"), icon: <Package className="size-4" />, count: counters.orders_active },
    { href: "/account/library", label: t("nav.myBooks"), icon: <BookOpen className="size-4" /> },
    { href: "/account/messages", label: t("nav.messages"), icon: <MessageCircle className="size-4" />, count: counters.unread_messages },
    { href: "/account/gifts", label: t("nav.myGifts"), icon: <Gift className="size-4" />, count: counters.gifts_waiting },
    { href: "/account/favorites", label: t("nav.favorites"), icon: <Heart className="size-4" /> },
    { href: "/account/settings", label: t("nav.settings"), icon: <Settings className="size-4" /> },
  ];

  return (
    <Dropdown
      align="right"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={t("common.a11y.profile")}
          className="relative shrink-0 rounded-full"
        >
          <Avatar name={user.fullName || user.phone} size={40} />
          {badge > 0 && <CountBubble count={badge} className="absolute -right-1 -top-1 ring-2 ring-navy" />}
        </button>
      )}
    >
      {(close) => (
        <div className="w-64">
          <div className="flex items-center gap-3 border-b border-line-soft px-3 pb-3 pt-2">
            <Avatar name={user.fullName || user.phone} size={40} tone="soft" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-ink">{user.fullName || formatPhone(user.phone)}</div>
              <div className="truncate text-xs text-muted">{formatPhone(user.phone)}</div>
            </div>
          </div>
          <div className="py-1">
            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-wine-ink transition hover:bg-wine-soft"
              >
                <LayoutDashboard className="size-4" />
                {t("nav.admin")}
              </Link>
            )}
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-subtle"
              >
                <span className="text-muted">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {!!item.count && <CountBubble count={item.count} />}
              </Link>
            ))}
            <button
              type="button"
              onClick={async () => {
                close();
                await getSupabaseBrowser().auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-danger-soft"
            >
              <LogOut className="size-4" />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}
