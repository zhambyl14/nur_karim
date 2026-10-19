"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { useCartBadge } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/* Geometric icons drawn exactly like the design mockup */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <span
      className={cn("size-[10px] rotate-45", active ? "bg-wine-ink" : "border-2 border-faint")}
      style={{ boxSizing: "border-box" }}
    />
  );
}
function CatalogIcon({ active }: { active: boolean }) {
  return <span className={cn("size-[11px] rounded-[2px]", active ? "bg-wine-ink" : "border-2 border-faint")} />;
}
function BooksIcon({ active }: { active: boolean }) {
  return <span className={cn("h-3 w-[9px] rounded-[1px_3px_3px_1px]", active ? "bg-wine-ink" : "border-2 border-faint")} />;
}
function CartIcon({ active }: { active: boolean }) {
  return <span className={cn("h-[11px] w-3 rounded-[2px_2px_4px_4px]", active ? "bg-wine-ink" : "border-2 border-faint")} />;
}

/** Bottom tab bar for phones (Басты · Каталог · Кітаптарым · Себет) */
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const cartCount = useCartBadge();

  const tabs = [
    { href: "/", label: t("nav.home"), Icon: HomeIcon, active: pathname === "/" },
    {
      href: "/catalog",
      label: t("nav.catalog"),
      Icon: CatalogIcon,
      active: pathname.startsWith("/catalog") || pathname.startsWith("/books") || pathname.startsWith("/authors"),
    },
    { href: "/account/library", label: t("nav.myBooksShort"), Icon: BooksIcon, active: pathname.startsWith("/account") },
    { href: "/cart", label: t("nav.cart"), Icon: CartIcon, active: pathname === "/cart" || pathname === "/checkout", badge: cartCount },
  ];

  return (
    <nav
      aria-label={t("common.a11y.menu")}
      className="nk-no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-card/95 px-3.5 pt-2.5 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
    >
      {tabs.map(({ href, label, Icon, active, badge }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center gap-[5px] text-[10.5px]",
            active ? "font-bold text-wine-ink" : "font-semibold text-faint",
          )}
        >
          <span className="grid h-3.5 place-items-center">
            <Icon active={active} />
          </span>
          {label}
          {!!badge && (
            <span className="absolute -top-1.5 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-wine px-1 text-[9px] font-extrabold leading-none text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
