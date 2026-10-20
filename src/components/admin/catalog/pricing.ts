import type { BookFormat, DiscountType, FormatScope, PromoScope } from "@/types/app";
import { scheduleStatus } from "./schedule";

/** Same formula as public.best_price(): percent -> price − floor(price·v/100), fixed -> max(0, price − v) */
export function discountedPrice(price: number, type: DiscountType, value: number): number {
  if (type === "percent") return Math.max(0, price - Math.floor((price * value) / 100));
  return Math.max(0, price - value);
}

export type PromotionRule = {
  id: string;
  discount_type: DiscountType;
  discount_value: number;
  scope: PromoScope;
  genre_id: string | null;
  format_scope: FormatScope;
  book_ids: string[];
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function ruleMatches(
  rule: Pick<PromotionRule, "scope" | "genre_id" | "format_scope" | "book_ids">,
  book: { id: string; genre_id: string | null },
  format: BookFormat,
): boolean {
  if (rule.format_scope !== "any" && rule.format_scope !== format) return false;
  if (rule.scope === "all") return true;
  if (rule.scope === "genre") return !!book.genre_id && rule.genre_id === book.genre_id;
  return rule.book_ids.includes(book.id);
}

/** Lowest price among the promotions running right now (or the base price). */
export function bestPromotionPrice(
  price: number | null,
  book: { id: string; genre_id: string | null },
  format: BookFormat,
  rules: PromotionRule[],
  now: number = Date.now(),
): number | null {
  if (price === null) return null;
  let best = price;
  for (const rule of rules) {
    if (scheduleStatus(rule, now) !== "active") continue;
    if (!ruleMatches(rule, book, format)) continue;
    best = Math.min(best, discountedPrice(price, rule.discount_type, rule.discount_value));
  }
  return best;
}

export function discountPct(price: number | null, final: number | null): number {
  if (!price || final === null || price <= 0) return 0;
  return Math.round((100 * (price - final)) / price);
}
