"use client";

import { useId } from "react";
import { useI18n } from "@/lib/i18n/client";
import { KZ_REGIONS } from "@/lib/constants";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/interactive";

export const CITY_OTHER = "__other";

export type ShipMethod = "astana_courier" | "kazpost";

export type AddressDraft = {
  region: string;
  /** a city of the region, or CITY_OTHER */
  cityChoice: string;
  cityOther: string;
  postal: string;
  street: string;
  house: string;
  apartment: string;
  entrance: string;
  comment: string;
  recipientName: string;
  recipientPhone: string;
};

export const EMPTY_ADDRESS: AddressDraft = {
  region: "",
  cityChoice: "",
  cityOther: "",
  postal: "",
  street: "",
  house: "",
  apartment: "",
  entrance: "",
  comment: "",
  recipientName: "",
  recipientPhone: "",
};

export type AddressField = keyof AddressDraft;
export type AddressErrors = Partial<
  Record<AddressField, "required" | "postal" | "phone">
>;

export function addressCity(a: AddressDraft): string {
  return (a.cityChoice === CITY_OTHER ? a.cityOther : a.cityChoice).trim();
}

/** Build a draft from profiles.saved_address (shape written by create_order) */
export function draftFromSaved(saved: unknown): {
  method: ShipMethod | null;
  draft: Partial<AddressDraft>;
} {
  if (!saved || typeof saved !== "object") return { method: null, draft: {} };
  const s = saved as Record<string, unknown>;
  const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
  const method =
    s.delivery_method === "astana_courier" || s.delivery_method === "kazpost"
      ? s.delivery_method
      : null;
  const region = str("region");
  const city = str("city");
  const known = KZ_REGIONS.find((r) => r.value === region);
  const cityKnown = !!known?.cities.some((c) => c.value === city);
  return {
    method,
    draft: {
      region: method === "kazpost" && known ? region : "",
      cityChoice:
        method === "kazpost" && known
          ? cityKnown
            ? city
            : city
              ? CITY_OTHER
              : ""
          : "",
      cityOther: method === "kazpost" && known && !cityKnown ? city : "",
      postal: str("postal_code"),
      street: str("street"),
      house: str("house"),
      apartment: str("apartment"),
      entrance: str("entrance"),
      recipientName: str("recipient_name"),
      recipientPhone: formatPhone(str("recipient_phone")),
    },
  };
}

/**
 * Client-side validation that mirrors create_order / submit_gift_address.
 * `regionOnly` = sender lets the friend fill the address (only region + city for Kazpost).
 */
export function validateAddress(
  method: ShipMethod,
  a: AddressDraft,
  {
    regionOnly = false,
    recipient = true,
  }: { regionOnly?: boolean; recipient?: boolean } = {},
): AddressErrors {
  const e: AddressErrors = {};
  if (method === "kazpost") {
    if (!a.region) e.region = "required";
    if (!a.cityChoice || (a.cityChoice === CITY_OTHER && !a.cityOther.trim())) {
      e[a.cityChoice === CITY_OTHER ? "cityOther" : "cityChoice"] = "required";
    }
  }
  if (regionOnly) return e;
  if (!a.street.trim()) e.street = "required";
  if (!a.house.trim()) e.house = "required";
  if (method === "kazpost" && !/^\d{6}$/.test(a.postal.replace(/\s/g, "")))
    e.postal = a.postal ? "postal" : "required";
  if (recipient) {
    if (method === "kazpost" && !a.recipientName.trim())
      e.recipientName = "required";
    if (
      a.recipientPhone.replace(/\D/g, "").length > 1 &&
      !isValidPhone(a.recipientPhone)
    )
      e.recipientPhone = "phone";
  }
  return e;
}

/** Payload for create_order.address / submit_gift_address */
export function addressPayload(
  method: ShipMethod,
  a: AddressDraft,
  regionOnly = false,
): Record<string, string> {
  const kazpost = method === "kazpost";
  if (regionOnly) {
    return kazpost ? { region: a.region, city: addressCity(a) } : {};
  }
  return {
    region: kazpost ? a.region : "Астана",
    city: kazpost ? addressCity(a) : "Астана",
    postal_code: kazpost ? a.postal.replace(/\s/g, "") : "",
    street: a.street.trim(),
    house: a.house.trim(),
    apartment: a.apartment.trim(),
    entrance: kazpost ? "" : a.entrance.trim(),
    comment: a.comment.trim(),
    recipient_name: a.recipientName.trim(),
    recipient_phone: normalizePhone(a.recipientPhone) ?? "",
  };
}

