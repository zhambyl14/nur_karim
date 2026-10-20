import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { InstagramIcon, TelegramIcon, WhatsappIcon } from "@/components/brand/social-icons";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { getSettings } from "@/lib/data/common";
import { phoneHref, whatsappHref } from "@/lib/phone";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/layout/controls";

export async function SiteFooter() {
  const [{ t, locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const address = localized(settings, "address", locale);

  const shop = [
    { href: "/catalog", label: t("nav.catalog") },
    { href: "/catalog?sort=new", label: t("nav.newBooks") },
    { href: "/catalog?format=ebook", label: t("nav.ebooks") },
    { href: "/authors", label: t("nav.authors") },
    { href: "/gifts", label: t("nav.footer.gifts") },
  ];
  const help = [
    { href: "/delivery", label: t("nav.footer.delivery") },
    { href: "/payment", label: t("nav.footer.payment") },
    { href: "/contacts", label: t("nav.footer.contacts") },
    { href: "/about", label: t("nav.footer.about") },
  ];

  return (
    <footer className="nk-no-print bg-navy text-white/60">
      <div className="nk-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-14">
        <div className="max-w-sm">
          <Logo tone="light" size="md" />
          <p className="mt-4 text-[13px] leading-relaxed">{t("nav.footer.description")}</p>
        </div>
        <FooterColumn title={t("nav.footer.shop")} links={shop} />
        <FooterColumn title={t("nav.footer.help")} links={help} />
        <div>
          <h3 className="mb-4 text-[11px] font-bold tracking-[.14em] text-gold">{t("nav.footer.contacts").toUpperCase()}</h3>
          <ul className="space-y-3 text-[13px] font-medium">
            <li>
              <a href={phoneHref(settings.contact_phone)} className="inline-flex items-center gap-2.5 transition hover:text-white">
                <Phone className="size-4" /> {settings.contact_phone}
              </a>
            </li>
            {settings.whatsapp_phone && (
              <li>
                <a href={whatsappHref(settings.whatsapp_phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 transition hover:text-white">
                  <WhatsappIcon size={16} /> WhatsApp
                </a>
              </li>
            )}
            {settings.telegram_url && (
              <li>
                <a href={settings.telegram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 transition hover:text-white">
                  <TelegramIcon size={16} /> Telegram
                </a>
              </li>
            )}
            {settings.instagram_url && (
              <li>
                <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 transition hover:text-white">
                  <InstagramIcon size={16} /> Instagram
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {address}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.08]">
        <div className="nk-container flex flex-col gap-2 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between md:pb-6">
          <span>{t("nav.footer.rights", { year: new Date().getFullYear() })}</span>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-white/80">Nur Karim</span>
            <LocaleSwitch className="sm:hidden" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-[11px] font-bold tracking-[.14em] text-gold">{title.toUpperCase()}</h3>
      <ul className="space-y-3 text-[13px] font-medium">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
