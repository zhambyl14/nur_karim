"use client";

import { useMounted } from "@/lib/hooks";

/**
 * true once the persisted cart can be read on the client.
 * The cart store reads localStorage synchronously when the module loads, so the
 * lines are correct as soon as the component has mounted. (The store's own
 * `hydrated` flag is not reliable — see the report for src/lib/cart/store.ts.)
 */
export function useCartReady(): boolean {
  return useMounted();
}
