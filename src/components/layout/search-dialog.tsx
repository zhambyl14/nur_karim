"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { BookCover } from "@/components/book/book-cover";

type Hit = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  cover_palette: number;
  min_price: number | null;
};

/** Search with instant results (top matches by title / author / tags) */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    const query = value.trim().toLocaleLowerCase("kk");
    const id = ++reqId.current;
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const pattern = `%${query.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      const { data } = await getSupabaseBrowser()
        .from("catalog_books")
        .select("id, slug, title, author, cover_url, cover_palette, min_price")
        .eq("is_published", true)
        .ilike("search_text", pattern)
        .order("sold_count", { ascending: false })
        .limit(6);
      if (id === reqId.current) {
        setHits((data ?? []) as Hit[]);
        setLoading(false);
      }
    }, 220);
  };

  const submit = () => {
    const query = q.trim();
    onClose();
    router.push(query ? `/catalog?q=${encodeURIComponent(query)}` : "/catalog");
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" hideClose closeLabel={t("common.actions.close")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-card-2 p-1.5 pl-4 focus-within:border-primary"
      >
        <Search className="size-[18px] shrink-0 text-faint" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("nav.searchPlaceholder")}
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink placeholder:text-faint focus:outline-none"
          aria-label={t("common.actions.search")}
          enterKeyHint="search"
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl bg-wine px-5 text-sm font-bold text-white hover:bg-wine-hover">
          {t("common.actions.search")}
        </button>
      </form>

      <div className="mt-3 min-h-[60px]">
        {loading && hits.length === 0 && <p className="px-1 py-3 text-sm text-muted">{t("common.states.loading")}</p>}
        {!loading && q.trim().length >= 2 && hits.length === 0 && (
          <p className="px-1 py-3 text-sm text-muted">{t("common.states.notFound")}</p>
        )}
        <ul className="flex flex-col">
          {hits.map((hit) => (
            <li key={hit.id}>
              <Link
                href={`/books/${hit.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-subtle"
              >
                <div className="w-10 shrink-0">
                  <BookCover title={hit.title} coverUrl={hit.cover_url} palette={hit.cover_palette} size="xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">{hit.title}</div>
                  <div className="truncate text-xs text-muted">{hit.author}</div>
                </div>
                {hit.min_price !== null && (
                  <div className="shrink-0 font-serif text-sm font-semibold text-ink">{formatPrice(hit.min_price)}</div>
                )}
              </Link>
            </li>
          ))}
        </ul>
        {hits.length > 0 && (
          <button
            type="button"
            onClick={submit}
            className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-wine-ink hover:bg-wine-soft")}
          >
            {t("common.actions.showAll")} <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </Modal>
  );
}
