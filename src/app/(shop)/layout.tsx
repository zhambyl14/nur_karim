import { Suspense } from "react";
import { getProfile, toSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SessionProvider, CartSync } from "@/components/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import type { UserCounters } from "@/types/app";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
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
