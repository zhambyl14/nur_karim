"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { publicStorageUrl } from "@/lib/env";
import { fieldErrorsFrom, isUniqueViolation, type ActionResult } from "@/components/admin/catalog/result";
import { storagePathFromUrl } from "@/components/admin/catalog/storage-paths";
import { BOOK_LIMITS, SLUG_RE, bookSchema, toBookRow, type BookInput } from "./schema";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

const idSchema = z.uuid();

function revalidateBook(...slugs: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin/books");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/books/${slug}`);
}

async function removeCoverFiles(supabase: Supabase, urls: (string | null | undefined)[]) {
  const paths = urls.map((u) => storagePathFromUrl(u, "covers")).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("covers").remove(paths);
  if (error) console.error("covers cleanup failed", error.message);
}

async function slugTaken(supabase: Supabase, slug: string, excludeId?: string): Promise<boolean> {
  let builder = supabase.from("books").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (excludeId) builder = builder.neq("id", excludeId);
  const { count } = await builder;
  return (count ?? 0) > 0;
}

export async function checkBookSlug(
  slug: string,
  excludeId?: string,
): Promise<ActionResult<{ available: boolean }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!SLUG_RE.test(slug) || slug.length > BOOK_LIMITS.slug) return { ok: false, error: "SLUG_INVALID" };
  if (excludeId && !idSchema.safeParse(excludeId).success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  return { ok: true, available: !(await slugTaken(supabase, slug, excludeId)) };
}

export async function createBook(
  input: BookInput & { id: string },
): Promise<ActionResult<{ id: string; slug: string; ebookWithoutPages: boolean }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(input.id);
  const parsed = bookSchema.safeParse(input);
  if (!id.success) return { ok: false, error: "VALIDATION" };
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createSupabaseServer();
  if (await slugTaken(supabase, parsed.data.slug)) {
    return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
  }
  const { error } = await supabase.from("books").insert({ id: id.data, ...toBookRow(parsed.data) });
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
    console.error("createBook failed", error.message);
    return { ok: false, error: "generic" };
  }
  revalidateBook(parsed.data.slug);
  return { ok: true, id: id.data, slug: parsed.data.slug, ebookWithoutPages: parsed.data.ebook_enabled };
}

export async function updateBook(
  bookId: string,
  input: BookInput,
): Promise<ActionResult<{ slug: string; ebookWithoutPages: boolean }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(bookId);
  const parsed = bookSchema.safeParse(input);
  if (!id.success) return { ok: false, error: "NOT_FOUND" };
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createSupabaseServer();
  const { data: current } = await supabase
    .from("books")
    .select("slug, cover_url, images, ebook_page_count")
    .eq("id", id.data)
    .maybeSingle();
  if (!current) return { ok: false, error: "NOT_FOUND" };

  const values = parsed.data;
  if (current.ebook_page_count > 0 && values.ebook_preview_pages >= current.ebook_page_count) {
    return { ok: false, error: "VALIDATION", fieldErrors: { ebook_preview_pages: "PREVIEW_TOO_MANY" } };
  }
  if (values.slug !== current.slug && (await slugTaken(supabase, values.slug, id.data))) {
    return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
  }

  const { error } = await supabase.from("books").update(toBookRow(values)).eq("id", id.data);
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "SLUG_TAKEN", fieldErrors: { slug: "SLUG_TAKEN" } };
    console.error("updateBook failed", error.message);
    return { ok: false, error: "generic" };
  }

  const kept = new Set([values.cover_url, ...values.images]);
  await removeCoverFiles(
    supabase,
    [current.cover_url, ...current.images].filter((url) => url && !kept.has(url)),
  );

  revalidateBook(values.slug, current.slug);
  revalidatePath(`/admin/books/${id.data}`);
  return {
    ok: true,
    slug: values.slug,
    ebookWithoutPages: values.ebook_enabled && current.ebook_page_count === 0,
  };
}

export async function setBookFlag(
  bookId: string,
  flag: "is_published" | "is_featured",
  value: boolean,
): Promise<ActionResult<{ ebookWithoutPages: boolean }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(bookId);
  if (!id.success || !["is_published", "is_featured"].includes(flag) || typeof value !== "boolean") {
    return { ok: false, error: "VALIDATION" };
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("books")
    .update(flag === "is_published" ? { is_published: value } : { is_featured: value })
    .eq("id", id.data)
    .select("slug, ebook_enabled, ebook_page_count")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateBook(data.slug);
  revalidatePath(`/admin/books/${id.data}`);
  return {
    ok: true,
    ebookWithoutPages: flag === "is_published" && value && data.ebook_enabled && data.ebook_page_count === 0,
  };
}

export async function setBookStock(bookId: string, stock: number): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(bookId);
  const value = z.number().int().min(0).max(BOOK_LIMITS.stock).safeParse(stock);
  if (!id.success || !value.success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("books")
    .update({ stock: value.data })
    .eq("id", id.data)
    .select("slug")
    .maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateBook(data.slug);
  return { ok: true };
}

