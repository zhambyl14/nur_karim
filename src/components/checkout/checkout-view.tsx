"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, BookOpen, Gift, Loader2, RefreshCw, ShoppingBag, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/store";
import { useI18n } from "@/lib/i18n/client";
import { formatPrice } from "@/lib/format";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/book/book-cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, RadioCard, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/interactive";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { PromoField } from "@/components/cart/promo-field";
import { usePromoCode } from "@/components/cart/promo-store";
import { useQuote } from "@/components/cart/use-quote";
import { useCartReady } from "@/components/cart/use-cart-ready";
import { placeOrder } from "@/app/(shop)/checkout/actions";
import type { Quote, QuoteError } from "@/types/app";
import {
  AddressFields,
  EMPTY_ADDRESS,
  addressPayload,
  draftFromSaved,
  validateAddress,
  type AddressDraft,
  type ShipMethod,
} from "./address-fields";
import { EMPTY_GIFT, GiftPanel, revealIso, validateGift, type GiftDraft } from "./gift-panel";

type Mode = "self" | "gift";

type CheckoutProfile = { name: string; phone: string; savedAddress: unknown };

export function CheckoutView(props: { initialMode: Mode; giftEnabled: boolean; profile: CheckoutProfile }) {
  const ready = useCartReady();
  if (!ready) return <CheckoutSkeleton />;
  return <CheckoutForm {...props} />;
}

