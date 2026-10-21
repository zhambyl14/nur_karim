import type { GiftCardTheme, OrderStatus } from "@/types/app";

/** Typographic cover palettes from the design: [background, text, inner frame] */
export const COVER_PALETTES = [
  { bg: "#10223f", fg: "#f3efe6", frame: "rgba(200,163,90,.55)", name: "navy" },
  { bg: "#7d1a35", fg: "#f7ece9", frame: "rgba(240,210,170,.45)", name: "wine" },
  { bg: "#e9e1d0", fg: "#2a1a14", frame: "rgba(125,26,53,.35)", name: "cream" },
  { bg: "#18181f", fg: "#efe9dc", frame: "rgba(200,163,90,.5)", name: "ink" },
] as const;

export function coverPalette(index: number | null | undefined) {
  const i = Math.abs(Math.trunc(index ?? 0)) % COVER_PALETTES.length;
  return COVER_PALETTES[i];
}

/** Badge tones per order status (matches the design: Жаңа / Төленді / Жолда / Жеткізілді) */
export const ORDER_STATUS_TONE: Record<OrderStatus, "wine" | "violet" | "gold" | "info" | "success" | "neutral"> = {
  pending_payment: "wine",
  payment_review: "violet",
  paid: "gold",
  shipped: "info",
  delivered: "success",
  cancelled: "neutral",
};

/** Progress steps for the client order tracker */
export const ORDER_FLOW_PAPER: OrderStatus[] = ["pending_payment", "payment_review", "paid", "shipped", "delivered"];
export const ORDER_FLOW_DIGITAL: OrderStatus[] = ["pending_payment", "payment_review", "delivered"];

export const GIFT_CARD_THEMES: GiftCardTheme[] = [
  "classic",
  "birthday",
  "thanks",
  "congrats",
  "holiday",
  "teacher",
  "family",
  "justbecause",
];

export const BOOK_LANGUAGES = ["kk", "ru", "ar", "en", "tr", "other"] as const;
export type BookLanguage = (typeof BOOK_LANGUAGES)[number];

export const BOOK_LANGUAGE_LABELS: Record<BookLanguage, { kk: string; ru: string }> = {
  kk: { kk: "Қазақша", ru: "Казахский" },
  ru: { kk: "Орысша", ru: "Русский" },
  ar: { kk: "Арабша", ru: "Арабский" },
  en: { kk: "Ағылшынша", ru: "Английский" },
  tr: { kk: "Түрікше", ru: "Турецкий" },
  other: { kk: "Басқа", ru: "Другой" },
};

