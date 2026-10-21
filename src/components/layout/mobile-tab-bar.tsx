"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, LayoutGrid, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useCartBadge } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Bottom tab bar for phones (Басты · Каталог · Кітаптарым · Себет) */
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const cartCount = useCartBadge();

  const tabs = [
    { href: "/", label: t("nav.home"), Icon: House, active: pathname === "/" },
    {
      href: "/catalog",
      label: t("nav.catalog"),
      Icon: LayoutGrid,
      active: pathname.startsWith("/catalog") || pathname.startsWith("/books") || pathname.startsWith("/authors"),
    },
    { href: "/account/library", label: t("nav.myBooksShort"), Icon: BookOpen, active: pathname.startsWith("/account") },
    { href: "/cart", label: t("nav.cart"), Icon: ShoppingBag, active: pathname === "/cart" || pathname === "/checkout", badge: cartCount },
  ];

  return (
    <nav
      aria-label={t("common.a11y.menu")}
      className="nk-no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 shadow-[0_-8px_24px_rgb(var(--nk-shadow-color)/.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-4 px-2 pt-1.5">
        {tabs.map(({ href, label, Icon, active, badge }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] leading-none transition active:scale-95",
              active ? "font-bold text-wine-ink" : "font-semibold text-muted",
            )}
          >
            <span
              className={cn(
                "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
                active && "bg-wine-soft",
              )}
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              {!!badge && (
                <span className="absolute -top-1 left-[calc(50%+4px)] grid h-[18px] min-w-[18px] place-items-center rounded-full bg-wine px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-card">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span className="max-w-full truncate px-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
