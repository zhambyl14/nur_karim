import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Profile, SessionUser } from "@/types/app";

/** Verified user id from the session JWT (or null). Deduplicated per request. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
});

/** Full profile row of the signed-in user (or null). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data ?? null;
});

export function toSessionUser(profile: Profile | null): SessionUser | null {
  if (!profile) return null;
  return {
    id: profile.id,
    phone: profile.phone,
    fullName: profile.full_name,
    role: profile.role,
    hasTelegram: profile.telegram_id !== null,
  };
}

/** Use in pages/actions that require a signed-in user. */
export async function requireUser(next = "/"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  return profile;
}

/** Use in every admin page, layout, action and route handler. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/");
  return profile;
}

/** For server actions: returns the admin profile or null (no redirect). */
export async function getAdminOrNull(): Promise<Profile | null> {
  const profile = await getProfile();
  return profile?.role === "admin" ? profile : null;
}
