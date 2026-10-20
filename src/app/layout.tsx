import type { Metadata, Viewport } from "next";
import { Lora, Manrope } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { Providers } from "@/components/providers";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const description = t("home.meta.description");
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t("home.meta.title"), template: "%s · Nur Karim" },
    description,
    applicationName: "Nur Karim",
    openGraph: {
      type: "website",
      siteName: "Nur Karim",
      locale: locale === "ru" ? "ru_RU" : "kk_KZ",
      description,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1830" },
    { media: "(prefers-color-scheme: dark)", color: "#081226" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dict } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning className={`${lora.variable} ${manrope.variable}`}>
      <body className="min-h-dvh bg-page font-sans text-ink antialiased">
        <Providers locale={locale} dict={dict}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
