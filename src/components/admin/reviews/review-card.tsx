"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, MessageSquareReply, Trash2, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { RatingStars } from "@/components/ui/misc";
import { confirmDialog } from "@/components/ui/interactive";
import { BookCover } from "@/components/book/book-cover";
import { deleteReview, saveReviewReply, setReviewHidden } from "@/app/admin/reviews/actions";

export type AdminReview = {
  id: string;
  rating: number;
  body: string;
  author_name: string;
  is_hidden: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  book_id: string;
  books: { title: string; author: string; slug: string; cover_url: string | null; cover_palette: number } | null;
  profiles: { full_name: string; phone: string } | null;
  /** dates are formatted on the server: browsers lack kk month names (hydration mismatch) */
  created_label: string;
  reply_label: string;
};

const fail = { ok: false as const, error: "network" };

export function ReviewCard({ review }: { review: AdminReview }) {
  const { t, te } = useI18n();
  const [pending, startTransition] = useTransition();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.admin_reply ?? "");
  const book = review.books;

  const act = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn().catch(() => fail);
      if (res.ok) {
        toast.success(success);
        after?.();
      } else toast.error(te(res.error));
    });

  return (
    <article
      className={cn(
        "rounded-[18px] border bg-card p-4 sm:p-5",
        review.is_hidden ? "border-dashed border-line-strong" : "border-line",
      )}
    >
      <div className="flex gap-3.5">
        <div className="hidden w-12 shrink-0 sm:block">
          <BookCover
            title={book?.title ?? t("admin.reviews.deletedBook")}
            author={book?.author}
            coverUrl={book?.cover_url}
            palette={book?.cover_palette}
            size="xs"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0">
              {book ? (
                <Link href={`/books/${book.slug}`} target="_blank" className="font-bold text-ink hover:text-wine-ink hover:underline">
                  {book.title}
                </Link>
              ) : (
                <span className="font-bold text-muted">{t("admin.reviews.deletedBook")}</span>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <Link href={`/admin/customers/${review.user_id}`} className="inline-flex items-center gap-1 font-semibold text-ink-2 hover:text-wine-ink">
                  <User className="size-3.5" aria-hidden />
                  {review.profiles?.full_name || review.author_name}
                </Link>
                {review.profiles?.phone && <span>{formatPhone(review.profiles.phone)}</span>}
                <span>· {review.created_label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {review.is_hidden && <Badge tone="danger">{t("admin.reviews.hiddenBadge")}</Badge>}
              <RatingStars value={review.rating} />
            </div>
          </div>

          {review.body ? (
            <p className={cn("mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2", review.is_hidden && "opacity-70")}>{review.body}</p>
          ) : (
            <p className="mt-3 text-sm italic text-faint">{t("admin.reviews.noText")}</p>
          )}

          {review.admin_reply && !replying && (
            <div className="mt-3 rounded-xl border-l-2 border-gold bg-subtle px-3.5 py-2.5">
              <div className="text-[11.5px] font-bold text-muted">
                {t("admin.reviews.storeReply", { date: review.reply_label })}
              </div>
              <p className="mt-1 whitespace-pre-line text-[13px] text-ink">{review.admin_reply}</p>
            </div>
          )}

          {replying && (
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(
                  () => saveReviewReply({ reviewId: review.id, reply }),
                  reply.trim() ? t("admin.reviews.replySaved") : t("admin.reviews.replyRemoved"),
                  () => setReplying(false),
                );
              }}
            >
              <label htmlFor={`reply-${review.id}`} className="mb-1.5 block text-xs font-semibold text-muted">
                {t("admin.reviews.replyLabel")}
              </label>
              <Textarea
                id={`reply-${review.id}`}
                value={reply}
                maxLength={2000}
                autoFocus
                onChange={(e) => setReply(e.target.value)}
                placeholder={t("admin.reviews.replyPlaceholder")}
                className="min-h-24"
              />
              <p className="mt-1.5 text-xs text-faint">{t("admin.reviews.replyHint")}</p>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReplying(false)} disabled={pending}>
                  {t("common.actions.cancel")}
                </Button>
                {review.admin_reply && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      act(() => saveReviewReply({ reviewId: review.id, reply: "" }), t("admin.reviews.replyRemoved"), () => {
                        setReply("");
                        setReplying(false);
                      })
                    }
                  >
                    {t("admin.reviews.removeReply")}
                  </Button>
                )}
                <Button type="submit" variant="ink" size="sm" loading={pending} disabled={!reply.trim()}>
                  {t("admin.reviews.saveReply")}
                </Button>
              </div>
            </form>
          )}

          {!replying && (
            <div className="mt-3.5 flex flex-wrap gap-2 border-t border-line-soft pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setReplying(true)}
                leftIcon={<MessageSquareReply className="size-4" />}
              >
                {review.admin_reply ? t("admin.reviews.editReply") : t("admin.reviews.reply")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  act(
                    () => setReviewHidden({ reviewId: review.id, hidden: !review.is_hidden }),
                    review.is_hidden ? t("admin.reviews.shownDone") : t("admin.reviews.hiddenDone"),
                  )
                }
                leftIcon={review.is_hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              >
                {review.is_hidden ? t("admin.reviews.unhide") : t("admin.reviews.hide")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-danger hover:bg-danger-soft"
                disabled={pending}
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: t("admin.reviews.deleteTitle"),
                    text: t("admin.reviews.deleteText"),
                    confirmText: t("admin.reviews.delete"),
                    danger: true,
                  });
                  if (ok) act(() => deleteReview({ reviewId: review.id }), t("admin.reviews.deleted"));
                }}
                leftIcon={<Trash2 className="size-4" />}
              >
                {t("admin.reviews.delete")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
