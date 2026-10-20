"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Native share sheet on phones, copy link elsewhere */
export function ShareButton({
  title,
  path,
  variant = "icon",
  className,
}: {
  title: string;
  path: string;
  variant?: "icon" | "glass";
  className?: string;
}) {
  const { t } = useI18n();

  const onShare = async () => {
    const url = new URL(path, window.location.origin).toString();
    const text = t("book.shareText", { title });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("book.linkCopied"));
    } catch {
      toast.error(t("errors.generic"));
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t("book.share")}
      title={t("book.share")}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl transition",
        variant === "glass"
          ? "border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20"
          : "border border-line bg-card text-ink hover:bg-subtle",
        className,
      )}
    >
      <Share2 className="size-[18px]" aria-hidden />
    </button>
  );
}
