"use client";

import { useRouter } from "next/navigation";
import { Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BookFormat } from "@/types/app";

/**
 * Adds a book format to the cart and shows a toast with «Себетке өту».
 * variant="icon" is the small «+» square from the book cards.
 */
export function AddToCartButton({
  bookId,
  format,
  title,
  variant = "full",
  quantity = 1,
  disabled,
  className,
  label,
}: {
  bookId: string;
  format: BookFormat;
  title?: string;
  variant?: "icon" | "full";
  quantity?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const add = useCart((s) => s.add);

  const onAdd = () => {
    const result = add(bookId, format, quantity);
    if (result === "exists") {
      toast.info(t("common.cartToast.alreadyEbook"), {
        action: { label: t("common.cartToast.goToCart"), onClick: () => router.push("/cart") },
      });
      return;
    }
    toast.success(t("common.cartToast.added"), {
      description: title,
      action: { label: t("common.cartToast.goToCart"), onClick: () => router.push("/cart") },
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAdd();
        }}
        disabled={disabled}
        aria-label={label ?? t("common.cartToast.added")}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-on-primary transition hover:bg-wine active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
          className,
        )}
      >
        <Plus className="size-5" strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={onAdd}
      disabled={disabled}
      className={cn("w-full", className)}
      leftIcon={<ShoppingBag className="size-[18px]" />}
    >
      {label ?? t("nav.cart")}
    </Button>
  );
}
