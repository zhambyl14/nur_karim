"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { createReview, updateReview, type ReviewActionResult } from "@/app/(shop)/books/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { StarInput } from "./star-input";

const MAX = 2000;

export function useReviewError() {
  const { dict, te } = useI18n();
  return (code: string) => {
    const own = dict.reviews.errors as Record<string, string>;
    return own[code] ?? te(code);
  };
}

/** Create or edit a review (rating 1–5 + text up to 2000 characters) */
export function ReviewForm({
  bookId,
  review,
  onDone,
  onCancel,
  className,
}: {
  bookId: string;
  review?: { id: string; rating: number; body: string };
  onDone?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  const reviewError = useReviewError();
  const labelId = useId();
  const bodyId = useId();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [body, setBody] = useState(review?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError("RATING_REQUIRED");
      return;
    }
    setError(null);
    startTransition(async () => {
      let result: ReviewActionResult;
      try {
        result = review
          ? await updateReview({ reviewId: review.id, rating, body })
          : await createReview({ bookId, rating, body });
      } catch {
        result = { ok: false, error: "network" };
      }
      if (!result.ok) {
        setError(result.error);
        toast.error(reviewError(result.error));
        return;
      }
      toast.success(review ? t("reviews.form.updated") : t("reviews.form.published"));
      if (!review) {
        setRating(0);
        setBody("");
      }
      onDone?.();
    });
  };

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-4", className)} noValidate>
      <div>
        <div id={labelId} className="mb-1 text-xs font-semibold text-muted">
          {t("reviews.form.ratingLabel")} <span className="text-wine-ink">*</span>
        </div>
        <StarInput value={rating} onChange={setRating} invalid={error === "RATING_REQUIRED"} labelId={labelId} />
      </div>
      <div>
        <label htmlFor={bodyId} className="mb-1.5 block text-xs font-semibold text-muted">
          {t("reviews.form.bodyLabel")}
        </label>
        <Textarea
          id={bodyId}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          maxLength={MAX}
          rows={4}
          placeholder={t("reviews.form.bodyPlaceholder")}
        />
        <div className="mt-1 text-right text-[11px] font-semibold text-faint">{t("reviews.form.counter", { count: body.length })}</div>
      </div>
      {error && (
        <p role="alert" className="-mt-2 text-xs font-semibold text-danger">
          {reviewError(error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {review ? t("reviews.form.save") : t("reviews.form.submit")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t("reviews.form.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
