import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { TelegramIcon } from "@/components/brand/social-icons";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Big link that opens the Telegram bot in a new tab / the Telegram app */
export function TelegramLinkButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant, size }), "w-full gap-2.5", className)}
    >
      <TelegramIcon size={20} />
      <span className="truncate">{children}</span>
      <ExternalLink className="size-4 opacity-70" aria-hidden />
    </a>
  );
}
