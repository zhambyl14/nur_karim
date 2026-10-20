import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { z } from "zod";
import { getI18n } from "@/lib/i18n/server";
import { getReaderPageData, previewAvailable } from "@/lib/reader";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ReaderView } from "@/components/reader/reader-view";

type Props = {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const idSchema = z.uuid();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId } = await params;
  const { t } = await getI18n();
  if (!idSchema.safeParse(bookId).success) return { title: t("reader.metaTitle", { title: "" }) };
  const data = await getReaderPageData(bookId);
  return {
    title: t("reader.metaTitle", { title: data?.book.title ?? "" }),
    robots: { index: false, follow: false },
  };
}

export default async function ReadPage({ params, searchParams }: Props) {
  const { bookId } = await params;
  const query = await searchParams;
  if (!idSchema.safeParse(bookId).success) notFound();

  const data = await getReaderPageData(bookId);
  if (!data) notFound();
  const { book, profile, fullAccess, isOwner, savedPage, maxDevices } = data;

  const canPreview = previewAvailable(book);
  if (!fullAccess && !canPreview) {
    if (!profile) redirect(`/login?next=${encodeURIComponent(`/read/${book.id}`)}`);
    redirect(`/books/${book.slug}`);
  }

  const { t } = await getI18n();
  const backHref = isOwner ? "/account/library" : `/books/${book.slug}`;

  if (book.pageCount === 0) {
    return (
      <main className="grid min-h-dvh place-items-center bg-page px-4">
        <div className="w-full max-w-md rounded-[22px] border border-line bg-card">
          <EmptyState
            icon={<BookOpen className="size-6" aria-hidden />}
            title={t("reader.notReady.title")}
            description={t("reader.notReady.text")}
            action={
              <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
                <ArrowLeft className="size-4" aria-hidden />
                {isOwner ? t("reader.backToLibrary") : t("reader.backToBook")}
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const requested = Number.parseInt(typeof query.page === "string" ? query.page : "", 10);
  const mode = fullAccess ? "full" : "preview";
  const maxStart = mode === "full" ? book.pageCount : book.previewPages;
  const start = Number.isFinite(requested) && requested >= 1 ? requested : (savedPage ?? 1);
  const initialPage = Math.min(Math.max(1, start), Math.max(1, maxStart));

  return (
    <ReaderView
      bookId={book.id}
      slug={book.slug}
      title={book.title}
      author={book.author}
      pageCount={book.pageCount}
      previewPages={book.previewPages}
      mode={mode}
      canSaveProgress={isOwner}
      initialPage={initialPage}
      backHref={backHref}
      backLabel={isOwner ? t("reader.backToLibrary") : t("reader.backToBook")}
      isSignedIn={profile !== null}
      maxDevices={maxDevices}
    />
  );
}
