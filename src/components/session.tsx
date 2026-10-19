"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { mergeCartLines, toRpcItems, useCart } from "@/lib/cart/store";
import type { CartLine, SessionUser, UserCounters } from "@/types/app";

type SessionContextValue = {
  user: SessionUser | null;
  counters: UserCounters;
  refreshCounters: () => Promise<void>;
};

const EMPTY_COUNTERS: UserCounters = { unread_messages: 0, gifts_waiting: 0, orders_active: 0 };

const SessionContext = createContext<SessionContextValue>({
  user: null,
  counters: EMPTY_COUNTERS,
  refreshCounters: async () => {},
});

export function SessionProvider({
  user,
  counters: initialCounters,
  children,
}: {
  user: SessionUser | null;
  counters?: UserCounters;
  children: ReactNode;
}) {
  // Fresh counters fetched on the client; reset when the server sends new ones
  const [fresh, setFresh] = useState<UserCounters | null>(null);
  const [base, setBase] = useState(initialCounters);
  if (base !== initialCounters) {
    setBase(initialCounters);
    setFresh(null);
  }
  const counters = fresh ?? initialCounters ?? EMPTY_COUNTERS;

  const refreshCounters = useCallback(async () => {
    if (!user) return;
    const { data } = await getSupabaseBrowser().rpc("my_counters");
    if (data) setFresh(data as unknown as UserCounters);
  }, [user]);

  return <SessionContext value={{ user, counters, refreshCounters }}>{children}</SessionContext>;
}

export function useSession() {
  return useContext(SessionContext);
}

/**
 * Keeps the local cart in sync with the account cart (cart_items table) so the
 * same cart is available on phone, tablet and laptop.
 *  - guest: cart lives in localStorage only
 *  - on sign-in: guest items are merged into the account cart once
 *  - signed in: the server cart is the source of truth; local edits are pushed
 */
export function CartSync() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const hydrated = useCart((s) => s.hydrated);
  const lines = useCart((s) => s.lines);
  const ownerId = useCart((s) => s.ownerId);
  const ready = useRef(false);
  const lastSynced = useRef<string>("");

  const pull = useCallback(
    async (userId: string, mergeGuest: boolean) => {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase
        .from("cart_items")
        .select("book_id, format, quantity")
        .eq("user_id", userId)
        .order("created_at");
      if (error) return;
      const server: CartLine[] = (data ?? []).map((r) => ({ bookId: r.book_id, format: r.format, quantity: r.quantity }));
      const merged = mergeGuest ? mergeCartLines(server, useCart.getState().lines) : server;
      useCart.getState().replace(merged, userId);
      const serialized = JSON.stringify(toRpcItems(useCart.getState().lines));
      if (mergeGuest && serialized !== JSON.stringify(toRpcItems(server))) {
        await supabase.rpc("replace_cart", { p_items: toRpcItems(useCart.getState().lines) });
      }
      lastSynced.current = serialized;
      ready.current = true;
    },
    [],
  );

  // Initial pull / merge whenever the signed-in user changes
  useEffect(() => {
    if (!hydrated) return;
    ready.current = false;
    if (!userId) {
      // signed out: do not leave the account cart on this device
      if (useCart.getState().ownerId) useCart.getState().replace([], null);
      return;
    }
    void pull(userId, useCart.getState().ownerId !== userId);
  }, [hydrated, userId, pull]);

  // Push local edits (debounced)
  useEffect(() => {
    if (!userId || !ready.current || ownerId !== userId) return;
    const serialized = JSON.stringify(toRpcItems(lines));
    if (serialized === lastSynced.current) return;
    const timer = setTimeout(async () => {
      const { error } = await getSupabaseBrowser().rpc("replace_cart", { p_items: toRpcItems(lines) });
      if (!error) lastSynced.current = serialized;
    }, 450);
    return () => clearTimeout(timer);
  }, [lines, userId, ownerId]);

  // Re-pull when the tab becomes visible (cart edited on another device)
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !ready.current) return;
      const pending = JSON.stringify(toRpcItems(useCart.getState().lines)) !== lastSynced.current;
      if (!pending) void pull(userId, false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, pull]);

  return null;
}
