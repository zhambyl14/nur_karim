import { Phone } from "lucide-react";
import { TelegramIcon, WhatsappIcon } from "@/components/brand/social-icons";
import { formatPhone, phoneHref, whatsappHref } from "@/lib/phone";
import { getI18n } from "@/lib/i18n/server";
import type { StoreSettings } from "@/types/app";

/** Store contacts shown while the Telegram bot is not connected yet */
export async function StoreContacts({ settings }: { settings: StoreSettings | null }) {
  const { t } = await getI18n();
  if (!settings) return null;

  const items = [
    settings.contact_phone && {
      key: "phone",
      href: phoneHref(settings.contact_phone),
      icon: <Phone className="size-[18px]" aria-hidden />,
      label: t("auth.register.soonPhone"),
      value: formatPhone(settings.contact_phone),
      external: false,
    },
    settings.whatsapp_phone && {
      key: "whatsapp",
      href: whatsappHref(settings.whatsapp_phone),
      icon: <WhatsappIcon size={18} />,
      label: t("auth.register.soonWhatsapp"),
      value: formatPhone(settings.whatsapp_phone),
      external: true,
    },
    settings.telegram_url && {
      key: "telegram",
      href: settings.telegram_url,
      icon: <TelegramIcon size={18} />,
      label: t("auth.register.soonTelegram"),
      value: settings.telegram_url.replace(/^https?:\/\/(www\.)?/, ""),
      external: true,
    },
  ].filter((item): item is Exclude<typeof item, "" | null | undefined> => Boolean(item));

  if (items.length === 0) return null;

  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex items-center gap-3 rounded-[14px] border border-line bg-card-2 px-4 py-3 transition hover:border-line-strong hover:bg-subtle"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine-ink">{item.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">{item.label}</span>
              <span className="block truncate text-sm font-bold text-ink">{item.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
