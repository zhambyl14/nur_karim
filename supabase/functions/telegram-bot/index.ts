// Nur Karim Telegram bot (Supabase Edge Function, Deno).
//
// Webhook: https://<project>.supabase.co/functions/v1/telegram-bot
// Deploy:  npx -y supabase@2.121.0 functions deploy telegram-bot --project-ref <ref> --no-verify-jwt --use-api
// Setup:   node scripts/set-telegram-webhook.mjs
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injected by Supabase),
//      TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SITE_URL.
//
// Flow (docs/SPEC.md «Registration via Telegram»):
//   /start [register|reset] → explanation + «📱 Тіркелу / Регистрация» (request_contact)
//   contact (own number only) → new phone: one-time register link (30 min)
//                             → registered phone: reset link + login link
//   /orders → last 5 orders of the linked account, /reset, /help.
// The raw token travels only in the link; the database stores its SHA-256 hex.

import { createClient } from "@supabase/supabase-js";

/* ---------------------------------------------------------------------------
   Runtime / env
   --------------------------------------------------------------------------- */
type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};
const runtime = (globalThis as unknown as { Deno: DenoRuntime }).Deno;

const BOT_TOKEN = runtime.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = runtime.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const SITE_URL = (runtime.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const SUPABASE_URL = runtime.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = runtime.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TOKEN_TTL_MINUTES = 30;
const MAX_TOKENS_PER_HOUR = 8;
const CONTACT_BUTTON = { kk: "📱 Нөмірді растау", ru: "📱 Подтвердить номер" } as const;
// The phone is confirmed through a Telegram Mini App (inline button inside the
// message, WebApp.requestContact). Mini Apps need an https site; until the site
// is deployed on https the bot falls back to the classic request_contact keyboard.
const MINI_APP = /^https:\/\//.test(SITE_URL);

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/* ---------------------------------------------------------------------------
   Telegram types (only what the bot uses)
   --------------------------------------------------------------------------- */
type TgUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};
type TgContact = { phone_number: string; first_name?: string; last_name?: string; user_id?: number };
type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TgUser;
  text?: string;
  contact?: TgContact;
};
type TgUpdate = { update_id: number; message?: TgMessage };
type InlineButton = { text: string; url?: string; web_app?: { url: string } };
type ReplyMarkup =
  | { inline_keyboard: InlineButton[][] }
  | {
      keyboard: { text: string; request_contact?: boolean }[][];
      resize_keyboard: boolean;
      one_time_keyboard: boolean;
      is_persistent?: boolean;
    }
  | { remove_keyboard: true };

type Lang = "kk" | "ru";
type OrderStatus = "pending_payment" | "payment_review" | "paid" | "shipped" | "delivered" | "cancelled";

/* ---------------------------------------------------------------------------
   Texts (Kazakh by default, Russian when Telegram's language is ru)
   --------------------------------------------------------------------------- */
