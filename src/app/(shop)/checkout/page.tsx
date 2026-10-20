import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getSettings } from "@/lib/data/common";
import { formatPhone } from "@/lib/phone";
import { CheckoutView } from "@/components/checkout/checkout-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("checkout.metaTitle"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "gift" ? "gift" : "self";
  const [profile, settings] = await Promise.all([
    requireUser(mode === "gift" ? "/checkout?mode=gift" : "/checkout"),
    getSettings(),
  ]);

  return (
    <CheckoutView
      initialMode={settings.gift_enabled ? mode : "self"}
      giftEnabled={settings.gift_enabled}
      profile={{
        name: profile.full_name,
        phone: formatPhone(profile.phone),
        savedAddress: profile.saved_address ?? null,
      }}
    />
  );
}
