"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BookFormat, CartLine } from "@/types/app";

type CartState = {
  lines: CartLine[];
  /** profile id the stored cart belongs to (null = guest cart) */
  ownerId: string | null;
  hydrated: boolean;
  /** returns "exists" when an e-book is already in the cart */
  add: (bookId: string, format: BookFormat, quantity?: number) => "added" | "exists";
  setQuantity: (bookId: string, format: BookFormat, quantity: number) => void;
  remove: (bookId: string, format: BookFormat) => void;
  removeMany: (items: { bookId: string; format: BookFormat }[]) => void;
  clear: () => void;
  replace: (lines: CartLine[], ownerId: string | null) => void;
};

const MAX_QTY = 99;

function sanitize(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    if (!line?.bookId || (line.format !== "paper" && line.format !== "ebook")) continue;
    const key = `${line.bookId}:${line.format}`;
    const prev = map.get(key);
    const quantity =
      line.format === "ebook" ? 1 : Math.min(MAX_QTY, Math.max(1, Math.trunc((prev?.quantity ?? 0) + (line.quantity || 1))));
    map.set(key, { bookId: line.bookId, format: line.format, quantity });
  }
  return [...map.values()];
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      ownerId: null,
      hydrated: false,
      add: (bookId, format, quantity = 1) => {
        const existing = get().lines.find((l) => l.bookId === bookId && l.format === format);
        if (existing && format === "ebook") return "exists";
        set((s) => ({
          lines: existing
            ? s.lines.map((l) =>
                l === existing ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + Math.max(1, quantity)) } : l,
              )
            : [...s.lines, { bookId, format, quantity: format === "ebook" ? 1 : Math.min(MAX_QTY, Math.max(1, quantity)) }],
        }));
        return "added";
      },
      setQuantity: (bookId, format, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => !(l.bookId === bookId && l.format === format))
              : s.lines.map((l) =>
                  l.bookId === bookId && l.format === format
                    ? { ...l, quantity: format === "ebook" ? 1 : Math.min(MAX_QTY, Math.trunc(quantity)) }
                    : l,
                ),
        })),
      remove: (bookId, format) =>
        set((s) => ({ lines: s.lines.filter((l) => !(l.bookId === bookId && l.format === format)) })),
      removeMany: (items) =>
        set((s) => ({
          lines: s.lines.filter((l) => !items.some((i) => i.bookId === l.bookId && i.format === l.format)),
        })),
      clear: () => set({ lines: [] }),
      replace: (lines, ownerId) => set({ lines: sanitize(lines), ownerId }),
    }),
    {
      name: "nk-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, ownerId: s.ownerId }),
      // localStorage hydration runs synchronously while `create()` is still
      // executing, so `useCart` does not exist yet: defer the flag update.
      onRehydrateStorage: () => () => {
        queueMicrotask(() => useCart.setState({ hydrated: true }));
      },
    },
  ),
);

/** Total number of copies in the cart (badge) */
export function useCartCount(): number {
  return useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
}

/** Union of two carts (used when a guest signs in) */
export function mergeCartLines(a: CartLine[], b: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of [...a, ...b]) {
    const key = `${line.bookId}:${line.format}`;
    const prev = map.get(key);
    map.set(key, {
      ...line,
      quantity: line.format === "ebook" ? 1 : Math.min(MAX_QTY, Math.max(prev?.quantity ?? 0, line.quantity)),
    });
  }
  return [...map.values()];
}

export function toRpcItems(lines: CartLine[]) {
  return lines.map((l) => ({ book_id: l.bookId, format: l.format, quantity: l.quantity }));
}
