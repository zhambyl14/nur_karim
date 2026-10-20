import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Initials for avatars: «Айдана Қасым» -> «АҚ» */
export function initials(name: string | null | undefined, fallback = "NK"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const letters = parts.slice(0, 2).map((p) => p[0]!.toLocaleUpperCase("kk"));
  return letters.join("");
}

const TRANSLIT: Record<string, string> = {
  а: "a", ә: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", і: "i", к: "k", қ: "k", л: "l", м: "m", н: "n", ң: "n", о: "o", ө: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u", ү: "u", ф: "f", х: "kh", һ: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "iu", я: "ia",
};

/** URL slug from Kazakh / Russian / Latin text: «Жүрек тазалығы» -> «zhurek-tazalygy» */
export function slugify(input: string): string {
  return input
    .toLocaleLowerCase("kk")
    .split("")
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Safe internal redirect target (prevents open redirects) */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  // Browsers drop tabs / newlines and treat "\" as "/" in URLs, so "/\t/evil.com"
  // would become "//evil.com": reject control characters and backslashes anywhere.
  // eslint-disable-next-line no-control-regex
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }
  return next;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
