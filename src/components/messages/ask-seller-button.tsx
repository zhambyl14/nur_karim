"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { ComposeModal } from "./compose-modal";

/**
 * «Сатушыға сұрақ» on the book page: a private question about this book.
 * Guests are sent to the login page and come back to the book.
 */
export function AskSellerButton({
  bookId,
  bookTitle,
  bookSlug,
  className,
}: {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  className?: string;
}) {
  const { t } = useI18n();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const classes = buttonVariants({ variant: "outline", className });

  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/books/${bookSlug}`)}`}
        className={classes}
        title={t("messages.ask.loginToAsk")}
      >
        <MessageCircle className="size-4" aria-hidden />
        {t("messages.ask.button")}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={classes} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <MessageCircle className="size-4" aria-hidden />
        {t("messages.ask.button")}
      </button>
      <ComposeModal
        open={open}
        onClose={() => setOpen(false)}
        bookId={bookId}
        title={t("messages.ask.title")}
        description={t("messages.ask.about", { title: bookTitle })}
      />
    </>
  );
}
