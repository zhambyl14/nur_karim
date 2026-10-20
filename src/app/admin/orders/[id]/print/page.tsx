import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getSettings } from "@/lib/data/common";
import { formatDate, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminOrder, orderAddress } from "@/components/admin/orders/data";
import { PrintButton } from "@/components/admin/orders/print-button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ t }, { id }] = await Promise.all([getI18n(), params]);
  const order = await getAdminOrder(id);
  return { title: order ? t("admin.orders.print.metaTitle", { number: order.order_number }) : t("admin.orders.title") };
}

/*
 * The slip renders inside the admin shell; in print mode everything except
 * `.nk-slip` is hidden and the colour tokens are forced to light values so a
 * dark-theme screen still prints black on white.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  :root, .dark {
    --nk-page: #fff; --nk-card: #fff; --nk-card-2: #fff; --nk-subtle: #f3f3f3; --nk-chip: #eee;
    --nk-line: #bbb; --nk-line-soft: #ddd; --nk-line-strong: #999;
    --nk-ink: #000; --nk-ink-2: #222; --nk-muted: #444; --nk-faint: #666;
    color-scheme: light;
  }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .nk-slip, .nk-slip * { visibility: visible !important; }
  .nk-slip { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; padding: 0 !important; box-shadow: none !important; }
  .nk-slip-hide { display: none !important; }
}
`;

export default async function OrderPrintPage({ params }: Props) {
  await requireAdmin();
  const [{ t, locale }, { id }, settings] = await Promise.all([getI18n(), params, getSettings()]);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const gift = order.gifts;
  const hidePrice = !!gift?.hide_price;
  const items = order.order_items.filter((i) => i.format === "paper");
  const address = orderAddress(order, locale);
  const recipient = order.recipient_name || gift?.recipient_name || order.contact_name;
  const recipientPhone = order.recipient_phone || gift?.recipient_phone || order.contact_phone;
  const cell = "border-b border-line-soft px-2 py-2 align-top";

  return (
    <div className="mx-auto max-w-[820px]">
      <style>{PRINT_CSS}</style>
      <div className="nk-slip-hide">
        <AdminPageHeader
          backHref={`/admin/orders/${order.id}`}
          backLabel={t("admin.orders.detail.title", { number: order.order_number })}
          title={t("admin.orders.print.title")}
          actions={<PrintButton label={t("admin.orders.print.print")} />}
        />
      </div>

      <article className="nk-slip rounded-[18px] border border-line bg-card p-6 text-ink sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <div className="text-[11px] font-bold tracking-[.24em] text-muted">NUR KARIM</div>
            <h1 className="mt-1 font-serif text-2xl font-semibold">{t("admin.orders.print.order", { number: order.order_number })}</h1>
          </div>
          <div className="text-right text-[13px]">
            <div>
              <span className="text-muted">{t("admin.orders.print.date")}: </span>
              <span className="font-semibold">{formatDate(order.created_at, locale)}</span>
            </div>
            <div>
              <span className="text-muted">{t("admin.orders.print.delivery")}: </span>
              <span className="font-semibold">{t(`status.delivery.${order.delivery_method}`)}</span>
            </div>
            {order.tracking_number && (
              <div>
                <span className="text-muted">{t("admin.orders.print.tracking")}: </span>
                <span className="font-mono font-semibold">{order.tracking_number}</span>
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-6 py-5 sm:grid-cols-2">
          <div>
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{t("admin.orders.print.from")}</h2>
            <p className="text-sm font-semibold">{settings.store_name}</p>
            <p className="text-sm">{settings.contact_phone}</p>
            {(locale === "ru" ? settings.address_ru : settings.address_kk) && (
              <p className="text-sm">{locale === "ru" ? settings.address_ru : settings.address_kk}</p>
            )}
          </div>
          <div>
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{t("admin.orders.print.to")}</h2>
            <p className="text-base font-bold">{recipient}</p>
            <p className="text-sm">
              {t("admin.orders.print.phone")}: <span className="font-semibold">{formatPhone(recipientPhone)}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {t("admin.orders.print.address")}: <span className="font-semibold">{address || "—"}</span>
            </p>
            {order.delivery_comment && <p className="mt-1 text-[13px] text-ink-2">{order.delivery_comment}</p>}
          </div>
        </section>

        {gift && (
          <p className="mb-4 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold">
            {t("admin.orders.print.giftFor", { name: gift.recipient_name })}
            {hidePrice && <> · {t("admin.orders.print.giftNote")}</>}
            {order.gift_wrap && <> · {t("admin.orders.print.giftWrap")}</>}
          </p>
        )}

        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{t("admin.orders.print.items")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink text-xs text-muted">
                <th scope="col" className="px-2 py-2">№</th>
                <th scope="col" className="px-2 py-2">{t("admin.orders.print.book")}</th>
                <th scope="col" className="px-2 py-2 text-center">{t("admin.orders.print.qty")}</th>
                {!hidePrice && <th scope="col" className="px-2 py-2 text-right">{t("admin.orders.print.price")}</th>}
                {!hidePrice && <th scope="col" className="px-2 py-2 text-right">{t("admin.orders.print.sum")}</th>}
                <th scope="col" className="w-10 px-2 py-2 text-center">✓</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className={cell}>{i + 1}</td>
                  <td className={cell}>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs text-muted">{item.author}</div>
                  </td>
                  <td className={`${cell} text-center font-bold`}>{item.quantity}</td>
                  {!hidePrice && <td className={`${cell} text-right`}>{formatPrice(item.unit_final_price)}</td>}
                  {!hidePrice && <td className={`${cell} text-right font-semibold`}>{formatPrice(item.line_total)}</td>}
                  <td className={`${cell} text-center`}>
                    <span className="inline-block size-4 rounded-[3px] border border-ink" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
            {!hidePrice && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-2 pt-3 text-right font-bold">{t("admin.orders.print.total")}</td>
                  <td className="px-2 pt-3 text-right font-serif text-base font-semibold">{formatPrice(order.total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {order.customer_note && (
          <p className="mt-5 text-[13px]">
            <span className="font-bold">{t("admin.orders.print.note")}: </span>
            {order.customer_note}
          </p>
        )}

        <footer className="mt-10 grid grid-cols-2 gap-8 text-[13px]">
          <div className="border-t border-ink pt-1.5 text-muted">{t("admin.orders.print.packed")}</div>
          <div className="border-t border-ink pt-1.5 text-muted">{t("admin.orders.print.checked")}</div>
          <p className="col-span-2 text-center font-serif text-sm italic text-ink-2">{t("admin.orders.print.thanks")}</p>
        </footer>
      </article>
    </div>
  );
}
