import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

let adminClient: SupabaseClient<Database> | undefined;

/**
 * Service-role client: BYPASSES Row Level Security.
 * Use only on the server, only after you have authorized the caller yourself
 * (registration via Telegram token, watermarking reader, notifications).
 */
export function createSupabaseAdmin(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (!adminClient) {
    adminClient = createClient<Database>(env.supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
