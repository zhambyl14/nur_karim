import Link from "next/link";
import { MessageCircle, Package } from "lucide-react";
import { formatDate, formatTime, storeDateKey } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFunction } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book/book-cover";
import { CountBubble } from "@/components/ui/badge";

export type ConversationListItem = {
  id: string;
  href: string;
  title: string;
  /** client name for the admin inbox */
  eyebrow?: string | null;
  preview: string;
  lastFromMe: boolean;
  lastMessageAt: string;
  unread: number;
  kind: "book" | "order" | "general";
  book?: { title: string; author: string; cover_url: string | null; cover_palette: number } | null;
};

export function shortWhen(iso: string, locale: Locale, t: TFunction): string {
  const key = storeDateKey(iso);
  if (key === storeDateKey(new Date())) return formatTime(iso, locale);
  if (key === storeDateKey(new Date(Date.now() - 86_400_000))) return t("common.time.yesterday");
  const sameYear = key.slice(0, 4) === storeDateKey(new Date()).slice(0, 4);
  return formatDate(iso, locale, sameYear ? { year: undefined, month: "short" } : { month: "short" });
}

/** Conversation rows: cover or icon, subject, last message preview, time, unread badge. */
export function ConversationList({
  items,
  locale,
  t,
  youLabel,
}: {
  items: ConversationListItem[];
  locale: Locale;
  t: TFunction;
  youLabel: string;
}) {
  return (
    <ul className="divide-y divide-line-soft overflow-hidden rounded-[18px] border border-line bg-card">
      {items.map((c) => {
        const unread = c.unread > 0;
        return (
          <li key={c.id}>
            <Link
              href={c.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none sm:gap-4 sm:px-5",
                unread && "bg-wine-soft/40",
              )}
            >
              <div className="w-11 shrink-0">
                {c.kind === "book" && c.book ? (
                  <BookCover
                    size="xs"
                    title={c.book.title}
                    author={c.book.author}
                    coverUrl={c.book.cover_url}
                    palette={c.book.cover_palette}
                  />
                ) : (
                  <span className="grid aspect-[3/4] w-full place-items-center rounded-[6px] bg-subtle text-muted">
                    {c.kind === "order" ? <Package className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {c.eyebrow && <p className="truncate text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted">{c.eyebrow}</p>}
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn("truncate text-[14.5px] text-ink", unread ? "font-extrabold" : "font-bold")}>{c.title}</p>
                  <time
                    dateTime={c.lastMessageAt}
                    className={cn("shrink-0 text-xs font-semibold", unread ? "text-wine-ink" : "text-faint")}
                  >
                    {shortWhen(c.lastMessageAt, locale, t)}
                  </time>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3">
                  <p className={cn("line-clamp-1 text-[13px]", unread ? "font-semibold text-ink-2" : "text-muted")}>
                    {c.lastFromMe && <span className="font-semibold text-faint">{youLabel} </span>}
                    {c.preview}
                  </p>
                  <CountBubble count={c.unread} className="shrink-0" />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
