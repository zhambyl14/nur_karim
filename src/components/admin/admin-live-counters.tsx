"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Keeps the admin nav counters (unread messages) fresh: a new client message or
 * a conversation marked as read changes `conversations`, and the layout's
 * server-side counters are re-fetched with a (debounced) router refresh.
 */
export function AdminLiveCounters() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 800);
    };

    // Realtime checks RLS with the user's JWT: set it before joining.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel("admin-counters")
        .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, refresh)
        .subscribe();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
