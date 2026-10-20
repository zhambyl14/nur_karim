"use client";

import { useState, useTransition } from "react";
import { EyeOff, Pencil, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteReview } from "@/app/(shop)/books/[slug]/actions";
import { Avatar, RatingStars } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/interactive";
import { useI18n } from "@/lib/i18n/client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReviewForm, useReviewError } from "./review-form";

export type ReviewView = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
  edited: boolean;
  isHidden: boolean;
};

function ReviewCard({ review, highlight, actions }: { review: ReviewView; highlight?: boolean; actions?: React.ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <article
      className={cn(
        "rounded-[18px] border bg-card p-4 sm:p-5",
        highlight ? "border-wine-line ring-1 ring-wine-line" : "border-line",
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar name={review.authorName} size={40} tone="soft" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-ink">{review.authorName}</span>
            {highlight && <Badge tone="wine">{t("reviews.yours")}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <RatingStars value={review.rating} size={13} />
            <time dateTime={review.createdAt} className="text-xs font-medium text-faint">
              {formatDate(review.createdAt, locale)}
              {review.edited && ` · ${t("reviews.edited")}`}
            </time>
          </div>
        </div>
        {actions}
      </header>
      {review.isHidden && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
          <EyeOff className="size-4 shrink-0" aria-hidden />
          {t("reviews.hiddenNote")}
        </p>
      )}
      {review.body && <p className="mt-3 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-ink-2">{review.body}</p>}
      {review.adminReply && (
        <div className="mt-4 rounded-[14px] border-l-[3px] border-gold bg-subtle px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <Store className="size-3.5 text-gold" aria-hidden />
            {t("reviews.adminReply")}
            {review.adminReplyAt && (
              <span className="font-medium text-faint">· {formatDate(review.adminReplyAt, locale)}</span>
            )}
          </div>
          <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">{review.adminReply}</p>
        </div>
      )}
    </article>
  );
}

/** The signed-in user's own review with edit / delete */
export function OwnReview({ review, bookId }: { review: ReviewView; bookId: string }) {
  const { t } = useI18n();
  const reviewError = useReviewError();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = async () => {
    const ok = await confirmDialog({
      title: t("reviews.form.deleteConfirm"),
      text: t("reviews.form.deleteText"),
      confirmText: t("reviews.form.delete"),
      cancelText: t("reviews.form.cancel"),
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteReview({ reviewId: review.id }).catch(() => ({ ok: false as const, error: "network" }));
      if (!result.ok) {
        toast.error(reviewError(result.error));
        return;
      }
      toast.success(t("reviews.form.deleted"));
    });
  };

  if (editing) {
    return (
      <div className="rounded-[18px] border border-wine-line bg-card p-4 sm:p-5">
        <h3 className="mb-4 font-serif text-lg font-semibold text-ink">{t("reviews.form.editTitle")}</h3>
        <ReviewForm
          bookId={bookId}
          review={{ id: review.id, rating: review.rating, body: review.body }}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <ReviewCard
      review={review}
      highlight
      actions={
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={t("reviews.form.edit")} title={t("reviews.form.edit")}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            loading={pending}
            aria-label={t("reviews.form.delete")}
            title={t("reviews.form.delete")}
            className="text-danger hover:bg-danger-soft"
          >
            {!pending && <Trash2 className="size-4" />}
          </Button>
        </div>
      }
    />
  );
}

const PAGE = 6;

export function ReviewList({ reviews }: { reviews: ReviewView[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(PAGE);
  const rest = reviews.length - shown;
  return (
    <div className="flex flex-col gap-3">
      {reviews.slice(0, shown).map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {rest > 0 && (
        <Button variant="outline" onClick={() => setShown((s) => s + PAGE * 2)} className="self-center">
          {t("reviews.showMore", { count: Math.min(rest, PAGE * 2) })}
        </Button>
      )}
    </div>
  );
}
