"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useCartBadge } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { ThemeToggle, LocaleSwitch } from "./controls";
import { UserMenu } from "./user-menu";
import { SearchDialog } from "./search-dialog";

/** Navy header from the design (desktop nav, tablet inline search, phone compact) */
export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const cartCount = useCartBadge();
  const [searchOpen, setSearchOpen] = useState(false);

  const format = searchParams.get("format");
  const sort = searchParams.get("sort");
  const nav = [
    { href: "/catalog", label: t("nav.catalog"), active: pathname === "/catalog" && !format && sort !== "new" },
    { href: "/catalog?sort=new", label: t("nav.newBooks"), active: pathname === "/catalog" && sort === "new" },
    { href: "/authors", label: t("nav.authors"), active: pathname.startsWith("/authors") },
    { href: "/catalog?format=ebook", label: t("nav.ebooks"), active: pathname === "/catalog" && format === "ebook" },
    { href: "/gifts", label: t("nav.gifts"), active: pathname.startsWith("/gift") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-navy text-white shadow-[0_1px_0_rgba(255,255,255,.06)]">
      <div className="nk-container flex h-[68px] items-center gap-3 md:h-[76px] md:gap-5 lg:gap-8">
        <Logo tone="light" size="md" />

        <nav className="hidden h-full items-center gap-1 lg:flex xl:gap-2" aria-label={t("common.a11y.menu")}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center rounded-full px-3 text-sm font-semibold transition hover:bg-white/[0.06] hover:text-white",
                item.active ? "text-white" : "text-white/70",
              )}
            >
              {item.label}
              {item.active && (
                <span className="absolute -bottom-[9px] left-1/2 size-[7px] -translate-x-1/2 rotate-45 bg-gold" aria-hidden />
              )}
            </Link>
          ))}
        </nav>

        {/* tablet: inline search like the design */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mx-1 hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.08] px-3.5 text-left text-sm font-medium text-white/55 transition hover:bg-white/[0.12] md:flex lg:hidden"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{t("nav.searchShort")}</span>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0 lg:ml-auto">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t("common.actions.search")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white/85 transition hover:bg-white/10 hover:text-white md:hidden lg:grid"
          >
            <Search className="size-[18px]" />
          </button>
          <ThemeToggle />
          <LocaleSwitch className="hidden min-w-10 px-2.5 min-[385px]:grid sm:min-w-12 sm:px-3" />
          {user && (
            <Link
              href="/account/library"
              className="hidden h-10 items-center rounded-full border border-white/20 px-4 text-[13px] font-semibold transition hover:bg-white/10 xl:inline-flex"
            >
              {t("nav.myBooks")}
            </Link>
          )}
          <Link
            href="/cart"
            className="hidden h-10 items-center gap-2 rounded-full bg-wine pl-4 pr-2 text-[13px] font-bold shadow-[0_6px_16px_rgba(125,26,53,.35)] transition hover:bg-wine-hover md:inline-flex"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {t("nav.cart")}
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#7d1a35]">
              {cartCount}
            </span>
          </Link>
          <UserMenu />
        </div>
      </div>
      <div className="nk-hairline-gold opacity-30" aria-hidden />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
