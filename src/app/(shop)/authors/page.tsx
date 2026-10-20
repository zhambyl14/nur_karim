import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { AuthorsDirectory } from "@/components/catalog/authors-directory";
import type { AuthorEntry } from "@/components/catalog/authors";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("authors.meta.title"),
    description: t("authors.meta.description"),
    alternates: { canonical: "/authors" },
  };
}

export default async function AuthorsPage() {
  const { t } = await getI18n();
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("list_authors");
  if (error) {
    console.error("list_authors failed", error);
    throw new Error("AUTHORS_LOAD_FAILED");
  }
  const authors: AuthorEntry[] = (data ?? [])
    .filter((row) => row.author?.trim())
    .map((row) => ({ name: row.author.trim(), count: Number(row.books_count) || 0 }));

  return (
    <div className="nk-container py-6 sm:py-8 lg:py-10">
      <SectionTitle
        as="h1"
        title={t("authors.title")}
        meta={authors.length > 0 ? t("authors.count", { count: authors.length }) : undefined}
      />
      <div className="mt-5">
        {authors.length === 0 ? (
          <div className="rounded-[18px] border border-line bg-card">
            <EmptyState
              icon={<Users className="size-6" aria-hidden />}
              title={t("authors.empty.title")}
              description={t("authors.empty.text")}
              action={
                <Link href="/catalog" className={buttonVariants({ variant: "ink" })}>
                  {t("authors.toCatalog")}
                </Link>
              }
            />
          </div>
        ) : (
          <AuthorsDirectory authors={authors} />
        )}
      </div>
    </div>
  );
}
