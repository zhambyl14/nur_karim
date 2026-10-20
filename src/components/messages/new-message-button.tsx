"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ComposeModal } from "./compose-modal";

/** «Жаңа хабарлама»: a general question to the store (no book / order). */
export function NewMessageButton({ variant = "primary", className }: { variant?: ButtonProps["variant"]; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        leftIcon={<PenLine className="size-4" aria-hidden />}
      >
        {t("messages.newMessage")}
      </Button>
      <ComposeModal
        open={open}
        onClose={() => setOpen(false)}
        bookId={null}
        title={t("messages.compose.title")}
        description={t("messages.compose.description")}
      />
    </>
  );
}
