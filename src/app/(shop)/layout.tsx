import { Suspense } from "react";
import { getProfile, toSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SessionProvider, CartSync } from "@/components/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { getI18n } from "@/lib/i18n/server";
import type { UserCounters } from "@/types/app";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [profile, { t }] = await Promise.all([getProfile(), getI18n()]);
  const user = toSessionUser(profile);

  let counters: UserCounters | undefined;
  if (user) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.rpc("my_counters");
    counters = (data as unknown as UserCounters) ?? undefined;
  }

  return (
    <SessionProvider user={user} counters={counters}>
      <CartSync />
      <a
        href="#main"
        className="sr-only z-[100] rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-ink shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("common.a11y.skipToContent")}
      </a>
      <Suspense fallback={<div className="h-[68px] bg-navy md:h-[76px]" />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="min-h-[60vh] pb-24 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
    </SessionProvider>
  );
}
