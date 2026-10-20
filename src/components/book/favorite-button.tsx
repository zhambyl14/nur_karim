"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Heart toggle backed by the `favorites` table (RLS: own rows only).
 * Guests are sent to the login page and come back to `next`.
 */
export function FavoriteButton({
  bookId,
  slug,
  initialFavorite,
  variant = "icon",
  next,
  className,
  onRemoved,
}: {
  bookId: string;
  slug: string;
  initialFavorite: boolean;
  /** icon = bordered square on the page, glass = on navy, full = button with text */
  variant?: "icon" | "glass" | "full";
  next?: string;
  className?: string;
  onRemoved?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useSession();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [base, setBase] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();
  if (base !== initialFavorite) {
    setBase(initialFavorite);
    setFavorite(initialFavorite);
  }

  const label = favorite ? t("book.favorite.remove") : t("book.favorite.add");

  const toggle = () => {
    if (!user) {
      toast.info(t("book.favorite.login"));
      router.push(`/login?next=${encodeURIComponent(next ?? `/books/${slug}`)}`);
      return;
    }
    const nextValue = !favorite;
    setFavorite(nextValue);
    startTransition(async () => {
      const supabase = getSupabaseBrowser();
      const { error } = nextValue
        ? await supabase.from("favorites").upsert({ user_id: user.id, book_id: bookId }, { onConflict: "user_id,book_id", ignoreDuplicates: true })
        : await supabase.from("favorites").delete().eq("user_id", user.id).eq("book_id", bookId);
      if (error) {
        setFavorite(!nextValue);
        toast.error(t("errors.generic"));
        return;
      }
      toast.success(nextValue ? t("book.favorite.added") : t("book.favorite.removed"));
      if (!nextValue) onRemoved?.();
    });
  };

  const icon = (
    <Heart
      className={cn("size-[18px] transition", favorite && "animate-pop")}
      fill={favorite ? "currentColor" : "none"}
      aria-hidden
    />
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorite}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition disabled:opacity-60",
          favorite ? "border-wine-line bg-wine-soft text-wine-ink" : "border-line bg-card text-ink hover:bg-subtle",
          className,
        )}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl transition disabled:opacity-60",
        variant === "glass"
          ? cn("border border-white/20 bg-white/10 backdrop-blur hover:bg-white/20", favorite ? "text-[#f29ab2]" : "text-white")
          : cn("border bg-card hover:bg-subtle", favorite ? "border-wine-line text-wine-ink" : "border-line text-ink"),
        className,
      )}
    >
      {icon}
    </button>
  );
}
