import { AUTH_EMAIL_DOMAIN } from "@/lib/env";

/**
 * Normalizes a phone number to digits in local format 87XXXXXXXXX.
 * MUST stay identical to public.normalize_phone() in the database.
 *   "+7 747 400 53 47" -> "87474005347"
 *   "77474005347"      -> "87474005347"
 *   "7474005347"       -> "87474005347"
 */
export function normalizePhone(input: string | null | undefined): string | null {
  const d = (input ?? "").replace(/\D/g, "");
  if (d === "") return null;
  if (/^7\d{10}$/.test(d)) return `8${d.slice(1)}`;
  if (/^8\d{10}$/.test(d)) return d;
  if (/^7\d{9}$/.test(d)) return `8${d}`;
  return d;
}

/** Kazakhstan / Russia style number accepted for login and registration */
export function isValidPhone(input: string | null | undefined): boolean {
  const n = normalizePhone(input);
  return !!n && /^8\d{10}$/.test(n);
}

/** 87474005347 -> "+7 747 400 53 47" */
export function formatPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return "";
  if (/^8\d{10}$/.test(n)) {
    return `+7 ${n.slice(1, 4)} ${n.slice(4, 7)} ${n.slice(7, 9)} ${n.slice(9, 11)}`;
  }
  return `+${n}`;
}

/** 87474005347 -> "+7 747 *** ** 47" */
export function maskPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return "";
  if (/^8\d{10}$/.test(n)) return `+7 ${n.slice(1, 4)} *** ** ${n.slice(9, 11)}`;
  return `${n.slice(0, 3)}****${n.slice(-2)}`;
}

/** Supabase Auth e-mail for a phone: 87474005347@karim.kz */
export function phoneToAuthEmail(input: string): string | null {
  const n = normalizePhone(input);
  return n ? `${n}@${AUTH_EMAIL_DOMAIN}` : null;
}

/** tel: link */
export function phoneHref(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return "";
  return /^8\d{10}$/.test(n) ? `tel:+7${n.slice(1)}` : `tel:+${n}`;
}

/** WhatsApp link for a phone number */
export function whatsappHref(input: string | null | undefined, text?: string): string {
  const n = normalizePhone(input);
  if (!n) return "";
  const intl = /^8\d{10}$/.test(n) ? `7${n.slice(1)}` : n;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/**
 * Formats raw input while typing: "8747" -> "+7 747", "87474005347" -> "+7 747 400 53 47"
 */
export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, "");
  // A full number pasted after the "+7 " prefix: "+7 87001234567" -> drop the prefix 7.
  if (d.length >= 12 && d.startsWith("7") && (d[1] === "8" || d[1] === "7")) d = d.slice(1);
  if (d.startsWith("8")) d = `7${d.slice(1)}`;
  if (d.length > 0 && !d.startsWith("7")) d = `7${d}`;
  d = d.slice(0, 11);
  const rest = d.slice(1);
  let out = "+7";
  if (rest.length > 0) out += ` ${rest.slice(0, 3)}`;
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += ` ${rest.slice(6, 8)}`;
  if (rest.length > 8) out += ` ${rest.slice(8, 10)}`;
  return out;
}
