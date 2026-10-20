import { formatDateTime, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import type { DiscountType } from "@/types/app";

export function discountText(type: DiscountType, value: number): string {
  return type === "percent" ? `−${value}%` : `−${formatPrice(value)}`;
}

export function periodText(t: TFunction, locale: Locale, startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) {
    return t("admin.promotions.common.period", {
      start: formatDateTime(startsAt, locale),
      end: formatDateTime(endsAt, locale),
    });
  }
  if (startsAt) return t("admin.promotions.common.periodFrom", { date: formatDateTime(startsAt, locale) });
  if (endsAt) return t("admin.promotions.common.periodUntil", { date: formatDateTime(endsAt, locale) });
  return t("admin.promotions.common.periodAlways");
}
