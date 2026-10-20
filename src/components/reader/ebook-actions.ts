"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { EBOOK_PAGES_BUCKET, EBOOK_SOURCES_BUCKET, ebookVersionFolder } from "@/lib/reader";

/**
 * Server side of the admin EbookUploader. Page images are uploaded by the
 * browser (admin session, storage policies allow admins) into a NEW version
 * folder; only after every page is there do we switch the book to it and
 * delete the old version. Anything failing keeps the current version intact.
 */

export type EbookUploadError = "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "VERSION_CONFLICT" | "PAGES_MISSING" | "generic";
export type EbookActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: EbookUploadError };

const baseSchema = z.object({
  bookId: z.uuid(),
  version: z.number().int().min(1).max(100_000),
});

type Storage = ReturnType<ReturnType<typeof createSupabaseAdmin>["storage"]["from"]>;

async function listFolder(storage: Storage, folder: string) {
  const out: { name: string; isFile: boolean }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(folder, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data ?? []) out.push({ name: item.name, isFile: item.id !== null });
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function removeFolder(storage: Storage, folder: string) {
  const files = (await listFolder(storage, folder)).filter((f) => f.isFile).map((f) => `${folder}/${f.name}`);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await storage.remove(files.slice(i, i + 100));
    if (error) throw error;
  }
}

/** Next free version number (current + 1), re-read on the server. */
export async function prepareEbookUpload(input: { bookId: string }): Promise<EbookActionResult<{ version: number }>> {
  const admin = await getAdminOrNull();
  if (!admin) return { ok: false, error: "FORBIDDEN" };
  const parsed = z.object({ bookId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { data: book } = await createSupabaseAdmin()
    .from("books")
    .select("ebook_version")
    .eq("id", parsed.data.bookId)
    .maybeSingle();
  if (!book) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, version: book.ebook_version + 1 };
}

export async function finalizeEbookUpload(input: {
  bookId: string;
  version: number;
  pageCount: number;
}): Promise<EbookActionResult<{ pageCount: number; version: number }>> {
  const admin = await getAdminOrNull();
  if (!admin) return { ok: false, error: "FORBIDDEN" };
  const parsed = baseSchema.extend({ pageCount: z.number().int().min(1).max(5000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { bookId, version, pageCount } = parsed.data;

  const supabase = createSupabaseAdmin();
  const { data: book } = await supabase
    .from("books")
    .select("slug, ebook_version")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) return { ok: false, error: "NOT_FOUND" };
  if (version !== book.ebook_version + 1) return { ok: false, error: "VERSION_CONFLICT" };

  const pagesStorage = supabase.storage.from(EBOOK_PAGES_BUCKET);
  try {
    const files = await listFolder(pagesStorage, ebookVersionFolder(bookId, version));
    const present = new Set(files.filter((f) => f.isFile).map((f) => f.name));
    for (let p = 1; p <= pageCount; p++) {
      if (!present.has(`${p}.webp`)) return { ok: false, error: "PAGES_MISSING" };
    }
  } catch {
    return { ok: false, error: "generic" };
  }

  const { data: updated, error: updateError } = await supabase
    .from("books")
    .update({
      ebook_page_count: pageCount,
      ebook_version: version,
      ebook_enabled: true,
    })
    .eq("id", bookId)
    .eq("ebook_version", book.ebook_version)
    .select("id");
  if (updateError) return { ok: false, error: "generic" };
  // Another upload switched the book in the meantime: never delete its files.
  if (!updated || updated.length === 0) return { ok: false, error: "VERSION_CONFLICT" };

  // Old versions: best effort, the book already points to the new one.
  try {
    const root = await listFolder(pagesStorage, bookId);
    for (const entry of root) {
      if (!entry.isFile && entry.name !== `v${version}`) await removeFolder(pagesStorage, `${bookId}/${entry.name}`);
    }
    const sources = supabase.storage.from(EBOOK_SOURCES_BUCKET);
    const oldSources = (await listFolder(sources, bookId))
      .filter((f) => f.isFile && f.name !== `v${version}.pdf`)
      .map((f) => `${bookId}/${f.name}`);
    if (oldSources.length) await sources.remove(oldSources);
  } catch (error) {
    console.warn("ebook upload: cleanup of old versions failed", error);
  }

  revalidatePath(`/admin/books/${bookId}`);
  revalidatePath("/admin/books");
  revalidatePath(`/books/${book.slug}`);
  revalidatePath(`/read/${bookId}`);
  revalidatePath("/account/library");
  return { ok: true, pageCount, version };
}

/** Removes a cancelled / failed upload. Never touches the version in use. */
export async function discardEbookUpload(input: { bookId: string; version: number }): Promise<EbookActionResult> {
  const admin = await getAdminOrNull();
  if (!admin) return { ok: false, error: "FORBIDDEN" };
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  const { bookId, version } = parsed.data;

  const supabase = createSupabaseAdmin();
  const { data: book } = await supabase.from("books").select("ebook_version").eq("id", bookId).maybeSingle();
  if (!book) return { ok: false, error: "NOT_FOUND" };
  if (version <= book.ebook_version) return { ok: false, error: "VERSION_CONFLICT" };

  try {
    await removeFolder(supabase.storage.from(EBOOK_PAGES_BUCKET), ebookVersionFolder(bookId, version));
    await supabase.storage.from(EBOOK_SOURCES_BUCKET).remove([`${bookId}/v${version}.pdf`]);
  } catch {
    return { ok: false, error: "generic" };
  }
  return { ok: true };
}
