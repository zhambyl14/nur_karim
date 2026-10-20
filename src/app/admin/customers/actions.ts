"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const pairSchema = z.object({ userId: z.string().uuid(), bookId: z.string().uuid() });
const userSchema = z.object({ userId: z.string().uuid() });
const deviceSchema = z.object({ userId: z.string().uuid(), deviceId: z.string().uuid() });

function refresh(userId: string) {
  revalidatePath(`/admin/customers/${userId}`);
  revalidatePath("/admin/customers");
}

export async function grantEbook(input: z.input<typeof pairSchema>): Promise<Result> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const { userId, bookId } = parsed.data;
  const supabase = await createSupabaseServer();

  const [{ data: book }, { data: owned }, { data: user }] = await Promise.all([
    supabase.from("books").select("id, ebook_enabled").eq("id", bookId).maybeSingle(),
    supabase.from("entitlements").select("book_id").eq("user_id", userId).eq("book_id", bookId).maybeSingle(),
    supabase.from("profiles").select("id").eq("id", userId).maybeSingle(),
  ]);
  if (!book || !user) return { ok: false, error: "NOT_FOUND" };
  if (!book.ebook_enabled) return { ok: false, error: "NOT_EBOOK" };
  if (owned) return { ok: false, error: "ALREADY_OWNED" };

  const { error } = await supabase.from("entitlements").insert({ user_id: userId, book_id: bookId, source: "admin" });
  if (error) return { ok: false, error: error.code === "23505" ? "ALREADY_OWNED" : "generic" };
  refresh(userId);
  revalidatePath("/library");
  return { ok: true };
}

export async function revokeEbook(input: z.input<typeof pairSchema>): Promise<Result> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("entitlements")
    .delete()
    .eq("user_id", parsed.data.userId)
    .eq("book_id", parsed.data.bookId);
  if (error) return { ok: false, error: "generic" };
  refresh(parsed.data.userId);
  revalidatePath("/library");
  return { ok: true };
}

export async function resetDevices(input: z.input<typeof userSchema>): Promise<Result> {
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("ebook_devices").delete().eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: "generic" };
  refresh(parsed.data.userId);
  return { ok: true };
}

export async function removeDevice(input: z.input<typeof deviceSchema>): Promise<Result> {
  const parsed = deviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };
  if (!(await getAdminOrNull())) return { ok: false, error: "FORBIDDEN" };
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("ebook_devices")
    .delete()
    .eq("id", parsed.data.deviceId)
    .eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: "generic" };
  refresh(parsed.data.userId);
  return { ok: true };
}
