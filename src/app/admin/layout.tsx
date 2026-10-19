import type { Metadata } from "next";
import { requireAdmin, toSessionUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SessionProvider } from "@/components/session";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminCounters, SessionUser } from "@/types/app";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const EMPTY: AdminCounters = {
  pending_payment: 0,
  payment_review: 0,
  to_ship: 0,
  unread_messages: 0,
  low_stock: 0,
  new_reviews: 0,
  gifts_waiting_address: 0,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const user = toSessionUser(profile) as SessionUser;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("admin_counters");
  const counters = { ...EMPTY, ...((data as unknown as Partial<AdminCounters>) ?? {}) };

  return (
    <SessionProvider user={user}>
      <AdminShell user={user} counters={counters}>
        {children}
      </AdminShell>
    </SessionProvider>
  );
}
