"use client";

// STUB — implemented by the e-books feature.
// Contract: used inside the admin book form. Lets the admin pick a PDF,
// renders every page in the browser to WebP and uploads them to the private
// bucket `ebook-pages` at `${bookId}/v${version}/${page}.webp` (1-based),
// then updates books.ebook_page_count / books.ebook_version.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function EbookUploader(_props: {
  bookId: string;
  ebookVersion: number;
  pageCount: number;
  onUploaded?: (result: { pageCount: number; version: number }) => void;
}) {
  return null;
}