async function freeCopySlug(supabase: Supabase, slug: string): Promise<string> {
  const base = `${slug.slice(0, BOOK_LIMITS.slug - 8)}-copy`;
  const { data } = await supabase.from("books").select("slug").like("slug", `${base}%`);
  const used = new Set((data ?? []).map((r) => r.slug));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

/** Copy a public cover file into the new book's folder (keeps foreign URLs as they are). */
async function copyCover(supabase: Supabase, url: string, newId: string, n: number): Promise<string | null> {
  const from = storagePathFromUrl(url, "covers");
  if (!from) return url;
  const to = `books/${newId}/${Date.now()}-${n}.webp`;
  const { error } = await supabase.storage.from("covers").copy(from, to);
  if (error) {
    console.error("cover copy failed", error.message);
    return null;
  }
  return publicStorageUrl("covers", to);
}

export async function duplicateBook(bookId: string): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(bookId);
  if (!id.success) return { ok: false, error: "NOT_FOUND" };
  const supabase = await createSupabaseServer();
  const { data: book } = await supabase.from("books").select("*").eq("id", id.data).maybeSingle();
  if (!book) return { ok: false, error: "NOT_FOUND" };

  const { t } = await getI18n();
  const newId = crypto.randomUUID();
  const coverUrl = book.cover_url ? await copyCover(supabase, book.cover_url, newId, 0) : null;
  const images = (await Promise.all(book.images.map((url, i) => copyCover(supabase, url, newId, i + 1)))).filter(
    (u): u is string => !!u,
  );
  const suffix = t("admin.books.form.copySuffix");

  const { error } = await supabase.from("books").insert({
    id: newId,
    slug: await freeCopySlug(supabase, book.slug),
    title: `${book.title.slice(0, BOOK_LIMITS.title - suffix.length)}${suffix}`,
    author: book.author,
    genre_id: book.genre_id,
    description_kk: book.description_kk,
    description_ru: book.description_ru,
    language: book.language,
    publisher: book.publisher,
    publish_year: book.publish_year,
    isbn: book.isbn,
    pages: book.pages,
    cover_type: book.cover_type,
    cover_url: coverUrl,
    images,
    cover_palette: book.cover_palette,
    tags: book.tags,
    paper_enabled: book.paper_enabled,
    paper_price: book.paper_price,
    stock: 0,
    ebook_enabled: book.ebook_enabled,
    ebook_price: book.ebook_price,
    ebook_preview_pages: 0,
    is_featured: false,
    is_published: false,
  });
  if (error) {
    console.error("duplicateBook failed", error.message);
    return { ok: false, error: "generic" };
  }
  revalidatePath("/admin/books");
  return { ok: true, id: newId };
}

/** Removes every object under `<prefix>/` (two levels deep: e-book pages are `<id>/v<n>/<page>.webp`). */
async function removeFolder(supabase: Supabase, bucket: string, prefix: string) {
  const storage = supabase.storage.from(bucket);
  const { data: entries } = await storage.list(prefix, { limit: 1000 });
  if (!entries?.length) return;
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.id) files.push(`${prefix}/${entry.name}`);
    else {
      const { data: nested } = await storage.list(`${prefix}/${entry.name}`, { limit: 10000 });
      for (const file of nested ?? []) if (file.id) files.push(`${prefix}/${entry.name}/${file.name}`);
    }
  }
  for (let i = 0; i < files.length; i += 500) {
    const { error } = await storage.remove(files.slice(i, i + 500));
    if (error) console.error(`${bucket} cleanup failed`, error.message);
  }
}

export async function deleteBook(
  bookId: string,
): Promise<ActionResult | { ok: false; error: "HAS_ORDERS"; isPublished: boolean }> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const id = idSchema.safeParse(bookId);
  if (!id.success) return { ok: false, error: "NOT_FOUND" };
  const supabase = await createSupabaseServer();
  const { data: book } = await supabase
    .from("books")
    .select("slug, cover_url, images, is_published")
    .eq("id", id.data)
    .maybeSingle();
  if (!book) return { ok: false, error: "NOT_FOUND" };

  const [items, owners] = await Promise.all([
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("book_id", id.data),
    supabase.from("entitlements").select("book_id", { count: "exact", head: true }).eq("book_id", id.data),
  ]);
  if (items.error || owners.error) return { ok: false, error: "generic" };
  if ((items.count ?? 0) > 0 || (owners.count ?? 0) > 0) {
    return { ok: false, error: "HAS_ORDERS", isPublished: book.is_published };
  }

  const { error } = await supabase.from("books").delete().eq("id", id.data);
  if (error) {
    // 23503 = a row elsewhere still references the book
    if (error.code === "23503") return { ok: false, error: "HAS_ORDERS", isPublished: book.is_published };
    console.error("deleteBook failed", error.message);
    return { ok: false, error: "generic" };
  }

  await removeCoverFiles(supabase, [book.cover_url, ...book.images]);
  await Promise.all([
    removeFolder(supabase, "covers", `books/${id.data}`),
    removeFolder(supabase, "ebook-pages", id.data),
    removeFolder(supabase, "ebook-sources", id.data),
  ]);
  revalidateBook(book.slug);
  return { ok: true };
}
