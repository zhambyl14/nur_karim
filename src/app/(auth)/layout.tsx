import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitch, ThemeToggle } from "@/components/layout/controls";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import type { StoreSettings } from "@/types/app";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/**
 * Login / registration / password reset. No shop chrome: navy screen with a
 * white bottom sheet on phones, split screen (brand panel + form) on laptops.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  let settings: StoreSettings | null = null;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  return (
    <div className="min-h-dvh bg-navy lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:bg-page">
      <div className="hidden bg-navy lg:block">
        <AuthBrandPanel settings={settings} />
      </div>

      <div className="relative flex min-h-dvh flex-col overflow-x-clip">
        {/* decorative rotated squares from design 1d (phones / tablets) */}
        <span aria-hidden className="pointer-events-none absolute -right-[90px] top-[150px] size-[260px] rotate-45 border border-gold/25 lg:hidden" />
        <span aria-hidden className="pointer-events-none absolute -right-10 top-[196px] size-40 rotate-45 bg-wine/85 lg:hidden" />

        <header className="relative z-10 flex items-center justify-between gap-3 px-6 pt-5 md:px-8 lg:px-10 lg:pt-8">
          <Logo tone="light" className="lg:hidden" />
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-full px-1 text-sm font-semibold text-muted transition hover:text-ink lg:inline-flex"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("auth.shell.backToShop")}
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitch tone="glass" className="lg:hidden" />
            <ThemeToggle tone="glass" className="lg:hidden" />
            <LocaleSwitch tone="plain" className="hidden lg:grid" />
            <ThemeToggle tone="plain" className="hidden lg:grid" />
          </div>
        </header>

        <main id="main" className="relative z-10 flex flex-1 flex-col md:px-8 lg:items-center lg:justify-center lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
