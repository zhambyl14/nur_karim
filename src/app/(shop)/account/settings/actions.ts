"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { dictionaries } from "@/i18n";
import { getProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/telegram";
import { phoneToAuthEmail } from "@/lib/phone";
import { env } from "@/lib/env";

export type SettingsResult = { ok: true } | { ok: false; error: string; field?: string };

const nameSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(2, "NAME_INVALID").max(120, "NAME_INVALID"));

/** Updates the full name of the signed-in user (RLS: own row; protected columns are guarded by a trigger). */
export async function updateProfileNameAction(fullName: string): Promise<SettingsResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };

  const parsed = nameSchema.safeParse(typeof fullName === "string" ? fullName : "");
  if (!parsed.success) return { ok: false, error: "NAME_INVALID", field: "fullName" };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data }).eq("id", profile.id);
  if (error) {
    console.error("settings: name update failed", error.code, error.message);
    return { ok: false, error: "generic" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "PASSWORD_WRONG").max(200, "PASSWORD_WRONG"),
    password: z.string().min(8, "PASSWORD_WEAK").max(72, "PASSWORD_TOO_LONG"),
    confirm: z.string().max(200),
  })
  .refine((v) => v.password === v.confirm, { message: "PASSWORD_MISMATCH", path: ["confirm"] })
  .refine((v) => v.password !== v.current, { message: "PASSWORD_SAME", path: ["password"] });

/** Changes the password after re-authenticating with the current one. */
export async function changePasswordAction(input: {
  current: string;
  password: string;
  confirm: string;
}): Promise<SettingsResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "AUTH_REQUIRED" };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
    const code = issue?.message && /^[A-Z_]+$/.test(issue.message) ? issue.message : "VALIDATION";
    return { ok: false, error: code, field };
  }

  const email = phoneToAuthEmail(profile.phone);
  if (!email) return { ok: false, error: "generic" };

  const supabase = await createSupabaseServer();
  const { data: reauth, error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.current,
  });
  if (reauthError || reauth.user?.id !== profile.id) {
    if (reauthError?.status === 429 || reauthError?.code === "over_request_rate_limit") {
      return { ok: false, error: "RATE_LIMITED" };
    }
    return { ok: false, error: "PASSWORD_WRONG", field: "current" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "PASSWORD_WEAK", field: "password" };
    if (error.code === "same_password") return { ok: false, error: "PASSWORD_SAME", field: "password" };
    if (error.status === 429) return { ok: false, error: "RATE_LIMITED" };
    console.error("settings: password update failed", error.code, error.message);
    return { ok: false, error: "generic" };
  }

  const userId = profile.id;
  after(() =>
    notifyUser(userId, (locale) => {
      const dict = dictionaries[locale].auth.telegram;
      return { text: dict.passwordChanged, buttons: [[{ text: dict.openSite, url: env.siteUrl }]] };
    }),
  );

  return { ok: true };
}
