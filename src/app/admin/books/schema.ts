import { z } from "zod";
import { BOOK_LANGUAGES } from "@/lib/constants";
import { isBucketUrl } from "@/components/admin/catalog/storage-paths";

export const BOOK_LIMITS = {
  title: 300,
  author: 200,
  slug: 80,
  description: 6000,
  publisher: 200,
  tags: 15,
  tag: 40,
  images: 8,
  previewPages: 50,
  price: 10_000_000,
  stock: 100_000,
} as const;

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const LOW_STOCK = 5;

const int = (min: number, max: number, code: string) =>
  z.number({ error: code }).int({ error: code }).min(min, { error: code }).max(max, { error: code });

const coverUrl = z.string().refine((v) => isBucketUrl(v, "covers"), { error: "VALIDATION" });

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export const bookSchema = z
  .object({
    title: z.string().trim().min(1, { error: "REQUIRED" }).max(BOOK_LIMITS.title, { error: "TOO_LONG" }),
    author: z.string().trim().max(BOOK_LIMITS.author, { error: "TOO_LONG" }),
    slug: z
      .string()
      .trim()
      .min(1, { error: "REQUIRED" })
      .max(BOOK_LIMITS.slug, { error: "TOO_LONG" })
      .regex(SLUG_RE, { error: "SLUG_INVALID" }),
    genre_id: z.uuid({ error: "GENRE_INVALID" }).nullable(),
    description_kk: z.string().max(BOOK_LIMITS.description, { error: "TOO_LONG" }),
    description_ru: z.string().max(BOOK_LIMITS.description, { error: "TOO_LONG" }),
    language: z.enum(BOOK_LANGUAGES, { error: "VALIDATION" }),
    publisher: z.string().trim().max(BOOK_LIMITS.publisher, { error: "TOO_LONG" }),
    publish_year: int(1000, 2100, "YEAR_INVALID").nullable(),
    pages: int(1, 10_000, "PAGES_INVALID").nullable(),
    isbn: z
      .string()
      .trim()
      .refine((v) => v === "" || /^(\d{9}[\dX]|\d{13})$/.test(normalizeIsbn(v)), { error: "ISBN_INVALID" }),
    cover_type: z.enum(["hard", "soft"]).nullable(),
    tags: z
      .array(z.string().trim().min(1).max(BOOK_LIMITS.tag, { error: "TOO_LONG" }))
      .max(BOOK_LIMITS.tags, { error: "TAGS_TOO_MANY" }),
    cover_url: coverUrl.nullable(),
    images: z.array(coverUrl).max(BOOK_LIMITS.images, { error: "IMAGES_TOO_MANY" }),
    cover_palette: int(0, 3, "VALIDATION"),
    paper_enabled: z.boolean(),
    paper_price: int(1, BOOK_LIMITS.price, "PRICE_INVALID").nullable(),
    stock: int(0, BOOK_LIMITS.stock, "STOCK_INVALID"),
    ebook_enabled: z.boolean(),
    ebook_price: int(1, BOOK_LIMITS.price, "PRICE_INVALID").nullable(),
    ebook_preview_pages: int(0, BOOK_LIMITS.previewPages, "PREVIEW_INVALID"),
    is_featured: z.boolean(),
    is_published: z.boolean(),
  })
  .superRefine((book, ctx) => {
    if (!book.paper_enabled && !book.ebook_enabled) {
      ctx.addIssue({ code: "custom", path: ["formats"], message: "FORMAT_REQUIRED" });
    }
    if (book.paper_enabled && book.paper_price === null) {
      ctx.addIssue({ code: "custom", path: ["paper_price"], message: "PRICE_REQUIRED" });
    }
    if (book.ebook_enabled && book.ebook_price === null) {
      ctx.addIssue({ code: "custom", path: ["ebook_price"], message: "PRICE_REQUIRED" });
    }
  });

export type BookInput = z.input<typeof bookSchema>;
export type BookValues = z.output<typeof bookSchema>;

/** Values as stored in the database (empty strings -> null, ISBN normalized) */
export function toBookRow(values: BookValues) {
  return {
    ...values,
    publisher: values.publisher || null,
    isbn: values.isbn ? normalizeIsbn(values.isbn) : null,
    tags: [...new Set(values.tags)],
  };
}
