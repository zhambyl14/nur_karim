"use client";

import { Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import { TelegramIcon, WhatsappIcon } from "@/components/brand/social-icons";

/** Share tools for a gift link: WhatsApp, Telegram, copy, system share sheet */
export function GiftShare({
  url,
  recipientName,
  anonymous,
  className,
}: {
  url: string;
  recipientName: string;
  anonymous?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const mounted = useMounted();
  const text = anonymous || !recipientName ? t("orders.share.textAnon") : t("orders.share.text", { name: recipientName });
  const canShare = mounted && typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.actions.copied"));
    } catch {
      toast.error(t("errors.generic"));
    }
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", className: "sm:flex-1" })}
      >
        <WhatsappIcon size={16} className="text-success" aria-hidden />
        {t("orders.share.whatsapp")}
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", className: "sm:flex-1" })}
      >
        <TelegramIcon size={16} className="text-info" aria-hidden />
        {t("orders.share.telegram")}
      </a>
      <Button variant="outline" onClick={copy} leftIcon={<Link2 className="size-4" aria-hidden />} className="sm:flex-1">
        {t("orders.share.copy")}
      </Button>
      {canShare && (
        <Button
          variant="ink"
          className="sm:flex-1"
          leftIcon={<Share2 className="size-4" aria-hidden />}
          onClick={() => navigator.share({ title: t("gift.metaTitle"), text, url }).catch(() => {})}
        >
          {t("orders.share.more")}
        </Button>
      )}
    </div>
  );
}
