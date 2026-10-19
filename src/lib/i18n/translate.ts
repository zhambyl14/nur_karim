import type { Dictionary } from "@/i18n/kk";
import type { Locale } from "./config";

/** Every leaf key of the dictionary, e.g. "catalog.title" */
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Leaves<Dictionary>;
export type TVars = Record<string, string | number | null | undefined>;
export type TFunction = (key: TKey, vars?: TVars) => string;

function lookup(dict: unknown, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return node;
}

/**
 * Plural forms are written with "|":
 *   ru: "{count} книга|{count} книги|{count} книг"  (one|few|many)
 *   kk: "{count} кітап"                             (no plural forms needed)
 */
function pickPlural(rules: Intl.PluralRules, count: number, forms: string[]): string {
  const category = rules.select(count);
  if (forms.length >= 3) {
    const index = category === "one" ? 0 : category === "few" ? 1 : 2;
    return forms[index] ?? forms[forms.length - 1];
  }
  if (forms.length === 2) {
    return category === "one" ? forms[0] : forms[1];
  }
  return forms[0];
}

export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === null || value === undefined ? match : String(value);
  });
}

export function createTranslator(locale: Locale, dict: Dictionary): TFunction {
  const rules = new Intl.PluralRules(locale === "kk" ? "kk" : "ru");
  return (key, vars) => {
    const value = lookup(dict, key);
    if (typeof value !== "string") {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] missing key "${key}" for locale "${locale}"`);
      }
      return key;
    }
    let text = value;
    if (text.includes("|") && vars && typeof vars.count === "number") {
      text = pickPlural(rules, vars.count, text.split("|"));
    }
    return interpolate(text, vars);
  };
}

/** Translate a dynamic error code (e.g. from an RPC) with a generic fallback. */
export function translateError(
  dict: Dictionary,
  code: string | null | undefined,
  vars?: TVars,
): string {
  const errors = dict.errors as Record<string, string>;
  const text = (code && errors[code]) || errors.generic;
  return interpolate(text, vars);
}

/** Pick a localized DB column: localized(book, "description", "ru") -> book.description_ru (fallback kk) */
export function localized<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  const primary = row[`${field}_${locale}`];
  if (typeof primary === "string" && primary.trim() !== "") return primary;
  const fallback = row[`${field}_${locale === "kk" ? "ru" : "kk"}`];
  return typeof fallback === "string" ? fallback : "";
}
