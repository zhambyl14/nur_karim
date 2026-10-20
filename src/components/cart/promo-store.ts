"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PromoState = {
  /** promo code applied in the cart; reused by the checkout (sessionStorage) */
  code: string;
  setCode: (code: string) => void;
  clear: () => void;
};

export const usePromoCode = create<PromoState>()(
  persist(
    (set) => ({
      code: "",
      setCode: (code) => set({ code: code.trim().toUpperCase().slice(0, 40) }),
      clear: () => set({ code: "" }),
    }),
    {
      name: "nk-promo-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ code: s.code }),
    },
  ),
);
