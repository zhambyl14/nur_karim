"use client";

// STUB — implemented by the gifts feature («Досыңа сыйла»).
// Contract: a button on the book page that starts the gift flow for this book
// and format (e.g. puts it into the cart and opens /checkout?mode=gift).

import type { BookFormat } from "@/types/app";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function GiftButton(_props: {
  bookId: string;
  format: BookFormat;
  title: string;
  className?: string;
  variant?: "full" | "compact";
}) {
  return null;
}
