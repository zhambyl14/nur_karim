"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useCartCount } from "@/lib/cart/store";

const subscribeNoop = () => () => {};

/** true after the component has mounted on the client (avoids hydration mismatches) */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Cart badge count, 0 during SSR / first paint (the cart lives in localStorage) */
export function useCartBadge(): number {
  const count = useCartCount();
  const mounted = useMounted();
  return mounted ? count : 0;
}

/** Debounced value */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Matches a CSS media query, e.g. useMediaQuery("(min-width: 768px)") */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
