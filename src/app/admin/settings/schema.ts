import { z } from "zod";
import { formatPhone, isValidPhone } from "@/lib/phone";

/**
 * Validation for the store_settings form (used by the server action and, for
 * instant feedback, by the client form). Issue messages are i18n codes from
 * admin.settings.errors; ranges carry their bounds in `params`.
 */

const text = (max: number) => z.string().trim().max(max, { message: "tooLong" });
const required = (max: number) => text(max).min(1, { message: "required" });

const phone = z
  .string()
  .trim()
  .refine((v) => isValidPhone(v), { message: "phone" })
  .transform((v) => formatPhone(v));

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidPhone(v), { message: "phone" })
  .transform((v) => (v === "" ? null : formatPhone(v)));

const optionalUrl = z
  .string()
  .trim()
  .max(300, { message: "tooLong" })
  .refine((v) => v === "" || /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(v), { message: "url" })
  .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .max(200, { message: "tooLong" })
  .refine((v) => v === "" || z.email().safeParse(v).success, { message: "email" })
  .transform((v) => (v === "" ? null : v.toLowerCase()));

const int = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null ? Number.NaN : v), z.coerce
    .number({ message: "number" })
    .refine((v) => Number.isFinite(v) && Number.isInteger(v), { message: "number" })
    .refine((v) => v >= min && v <= max, { message: "range", params: { min, max } }));

const optionalPositiveInt = z
  .union([z.literal(""), z.null(), z.coerce.number()])
  .transform((v) => (v === "" || v === null ? null : v))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 10_000_000), {
    message: "range",
    params: { min: 1, max: 10_000_000 },
  });

export const settingsSchema = z.object({
  store_name: required(80),
  contact_phone: phone,
  contact_email: optionalEmail,
  address_kk: text(300),
  address_ru: text(300),
  instagram_url: optionalUrl,
  telegram_url: optionalUrl,
  whatsapp_phone: optionalPhone,

  payment_phone: phone,
  payment_recipient: text(80),
  payment_bank: required(60),
  payment_note_kk: text(1000),
  payment_note_ru: text(1000),

  delivery_astana_price: int(0, 100_000),
  delivery_kazpost_price: int(0, 100_000),
  free_delivery_threshold: optionalPositiveInt,

  gift_enabled: z.boolean(),
  gift_wrap_price: int(0, 100_000),

  ebook_max_devices: int(1, 20),
  ebook_pages_per_10min: int(10, 5000),
  ebook_watermark: z.boolean(),

  hero_label_kk: required(40),
  hero_label_ru: required(40),
  hero_quote_kk: required(300),
  hero_quote_ru: required(300),
  hero_sub_kk: text(300),
  hero_sub_ru: text(300),

  order_auto_cancel_hours: int(1, 720),
  telegram_notify_admins: z.boolean(),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
export type SettingsField = keyof SettingsInput;
export type FieldErrors = Partial<Record<SettingsField, { code: string; min?: number; max?: number }>>;

export function collectErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as SettingsField | undefined;
    if (!key || out[key]) continue;
    const params = (issue as { params?: { min?: number; max?: number } }).params;
    out[key] = { code: issue.message, min: params?.min, max: params?.max };
  }
  return out;
}