const TEXTS = {
  kk: {
    welcome: "Сәлеметсіз бе, <b>{name}</b>!\n\n<b>Nur Karim</b> кітап дүкенінің ботына қош келдіңіз.",
    registerHow:
      "Тіркелу үшін осы хабарламадағы «📱 Нөмірді растау» батырмасын басып, нөміріңізбен бөлісіңіз. Біз сізге тіркелуді аяқтау сілтемесін жібереміз.",
    resetHow:
      "Құпиясөзді жаңарту үшін осы хабарламадағы «📱 Нөмірді растау» батырмасын басып, тіркелген нөміріңізбен бөлісіңіз. Біз сізге құпиясөзді жаңарту сілтемесін жібереміз.",
    alreadyLinked:
      "Сіздің Telegram аккаунтыңыз {phone} нөміріне байланыстырылған.\n\n/orders — соңғы тапсырыстар\n/reset — құпиясөзді жаңарту",
    contactReceived: "✅ Нөміріңіз қабылданды: <b>{phone}</b>",
    notOwnContact:
      "⚠️ Тек өз нөміріңізбен бөлісіңіз. «📱 Нөмірді растау» батырмасын басыңыз — Telegram нөміріңізді өзі жібереді.",
    phoneUnsupported: "⚠️ Бұл нөмірмен тіркелу мүмкін емес. +7 басталатын Қазақстан нөмірін пайдаланыңыз.",
    rateLimited: "⏳ Сұраныс тым көп. Бір сағаттан кейін қайталап көріңіз.",
    alreadyRegisteredShort: "ℹ️ <b>Бұл нөмір тіркелген.</b> Сайтқа телефон нөміріңіз бен құпиясөзіңіз арқылы кіріңіз.",
    registerLink:
      "Тіркелуді аяқтау үшін төмендегі батырманы басыңыз — сайтта аты-жөніңіз бен құпиясөзді жазасыз.\n\nСілтеме <b>{minutes} минут</b> жарамды және бір рет қолданылады. Оны ешкімге жібермеңіз.",
    registerButton: "Тіркелуді аяқтау",
    backToSite:
      "✅ <b>Нөміріңіз расталды!</b>\n\nЕнді сайт ашық тұрған браузерге (TikTok, Instagram немесе басқа) оралыңыз — тіркелу сол жерде өзі жалғасады, тек құпиясөз ойлап табасыз.\n\nСайт жабылып қалса, төмендегі батырманы басыңыз (сілтеме {minutes} минут жарамды).",
    alreadyRegistered:
      "ℹ️ <b>Бұл нөмір тіркелген.</b>\n\nСайтқа телефон нөміріңіз бен құпиясөзіңіз арқылы кіре аласыз. Құпиясөзді ұмытсаңыз, төмендегі батырма арқылы жаңартыңыз — сілтеме {minutes} минут жарамды.",
    linkedNow: "🔗 Telegram аккаунтыңыз сайттағы профильге байланыстырылды. Тапсырыс күйі туралы хабарламалар осы жерге келеді.",
    resetButton: "Құпиясөзді жаңарту",
    loginButton: "Сайтқа кіру",
    ordersTitle: "📦 <b>Соңғы тапсырыстарыңыз</b>",
    orderOpen: "Тапсырысты ашу",
    noOrders: "Сізде әзірге тапсырыс жоқ. Ұнаған кітабыңызды каталогтан таңдаңыз.",
    catalogButton: "Каталогқа өту",
    notLinked:
      "Бұл Telegram аккаунты сайттағы аккаунтқа байланыстырылмаған. Тіркелу немесе байланыстыру үшін төмендегі батырма арқылы нөміріңізбен бөлісіңіз.",
    help:
      "Мен <b>Nur Karim</b> кітап дүкенінің ботымын.\n\n/start — тіркелу\n/orders — соңғы тапсырыстар\n/reset — құпиясөзді жаңарту\n/help — көмек\n\nДүкенге сұрағыңызды сайттағы «Хабарламалар» бөлімінде жаза аласыз.",
    error: "Қате шықты. Біраз уақыттан кейін қайталап көріңіз.",
    friend: "оқырман",
    status: {
      pending_payment: "Төлем күтілуде",
      payment_review: "Төлем тексерілуде",
      paid: "Төленді",
      shipped: "Жолда",
      delivered: "Жеткізілді",
      cancelled: "Бас тартылды",
    } satisfies Record<OrderStatus, string>,
    digitalDone: "Аяқталды",
  },
  ru: {
    welcome: "Здравствуйте, <b>{name}</b>!\n\nДобро пожаловать в бот книжного магазина <b>Nur Karim</b>.",
    registerHow:
      "Чтобы зарегистрироваться, нажмите в этом сообщении кнопку «📱 Подтвердить номер» и поделитесь номером. Мы пришлём ссылку для завершения регистрации.",
    resetHow:
      "Чтобы обновить пароль, нажмите в этом сообщении кнопку «📱 Подтвердить номер» и поделитесь номером, на который зарегистрирован аккаунт. Мы пришлём ссылку для смены пароля.",
    alreadyLinked:
      "Ваш Telegram привязан к номеру {phone}.\n\n/orders — последние заказы\n/reset — обновить пароль",
    contactReceived: "✅ Номер получен: <b>{phone}</b>",
    notOwnContact: "⚠️ Поделитесь, пожалуйста, своим номером. Нажмите «📱 Подтвердить номер» — Telegram отправит его сам.",
    phoneUnsupported: "⚠️ С этим номером зарегистрироваться нельзя. Используйте казахстанский номер, начинающийся с +7.",
    rateLimited: "⏳ Слишком много запросов. Попробуйте снова через час.",
    alreadyRegisteredShort: "ℹ️ <b>Этот номер уже зарегистрирован.</b> Войдите на сайт по номеру телефона и паролю.",
    registerLink:
      "Чтобы завершить регистрацию, нажмите кнопку ниже — на сайте нужно будет указать имя и пароль.\n\nСсылка действует <b>{minutes} минут</b> и используется один раз. Никому её не пересылайте.",
    registerButton: "Завершить регистрацию",
    backToSite:
      "✅ <b>Номер подтверждён!</b>\n\nВернитесь в браузер, где открыт сайт (TikTok, Instagram или другой), — регистрация продолжится там автоматически, останется только придумать пароль.\n\nЕсли сайт закрыт, нажмите кнопку ниже (ссылка действует {minutes} минут).",
    alreadyRegistered:
      "ℹ️ <b>Этот номер уже зарегистрирован.</b>\n\nВходите на сайт по номеру телефона и паролю. Если забыли пароль, обновите его кнопкой ниже — ссылка действует {minutes} минут.",
    linkedNow: "🔗 Ваш Telegram привязан к профилю на сайте. Уведомления о статусе заказов будут приходить сюда.",
    resetButton: "Обновить пароль",
    loginButton: "Войти на сайт",
    ordersTitle: "📦 <b>Ваши последние заказы</b>",
    orderOpen: "Открыть заказ",
    noOrders: "У вас пока нет заказов. Выберите книгу в каталоге.",
    catalogButton: "Перейти в каталог",
    notLinked:
      "Этот Telegram не привязан к аккаунту на сайте. Чтобы зарегистрироваться или привязать аккаунт, поделитесь номером кнопкой ниже.",
    help:
      "Я бот книжного магазина <b>Nur Karim</b>.\n\n/start — регистрация\n/orders — последние заказы\n/reset — обновить пароль\n/help — помощь\n\nВопрос магазину можно задать в разделе «Сообщения» на сайте.",
    error: "Произошла ошибка. Попробуйте ещё раз чуть позже.",
    friend: "читатель",
    status: {
      pending_payment: "Ожидает оплаты",
      payment_review: "Оплата проверяется",
      paid: "Оплачен",
      shipped: "В пути",
      delivered: "Доставлен",
      cancelled: "Отменён",
    } satisfies Record<OrderStatus, string>,
    digitalDone: "Выполнен",
  },
};

