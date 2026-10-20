"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toRpcItems } from "@/lib/cart/store";
import { useDebounced } from "@/lib/hooks";
import type { CartLine, DeliveryMethod, Quote } from "@/types/app";

export type QuoteParams = {
  lines: CartLine[];
  promoCode?: string | null;
  deliveryMethod?: Exclude<DeliveryMethod, "digital"> | null;
  isGift?: boolean;
  giftWrap?: boolean;
};

type QuoteState = {
  key: string;
  nonce: number;
  quote: Quote | null;
  error: boolean;
};

type QuoteKey = [
  ReturnType<typeof toRpcItems>,
  string | null,
  QuoteParams["deliveryMethod"],
  boolean,
  boolean,
];

export function quoteKey(params: QuoteParams): string {
  const promo = params.promoCode?.trim().toUpperCase() || null;
  const key: QuoteKey = [
    toRpcItems(params.lines),
    promo,
    params.deliveryMethod ?? null,
    !!params.isGift,
    !!params.giftWrap,
  ];
  return JSON.stringify(key);
}

/**
 * Server-side price quote for the cart (quote_cart RPC). Re-quotes with a short
 * debounce whenever the lines, promo code, delivery or gift options change.
 * Totals are ALWAYS taken from the result — never computed on the client.
 */
export function useQuote(params: QuoteParams, { enabled = true, delay = 350 }: { enabled?: boolean; delay?: number } = {}) {
  const key = quoteKey(params);
  const debouncedKey = useDebounced(key, delay);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<QuoteState>({ key: "", nonce: -1, quote: null, error: false });

  const empty = params.lines.length === 0;

  useEffect(() => {
    if (!enabled) return;
    const [items, promo, method, isGift, wrap] = JSON.parse(debouncedKey) as QuoteKey;
    if (items.length === 0) return;
    let cancelled = false;
    getSupabaseBrowser()
      .rpc("quote_cart", {
        p_items: items,
        p_promo_code: promo ?? undefined,
        p_delivery_method: method ?? undefined,
        p_is_gift: isGift,
        p_gift_wrap: wrap,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        setState((prev) => ({
          key: debouncedKey,
          nonce,
          quote: error || !data ? prev.quote : (data as unknown as Quote),
          error: !!error || !data,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKey, nonce, enabled]);

  const loading = enabled && !empty && (state.key !== key || state.nonce !== nonce);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  /** Replace the displayed quote (e.g. the fresh quote returned with PRICE_CHANGED) */
  const replace = useCallback(
    (quote: Quote) => setState({ key, nonce, quote, error: false }),
    [key, nonce],
  );

  return {
    quote: empty ? null : state.quote,
    loading,
    error: !loading && state.error,
    /** true until the very first quote arrived */
    initial: !empty && state.quote === null && !state.error,
    retry,
    replace,
  };
}
