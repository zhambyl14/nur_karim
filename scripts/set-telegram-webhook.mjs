// Connects the Telegram bot to the Supabase Edge Function `telegram-bot`.
//
// Usage (from the project root, after creating the bot with @BotFather):
//   1. Put into .env.local:
//        TELEGRAM_BOT_TOKEN=<token from @BotFather>
//        TELEGRAM_WEBHOOK_SECRET=<long random string, letters/digits/_/- only>
//        NEXT_PUBLIC_SITE_URL=https://<your domain>
//   2. Deploy the function once:
//        npx -y supabase@2.121.0 functions deploy telegram-bot --project-ref shwlwcnjwvvdhaajvyzn --no-verify-jwt --use-api
//   3. Run:
//        node scripts/set-telegram-webhook.mjs              # secrets + webhook + commands
//        node scripts/set-telegram-webhook.mjs --skip-secrets   # only Telegram API calls
//        node scripts/set-telegram-webhook.mjs --info           # show the current webhook status
//
// Secret values are never printed.
import { spawnSync } from "node:child_process";
import { loadEnv } from "./_env.mjs";

const PROJECT_REF = "shwlwcnjwvvdhaajvyzn";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/telegram-bot`;
const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(
    [
      "node scripts/set-telegram-webhook.mjs [--skip-secrets] [--info]",
      "",
      "Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL from .env.local,",
      "stores them as Supabase Edge Function secrets, registers the webhook",
      `(${WEBHOOK_URL}) and the bot commands (kk + ru).`,
    ].join("\n"),
  );
  process.exit(0);
}

loadEnv();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

const missing = [
  !BOT_TOKEN && "TELEGRAM_BOT_TOKEN",
  !WEBHOOK_SECRET && "TELEGRAM_WEBHOOK_SECRET",
  !SITE_URL && "NEXT_PUBLIC_SITE_URL",
].filter(Boolean);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  console.error("Create the bot with @BotFather, put its token into .env.local and run this script again.");
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{16,256}$/.test(WEBHOOK_SECRET)) {
  console.error("TELEGRAM_WEBHOOK_SECRET must be 16–256 characters: A–Z, a–z, 0–9, _ or -.");
  process.exit(1);
}
if (!/^https:\/\//.test(SITE_URL)) {
  console.warn(`Warning: NEXT_PUBLIC_SITE_URL is not https (${SITE_URL}). Telegram may reject the link buttons.`);
}

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  if (!body.ok) throw new Error(`${method}: ${body.description ?? "failed"}`);
  return body.result;
}

if (args.has("--info")) {
  const info = await tg("getWebhookInfo");
  console.log(`Webhook URL:      ${info.url || "(not set)"}`);
  console.log(`Pending updates:  ${info.pending_update_count ?? 0}`);
  if (info.last_error_message) {
    console.log(`Last error:       ${info.last_error_message} (${new Date(info.last_error_date * 1000).toISOString()})`);
  }
  process.exit(0);
}

// 1. Supabase secrets for the Edge Function
if (!args.has("--skip-secrets")) {
  console.log("Setting Supabase Edge Function secrets (TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SITE_URL)...");
  const result = spawnSync(
    "npx",
    [
      "-y",
      "supabase@2.121.0",
      "secrets",
      "set",
      "--project-ref",
      PROJECT_REF,
      `TELEGRAM_BOT_TOKEN=${BOT_TOKEN}`,
      `TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}`,
      `SITE_URL=${SITE_URL}`,
    ],
    // Output is captured (not shown) so that secret values never reach the terminal.
    { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    const redact = (s) =>
      String(s ?? "")
        .split(BOT_TOKEN).join("***")
        .split(WEBHOOK_SECRET).join("***");
    console.error("Could not set the secrets with the Supabase CLI:");
    console.error(redact(result.stderr || result.stdout || result.error?.message).trim());
    console.error("Log in with `npx -y supabase@2.121.0 login` or run again with --skip-secrets.");
    process.exit(1);
  }
  console.log("  done");
}

// 2. Webhook
console.log(`Registering webhook ${WEBHOOK_URL} ...`);
await tg("setWebhook", {
  url: WEBHOOK_URL,
  secret_token: WEBHOOK_SECRET,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
console.log("  done");

// 3. Commands (Kazakh by default, Russian for ru clients)
const commands = {
  default: [
    { command: "start", description: "Тіркелу / бастау" },
    { command: "orders", description: "Соңғы тапсырыстар" },
    { command: "reset", description: "Құпиясөзді жаңарту" },
    { command: "help", description: "Көмек" },
  ],
  ru: [
    { command: "start", description: "Регистрация / начало" },
    { command: "orders", description: "Последние заказы" },
    { command: "reset", description: "Сбросить пароль" },
    { command: "help", description: "Помощь" },
  ],
};
console.log("Setting bot commands (default + ru) ...");
await tg("setMyCommands", { commands: commands.default });
await tg("setMyCommands", { commands: commands.ru, language_code: "ru" });
console.log("  done");

// 4. Bot info
const me = await tg("getMe");
console.log("");
console.log(`Bot: @${me.username} (${me.first_name})`);
if ((process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "") !== me.username) {
  console.log(`Put this into .env.local (and the hosting env) and restart / redeploy the site:`);
  console.log(`  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${me.username}`);
} else {
  console.log("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is already set correctly.");
}
console.log("Test: open the bot in Telegram and send /start.");