function langOf(user: TgUser | undefined): Lang {
  return user?.language_code?.toLowerCase().startsWith("ru") ? "ru" : "kk";
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Escape user content for Telegram HTML parse mode */
function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------------------------
   Helpers: phone, tokens, formatting
   --------------------------------------------------------------------------- */

/** MUST stay identical to public.normalize_phone() and src/lib/phone.ts */
function normalizePhone(input: string | null | undefined): string | null {
  const d = (input ?? "").replace(/\D/g, "");
  if (d === "") return null;
  if (/^7\d{10}$/.test(d)) return `8${d.slice(1)}`;
  if (/^8\d{10}$/.test(d)) return d;
  if (/^7\d{9}$/.test(d)) return `8${d}`;
  return d;
}

/** 87474005347 -> "+7 747 *** ** 47" */
function maskPhone(phone: string): string {
  return /^8\d{10}$/.test(phone) ? `+7 ${phone.slice(1, 4)} *** ** ${phone.slice(9, 11)}` : phone;
}

/** 87474005347 -> "+7 747 400 53 47" */
function formatPhone(phone: string): string {
  return /^8\d{10}$/.test(phone)
    ? `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)}`
    : `+${phone}`;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of the webhook secret */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount)} ₸`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Almaty",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function siteLink(path: string): string {
  return `${SITE_URL}${path}`;
}

/* ---------------------------------------------------------------------------
   Telegram API
   --------------------------------------------------------------------------- */
async function telegram(method: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn(`telegram-bot: TELEGRAM_BOT_TOKEN is not set, ${method} skipped`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn(`telegram-bot: ${method} failed`, res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.warn(`telegram-bot: ${method} error`, error);
    return false;
  }
}

async function send(chatId: number, text: string, markup?: ReplyMarkup): Promise<boolean> {
  const ok = await telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: markup,
  });
  // Telegram rejects URL buttons for some hosts (e.g. a local SITE_URL):
  // fall back to plain links so the user always gets the link.
  if (!ok && BOT_TOKEN && markup && "inline_keyboard" in markup) {
    const links = markup.inline_keyboard
      .flat()
      .filter((b) => b.url)
      .map((b) => `<a href="${esc(b.url ?? "")}">${esc(b.text)}</a>`)
      .join("\n");
    return telegram("sendMessage", {
      chat_id: chatId,
      text: `${text}\n\n${links}`,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  }
  return ok;
}

function contactKeyboard(lang: Lang): ReplyMarkup {
  if (MINI_APP) {
    return { inline_keyboard: [[{ text: CONTACT_BUTTON[lang], web_app: { url: `${SITE_URL}/tg/verify?lang=${lang}` } }]] };
  }
  return {
    keyboard: [[{ text: CONTACT_BUTTON[lang], request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

/* ---------------------------------------------------------------------------
   Database
   --------------------------------------------------------------------------- */
type ProfileRow = {
  id: string;
  phone: string;
  full_name: string;
  telegram_id: number | null;
  telegram_username: string | null;
};

async function profileByTelegram(telegramId: number): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id, phone, full_name, telegram_id, telegram_username")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

async function profileByPhone(phone: string): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from("profiles")
    .select("id, phone, full_name, telegram_id, telegram_username")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

/** Count of tokens issued in the last hour for this phone or Telegram user */
async function recentTokenCount(phone: string, telegramId: number): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("telegram_tokens")
    .select("id", { count: "exact", head: true })
    .or(`phone.eq.${phone},telegram_id.eq.${telegramId}`)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

async function createToken(
  purpose: "register" | "reset",
  phone: string,
  user: TgUser,
): Promise<{ token: string; id: string }> {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const { data, error } = await db.from("telegram_tokens").insert({
    token_hash: await sha256Hex(token),
    purpose,
    phone,
    telegram_id: user.id,
    telegram_username: user.username ?? null,
    first_name: user.first_name?.slice(0, 120) ?? null,
    last_name: user.last_name?.slice(0, 120) ?? null,
    language_code: user.language_code?.slice(0, 10) ?? null,
    expires_at: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
  }).select("id").single();
  if (error) throw error;
  return { token, id: (data as { id: string }).id };
}

/** «r_<48 hex>»: registration started on the site (see migration telegram_auth_requests) */
const SITE_REQUEST_RE = /^r_([0-9a-f]{48})$/;

/** Remembers which Telegram user opened the site's registration request. */
async function claimSiteRequest(code: string, user: TgUser): Promise<boolean> {
  const { data, error } = await db
    .from("telegram_auth_requests")
    .update({ telegram_id: user.id })
    .eq("code_hash", await sha256Hex(code))
    .is("token_id", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");
  if (error) {
    console.warn("telegram-bot: claim request failed", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Attaches the issued token to the latest open site request of this Telegram user. */
async function completeSiteRequest(user: TgUser, tokenId: string): Promise<boolean> {
  const { data: open, error } = await db
    .from("telegram_auth_requests")
    .select("id")
    .eq("telegram_id", user.id)
    .is("token_id", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !open) return false;
  const { error: updateError } = await db
    .from("telegram_auth_requests")
    .update({ token_id: tokenId })
    .eq("id", (open as { id: string }).id);
  return !updateError;
}

/** Links this Telegram account to the profile when it has none yet. Returns true when linked now. */
async function linkTelegram(profile: ProfileRow, user: TgUser): Promise<boolean> {
  if (profile.telegram_id === user.id) {
    if ((user.username ?? null) !== profile.telegram_username) {
      await db.from("profiles").update({ telegram_username: user.username ?? null }).eq("id", profile.id);
    }
    return false;
  }
  if (profile.telegram_id !== null) return false;
  // profiles.telegram_id is unique: one Telegram account per profile
  const other = await profileByTelegram(user.id);
  if (other) return false;
  const { data, error } = await db
    .from("profiles")
    .update({ telegram_id: user.id, telegram_username: user.username ?? null })
    .eq("id", profile.id)
    .is("telegram_id", null)
    .select("id");
  if (error) {
    console.warn("telegram-bot: link failed", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/* ---------------------------------------------------------------------------
   Handlers
   --------------------------------------------------------------------------- */
async function handleStart(chatId: number, user: TgUser, payload: string) {
  const t = TEXTS[langOf(user)];
  const name = esc(user.first_name || user.username || t.friend);
  const siteRequest = SITE_REQUEST_RE.exec(payload);
  if (siteRequest) {
    await claimSiteRequest(siteRequest[1], user);
    await send(chatId, `${fill(t.welcome, { name })}\n\n${t.registerHow}`, contactKeyboard(langOf(user)));
    return;
  }
  if (payload === "reset") {
    await send(chatId, `${fill(t.welcome, { name })}\n\n${t.resetHow}`, contactKeyboard(langOf(user)));
    return;
  }
  const linked = await profileByTelegram(user.id);
  if (linked && payload !== "register") {
    await send(chatId, `${fill(t.welcome, { name })}\n\n${fill(t.alreadyLinked, { phone: maskPhone(linked.phone) })}`, {
      inline_keyboard: [[{ text: t.loginButton, url: siteLink("/login") }]],
    });
    return;
  }
  await send(chatId, `${fill(t.welcome, { name })}\n\n${t.registerHow}`, contactKeyboard(langOf(user)));
}

async function handleContact(chatId: number, user: TgUser, contact: TgContact) {
  const t = TEXTS[langOf(user)];

  // Only the user's own number proves ownership of the phone.
  if (!contact.user_id || contact.user_id !== user.id) {
    await send(chatId, t.notOwnContact, contactKeyboard(langOf(user)));
    return;
  }

  const phone = normalizePhone(contact.phone_number);
  if (!phone || !/^8\d{10}$/.test(phone)) {
    await send(chatId, t.phoneUnsupported, { remove_keyboard: true });
    return;
  }

  const profile = await profileByPhone(phone);

  if ((await recentTokenCount(phone, user.id)) >= MAX_TOKENS_PER_HOUR) {
    // Already registered: no new link is needed to sign in, so do not just refuse.
    if (profile) {
      const linkedNow = await linkTelegram(profile, user);
      await send(chatId, `${t.alreadyRegisteredShort}${linkedNow ? `\n\n${t.linkedNow}` : ""}`, {
        inline_keyboard: [[{ text: t.loginButton, url: siteLink("/login") }]],
      });
      return;
    }
    await send(chatId, t.rateLimited, { remove_keyboard: true });
    return;
  }

  await send(chatId, fill(t.contactReceived, { phone: formatPhone(phone) }), { remove_keyboard: true });

  if (profile) {
    const linkedNow = await linkTelegram(profile, user);
    const { token, id } = await createToken("reset", phone, user);
    await completeSiteRequest(user, id);
    const text = `${fill(t.alreadyRegistered, { minutes: TOKEN_TTL_MINUTES })}${linkedNow ? `\n\n${t.linkedNow}` : ""}`;
    await send(chatId, text, {
      inline_keyboard: [
        [{ text: t.resetButton, url: siteLink(`/reset?token=${token}`) }],
        [{ text: t.loginButton, url: siteLink("/login") }],
      ],
    });
    return;
  }

  const { token, id } = await createToken("register", phone, user);
  const fromSite = await completeSiteRequest(user, id);
  await send(chatId, fill(fromSite ? t.backToSite : t.registerLink, { minutes: TOKEN_TTL_MINUTES }), {
    inline_keyboard: [[{ text: t.registerButton, url: siteLink(`/register/complete?token=${token}`) }]],
  });
}

async function handleOrders(chatId: number, user: TgUser) {
  const t = TEXTS[langOf(user)];
  const profile = await profileByTelegram(user.id);
  if (!profile) {
    await send(chatId, t.notLinked, contactKeyboard(langOf(user)));
    return;
  }
  const { data, error } = await db
    .from("orders")
    .select("order_number, status, total, created_at, has_paper")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  const orders = (data ?? []) as {
    order_number: number;
    status: OrderStatus;
    total: number;
    created_at: string;
    has_paper: boolean;
  }[];

  if (orders.length === 0) {
    await send(chatId, t.noOrders, { inline_keyboard: [[{ text: t.catalogButton, url: siteLink("/catalog") }]] });
    return;
  }

  const lines = orders.map((o) => {
    const status = o.status === "delivered" && !o.has_paper ? t.digitalDone : t.status[o.status] ?? o.status;
    const url = siteLink(`/orders/${o.order_number}`);
    return `<b>#${o.order_number}</b> · ${formatDate(o.created_at)}\n${esc(status)} · ${formatMoney(o.total)}\n<a href="${esc(url)}">${esc(t.orderOpen)}</a>`;
  });
  await send(chatId, `${t.ordersTitle}\n\n${lines.join("\n\n")}`);
}

