"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fieldErrorsFrom, type ActionResult } from "@/components/admin/catalog/result";
import { isBucketUrl, storagePathFromUrl } from "@/components/admin/catalog/storage-paths";

type Supabase = Awaited<ReturnType<typeof createSupabaseServer>>;

const text = (max: number) => z.string().trim().max(max, "TOO_LONG");
const bannerImage = z.string().max(1000).refine((url) => isBucketUrl(url, "banners"), "IMAGE_INVALID");
const isoOrNull = z
  .string()
  .nullable()
  .refine((v) => v === null || !Number.isNaN(new Date(v).getTime()), "DATE_INVALID");

const bannerSchema = z
  .object({
    title_kk: text(120),
    title_ru: text(120),
    subtitle_kk: text(240),
    subtitle_ru: text(240),
    button_kk: text(40),
    button_ru: text(40),
    link_url: z
      .string()
      .trim()
      .max(500, "TOO_LONG")
      .refine(
        (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v) || (/^\/[^\s]*$/.test(v) && !v.startsWith("//") && !v.startsWith("/\\")),
        "LINK_INVALID",
      ),
    image_url: z.string().min(1, "IMAGE_REQUIRED").pipe(bannerImage),
    image_mobile_url: bannerImage.nullable(),
    text_theme: z.enum(["light", "dark"]),
    overlay: z.boolean(),
    starts_at: isoOrNull,
    ends_at: isoOrNull,
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.starts_at && v.ends_at && new Date(v.ends_at) <= new Date(v.starts_at)) {
      ctx.addIssue({ code: "custom", path: ["ends_at"], message: "DATES_ORDER" });
    }
  });

export type BannerInput = z.input<typeof bannerSchema>;

function revalidateBanners() {
  revalidatePath("/");
  revalidatePath("/admin/banners");
}

async function removeFiles(supabase: Supabase, urls: (string | null | undefined)[]) {
  const paths = [...new Set(urls.map((u) => storagePathFromUrl(u, "banners")).filter((p): p is string => !!p))];
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("banners").remove(paths);
  if (error) console.error("banners cleanup failed", error.message);
}

export async function saveBanner(id: string | null, input: BannerInput): Promise<ActionResult<{ id: string }>> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (id !== null && !z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: fieldErrorsFrom(parsed.error) };
  const row = { ...parsed.data, link_url: parsed.data.link_url || null };
  const supabase = await createSupabaseServer();

  if (id) {
    const { data: before } = await supabase.from("banners").select("image_url, image_mobile_url").eq("id", id).maybeSingle();
    if (!before) return { ok: false, error: "NOT_FOUND" };
    const { error } = await supabase.from("banners").update(row).eq("id", id);
    if (error) {
      console.error("saveBanner update failed", error.message);
      return { ok: false, error: "generic" };
    }
    // replaced images are no longer referenced
    await removeFiles(
      supabase,
      [before.image_url, before.image_mobile_url].filter((u) => u && u !== row.image_url && u !== row.image_mobile_url),
    );
    revalidateBanners();
    return { ok: true, id };
  }

  const { data: last } = await supabase
    .from("banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("banners")
    .insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error) {
    console.error("saveBanner insert failed", error.message);
    return { ok: false, error: "generic" };
  }
  revalidateBanners();
  return { ok: true, id: data.id };
}

export async function setBannerActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || typeof active !== "boolean") return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("banners").update({ is_active: active }).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: "generic" };
  if (!data) return { ok: false, error: "NOT_FOUND" };
  revalidateBanners();
  return { ok: true };
}

export async function moveBanner(id: string, direction: "up" | "down"): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success || !["up", "down"].includes(direction)) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("banners").select("id, sort_order").order("sort_order").order("created_at");
  if (error) return { ok: false, error: "generic" };
  const ids = (data ?? []).map((b) => b.id);
  const index = ids.indexOf(id);
  if (index === -1) return { ok: false, error: "NOT_FOUND" };
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return { ok: true };
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const current = new Map((data ?? []).map((b) => [b.id, b.sort_order]));
  const updates = ids
    .map((bid, i) => ({ id: bid, sort_order: (i + 1) * 10 }))
    .filter((u) => current.get(u.id) !== u.sort_order);
  const results = await Promise.all(
    updates.map((u) => supabase.from("banners").update({ sort_order: u.sort_order }).eq("id", u.id)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "generic" };
  revalidateBanners();
  return { ok: true };
}

/** Deletes the banner and its images in the banners bucket. */
export async function deleteBanner(id: string): Promise<ActionResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "VALIDATION" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id)
    .select("image_url, image_mobile_url")
    .maybeSingle();
  if (error) {
    console.error("deleteBanner failed", error.message);
    return { ok: false, error: "generic" };
  }
  if (!data) return { ok: false, error: "NOT_FOUND" };
  await removeFiles(supabase, [data.image_url, data.image_mobile_url]);
  revalidateBanners();
  return { ok: true };
}
