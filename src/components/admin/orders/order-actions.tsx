"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, PackageCheck, SearchX, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { confirmDialog } from "@/components/ui/interactive";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import type { DeliveryMethod, OrderStatus } from "@/types/app";
import { orderErrorText } from "./labels";

type Dialog = "notFound" | "ship" | "cancel" | null;

/** Status buttons of the order page. Only transitions allowed by admin_update_order are offered. */
export function OrderActions({
  orderId,
  status,
  hasPaper,
  deliveryMethod,
  trackingNumber,
}: {
  orderId: string;
  status: OrderStatus;
  hasPaper: boolean;
  deliveryMethod: DeliveryMethod;
  trackingNumber: string | null;
}) {
  const { t, te } = useI18n();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState("");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [error, setError] = useState<string | null>(null);

  const run = (next: OrderStatus, extra: { note?: string; tracking?: string } = {}) => {
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatus({ orderId, status: next, ...extra }).catch(() => ({
        ok: false as const,
        error: "network",
      }));
      if (res.ok) {
        toast.success(t("admin.orders.detail.actions.done"));
        setDialog(null);
        setText("");
      } else {
        const message = orderErrorText(t, te, res.error);
        if (dialog) setError(message);
        else toast.error(message);
      }
    });
  };

  const open = (d: Dialog) => {
    setError(null);
    setText("");
    setDialog(d);
  };

  const confirmPayment = async () => {
    const ok = await confirmDialog({
      title: t("admin.orders.detail.actions.confirmPayment"),
      text: t("admin.orders.detail.actions.confirmPaymentText"),
      confirmText: t("admin.orders.detail.actions.confirmPayment"),
    });
    if (ok) run("paid");
  };

  const deliver = async () => {
    const ok = await confirmDialog({
      title: t("admin.orders.detail.actions.deliver"),
      text: t("admin.orders.detail.actions.deliverText"),
      confirmText: t("admin.orders.detail.actions.deliver"),
    });
    if (ok) run("delivered");
  };

  const unpaid = status === "pending_payment" || status === "payment_review";
  const canShip = status === "paid" && hasPaper;
  const canDeliver = (status === "paid" && hasPaper) || status === "shipped";
  const canCancel = status !== "cancelled";
  const kazpost = deliveryMethod === "kazpost";

  if (status === "cancelled") {
    return <p className="text-sm text-muted">{t("admin.orders.detail.actions.noActions")}</p>;
  }

  return (
    <>
      <div className="grid gap-2">
        {unpaid && (
          <Button size="lg" onClick={confirmPayment} loading={pending} leftIcon={<CheckCircle2 className="size-5" />}>
            {t("admin.orders.detail.actions.confirmPayment")}
          </Button>
        )}
        {status === "payment_review" && (
          <Button variant="outline" onClick={() => open("notFound")} disabled={pending} leftIcon={<SearchX className="size-4" />}>
            {t("admin.orders.detail.actions.paymentNotFound")}
          </Button>
        )}
        {status === "pending_payment" && (
          <Button variant="outline" onClick={() => run("payment_review")} disabled={pending}>
            {t("admin.orders.detail.actions.reviewing")}
          </Button>
        )}
        {canShip && (
          <Button size="lg" variant="ink" onClick={() => open("ship")} disabled={pending} leftIcon={<Truck className="size-5" />}>
            {t("admin.orders.detail.actions.ship")}
          </Button>
        )}
        {canDeliver && (
          <Button
            size={status === "shipped" ? "lg" : "md"}
            variant={status === "shipped" ? "ink" : "outline"}
            onClick={deliver}
            loading={pending && !dialog}
            leftIcon={<PackageCheck className="size-4" />}
          >
            {t("admin.orders.detail.actions.deliver")}
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={() => open("cancel")} disabled={pending} leftIcon={<Ban className="size-4" />}>
            {t("admin.orders.detail.actions.cancel")}
          </Button>
        )}
      </div>

      <Modal
        open={dialog === "notFound"}
        onClose={() => setDialog(null)}
        size="sm"
        title={t("admin.orders.detail.actions.paymentNotFoundTitle")}
        description={t("admin.orders.detail.actions.paymentNotFoundText")}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button onClick={() => run("pending_payment", { note: text })} loading={pending} disabled={!text.trim()}>
              {t("common.actions.send")}
            </Button>
          </div>
        }
      >
        <Field label={t("admin.orders.detail.actions.noteLabel")} htmlFor="nf-note" error={error}>
          <Textarea
            id="nf-note"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("admin.orders.detail.actions.paymentNotFoundPlaceholder")}
            className="min-h-24"
          />
        </Field>
      </Modal>

      <Modal
        open={dialog === "ship"}
        onClose={() => setDialog(null)}
        size="sm"
        title={t("admin.orders.detail.actions.shipTitle")}
        description={kazpost ? t("admin.orders.detail.actions.shipText") : undefined}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="ink"
              onClick={() => run("shipped", { tracking })}
              loading={pending}
              disabled={kazpost && tracking.trim().length < 3}
            >
              {t("admin.orders.detail.actions.ship")}
            </Button>
          </div>
        }
      >
        <Field
          label={t("admin.orders.detail.tracking")}
          htmlFor="ship-tracking"
          required={kazpost}
          error={error}
        >
          <Input
            id="ship-tracking"
            value={tracking}
            maxLength={60}
            autoComplete="off"
            onChange={(e) => setTracking(e.target.value.toUpperCase())}
            placeholder={t("admin.orders.detail.trackingPlaceholder")}
          />
        </Field>
      </Modal>

      <Modal
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        size="sm"
        title={t("admin.orders.detail.actions.cancelTitle")}
        description={t("admin.orders.detail.actions.cancelText")}
        closeLabel={t("common.actions.close")}
        footer={
          <div className="flex justify-end gap-2 pb-1">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t("common.actions.back")}
            </Button>
            <Button variant="danger" onClick={() => run("cancelled", { note: text })} loading={pending} disabled={!text.trim()}>
              {t("admin.orders.detail.actions.cancelConfirm")}
            </Button>
          </div>
        }
      >
        <Field label={t("admin.orders.detail.actions.reasonLabel")} htmlFor="cancel-reason" error={error}>
          <Textarea
            id="cancel-reason"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("admin.orders.detail.actions.cancelPlaceholder")}
            className="min-h-24"
          />
        </Field>
      </Modal>
    </>
  );
}
