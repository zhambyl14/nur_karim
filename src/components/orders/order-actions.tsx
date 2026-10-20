"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircleQuestion, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { confirmDialog } from "@/components/ui/interactive";
import { Modal } from "@/components/ui/modal";
import { askAboutOrder, cancelOrder } from "@/app/(shop)/orders/actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = async () => {
    const yes = await confirmDialog({
      title: t("orders.actions.cancelConfirmTitle"),
      text: t("orders.actions.cancelConfirmText"),
      confirmText: t("orders.actions.cancelConfirm"),
      danger: true,
    });
    if (!yes) return;
    startTransition(async () => {
      const res = await cancelOrder({ orderId }).catch(() => ({ ok: false as const, error: "network" }));
      if (!res.ok) {
        toast.error(te(res.error));
        return;
      }
      toast.success(t("orders.actions.cancelled"));
      router.refresh();
    });
  };

  return (
    <Button variant="danger" onClick={onClick} loading={pending} leftIcon={<XCircle className="size-4" aria-hidden />}>
      {t("orders.actions.cancel")}
    </Button>
  );
}

export function AskQuestionButton({ orderId, className }: { orderId: string; className?: string }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await askAboutOrder({ orderId, body }).catch(() => ({ ok: false as const, error: "network" }));
      if (!res.ok) {
        toast.error(te(res.error));
        return;
      }
      setOpen(false);
      setBody("");
      router.push(`/account/messages/${res.conversationId}`);
    });
  };

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
        leftIcon={<MessageCircleQuestion className="size-4" aria-hidden />}
      >
        {t("orders.actions.ask")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("orders.actions.askTitle")}
        description={t("orders.actions.askText")}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button onClick={send} loading={pending} disabled={!body.trim()}>
              {t("orders.actions.askSend")}
            </Button>
          </div>
        }
      >
        <Field label={t("orders.actions.askTitle")} htmlFor="ask-body">
          <Textarea
            id="ask-body"
            autoFocus
            rows={4}
            maxLength={2000}
            value={body}
            placeholder={t("orders.actions.askPlaceholder")}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
