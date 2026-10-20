"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useSession } from "@/components/session";
import { startConversation } from "@/app/(shop)/account/messages/actions";
import { MESSAGE_MAX_LENGTH } from "./types";

/** Modal with a textarea that starts a conversation (about a book or general) and opens it. */
export function ComposeModal({
  open,
  onClose,
  bookId,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  bookId: string | null;
  title: ReactNode;
  description?: ReactNode;
}) {
  const { t, te } = useI18n();
  const router = useRouter();
  const { refreshCounters } = useSession();
  const id = useId();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const trimmed = body.trim();
  const tooLong = trimmed.length > MESSAGE_MAX_LENGTH;

  const submit = () => {
    if (!trimmed || tooLong || pending) return;
    setError(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof startConversation>>;
      try {
        result = await startConversation({ body: trimmed, bookId });
      } catch {
        result = { ok: false, error: "network" };
      }
      if (!result.ok) {
        setError(te(result.error));
        return;
      }
      toast.success(t("messages.ask.sent"));
      setBody("");
      void refreshCounters();
      router.push(`/account/messages/${result.id}`);
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      description={description}
      closeLabel={t("common.actions.close")}
      footer={
        <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end sm:pb-0">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("common.actions.cancel")}
          </Button>
          <Button
            onClick={submit}
            loading={pending}
            disabled={!trimmed || tooLong}
            rightIcon={<SendHorizontal className="size-4" aria-hidden />}
          >
            {t("messages.ask.send")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          label={t("messages.compose.label")}
          htmlFor={id}
          error={error ?? (tooLong ? t("messages.chat.tooLong") : undefined)}
        >
          <Textarea
            id={id}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("messages.ask.placeholder")}
            rows={5}
            maxLength={MESSAGE_MAX_LENGTH + 200}
            invalid={tooLong || Boolean(error)}
            autoFocus
          />
        </Field>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-subtle px-3 py-2.5 text-xs font-semibold leading-relaxed text-muted">
          <ShieldCheck className="mt-px size-4 shrink-0 text-success" aria-hidden />
          {t("messages.ask.hint")}
        </p>
      </form>
    </Modal>
  );
}