async function handleMessage(message: TgMessage) {
  const user = message.from;
  if (!user || user.is_bot || message.chat.type !== "private") return;
  const chatId = message.chat.id;

  if (message.contact) {
    await handleContact(chatId, user, message.contact);
    return;
  }

  const text = (message.text ?? "").trim();
  const [rawCommand = "", ...rest] = text.split(/\s+/);
  const command = rawCommand.startsWith("/") ? rawCommand.split("@")[0].toLowerCase() : "";
  const payload = rest.join(" ").trim().toLowerCase();

  switch (command) {
    case "/start":
      await handleStart(chatId, user, payload);
      return;
    case "/reset":
      await handleStart(chatId, user, "reset");
      return;
    case "/orders":
      await handleOrders(chatId, user);
      return;
    default:
      await send(chatId, TEXTS[langOf(user)].help);
  }
}

/* ---------------------------------------------------------------------------
   HTTP entry point
   --------------------------------------------------------------------------- */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

runtime.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!WEBHOOK_SECRET || !safeEqual(secret, WEBHOOK_SECRET)) {
    return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  if (!BOT_TOKEN) console.warn("telegram-bot: TELEGRAM_BOT_TOKEN is not set — updates are processed, replies are not sent");

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return json({ ok: true, ignored: "invalid json" });
  }

  const message = update.message;
  if (!message) return json({ ok: true });

  try {
    await handleMessage(message);
  } catch (error) {
    // Always answer 200 so Telegram does not retry the same update forever.
    console.error("telegram-bot: update failed", update.update_id, error);
    if (message.from && message.chat.type === "private") {
      await send(message.chat.id, TEXTS[langOf(message.from)].error);
    }
  }
  return json({ ok: true });
});
