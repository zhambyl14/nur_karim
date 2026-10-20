"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { confirmDialog } from "@/components/ui/interactive";
import { grantEbook, removeDevice, resetDevices, revokeEbook } from "@/app/admin/customers/actions";

type Res = { ok: true } | { ok: false; error: string };

function useErrorText() {
  const { t, te } = useI18n();
  return (code: string) =>
    code === "ALREADY_OWNED" || code === "NOT_EBOOK" ? t(`admin.customers.errors.${code}`) : te(code);
}

const fail = { ok: false as const, error: "network" };

export function GrantEbookForm({ userId, books }: { userId: string; books: { id: string; title: string; author: string }[] }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [bookId, setBookId] = useState("");
  const [pending, startTransition] = useTransition();

  if (books.length === 0) return <p className="text-[13px] text-muted">{t("admin.customers.detail.noGrantable")}</p>;

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!bookId) return;
        startTransition(async () => {
          const res: Res = await grantEbook({ userId, bookId }).catch(() => fail);
          if (res.ok) {
            toast.success(t("admin.customers.detail.granted"));
            setBookId("");
          } else toast.error(errorText(res.error));
        });
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="grant-book" className="sr-only">
          {t("admin.customers.detail.grantLabel")}
        </label>
        <Select id="grant-book" value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-11">
          <option value="">{t("admin.customers.detail.grantPlaceholder")}</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.author ? `${b.title} — ${b.author}` : b.title}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="ink" className="h-11" loading={pending} disabled={!bookId} leftIcon={<Plus className="size-4" />}>
        {t("admin.customers.detail.grant")}
      </Button>
    </form>
  );
}

export function RevokeEbookButton({ userId, bookId, title }: { userId: string; bookId: string; title: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`${t("admin.customers.detail.revoke")}: ${title}`}
      title={t("admin.customers.detail.revoke")}
      loading={pending}
      className="text-muted hover:text-danger"
      onClick={async () => {
        const ok = await confirmDialog({
          title: t("admin.customers.detail.revokeTitle"),
          text: t("admin.customers.detail.revokeText", { title }),
          confirmText: t("admin.customers.detail.revoke"),
          danger: true,
        });
        if (!ok) return;
        startTransition(async () => {
          const res: Res = await revokeEbook({ userId, bookId }).catch(() => fail);
          if (res.ok) toast.success(t("admin.customers.detail.revoked"));
          else toast.error(errorText(res.error));
        });
      }}
    >
      {!pending && <X className="size-4" />}
    </Button>
  );
}

export function ResetDevicesButton({ userId }: { userId: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      leftIcon={<RotateCcw className="size-4" />}
      onClick={async () => {
        const ok = await confirmDialog({
          title: t("admin.customers.detail.resetTitle"),
          text: t("admin.customers.detail.resetText"),
          confirmText: t("admin.customers.detail.resetDevices"),
          danger: true,
        });
        if (!ok) return;
        startTransition(async () => {
          const res: Res = await resetDevices({ userId }).catch(() => fail);
          if (res.ok) toast.success(t("admin.customers.detail.resetDone"));
          else toast.error(errorText(res.error));
        });
      }}
    >
      {t("admin.customers.detail.resetDevices")}
    </Button>
  );
}

export function RemoveDeviceButton({ userId, deviceId }: { userId: string; deviceId: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("admin.customers.detail.removeDevice")}
      title={t("admin.customers.detail.removeDevice")}
      loading={pending}
      className="text-muted hover:text-danger"
      onClick={() =>
        startTransition(async () => {
          const res: Res = await removeDevice({ userId, deviceId }).catch(() => fail);
          if (res.ok) toast.success(t("admin.customers.detail.resetDone"));
          else toast.error(errorText(res.error));
        })
      }
    >
      {!pending && <Trash2 className="size-4" />}
    </Button>
  );
}
