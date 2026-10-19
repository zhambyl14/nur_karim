"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-navy text-white">
      <div className="nk-container flex h-[68px] items-center gap-3 md:h-[76px] md:gap-5 lg:gap-8">
        <Logo tone="light" size="md" />

        <nav className="hidden items-center gap-6 lg:flex" aria-label={t("common.a11y.menu")}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-semibold transition hover:text-white",
                item.active ? "text-white" : "text-white/70",
              )}
            >
              {item.label}
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

        <div className="ml-auto flex items-center gap-2 md:ml-0 lg:ml-auto">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t("common.actions.search")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white/85 transition hover:bg-white/10 hover:text-white md:hidden lg:grid"
          >
            <Search className="size-[18px]" />
          </button>
          <ThemeToggle />
          <LocaleSwitch className="hidden sm:grid" />
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
            className="hidden h-10 items-center gap-2 rounded-full bg-wine px-[18px] text-[13px] font-bold transition hover:bg-wine-hover md:inline-flex"
          >
            {t("nav.cart")}
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-[#7d1a35]">
              {cartCount}
            </span>
          </Link>
          <UserMenu />
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
