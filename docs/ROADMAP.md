# Roadmap (self-assigned backlog)

## Phase 1 — core build (in progress)
Storefront · cart & checkout · orders & payment by transfer · «Досыңа сыйла» gifts ·
Telegram registration bot · secure e-book reader · private messages · admin dashboard,
orders, customers, reviews, settings · admin catalog (books, genres, promotions, promo codes, banners).

## Phase 2 — integration & QA
- Production build (`next build`), type/lint clean, apply agent migrations, regenerate types.
- End-to-end browser flows with Playwright (guest → order → payment → admin confirm → library/reader;
  gift flow; messages; reviews; promo codes; admin CRUD; registration via a test token).
- Visual QA of every page: 390 / 820 / 1280 px × light / dark.
- Security review: RLS & RPC abuse attempts, server actions auth, reader API protection.
- i18n completeness scan (no hard-coded text, kk/ru parity).

## Phase 3 — high-value additions
1. **Kaspi payment helpers** — settings: payment QR image + Kaspi payment link; shown on the order page.
2. **Bulk book import (CSV)** — upload, preview with validation, create/update books in one go.
3. **«Түскенде хабарлау»** — back-in-stock alerts for sold-out books via Telegram.
4. **Telegram bot catalog search** — any text → top books with prices and links.
5. **Daily admin summary** in Telegram (cron): today's revenue, orders, payments to check, low stock.
6. **Search & views analytics** — popular searches, zero-result searches, most viewed books, view→order conversion.
7. **Book OpenGraph images** — beautiful share previews (typographic cover) for WhatsApp / Telegram.
8. **Recently viewed** books.
9. **Abandoned cart reminder** via Telegram (once, after 24 h).
10. **Admin activity log** — who changed which order / book / setting.
11. **Gift certificates** — sell fixed-amount certificates redeemable as promo codes.
