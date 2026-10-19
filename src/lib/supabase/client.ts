"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

/** Singleton Supabase client for Client Components (session in cookies). */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
