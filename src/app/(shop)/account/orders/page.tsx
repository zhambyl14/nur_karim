import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { OrderList, type OrderListRow } from "@/components/orders/order-list";
import type { OrderStatus } from "@/types/app";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("orders.metaTitle") };
}

const TABS = {
  active: ["pending_payment", "payment_review", "paid", "shipped"],
  completed: ["delivered"],
  cancelled: ["cancelled"],
} as const satisfies Record<string, OrderStatus[]>;
type Tab = keyof typeof TABS;

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "completed" || sp.tab === "cancelled" ? sp.tab : "active";
  const [profile, { t, locale }] = await Promise.all([requireUser("/account/orders"), getI18n()]);
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, created_at, delivered_at, has_paper, is_gift, tracking_number, order_items(title, author, cover_url, cover_palette, format)",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const all = (data ?? []) as unknown as OrderListRow[];
  const count = (k: Tab) => all.filter((o) => (TABS[k] as readonly OrderStatus[]).includes(o.status)).length;
  const orders = all.filter((o) => (TABS[tab] as readonly OrderStatus[]).includes(o.status));

  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink sm:text-[32px]">{t("orders.title")}</h1>
      <nav aria-label={t("orders.tabs.label")} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <ChipLink key={k} href={k === "active" ? "/account/orders" : `/account/orders?tab=${k}`} active={tab === k}>
            {t(`orders.tabs.${k}`)}
            <span className="text-xs opacity-70">{count(k)}</span>
          </ChipLink>
        ))}
      </nav>

      <div className="mt-5">
        {error ? (
          <p role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm font-semibold text-danger">
            {t("orders.list.error")}
          </p>
        ) : orders.length === 0 ? (
          <div className="rounded-[20px] border border-line bg-card">
            <EmptyState
              icon={<Package className="size-6" />}
              title={t(`orders.empty.${tab}`)}
              description={t(`orders.empty.${tab}Text`)}
              action={
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  {t("orders.empty.action")}
                </Link>
              }
            />
          </div>
        ) : (
          <OrderList orders={orders} t={t} locale={locale} />
        )}
      </div>
    </div>
  );
}
