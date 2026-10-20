"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { saveAdminNote, saveTracking } from "@/app/admin/orders/actions";
import { orderErrorText } from "./labels";

export function AdminNoteForm({ orderId, initial }: { orderId: string; initial: string }) {
  const { t, te } = useI18n();
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = note.trim() !== saved.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveAdminNote({ orderId, note }).catch(() => ({ ok: false as const, error: "network" }));
          if (res.ok) {
            setSaved(note);
            toast.success(t("admin.orders.detail.noteSaved"));
          } else toast.error(te(res.error));
        });
      }}
    >
      <label htmlFor="admin-note" className="sr-only">
        {t("admin.orders.detail.adminNote")}
      </label>
      <Textarea
        id="admin-note"
        value={note}
        maxLength={2000}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("admin.orders.detail.adminNotePlaceholder")}
        className="min-h-24"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-faint">{t("admin.orders.detail.adminNoteHint")}</p>
        <Button type="submit" size="sm" variant="ink" loading={pending} disabled={!dirty}>
          {t("common.actions.save")}
        </Button>
      </div>
    </form>
  );
}

export function TrackingForm({ orderId, initial }: { orderId: string; initial: string }) {
  const { t, te } = useI18n();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveTracking({ orderId, tracking: value }).catch(() => ({ ok: false as const, error: "network" }));
          if (res.ok) toast.success(t("admin.orders.detail.trackingSaved"));
          else toast.error(orderErrorText(t, te, res.error));
        });
      }}
    >
      <label htmlFor="tracking" className="sr-only">
        {t("admin.orders.detail.tracking")}
      </label>
      <Input
        id="tracking"
        value={value}
        maxLength={60}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder={t("admin.orders.detail.trackingPlaceholder")}
        className="h-10 min-w-0 flex-1 font-mono text-[13px]"
      />
      <Button type="submit" size="sm" variant="outline" className="h-10" loading={pending} disabled={value.trim() === initial.trim()}>
        {t("common.actions.save")}
      </Button>
    </form>
  );
}
