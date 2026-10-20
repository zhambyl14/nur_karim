"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileText, Hourglass, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { MAX_RECEIPT_BYTES } from "@/lib/constants";
import { formatPrice, orderNo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/interactive";
import { markOrderPaid } from "@/app/(shop)/orders/actions";

const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export function PaymentBlock({
  orderId,
  orderNumber,
  userId,
  status,
  amount,
  payment,
  deadlineHours,
  receipt,
}: {
  orderId: string;
  orderNumber: number;
  userId: string;
  status: "pending_payment" | "payment_review";
  amount: number;
  payment: { phone: string; bank: string; recipient: string; note: string };
  deadlineHours: number;
  receipt: { url: string; pdf: boolean } | null;
}) {
  const { t, te } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "marking">("idle");
  const [pending, startTransition] = useTransition();
  const busy = stage !== "idle" || pending;
  const comment = orderNo(orderNumber);
  const review = status === "payment_review";

  const pick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!RECEIPT_TYPES[f.type]) {
      toast.error(t("orders.payment.receiptType"));
      return;
    }
    if (f.size > MAX_RECEIPT_BYTES) {
      toast.error(t("orders.payment.receiptTooLarge"));
      return;
    }
    setFile(f);
    setPreview(f.type.startsWith("image/") && f.type !== "image/heic" && f.type !== "image/heif" ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    let receiptPath: string | null = null;
    if (file) {
      setStage("uploading");
      const path = `${userId}/${orderNumber}-${Date.now()}.${RECEIPT_TYPES[file.type]}`;
      const { error } = await getSupabaseBrowser()
        .storage.from("receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setStage("idle");
        toast.error(te(error.message?.includes("size") ? "FILE_TOO_LARGE" : "generic"));
        return;
      }
      receiptPath = path;
    }
    setStage("marking");
    const res = await markOrderPaid({ orderId, receiptPath }).catch(() => ({ ok: false as const, error: "network" }));
    setStage("idle");
    if (!res.ok) {
      toast.error(te(res.error));
      return;
    }
    toast.success(t("orders.payment.markedToast"));
    pick(null);
    startTransition(() => router.refresh());
  };

  return (
    <section
      aria-labelledby="payment-title"
      className="overflow-hidden rounded-[22px] border border-line bg-card"
    >
      <div className="relative bg-navy px-5 py-5 text-white sm:px-6">
        <span className="absolute -right-8 -top-8 size-28 rotate-45 border border-gold/25" aria-hidden />
        <h2 id="payment-title" className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
          {t("orders.payment.title")}
        </h2>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[13px] text-white/60">{t("orders.payment.amount")}</div>
            <div className="font-serif text-[34px] font-semibold leading-tight">{formatPrice(amount)}</div>
          </div>
          <CopyButton value={String(amount)} label={t("orders.payment.copyAmount")} variant="ink" className="bg-white/10 text-white hover:bg-white/15" />
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/65">{t("orders.payment.lead")}</p>
      </div>

      {review && (
        <div className="flex gap-3 border-b border-line bg-violet-soft px-5 py-4 sm:px-6">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-violet" aria-hidden />
          <div>
            <div className="text-sm font-bold text-violet">{t("orders.payment.markedTitle")}</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-violet/90">{t("orders.payment.markedText")}</p>
          </div>
        </div>
      )}

      <dl className="divide-y divide-line px-5 sm:px-6">
        <PayRow label={t("orders.payment.phone")} value={formatPhone(payment.phone) || payment.phone} copy={payment.phone} copyLabel={t("orders.payment.copyPhone")} big />
        {payment.bank && <PayRow label={t("orders.payment.bank")} value={payment.bank} />}
        {payment.recipient && <PayRow label={t("orders.payment.recipient")} value={payment.recipient} />}
        <PayRow
          label={t("orders.payment.comment")}
          value={comment}
          copy={comment}
          copyLabel={t("orders.payment.copyComment")}
          hint={t("orders.payment.commentHint")}
        />
      </dl>

      <div className="space-y-2 bg-subtle px-5 py-4 text-[12.5px] leading-relaxed text-muted sm:px-6">
        {payment.note && <p className="whitespace-pre-line">{payment.note}</p>}
        {!review && deadlineHours > 0 && <p className="font-semibold text-wine-ink">{t("orders.payment.deadline", { hours: deadlineHours })}</p>}
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="text-sm font-bold text-ink">{t("orders.payment.receipt")}</div>
        <p className="mt-0.5 text-xs text-muted">{t("orders.payment.receiptHint")}</p>

        {receipt && !file && (
          <a
            href={receipt.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-card-2 p-2.5 transition hover:border-line-strong"
          >
            {receipt.pdf ? (
              <span className="grid size-14 place-items-center rounded-lg bg-wine-soft text-wine-ink">
                <FileText className="size-6" aria-hidden />
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img src={receipt.url} alt={t("orders.payment.receiptUploaded")} className="size-14 rounded-lg object-cover" />
            )}
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                {t("orders.payment.receiptUploaded")}
              </span>
              <span className="text-xs font-semibold text-wine-ink">{t("orders.payment.receiptOpen")}</span>
            </span>
          </a>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {file ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-card-2 p-2.5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="" className="size-14 rounded-lg object-cover" />
            ) : (
              <span className="grid size-14 place-items-center rounded-lg bg-wine-soft text-wine-ink">
                <FileText className="size-6" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">{file.name}</div>
              <div className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("orders.payment.receiptRemove")}
              onClick={() => pick(null)}
              disabled={busy}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-4 text-sm font-bold text-muted transition",
              "hover:border-wine-line hover:bg-wine-soft hover:text-wine-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            )}
          >
            {receipt ? <Paperclip className="size-4" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {receipt ? t("orders.payment.receiptChange") : t("orders.payment.receiptChoose")}
          </button>
        )}

        {(!review || file) && (
          <Button size="lg" className="mt-4 w-full" onClick={submit} loading={busy} disabled={busy}>
            {stage === "uploading"
              ? t("orders.payment.uploading")
              : stage === "marking"
                ? t("orders.payment.marking")
                : review
                  ? t("orders.payment.paidAgain")
                  : t("orders.payment.paid")}
          </Button>
        )}
      </div>
    </section>
  );
}

function PayRow({
  label,
  value,
  copy,
  copyLabel,
  hint,
  big,
}: {
  label: string;
  value: string;
  copy?: string;
  copyLabel?: string;
  hint?: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className={cn("mt-0.5 break-words font-bold text-ink", big ? "font-serif text-xl" : "text-[15px]")}>{value}</dd>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
      {copy && <CopyButton value={copy} label={copyLabel} size="icon-sm" variant="outline" />}
    </div>
  );
}