function CheckoutForm({
  initialMode,
  giftEnabled,
  profile,
}: {
  initialMode: Mode;
  giftEnabled: boolean;
  profile: CheckoutProfile;
}) {
  const { t, te } = useI18n();
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const promoCode = usePromoCode((s) => s.code);
  const setPromo = usePromoCode((s) => s.setCode);
  const clearPromo = usePromoCode((s) => s.clear);

  const saved = useMemo(() => draftFromSaved(profile.savedAddress), [profile.savedAddress]);
  const [mountedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<Mode>(initialMode);
  const [contact, setContact] = useState({ name: profile.name, phone: profile.phone });
  const [method, setMethod] = useState<ShipMethod | null>(saved.method);
  // recipient defaults to the account holder until a saved address says otherwise
  const [address, setAddress] = useState<AddressDraft>(() => ({
    ...EMPTY_ADDRESS,
    ...saved.draft,
    recipientName: saved.draft.recipientName || profile.name,
    recipientPhone: saved.draft.recipientPhone || profile.phone,
  }));
  const [giftAddress, setGiftAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [gift, setGift] = useState<GiftDraft>(EMPTY_GIFT);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<{ code: string; errors?: QuoteError[] } | null>(null);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();

  const isGift = giftEnabled && mode === "gift";
  const hasPaper = lines.some((l) => l.format === "paper");
  const friendFills = isGift && hasPaper && gift.addressMode === "recipient";

  const { quote, loading, error: quoteError, initial, retry, replace } = useQuote({
    lines,
    promoCode,
    deliveryMethod: hasPaper ? method : null,
    isGift,
    giftWrap: isGift && gift.wrap,
  });

  // ---- validation (shown after the first submit attempt)
  const activeAddress = isGift ? giftAddress : address;
  const contactErrors = {
    name: !contact.name.trim(),
    phone: !isValidPhone(contact.phone),
  };
  const addressErrors =
    hasPaper && method
      ? validateAddress(method, activeAddress, { regionOnly: friendFills, recipient: !isGift })
      : {};
  const giftErrors = isGift ? validateGift(gift, mountedAt) : {};
  const methodMissing = hasPaper && !method;
  const formInvalid =
    contactErrors.name ||
    contactErrors.phone ||
    methodMissing ||
    Object.keys(addressErrors).length > 0 ||
    Object.keys(giftErrors).length > 0;
  const show = <T,>(v: T): T | undefined => (submitted ? v : undefined);

  if (placed) {
    return (
      <div className="nk-container grid min-h-[50vh] place-items-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-wine-ink" aria-hidden />
          <p className="text-sm font-semibold text-muted" role="status">
            {t("checkout.redirecting")}
          </p>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="nk-container py-5 sm:py-8 lg:py-10">
        <h1 className="font-serif text-[30px] font-semibold text-ink sm:text-[34px]">{t("checkout.title")}</h1>
        <div className="mt-5 rounded-[22px] border border-line bg-card">
          <EmptyState
            icon={<ShoppingBag className="size-6" />}
            title={t("checkout.emptyTitle")}
            description={t("checkout.emptyText")}
            action={
              <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                {t("checkout.emptyAction")}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const lineIssues = quote?.errors ?? [];
  const priceChanged = serverError?.code === "PRICE_CHANGED";
  // an applied but rejected promo code would make create_order fail: ask to remove it first
  const promoBad = !!promoCode && quote?.promo?.valid === false;
  const canSubmit =
    !!quote && !loading && !pending && quote.lines.length > 0 && lineIssues.length === 0 && !promoBad;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (formInvalid) {
      toast.error(t("checkout.errors.form"));
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("#checkout-form [aria-invalid=true], #checkout-form [data-invalid=true]")?.focus();
      });
      return;
    }
    if (!quote || !canSubmit) return;
    const ordered = quote.lines.map((l) => ({ bookId: l.book_id, format: l.format }));
    const items = lines.map((l) => ({ book_id: l.bookId, format: l.format, quantity: l.quantity }));
    const addr: Record<string, string> = hasPaper && method ? addressPayload(method, activeAddress, friendFills) : {};
    if (isGift && !friendFills && hasPaper) {
      // the recipient of the parcel is the friend unless the sender typed someone else
      const a = addr as Record<string, string>;
      if (!a.recipient_name) a.recipient_name = gift.name.trim();
      if (!a.recipient_phone) a.recipient_phone = normalizePhone(gift.phone) ?? "";
    }
    setServerError(null);
    startTransition(async () => {
      const res = await placeOrder({
        items,
        promo_code: promoCode,
        delivery_method: hasPaper ? method : null,
        contact: { name: contact.name.trim(), phone: normalizePhone(contact.phone) ?? "" },
        address: addr,
        customer_note: note.trim(),
        expected_total: quote.total,
        gift: isGift
          ? {
              recipient_name: gift.name.trim(),
              recipient_phone: normalizePhone(gift.phone) ?? "",
              message: gift.message.trim(),
              card_theme: gift.theme,
              is_anonymous: gift.anonymous,
              reveal_at: revealIso(gift),
              hide_price: gift.hidePrice,
              gift_wrap: hasPaper && gift.wrap,
              address_mode: hasPaper ? gift.addressMode : "sender",
            }
          : null,
      }).catch(() => ({ ok: false as const, error: "network", errors: undefined, quote: undefined }));

      if (res.ok) {
        setPlaced(true);
        useCart.getState().removeMany(ordered);
        clearPromo();
        toast.success(t("checkout.success"));
        router.push(`/orders/${res.orderNumber}?new=1`);
        return;
      }
      if (res.quote) replace(res.quote as Quote);
      setServerError({ code: res.error, errors: res.errors });
      if (res.error !== "PRICE_CHANGED") toast.error(te(res.error));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <form id="checkout-form" noValidate onSubmit={submit} className="nk-container py-5 sm:py-8 lg:py-10">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("checkout.backToCart")}
      </Link>
      <h1 className="mt-2 font-serif text-[28px] font-semibold tracking-[-0.01em] text-ink sm:text-[34px]">
        {t("checkout.title")}
      </h1>

      {serverError && <ServerErrorBanner code={serverError.code} quote={quote} />}

      <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          {giftEnabled && (
            <Section icon={<Gift className="size-4" />} title={t("checkout.mode.label")}>
              <Segmented<Mode>
                ariaLabel={t("checkout.mode.label")}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setServerError(null);
                }}
                options={[
                  { value: "self", label: t("checkout.mode.self"), sublabel: t("checkout.mode.selfHint") },
                  { value: "gift", label: `🎁 ${t("checkout.mode.gift")}`, sublabel: t("checkout.mode.giftHint") },
                ]}
              />
              {isGift && (
                <p className="mt-2.5 text-xs text-muted">
                  {t("checkout.mode.giftAllCart")}{" "}
                  <Link href="/cart" className="font-bold text-wine-ink hover:underline">
                    {t("checkout.mode.editCart")}
                  </Link>
                </p>
              )}
            </Section>
          )}

          <Section icon={<User className="size-4" />} title={t("checkout.steps.contact")} step={1}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("checkout.contact.name")}
                htmlFor="co-name"
                required
                error={show(contactErrors.name) ? t("checkout.contact.errors.name") : undefined}
              >
                <Input
                  id="co-name"
                  value={contact.name}
                  autoComplete="name"
                  maxLength={120}
                  invalid={show(contactErrors.name)}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                />
              </Field>
              <Field
                label={t("checkout.contact.phone")}
                htmlFor="co-phone"
                required
                error={show(contactErrors.phone) ? t("checkout.contact.errors.phone") : undefined}
              >
                <PhoneInput
                  id="co-phone"
                  value={contact.phone}
                  invalid={show(contactErrors.phone)}
                  onChange={(phone) => setContact((c) => ({ ...c, phone }))}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-faint">{t("checkout.contact.hint")}</p>
          </Section>

          {isGift && (
            <Section icon={<Gift className="size-4" />} title={t("checkout.steps.gift")} step={2} accent>
              <GiftPanel
                value={gift}
                onChange={(patch) => setGift((g) => ({ ...g, ...patch }))}
                errors={submitted ? giftErrors : {}}
                senderName={contact.name.trim()}
                hasPaper={hasPaper}
                wrapAvailable={quote?.gift_wrap_available ?? false}
                wrapPrice={quote?.gift_wrap_unit_price ?? 0}
              />
            </Section>
          )}

          <Section icon={<Truck className="size-4" />} title={t("checkout.steps.delivery")} step={isGift ? 3 : 2}>
            {hasPaper ? (
              <div className="grid gap-4">
                {friendFills && (
                  <p className="rounded-xl bg-wine-soft px-3.5 py-2.5 text-[13px] font-medium text-wine-ink">
                    {t("checkout.gift.friendDeliveryNote")}
                  </p>
                )}
                <div
                  role="radiogroup"
                  aria-label={t("checkout.delivery.choose")}
                  data-invalid={show(methodMissing) || undefined}
                  tabIndex={show(methodMissing) ? -1 : undefined}
                  className="grid gap-2.5 sm:grid-cols-2"
                >
                  <RadioCard
                    name="delivery"
                    value="astana_courier"
                    checked={method === "astana_courier"}
                    onChange={() => setMethod("astana_courier")}
                    title={t("checkout.delivery.astana")}
                    description={t("checkout.delivery.astanaHint")}
                    aside={<DeliveryPrice quote={quote} method="astana_courier" />}
                  />
                  <RadioCard
                    name="delivery"
                    value="kazpost"
                    checked={method === "kazpost"}
                    onChange={() => setMethod("kazpost")}
                    title={t("checkout.delivery.kazpost")}
                    description={t("checkout.delivery.kazpostHint")}
                    aside={<DeliveryPrice quote={quote} method="kazpost" />}
                  />
                </div>
                {show(methodMissing) && (
                  <p role="alert" className="-mt-2 text-xs font-semibold text-danger">
                    {t("checkout.delivery.choose")}
                  </p>
                )}
                {quote?.delivery_prices.free_threshold != null && (
                  <p className="-mt-1 text-xs font-semibold text-success">
                    {t("checkout.delivery.freeFrom", { amount: formatPrice(quote.delivery_prices.free_threshold) })}
                  </p>
                )}
                {method && (
                  <div className="animate-fade-in">
                    {!isGift && saved.method === method && (
                      <p className="mb-3 text-xs font-semibold text-info">{t("checkout.delivery.savedAddress")}</p>
                    )}
                    {isGift && !friendFills && (
                      <p className="mb-3 text-xs text-muted">{t("checkout.gift.recipientIsFriend")}</p>
                    )}
                    <AddressFields
                      key={`${isGift ? "gift" : "self"}-${method}`}
                      method={method}
                      value={activeAddress}
                      onChange={(patch) =>
                        (isGift ? setGiftAddress : setAddress)((a) => ({ ...a, ...patch }))
                      }
                      errors={submitted ? addressErrors : {}}
                      regionOnly={friendFills}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl bg-success-soft px-4 py-3.5">
                <BookOpen className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                <div>
                  <div className="text-sm font-bold text-success">{t("checkout.delivery.digitalTitle")}</div>
                  <p className="mt-0.5 text-[13px] text-success/90">
                    {isGift ? t("checkout.delivery.digitalGiftText") : t("checkout.delivery.digitalText")}
                  </p>
                </div>
              </div>
            )}
          </Section>

          <Section title={t("checkout.steps.extra")} step={isGift ? 4 : 3}>
            <div className="grid gap-4">
              <PromoField
                code={promoCode}
                promo={quote?.promo}
                checking={loading}
                onApply={setPromo}
                onRemove={clearPromo}
              />
              <Field label={t("checkout.extra.note")} htmlFor="co-note">
                <Textarea
                  id="co-note"
                  rows={2}
                  maxLength={500}
                  value={note}
                  className="min-h-20"
                  placeholder={t("checkout.extra.notePlaceholder")}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
          </Section>
        </div>

        <OrderSummary
          quote={quote}
          loading={loading || initial}
          error={quoteError}
          onRetry={retry}
          isGift={isGift}
          hasPaper={hasPaper}
          methodChosen={!!method}
          canSubmit={canSubmit}
          pending={pending}
          priceChanged={priceChanged}
          lineIssues={lineIssues.length > 0}
          promoBad={promoBad}
        />
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  step,
  accent,
  children,
}: {
  icon?: ReactNode;
  title: string;
  step?: number;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] border bg-card p-4 sm:p-5",
        accent ? "border-wine-line shadow-[0_10px_30px_rgb(125_26_53/0.08)]" : "border-line",
      )}
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-bold text-ink">
        {step !== undefined ? (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-on-primary">
            {step}
          </span>
        ) : (
          icon && (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wine-soft text-wine-ink" aria-hidden>
              {icon}
            </span>
          )
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function DeliveryPrice({ quote, method }: { quote: Quote | null; method: ShipMethod }) {
  const { t } = useI18n();
  if (!quote) return <Skeleton className="h-5 w-14" />;
  const price =
    quote.delivery_method === method ? quote.delivery_price : quote.delivery_prices[method];
  return <span>{price === 0 ? t("checkout.delivery.free") : formatPrice(price)}</span>;
}

function ServerErrorBanner({ code, quote }: { code: string; quote: Quote | null }) {
  const { t, te } = useI18n();
  const stock = code === "OUT_OF_STOCK" || code === "BOOK_NOT_FOUND" || code === "FORMAT_UNAVAILABLE" || code === "ALREADY_OWNED";
  const shortage = code === "OUT_OF_STOCK";
  const price = code === "PRICE_CHANGED";
  return (
    <div
      role="alert"
      className={cn(
        "mt-4 flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3.5",
        price ? "border-warning/30 bg-warning-soft" : "border-danger/30 bg-danger-soft",
      )}
    >
      <AlertTriangle className={cn("mt-0.5 size-5 shrink-0", price ? "text-warning" : "text-danger")} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-bold", price ? "text-warning" : "text-danger")}>{t("checkout.errors.title")}</div>
        <p className={cn("mt-0.5 text-[13px] leading-relaxed", price ? "text-warning/90" : "text-danger/90")}>
          {price && quote
            ? t("checkout.errors.priceChanged", { total: formatPrice(quote.total) })
            : shortage
              ? `${te(code)} ${t("checkout.errors.outOfStock")}`
              : te(code)}
        </p>
      </div>
      {stock && (
        <Link href="/cart" className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("checkout.errors.fixCart")}
        </Link>
      )}
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px] font-medium text-white/65">
      <span>{label}</span>
      <span className={cn("text-right font-semibold", accent ? "text-gold" : "text-white/85")}>{value}</span>
    </div>
  );
}

function OrderSummary({
  quote,
  loading,
  error,
  onRetry,
  isGift,
  hasPaper,
  methodChosen,
  canSubmit,
  pending,
  priceChanged,
  lineIssues,
  promoBad,
}: {
  quote: Quote | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  isGift: boolean;
  hasPaper: boolean;
  methodChosen: boolean;
  canSubmit: boolean;
  pending: boolean;
  priceChanged: boolean;
  lineIssues: boolean;
  promoBad: boolean;
}) {
  const { t } = useI18n();
  const copies = quote?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;

  return (
    <aside className="mt-6 max-lg:contents lg:sticky lg:top-[100px] lg:mt-0" aria-label={t("checkout.summary.title")}>
      <div className="mt-6 rounded-t-[28px] bg-navy px-5 pb-2 pt-5 text-white sm:px-6 lg:mt-0 lg:rounded-t-[22px] lg:pt-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-gold">{t("checkout.summary.title")}</h2>
        {error && !quote ? (
          <div className="pb-3" role="alert">
            <div className="text-sm font-bold">{t("checkout.errors.quote")}</div>
            <Button variant="glass" size="sm" className="mt-3" onClick={onRetry} leftIcon={<RefreshCw className="size-4" />}>
              {t("cart.error.retry")}
            </Button>
          </div>
        ) : !quote ? (
          <div className="space-y-3 pb-3" aria-hidden>
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <div className={cn("transition-opacity", loading && "opacity-60")}>
            <ul className="mb-4 flex max-h-[260px] flex-col gap-2.5 overflow-y-auto pr-1">
              {quote.lines.map((l) => (
                <li key={`${l.book_id}:${l.format}`} className="flex items-center gap-3">
                  <div className="w-10 shrink-0">
                    <BookCover title={l.title} coverUrl={l.cover_url} palette={l.cover_palette} size="xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{l.title}</div>
                    <div className="text-[11.5px] text-white/55">
                      {t(l.format === "paper" ? "common.format.paperBook" : "common.format.ebookBook")}
                      {l.quantity > 1 && ` · ${t("cart.copies", { count: l.quantity })}`}
                    </div>
                  </div>
                  <div className="shrink-0 font-serif text-[14px] font-semibold">{formatPrice(l.line_total)}</div>
                </li>
              ))}
            </ul>
            <div className="h-px bg-white/12" />
            <div className="mt-3.5 space-y-2.5">
              <SummaryRow
                label={`${t("checkout.summary.books")} · ${copies}`}
                value={formatPrice(quote.items_subtotal)}
              />
              {quote.promotion_discount > 0 && (
                <SummaryRow label={t("checkout.summary.discount")} value={`−${formatPrice(quote.promotion_discount)}`} accent />
              )}
              {quote.promo_discount > 0 && (
                <SummaryRow label={t("checkout.summary.promo")} value={`−${formatPrice(quote.promo_discount)}`} accent />
              )}
              {hasPaper && (
                <SummaryRow
                  label={t("checkout.summary.delivery")}
                  value={
                    !methodChosen
                      ? t("checkout.summary.deliveryChoose")
                      : quote.delivery_price === 0
                        ? t("checkout.delivery.free")
                        : formatPrice(quote.delivery_price)
                  }
                  accent={methodChosen && quote.delivery_price === 0}
                />
              )}
              {isGift && quote.gift_wrap_price > 0 && (
                <SummaryRow label={t("checkout.summary.wrap")} value={formatPrice(quote.gift_wrap_price)} />
              )}
            </div>
          </div>
        )}
        <div className="mt-4 h-px bg-white/12" />
      </div>

      <div className="sticky bottom-[72px] z-10 rounded-b-[24px] rounded-t-[22px] bg-navy px-5 pb-5 pt-3 text-white shadow-[0_-14px_30px_rgb(0_0_0/0.18)] sm:px-6 md:bottom-0 lg:static lg:rounded-t-none lg:rounded-b-[22px] lg:pb-6 lg:shadow-none">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{t("checkout.summary.total")}</span>
          {quote ? (
            <span
              className={cn(
                "font-serif text-[26px] font-semibold transition-opacity",
                loading && "opacity-60",
                priceChanged && "text-gold",
              )}
              aria-live="polite"
            >
              {formatPrice(quote.total)}
            </span>
          ) : (
            <Skeleton className="inline-block h-7 w-28 bg-white/10" />
          )}
        </div>
        {lineIssues && (
          <p className="mt-2 text-xs font-semibold text-gold">
            {t("cart.summary.fixFirst")}{" "}
            <Link href="/cart" className="underline underline-offset-2 hover:text-white">
              {t("checkout.errors.fixCart")}
            </Link>
          </p>
        )}
        {promoBad && !lineIssues && (
          <p className="mt-2 text-xs font-semibold text-gold">{t("checkout.errors.promoInvalid")}</p>
        )}
        <Button
          type="submit"
          size="lg"
          className="mt-3.5 w-full"
          disabled={!canSubmit}
          loading={pending}
          leftIcon={isGift ? <Gift className="size-[18px]" aria-hidden /> : <ShoppingBag className="size-[18px]" aria-hidden />}
        >
          {pending
            ? t("checkout.summary.submitting")
            : priceChanged
              ? t("checkout.summary.confirmNew")
              : isGift
                ? t("checkout.summary.submitGift")
                : t("checkout.summary.submit")}
        </Button>
        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-white/50">{t("checkout.summary.payNote")}</p>
      </div>
    </aside>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="nk-container py-5 sm:py-8 lg:py-10" aria-busy>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-[20px]" />
          <Skeleton className="h-44 rounded-[20px]" />
          <Skeleton className="h-56 rounded-[20px]" />
        </div>
        <Skeleton className="mt-6 h-80 rounded-[22px] lg:mt-0" />
      </div>
    </div>
  );
}
