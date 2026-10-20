"use server";

import { revalidatePath } from "next/cache";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { collectErrors, settingsSchema, type FieldErrors, type SettingsInput } from "./schema";

export type SaveSettingsResult = { ok: true } | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function saveSettings(input: SettingsInput): Promise<SaveSettingsResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION", fieldErrors: collectErrors(parsed.error) };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from("store_settings").update(parsed.data).eq("id", 1).select("id").maybeSingle();
  if (error) return { ok: false, error: error.code === "23514" ? "VALIDATION" : "generic" };
  if (!data) return { ok: false, error: "FORBIDDEN" };

  // contacts, prices, hero texts and limits are used across the whole site
  revalidatePath("/", "layout");
  return { ok: true };
}

export type DemoResult =
  | { ok: true; counts: { books: number; promotions: number; promo_codes: number; banners: number } }
  | { ok: false; error: string };

export async function deleteDemoData(): Promise<DemoResult> {
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("admin_delete_demo_data");
  if (error) return { ok: false, error: error.code === "42501" ? "FORBIDDEN" : "generic" };
  const counts = data as unknown as { books: number; promotions: number; promo_codes: number; banners: number };
  revalidatePath("/", "layout");
  return {
    ok: true,
    counts: {
      books: counts?.books ?? 0,
      promotions: counts?.promotions ?? 0,
      promo_codes: counts?.promo_codes ?? 0,
      banners: counts?.banners ?? 0,
    },
  };
}
