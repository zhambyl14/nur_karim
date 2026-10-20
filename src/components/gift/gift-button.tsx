"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import type { BookFormat } from "@/types/app";

/**
 * «Сыйлау» — starts the «Досыңа сыйла» flow for this book and format:
 * puts it into the cart (if it is not there yet) and opens the gift checkout.
 */
export function GiftButton({
  bookId,
  format,
  title,
  className,
  variant = "full",
}: {
  bookId: string;
  format: BookFormat;
  title: string;
  className?: string;
  variant?: "full" | "compact";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const exists = useCart.getState().lines.some((l) => l.bookId === bookId && l.format === format);
    if (!exists) {
      useCart.getState().add(bookId, format, 1);
      toast.success(t("gift.button.added"));
    }
    startTransition(() => router.push("/checkout?mode=gift"));
  };

  return (
    <Button
      type="button"
      variant={variant === "full" ? "soft" : "outline"}
      size={variant === "full" ? "lg" : "md"}
      className={className}
      onClick={onClick}
      loading={pending}
      aria-label={t("gift.button.aria", { title })}
      leftIcon={<Gift className="size-[18px]" aria-hidden />}
    >
      {variant === "full" ? t("gift.button.full") : t("gift.button.compact")}
    </Button>
  );
}
