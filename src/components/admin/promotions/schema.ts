import { z } from "zod";

export const MAX_FIXED_DISCOUNT = 10_000_000;
export const MAX_SCOPE_BOOKS = 500;

const isoOrNull = z
  .string()
  .nullable()
  .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "DATE_INVALID");

/** Discount, scope and schedule shared by promotions and promo codes. Messages are error codes. */
export const discountRuleShape = {
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int("VALUE_FIXED"),
  scope: z.enum(["all", "genre", "books"]),
  genre_id: z.uuid().nullable(),
  book_ids: z.array(z.uuid()).max(MAX_SCOPE_BOOKS, "BOOKS_TOO_MANY"),
  format_scope: z.enum(["any", "paper", "ebook"]),
  starts_at: isoOrNull,
  ends_at: isoOrNull,
  is_active: z.boolean(),
};

type RuleFields = {
  discount_type: "percent" | "fixed";
  discount_value: number;
  scope: "all" | "genre" | "books";
  genre_id: string | null;
  book_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
};

/** Cross-field checks; add with `.superRefine(checkDiscountRule)` */
export function checkDiscountRule(value: RuleFields, ctx: z.RefinementCtx) {
  if (value.discount_type === "percent" && (value.discount_value < 1 || value.discount_value > 95)) {
    ctx.addIssue({ code: "custom", path: ["discount_value"], message: "VALUE_PERCENT" });
  }
  if (value.discount_type === "fixed" && (value.discount_value < 1 || value.discount_value > MAX_FIXED_DISCOUNT)) {
    ctx.addIssue({ code: "custom", path: ["discount_value"], message: "VALUE_FIXED" });
  }
  if (value.scope === "genre" && !value.genre_id) {
    ctx.addIssue({ code: "custom", path: ["genre_id"], message: "GENRE_REQUIRED" });
  }
  if (value.scope === "books" && value.book_ids.length === 0) {
    ctx.addIssue({ code: "custom", path: ["book_ids"], message: "BOOKS_REQUIRED" });
  }
  if (value.starts_at && value.ends_at && new Date(value.ends_at) <= new Date(value.starts_at)) {
    ctx.addIssue({ code: "custom", path: ["ends_at"], message: "DATES_ORDER" });
  }
}

/** Columns written to promotions / promo_codes (genre and book list follow the scope) */
export function ruleColumns<T extends RuleFields & { format_scope: "any" | "paper" | "ebook"; is_active: boolean }>(v: T) {
  return {
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    scope: v.scope,
    genre_id: v.scope === "genre" ? v.genre_id : null,
    format_scope: v.format_scope,
    starts_at: v.starts_at,
    ends_at: v.ends_at,
    is_active: v.is_active,
  };
}

export const promotionSchema = z
  .object({
    title_kk: z.string().trim().min(1, "REQUIRED").max(120, "TOO_LONG"),
    title_ru: z.string().trim().max(120, "TOO_LONG"),
    ...discountRuleShape,
  })
  .superRefine(checkDiscountRule);

export type PromotionInput = z.input<typeof promotionSchema>;

export const PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;

const optionalPositiveInt = z
  .number()
  .int("NUMBER_INVALID")
  .min(1, "NUMBER_INVALID")
  .max(1_000_000, "NUMBER_INVALID")
  .nullable();

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().min(1, "REQUIRED").regex(PROMO_CODE_RE, "CODE_INVALID")),
    description: z.string().trim().max(300, "TOO_LONG"),
    min_order_amount: z.number().int("NUMBER_INVALID").min(0, "NUMBER_INVALID").max(MAX_FIXED_DISCOUNT, "NUMBER_INVALID"),
    max_uses: optionalPositiveInt,
    per_user_limit: optionalPositiveInt,
    ...discountRuleShape,
  })
  .superRefine(checkDiscountRule);

export type PromoCodeInput = z.input<typeof promoCodeSchema>;
