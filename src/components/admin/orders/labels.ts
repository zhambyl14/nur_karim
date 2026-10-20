import type { TFunction } from "@/lib/i18n/translate";
import type { OrderStatus } from "@/types/app";

/** Status text; digital-only orders show «Аяқталды» instead of «Жеткізілді». */
export function orderStatusLabel(t: TFunction, status: OrderStatus, hasPaper: boolean): string {
  if (status === "delivered" && !hasPaper) return t("status.orderDigitalDelivered");
  return t(`status.order.${status}`);
}

const OWN_ERRORS = ["TRACKING_REQUIRED", "NOTE_REQUIRED", "REASON_REQUIRED"] as const;

/** Translates an action error code: own namespace first, then the shared `errors` namespace. */
export function orderErrorText(t: TFunction, te: (code: string) => string, code: string): string {
  return (OWN_ERRORS as readonly string[]).includes(code)
    ? t(`admin.orders.errors.${code as (typeof OWN_ERRORS)[number]}`)
    : te(code);
}

export function cancelReasonText(t: TFunction, reason: string | null): string {
  if (!reason) return "";
  if (reason === "CLIENT_CANCELLED" || reason === "AUTO_TIMEOUT" || reason === "ADMIN_CANCELLED") {
    return t(`admin.orders.cancelReasons.${reason}`);
  }
  return reason;
}
