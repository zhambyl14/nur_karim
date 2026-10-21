import Link from "next/link";
import { Lock, ShoppingBag, Star } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/misc";
import { SectionHeading } from "@/components/book-page/ornament";
import { OwnReview, ReviewList, type ReviewView } from "./review-list";
import { ReviewForm } from "./review-form";

type ReviewRow = {
  id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

function toView(row: ReviewRow): ReviewView {
  return {
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    body: row.body,
    adminReply: row.admin_reply,
    adminReplyAt: row.admin_reply_at,
    createdAt: row.created_at,
    // the DB bumps updated_at on every update (also admin replies); only count edits made a while later
    edited:
      new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 60_000 &&
      (!row.admin_reply_at || new Date(row.updated_at).getTime() - new Date(row.admin_reply_at).getTime() > 60_000),
    isHidden: row.is_hidden,
  };
}

/** Reviews block of the book page: summary, distribution, form gate, list */
export async function ReviewsSection({ bookId, slug, userId }: { bookId: string; slug: string; userId: string | null }) {
  const { t } = await getI18n();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, author_name, rating, body, admin_reply, admin_reply_at, is_hidden, created_at, updated_at")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) console.error("reviews load failed", error);
  const rows = (data ?? []) as ReviewRow[];

  const own = userId ? rows.find((r) => r.user_id === userId) : undefined;
  const visible = rows.filter((r) => !r.is_hidden);
  const others = visible.filter((r) => r.id !== own?.id);
  const count = visible.length;
  const average = count ? visible.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: visible.filter((r) => r.rating === stars).length,
  }));

  let canReview = false;
  if (userId && !own) {
    const { data: purchased } = await supabase.rpc("has_purchased", { p_book_id: bookId });
    canReview = purchased === true;
  }

  const gate = !own ? (
    canReview ? (
      <div className="rounded-[18px] border border-line bg-card p-5">
        <h3 className="mb-4 font-serif text-lg font-semibold text-ink">{t("reviews.form.title")}</h3>
        <ReviewForm bookId={bookId} />
      </div>
    ) : userId ? (
      <div className="flex gap-3 rounded-[18px] border border-dashed border-line-strong bg-card p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine-ink">
          <ShoppingBag className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">{t("reviews.gate.buyerOnly")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("reviews.gate.buyerOnlyHint")}</p>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-4 rounded-[18px] border border-dashed border-line-strong bg-card p-5">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine-ink">
            <Lock className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{t("reviews.gate.guestTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t("reviews.gate.guestText")}</p>
          </div>
        </div>
        <Link
          href={`/login?next=${encodeURIComponent(`/books/${slug}#reviews`)}`}
          className={buttonVariants({ variant: "ink", size: "md", className: "w-full sm:w-auto sm:self-start" })}
        >
          {t("reviews.gate.login")}
        </Link>
      </div>
    )
  ) : null;

  const heading = (
    <div>
      <p className="mb-1.5 pl-5 text-[11px] font-bold uppercase tracking-[.14em] text-wine-ink">{t("reviews.eyebrow")}</p>
      <SectionHeading
        id="reviews-title"
        aside={count > 0 ? <span className="text-sm font-semibold text-muted">{t("reviews.count", { count })}</span> : undefined}
      >
        {t("reviews.title")}
      </SectionHeading>
    </div>
  );

  // No reviews yet: one inviting card instead of an empty two-column layout
  if (count === 0 && !own) {
    return (
      <section aria-labelledby="reviews-title" className="scroll-mt-28" id="reviews">
        {heading}
        <div className="nk-book-girih nk-book-fade mt-5 grid gap-6 overflow-hidden rounded-[24px] border border-line bg-card-2 p-5 [--nk-book-girih-opacity:.12] sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-center lg:gap-10 lg:p-9">
          <div className="text-center lg:text-left">
            <div className="flex justify-center gap-1.5 lg:justify-start" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="size-6 text-gold" strokeWidth={1.4} />
              ))}
            </div>
            <h3 className="mt-4 text-balance font-serif text-[22px] font-semibold leading-snug text-ink sm:text-[24px]">
              {t("reviews.empty.title")}
            </h3>
            <p className="mx-auto mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2 lg:mx-0">{t("reviews.empty.text")}</p>
            <p className="mx-auto mt-3 max-w-[52ch] text-xs font-medium text-muted lg:mx-0">{t("reviews.empty.note")}</p>
          </div>
          {gate}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="reviews-title" className="scroll-mt-28" id="reviews">
      {heading}

      <div className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
          {count > 0 && (
            <div className="rounded-[18px] border border-line bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="font-serif text-[48px] font-semibold leading-none text-ink">{average.toFixed(1)}</div>
                <div>
                  <RatingStars value={average} size={17} />
                  <div className="mt-1 text-xs font-medium text-muted">{t("reviews.basedOn", { count })}</div>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-2" aria-label={t("reviews.distribution")}>
                {distribution.map((row) => {
                  const pct = count ? Math.round((row.count / count) * 100) : 0;
                  return (
                    <li
                      key={row.stars}
                      className="flex items-center gap-3 text-xs font-semibold text-muted"
                      aria-label={t("reviews.starsRowCount", { stars: row.stars, count: row.count })}
                    >
                      <span className="flex w-6 items-center justify-end gap-0.5 text-ink-2" aria-hidden>
                        {row.stars}
                        <Star className="size-3 fill-gold text-gold" strokeWidth={0} />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-subtle" aria-hidden>
                        <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-7 text-right tabular-nums" aria-hidden>
                        {row.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {gate}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {own && <OwnReview key={`${own.id}-${own.updated_at}`} review={toView(own)} bookId={bookId} />}
          {others.length > 0 && <ReviewList reviews={others.map(toView)} />}
        </div>
      </div>
    </section>
  );
}
