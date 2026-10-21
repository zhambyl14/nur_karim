import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { InstagramIcon, TelegramIcon, WhatsappIcon } from "@/components/brand/social-icons";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { getSettings } from "@/lib/data/common";
import { formatPrice } from "@/lib/format";
import { phoneHref, whatsappHref } from "@/lib/phone";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/layout/controls";

export async function SiteFooter() {
  const [{ t, locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const address = localized(settings, "address", locale);
  const whatsapp = settings.whatsapp_phone || null;

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
  const social = [
    whatsapp && { href: whatsappHref(whatsapp), label: "WhatsApp", Icon: WhatsappIcon },
    settings.telegram_url && { href: settings.telegram_url, label: "Telegram", Icon: TelegramIcon },
    settings.instagram_url && { href: settings.instagram_url, label: "Instagram", Icon: InstagramIcon },
  ].filter((x): x is { href: string; label: string; Icon: typeof WhatsappIcon } => !!x);

  return (
    <footer className="nk-no-print relative overflow-hidden bg-navy text-white/65">
      <div className="nk-girih pointer-events-none absolute inset-x-0 top-0 h-[260px] opacity-[.07] [mask-image:linear-gradient(to_bottom,#000,transparent)]" aria-hidden />

      {/* help band */}
      {whatsapp && (
        <div className="nk-container relative pt-10 md:pt-12">
          <div className="flex flex-col gap-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:px-8">
            <div className="min-w-0">
              <p className="font-serif text-lg font-semibold text-white sm:text-xl">{t("nav.footer.helpTitle")}</p>
              <p className="mt-1 text-[13px] leading-relaxed">{t("nav.footer.helpText")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <a
                href={whatsappHref(whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-wine px-5 text-sm font-bold text-white transition hover:bg-wine-hover sm:flex-none"
              >
                <WhatsappIcon size={18} />
                {t("nav.footer.whatsapp")}
              </a>
              <a
                href={phoneHref(settings.contact_phone)}
                aria-label={settings.contact_phone}
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/20 text-white transition hover:bg-white/10"
              >
                <Phone className="size-[18px]" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="nk-container relative grid grid-cols-2 gap-x-6 gap-y-10 py-10 md:grid-cols-[1.5fr_1fr_1fr_1.3fr] md:py-14">
        <div className="col-span-2 max-w-sm md:col-span-1">
          <Logo tone="light" size="md" />
          <p className="mt-4 text-[13px] leading-relaxed">{t("nav.footer.description")}</p>
          <ul className="mt-5 space-y-2 text-xs font-medium text-white/70">
            <li className="flex items-center gap-2.5">
              <span className="size-1.5 rotate-45 bg-gold" aria-hidden />
              {t("nav.footer.deliveryNote", {
                astana: formatPrice(settings.delivery_astana_price),
                kazpost: formatPrice(settings.delivery_kazpost_price),
              })}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="size-1.5 rotate-45 bg-gold" aria-hidden />
              {t("nav.footer.paymentNote", { bank: settings.payment_bank })}
            </li>
          </ul>
        </div>
        <FooterColumn title={t("nav.footer.shop")} links={shop} />
        <FooterColumn title={t("nav.footer.help")} links={help} />
        <div className="col-span-2 md:col-span-1">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[.16em] text-gold">{t("nav.footer.contacts")}</h3>
          <ul className="space-y-1 text-[13px] font-medium">
            <li>
              <a href={phoneHref(settings.contact_phone)} className="-mx-1 inline-flex min-h-10 items-center gap-2.5 rounded-lg px-1 font-serif text-[17px] font-semibold text-white transition hover:text-gold">
                <Phone className="size-4 text-gold" aria-hidden /> {settings.contact_phone}
              </a>
            </li>
            {address && (
              <li className="flex items-start gap-2.5 py-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /> {address}
              </li>
            )}
          </ul>
          {social.length > 0 && (
            <div className="mt-4">
              <p className="sr-only">{t("nav.footer.social")}</p>
              <ul className="flex gap-2.5">
                {social.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      title={label}
                      className="grid size-11 place-items-center rounded-full border border-white/15 text-white/85 transition hover:border-gold/70 hover:text-gold"
                    >
                      <Icon size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="nk-hairline-gold opacity-25" aria-hidden />
        <div className="nk-container flex flex-col gap-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between md:pb-7">
          <span>{t("nav.footer.rights", { year: new Date().getFullYear() })}</span>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold text-white/80">
              <span className="size-1.5 rotate-45 bg-gold" aria-hidden />
              Nur Karim
            </span>
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
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-gold">{title}</h3>
      <ul className="text-[13px] font-medium">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-9 items-center transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
