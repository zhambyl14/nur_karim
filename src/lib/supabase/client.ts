"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

/** Singleton Supabase client for Client Components (session in cookies). */
export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!browserClient) {
    const client = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
    // Keep the realtime socket on the user's JWT so RLS-filtered events
    // (messages, conversations) arrive; otherwise it may connect as anon.
    client.auth.onAuthStateChange((_event, session) => {
      void client.realtime.setAuth(session?.access_token ?? null);
    });
    browserClient = client;
  }
  return browserClient;
}
