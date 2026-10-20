import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, MessagesSquare, Phone } from "lucide-react";
import { getSettings } from "@/lib/data/common";
import { getI18n } from "@/lib/i18n/server";
import { localized } from "@/lib/i18n/translate";
import { formatPhone, phoneHref, whatsappHref } from "@/lib/phone";
import { InstagramIcon, TelegramIcon, WhatsappIcon } from "@/components/brand/social-icons";
import { buttonVariants } from "@/components/ui/button";
import { IconBadge, InfoCard, InfoLayout } from "@/components/home/info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("info.contacts.meta.title"),
    description: t("info.contacts.meta.description"),
    alternates: { canonical: "/contacts" },
  };
}

type ContactItem = {
  key: string;
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
  action: string;
  external: boolean;
};

/** "https://www.instagram.com/nurkarim.kz/" -> "@nurkarim.kz" */
function handleFromUrl(url: string): string {
  const path = url.replace(/^https?:\/\/(www\.)?[^/]+\/?/, "").replace(/\/+$/, "");
  return path ? `@${path.replace(/^@/, "")}` : url.replace(/^https?:\/\/(www\.)?/, "");
}

export default async function ContactsPage() {
  const [{ t, locale }, settings] = await Promise.all([getI18n(), getSettings()]);
  const address = localized(settings, "address", locale).trim() || t("info.contacts.city");

  const items: ContactItem[] = [];
  if (settings.contact_phone && phoneHref(settings.contact_phone)) {
    items.push({
      key: "phone",
      icon: <Phone className="size-5" aria-hidden />,
      label: t("info.contacts.phone"),
      value: formatPhone(settings.contact_phone),
      href: phoneHref(settings.contact_phone),
      action: t("info.contacts.call"),
      external: false,
    });
  }
  if (settings.whatsapp_phone && whatsappHref(settings.whatsapp_phone)) {
    items.push({
      key: "whatsapp",
      icon: <WhatsappIcon size={20} />,
      label: t("info.contacts.whatsapp"),
      value: formatPhone(settings.whatsapp_phone),
      href: whatsappHref(settings.whatsapp_phone),
      action: t("info.contacts.whatsappAction"),
      external: true,
    });
  }
  if (settings.telegram_url) {
    items.push({
      key: "telegram",
      icon: <TelegramIcon size={20} />,
      label: t("info.contacts.telegram"),
      value: handleFromUrl(settings.telegram_url),
      href: settings.telegram_url,
      action: t("info.contacts.telegramAction"),
      external: true,
    });
  }
  if (settings.instagram_url) {
    items.push({
      key: "instagram",
      icon: <InstagramIcon size={20} />,
      label: t("info.contacts.instagram"),
      value: handleFromUrl(settings.instagram_url),
      href: settings.instagram_url,
      action: t("info.contacts.instagramAction"),
      external: true,
    });
  }
  if (settings.contact_email) {
    items.push({
      key: "email",
      icon: <Mail className="size-5" aria-hidden />,
      label: t("info.contacts.email"),
      value: settings.contact_email,
      href: `mailto:${settings.contact_email}`,
      action: t("info.contacts.emailAction"),
      external: false,
    });
  }

  return (
    <InfoLayout t={t} current="contacts" title={t("info.contacts.title")} lead={t("info.contacts.lead")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-full flex-col rounded-[18px] border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <IconBadge>{item.icon}</IconBadge>
                <ArrowUpRight className="size-5 text-faint transition group-hover:text-wine-ink" aria-hidden />
              </div>
              <span className="mt-4 text-[12px] font-bold uppercase tracking-[.14em] text-muted">{item.label}</span>
              <span className="mt-1 break-all font-serif text-[20px] font-semibold text-ink">{item.value}</span>
              <span className="mt-auto pt-4 text-[13px] font-bold text-wine-ink">{item.action}</span>
            </a>
          </li>
        ))}
        <li>
          <div className="flex h-full flex-col rounded-[18px] border border-line bg-card p-5 sm:p-6">
            <IconBadge>
              <MapPin className="size-5" aria-hidden />
            </IconBadge>
            <span className="mt-4 text-[12px] font-bold uppercase tracking-[.14em] text-muted">{t("info.contacts.address")}</span>
            <span className="mt-1 font-serif text-[20px] font-semibold text-ink">{address}</span>
          </div>
        </li>
      </ul>

      <InfoCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <IconBadge>
            <MessagesSquare className="size-5" aria-hidden />
          </IconBadge>
          <div>
            <h2 className="text-[16px] font-bold text-ink">{t("info.contacts.chat.title")}</h2>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{t("info.contacts.chat.text")}</p>
          </div>
        </div>
        <Link href="/account/messages" className={buttonVariants({ variant: "ink", className: "shrink-0" })}>
          {t("info.contacts.chat.action")}
        </Link>
      </InfoCard>
    </InfoLayout>
  );
}