export const CATALOG_SORTS = ["new", "popular", "price_asc", "price_desc", "rating", "title"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_PAGE_SIZE = 20;

/** Free e-book preview pages are shown with a watermark to everyone */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_BANNER_BYTES = 8 * 1024 * 1024;

export const ASTANA = { kk: "Астана", ru: "Астана" } as const;

export type KzRegion = {
  /** canonical value stored in orders.delivery_region (Kazakh name) */
  value: string;
  ru: string;
  cities: { value: string; ru: string }[];
};

/**
 * Regions and main cities of Kazakhstan for Kazpost delivery (17 oblasts + Almaty, Shymkent).
 * Astana is served by the courier option.
 */
export const KZ_REGIONS: KzRegion[] = [
  { value: "Алматы", ru: "Алматы", cities: [{ value: "Алматы", ru: "Алматы" }] },
  { value: "Шымкент", ru: "Шымкент", cities: [{ value: "Шымкент", ru: "Шымкент" }] },
  {
    value: "Абай облысы",
    ru: "Абайская область",
    cities: [
      { value: "Семей", ru: "Семей" },
      { value: "Аягөз", ru: "Аягоз" },
      { value: "Курчатов", ru: "Курчатов" },
    ],
  },
  {
    value: "Ақмола облысы",
    ru: "Акмолинская область",
    cities: [
      { value: "Көкшетау", ru: "Кокшетау" },
      { value: "Степногорск", ru: "Степногорск" },
      { value: "Щучинск", ru: "Щучинск" },
      { value: "Атбасар", ru: "Атбасар" },
      { value: "Қосшы", ru: "Косшы" },
    ],
  },
  {
    value: "Ақтөбе облысы",
    ru: "Актюбинская область",
    cities: [
      { value: "Ақтөбе", ru: "Актобе" },
      { value: "Хромтау", ru: "Хромтау" },
      { value: "Қандыағаш", ru: "Кандыагаш" },
      { value: "Шалқар", ru: "Шалкар" },
    ],
  },
  {
    value: "Алматы облысы",
    ru: "Алматинская область",
    cities: [
      { value: "Қонаев", ru: "Конаев" },
      { value: "Қаскелең", ru: "Каскелен" },
      { value: "Талғар", ru: "Талгар" },
      { value: "Есік", ru: "Есик" },
    ],
  },
  {
    value: "Атырау облысы",
    ru: "Атырауская область",
    cities: [
      { value: "Атырау", ru: "Атырау" },
      { value: "Құлсары", ru: "Кульсары" },
    ],
  },
  {
    value: "Шығыс Қазақстан облысы",
    ru: "Восточно-Казахстанская область",
    cities: [
      { value: "Өскемен", ru: "Усть-Каменогорск" },
      { value: "Риддер", ru: "Риддер" },
      { value: "Алтай", ru: "Алтай" },
      { value: "Зайсан", ru: "Зайсан" },
    ],
  },
  {
    value: "Жамбыл облысы",
    ru: "Жамбылская область",
    cities: [
      { value: "Тараз", ru: "Тараз" },
      { value: "Шу", ru: "Шу" },
      { value: "Қаратау", ru: "Каратау" },
      { value: "Жаңатас", ru: "Жанатас" },
    ],
  },
  {
    value: "Жетісу облысы",
    ru: "Жетысуская область",
    cities: [
      { value: "Талдықорған", ru: "Талдыкорган" },
      { value: "Текелі", ru: "Текели" },
      { value: "Жаркент", ru: "Жаркент" },
      { value: "Үшарал", ru: "Ушарал" },
    ],
  },
  {
    value: "Батыс Қазақстан облысы",
    ru: "Западно-Казахстанская область",
    cities: [
      { value: "Орал", ru: "Уральск" },
      { value: "Ақсай", ru: "Аксай" },
    ],
  },
  {
    value: "Қарағанды облысы",
    ru: "Карагандинская область",
    cities: [
      { value: "Қарағанды", ru: "Караганда" },
      { value: "Теміртау", ru: "Темиртау" },
      { value: "Балқаш", ru: "Балхаш" },
      { value: "Шахтинск", ru: "Шахтинск" },
      { value: "Саран", ru: "Сарань" },
    ],
  },
  {
    value: "Қостанай облысы",
    ru: "Костанайская область",
    cities: [
      { value: "Қостанай", ru: "Костанай" },
      { value: "Рудный", ru: "Рудный" },
      { value: "Лисаковск", ru: "Лисаковск" },
      { value: "Арқалық", ru: "Аркалык" },
    ],
  },
  {
    value: "Қызылорда облысы",
    ru: "Кызылординская область",
    cities: [
      { value: "Қызылорда", ru: "Кызылорда" },
      { value: "Арал", ru: "Аральск" },
      { value: "Байқоңыр", ru: "Байконур" },
    ],
  },
  {
    value: "Маңғыстау облысы",
    ru: "Мангистауская область",
    cities: [
      { value: "Ақтау", ru: "Актау" },
      { value: "Жаңаөзен", ru: "Жанаозен" },
      { value: "Форт-Шевченко", ru: "Форт-Шевченко" },
    ],
  },
  {
    value: "Павлодар облысы",
    ru: "Павлодарская область",
    cities: [
      { value: "Павлодар", ru: "Павлодар" },
      { value: "Екібастұз", ru: "Экибастуз" },
      { value: "Ақсу", ru: "Аксу" },
    ],
  },
  {
    value: "Солтүстік Қазақстан облысы",
    ru: "Северо-Казахстанская область",
    cities: [
      { value: "Петропавл", ru: "Петропавловск" },
      { value: "Булаево", ru: "Булаево" },
    ],
  },
  {
    value: "Түркістан облысы",
    ru: "Туркестанская область",
    cities: [
      { value: "Түркістан", ru: "Туркестан" },
      { value: "Кентау", ru: "Кентау" },
      { value: "Сарыағаш", ru: "Сарыагаш" },
      { value: "Арыс", ru: "Арыс" },
      { value: "Жетісай", ru: "Жетысай" },
      { value: "Шардара", ru: "Шардара" },
    ],
  },
  {
    value: "Ұлытау облысы",
    ru: "Улытауская область",
    cities: [
      { value: "Жезқазған", ru: "Жезказган" },
      { value: "Сәтбаев", ru: "Сатпаев" },
      { value: "Қаражал", ru: "Каражал" },
    ],
  },
];

export function regionLabel(value: string | null | undefined, locale: "kk" | "ru"): string {
  if (!value) return "";
  if (value === "Астана") return "Астана";
  const r = KZ_REGIONS.find((x) => x.value === value);
  return r ? (locale === "ru" ? r.ru : r.value) : value;
}

export function cityLabel(value: string | null | undefined, locale: "kk" | "ru"): string {
  if (!value) return "";
  if (locale === "kk") return value;
  for (const r of KZ_REGIONS) {
    const c = r.cities.find((x) => x.value === value);
    if (c) return c.ru;
  }
  return value;
}

/** Site-wide share image (app/opengraph-image.png). Pages that set their own
 * `openGraph` replace the inherited image, so they add this one back. */
export const DEFAULT_OG_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Nur Karim" } as const;
