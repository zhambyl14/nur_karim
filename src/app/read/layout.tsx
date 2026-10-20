import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1830",
};

/**
 * Full-screen reader: no shop chrome. The print rule hides the whole page so
 * the browser's print dialog only produces blank sheets.
 */
export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@media print { html, body { display: none !important; } }`}</style>
      {children}
    </>
  );
}