export function AddressFields({
  method,
  value,
  onChange,
  errors = {},
  regionOnly = false,
  showRecipient = true,
  showComment = true,
  showRecipientPhone = true,
  disabled,
}: {
  method: ShipMethod;
  value: AddressDraft;
  onChange: (patch: Partial<AddressDraft>) => void;
  errors?: AddressErrors;
  regionOnly?: boolean;
  showRecipient?: boolean;
  showComment?: boolean;
  showRecipientPhone?: boolean;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const err = (f: AddressField) => {
    const code = errors[f];
    return code ? t(`checkout.address.errors.${code}`) : undefined;
  };
  const region = KZ_REGIONS.find((r) => r.value === value.region);
  const kazpost = method === "kazpost";

  const regionCity = kazpost && (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={t("checkout.address.region")}
        htmlFor={`${id}-region`}
        required
        error={err("region")}
      >
        <Select
          id={`${id}-region`}
          value={value.region}
          disabled={disabled}
          invalid={!!errors.region}
          onChange={(e) => {
            const next = KZ_REGIONS.find((r) => r.value === e.target.value);
            onChange({
              region: e.target.value,
              cityChoice:
                next && next.cities.length === 1 ? next.cities[0].value : "",
              cityOther: "",
            });
          }}
        >
          <option value="">{t("checkout.address.regionPlaceholder")}</option>
          {KZ_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {locale === "ru" ? r.ru : r.value}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={t("checkout.address.city")}
        htmlFor={`${id}-city`}
        required
        error={err("cityChoice")}
      >
        <Select
          id={`${id}-city`}
          value={value.cityChoice}
          disabled={disabled || !region}
          invalid={!!errors.cityChoice}
          onChange={(e) => onChange({ cityChoice: e.target.value })}
        >
          <option value="">{t("checkout.address.cityPlaceholder")}</option>
          {region?.cities.map((c) => (
            <option key={c.value} value={c.value}>
              {locale === "ru" ? c.ru : c.value}
            </option>
          ))}
          {region && (
            <option value={CITY_OTHER}>
              {t("checkout.address.cityOther")}
            </option>
          )}
        </Select>
      </Field>
      {value.cityChoice === CITY_OTHER && (
        <Field
          label={t("checkout.address.cityOtherInput")}
          htmlFor={`${id}-city-other`}
          required
          error={err("cityOther")}
          className="sm:col-span-2"
        >
          <Input
            id={`${id}-city-other`}
            value={value.cityOther}
            disabled={disabled}
            invalid={!!errors.cityOther}
            maxLength={80}
            placeholder={t("checkout.address.cityOtherPlaceholder")}
            onChange={(e) => onChange({ cityOther: e.target.value })}
          />
        </Field>
      )}
    </div>
  );

  if (regionOnly) return regionCity || null;

  return (
    <div className="grid gap-3">
      {regionCity}
      {kazpost && (
        <Field
          label={t("checkout.address.postal")}
          htmlFor={`${id}-postal`}
          required
          error={err("postal")}
          hint={t("checkout.address.postalHint")}
        >
          <Input
            id={`${id}-postal`}
            value={value.postal}
            disabled={disabled}
            invalid={!!errors.postal}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder={t("checkout.address.postalPlaceholder")}
            onChange={(e) =>
              onChange({
                postal: e.target.value.replace(/\D/g, "").slice(0, 6),
              })
            }
            className="sm:max-w-[220px]"
          />
        </Field>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field
          label={t("checkout.address.street")}
          htmlFor={`${id}-street`}
          required
          error={err("street")}
        >
          <Input
            id={`${id}-street`}
            value={value.street}
            disabled={disabled}
            invalid={!!errors.street}
            maxLength={160}
            autoComplete="address-line1"
            placeholder={t("checkout.address.streetPlaceholder")}
            onChange={(e) => onChange({ street: e.target.value })}
          />
        </Field>
        <Field
          label={t("checkout.address.house")}
          htmlFor={`${id}-house`}
          required
          error={err("house")}
        >
          <Input
            id={`${id}-house`}
            value={value.house}
            disabled={disabled}
            invalid={!!errors.house}
            maxLength={20}
            onChange={(e) => onChange({ house: e.target.value })}
          />
        </Field>
      </div>
      <div className={cn("grid gap-3", !kazpost && "grid-cols-2")}>
        <Field label={t("checkout.address.apartment")} htmlFor={`${id}-apt`}>
          <Input
            id={`${id}-apt`}
            value={value.apartment}
            disabled={disabled}
            maxLength={20}
            autoComplete="address-line2"
            onChange={(e) => onChange({ apartment: e.target.value })}
            className={kazpost ? "sm:max-w-[220px]" : undefined}
          />
        </Field>
        {!kazpost && (
          <Field
            label={t("checkout.address.entrance")}
            htmlFor={`${id}-entrance`}
          >
            <Input
              id={`${id}-entrance`}
              value={value.entrance}
              disabled={disabled}
              maxLength={40}
              onChange={(e) => onChange({ entrance: e.target.value })}
            />
          </Field>
        )}
      </div>
      {showComment && !kazpost && (
        <Field label={t("checkout.address.comment")} htmlFor={`${id}-comment`}>
          <Textarea
            id={`${id}-comment`}
            value={value.comment}
            disabled={disabled}
            maxLength={500}
            rows={2}
            className="min-h-20"
            placeholder={t("checkout.address.commentPlaceholder")}
            onChange={(e) => onChange({ comment: e.target.value })}
          />
        </Field>
      )}
      {showRecipient && (
        <div
          className={cn("grid gap-3", showRecipientPhone && "sm:grid-cols-2")}
        >
          <Field
            label={
              kazpost
                ? t("checkout.address.recipientNameId")
                : t("checkout.address.recipientName")
            }
            htmlFor={`${id}-rname`}
            required={kazpost}
            error={err("recipientName")}
            hint={
              kazpost ? t("checkout.address.recipientNameIdHint") : undefined
            }
          >
            <Input
              id={`${id}-rname`}
              value={value.recipientName}
              disabled={disabled}
              invalid={!!errors.recipientName}
              maxLength={120}
              autoComplete="name"
              onChange={(e) => onChange({ recipientName: e.target.value })}
            />
          </Field>
          {showRecipientPhone && (
            <Field
              label={t("checkout.address.recipientPhone")}
              htmlFor={`${id}-rphone`}
              error={err("recipientPhone")}
            >
              <PhoneInput
                id={`${id}-rphone`}
                value={value.recipientPhone}
                disabled={disabled}
                invalid={!!errors.recipientPhone}
                onChange={(v) => onChange({ recipientPhone: v })}
              />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}
