import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { isTelegramConfigured } from "@/lib/telegram";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/misc";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { DemoDataCard } from "@/components/admin/settings/demo-data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.settings.title") };
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [{ t }, supabase] = await Promise.all([getI18n(), createSupabaseServer()]);
  const demo = (table: "books" | "promotions" | "promo_codes" | "banners") =>
    supabase.from(table).select("id", { count: "exact", head: true }).eq("is_demo", true);

  const [settingsRes, books, promotions, codes, banners, admins] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("books").select("id", { count: "exact", head: true }).eq("is_demo", true).eq("is_published", true),
    demo("promotions"),
    demo("promo_codes"),
    demo("banners"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").not("telegram_id", "is", null),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <AdminPageHeader title={t("admin.settings.title")} description={t("admin.settings.description")} />
      {!settingsRes.data ? (
        <div className="rounded-[18px] border border-line bg-card">
          <EmptyState title={t("common.errorPage.title")} description={t("common.errorPage.text")} />
        </div>
      ) : (
        <SettingsForm
          // remount with fresh values after a save elsewhere (another admin / tab)
          key={settingsRes.data.updated_at}
          settings={settingsRes.data}
          telegramConfigured={isTelegramConfigured()}
          adminsWithTelegram={admins.count ?? 0}
        >
          <DemoDataCard
            counts={{
              books: books.count ?? 0,
              promotions: promotions.count ?? 0,
              codes: codes.count ?? 0,
              banners: banners.count ?? 0,
            }}
          />
        </SettingsForm>
      )}
    </div>
  );
}
