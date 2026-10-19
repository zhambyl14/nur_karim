# Nur Karim — architecture & conventions

Read this before writing code. Everything here is already implemented and
must be reused, not re-invented.

## Stack

- **Next.js 16.4 (App Router, Turbopack)**, React 19.3, TypeScript strict.
  This is NOT the Next.js from older training data. Before using an API,
  check `node_modules/next/dist/docs/` (e.g. `01-app/02-guides/forms.md`,
  `01-app/01-getting-started/07-mutating-data.md`, `.../15-route-handlers.md`).
  Important differences:
  - `cacheComponents` is **off** (classic dynamic rendering). Pages that read
    cookies are dynamic. Do not use `"use cache"`.
  - `params` and `searchParams` are **Promises**: `const { slug } = await params`.
    Page props: `{ params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }`.
  - `cookies()` / `headers()` are async.
  - Middleware is called **proxy** (`src/proxy.ts`).
  - `revalidatePath(path)` works; `revalidateTag(tag, "max")` needs 2 args;
    `refresh()` from `next/cache` refreshes the client router from an action.
  - `after()` from `next/server` runs work after the response (use it for
    Telegram notifications so they never slow down or break an action).
- **Tailwind CSS v4** (CSS-first, tokens in `src/app/globals.css`).
- **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions),
  project ref `shwlwcnjwvvdhaajvyzn`. `@supabase/ssr` 0.12, `supabase-js` 2.118.
- Libraries available: `zod` v4, `zustand` 5, `lucide-react` 1.x (NO brand
  icons — use `src/components/brand/social-icons.tsx`), `sonner` (toasts),
  `next-themes`, `recharts` 3, `embla-carousel-react` + `embla-carousel-autoplay`,
  `pdfjs-dist` 6, `sharp`, `qrcode`, `clsx`, `tailwind-merge`.
  Do not add new dependencies without a strong reason.

## Folder map

```
src/app/
  layout.tsx            root: fonts (Lora + Manrope), Providers (theme, i18n, toasts, confirm)
  (shop)/layout.tsx     storefront: SessionProvider, CartSync, SiteHeader, SiteFooter, MobileTabBar
  (shop)/...            storefront & account pages
  (auth)/...            login / register / reset pages (own layout, no shop chrome)
  admin/layout.tsx      requireAdmin() + AdminShell (sidebar / phone tab bar)
  admin/...             admin pages
  read/[bookId]/        full-screen e-book reader (no shop chrome)
  api/...               route handlers (reader images, exports)
src/components/
  ui/                   primitives (button, field, badge, card, chip, modal, segmented, misc, interactive)
  book/                 BookCover, BookCard, BookGrid, AddToCartButton
  layout/               header, footer, tab bar, theme/locale controls, search
  admin/                AdminShell, AdminPageHeader, AdminCard, EbookUploader (stub)
  brand/                Logo, social icons
  session.tsx           SessionProvider/useSession + CartSync
  providers.tsx
src/lib/
  supabase/{client,server,admin,proxy}.ts
  auth.ts               getSessionUserId, getProfile, requireUser, requireAdmin, getAdminOrNull
  data/common.ts        getSettings, getGenres, getCatalogStats
  data/books.ts         searchBooks, getBookBySlug, getBooksByIds, BOOK_CARD_COLUMNS
  i18n/                 config, translate, server (getI18n), client (useI18n), actions
  cart/store.ts         zustand cart (localStorage) + helpers
  telegram.ts           sendTelegramMessage, notifyAdmins, notifyUser, notifyPhone, esc
  phone.ts              normalizePhone, formatPhone, maskPhone, phoneToAuthEmail, formatPhoneInput...
  format.ts             formatPrice ("4 200 ₸"), formatDate/DateTime/Time (Asia/Almaty), relativeTime
  constants.ts          cover palettes, order status tones, KZ regions & cities, sorts, gift themes
  hooks.ts              useMounted, useCartBadge, useDebounced, useMediaQuery
  utils.ts              cn, initials, slugify (kk/ru transliteration), safeNext
src/i18n/kk/*.ts, src/i18n/ru/*.ts   dictionaries (one file per namespace)
src/types/database.ts   generated Supabase types (do not edit by hand)
src/types/app.ts        app types: CatalogBook, BookCardData, Quote, GiftPublic, SessionUser...
supabase/migrations/    SQL (already applied to the remote project)
supabase/functions/     edge functions (telegram-bot)
```

## Supabase usage

- Server Components / Server Actions / Route Handlers:
  `const supabase = await createSupabaseServer()` (visitor session, RLS applies).
- Client Components: `getSupabaseBrowser()`.
- `createSupabaseAdmin()` = service role, **bypasses RLS**. Only on the server,
  only after you authorized the caller yourself. Never import it in client code.
- Who is signed in: `getProfile()` (cached per request) / `requireUser(next)` /
  `requireAdmin()`. In Server Actions re-check auth inside the action.
- Every admin page/action must call `requireAdmin()` (pages) or
  `getAdminOrNull()` (actions → return `{ ok:false, error:"FORBIDDEN" }`).
  RLS is the real protection, these checks give clean errors.
- RPC results are typed loosely by the generator (`Json`); cast to the types
  in `src/types/app.ts` (`Quote`, `CreateOrderResult`, `GiftPublic`, ...).

### Key database objects (see supabase/migrations for exact SQL)

- `profiles` (phone 87XXXXXXXXX, full_name, role client|admin, telegram_id, locale, saved_address)
- `genres`, `books` (paper_enabled/paper_price/stock, ebook_enabled/ebook_price/
  ebook_page_count/ebook_version/ebook_preview_pages, cover_url, cover_palette 0..3,
  is_published, is_featured, is_demo, sold_count, rating_avg/count, search_text)
- view `catalog_books` = books + genre names + final prices after promotions
  (`paper_final_price`, `ebook_final_price`, `min_price`, `discount_pct`, `ebook_available`)
- `promotions` (+`promotion_books`) automatic discounts; `promo_codes` (+`promo_code_books`, `promo_code_uses`)
- `banners`, `store_settings` (single row id=1: contacts, payment phone,
  delivery prices 1000/1500, gift wrap price, e-book protection limits, hero texts)
- `cart_items` (synced cart), `favorites`
- `orders`, `order_items`, `order_status_history`, `entitlements` (e-book library), `gifts`
- `reviews` (insert only if `has_purchased(book_id)`), `conversations`, `messages`
- `reading_progress`, `ebook_devices`, `ebook_access_log`, `telegram_tokens`
- RPCs: `quote_cart(p_items, p_promo_code, p_delivery_method, p_is_gift, p_gift_wrap)`,
  `create_order(p_payload)`, `mark_order_paid(p_order_id, p_receipt_path)`,
  `cancel_my_order(p_order_id)`, `admin_update_order(...)`, `get_gift(p_code)`,
  `open_gift`, `claim_gift`, `submit_gift_address(p_code, p_phone, p_address)`,
  `send_gift_thanks`, `received_gifts()`, `start_conversation(p_body, p_book_id, p_order_id)`,
  `mark_conversation_read`, `has_purchased`, `admin_dashboard(p_from, p_to)`,
  `admin_customers(p_search, p_limit, p_offset, p_sort)`, `admin_counters()`,
  `admin_delete_demo_data()`, `replace_cart(p_items)`, `my_counters()`,
  `catalog_stats()`, `list_authors()`.
- Order statuses: `pending_payment → payment_review → paid → shipped → delivered`,
  or `cancelled`. Digital-only orders jump from `paid` to `delivered`.
  Side effects (stock, entitlements, gifts, promo uses, history) are done by DB
  triggers — never re-implement them in TypeScript.
- Storage buckets: `covers` (public), `banners` (public), `ebook-pages` (private),
  `ebook-sources` (private), `receipts` (private, path `<user_id>/...`).
  Public URL helper: `publicStorageUrl(bucket, path)` in `src/lib/env.ts`.

**Schema changes**: do NOT change the database yourself. If you really need a
new column/function, write a new migration file
`supabase/migrations/20261021<4 digits>_<feature>.sql` (unique name) and say
so in your final report — the lead applies it and regenerates types.

## i18n (Kazakh default + Russian)

- Server: `const { t, locale, dict } = await getI18n()`.
- Client: `const { t, te, locale } = useI18n()`; `te(code)` translates RPC error codes from `errors`.
- Keys are type-checked: `t("catalog.title")`. Interpolation: `t("common.units.books", { count: 5 })`.
  Russian plural forms use `|`: `"{count} книга|{count} книги|{count} книг"`.
- Each feature owns its namespace files: `src/i18n/kk/<ns>.ts` and
  `src/i18n/ru/<ns>.ts`. Write Kazakh first (it defines the type), then the
  Russian file with exactly the same keys (`Dictionary["<ns>"]` type makes TS
  enforce it). Nested objects are fine. **Never hard-code UI text** in components.
- DB content: `localized(row, "description", locale)` picks `description_kk` / `description_ru` with fallback.
- Write natural, correct Kazakh (Cyrillic with ә, ғ, қ, ң, ө, ұ, ү, һ, і) and Russian.

## Design system (from the Claude Design mockup `design/unpacked/template.html`)

- Colors are CSS variables with light/dark values. Use the Tailwind names:
  `bg-page`, `bg-card`, `bg-card-2` (inputs), `bg-subtle`, `bg-chip`,
  `border-line`, `border-line-soft`, `text-ink`, `text-ink-2`, `text-muted`, `text-faint`,
  `bg-navy`/`bg-navy-2`/`bg-navy-3` (dark chrome: header, hero, footer, sidebar — navy in both themes),
  `bg-primary` + `text-on-primary` (navy buttons/active chips; lighter in dark mode),
  `bg-wine` / `hover:bg-wine-hover` (bordeaux CTA), `text-wine-ink` (bordeaux text, readable in dark),
  `bg-wine-soft`, `border-wine-line`, `text-gold`, `bg-gold-soft`,
  `success|info|warning|danger|violet` + `-soft` variants.
  **Never use raw hex colors or Tailwind palette colors (gray-500, white text on page)**
  for surfaces/text — they break dark mode. Exception: content on navy/bordeaux
  backgrounds may use `text-white`, `text-white/60`, `border-white/15`.
- Fonts: `font-serif` = Lora (page titles, book titles on covers, prices, hadith quote,
  big numbers), `font-sans` = Manrope (everything else). Titles: `font-serif font-semibold`.
- Shapes: cards `rounded-[18px]` or `rounded-2xl` with `border border-line bg-card`;
  buttons `rounded-xl`/`rounded-[15px]`; chips `rounded-full`; inputs `rounded-[13px]` h-[50px].
- Brand motifs: rotated square (`nk-diamond` utility, `LogoMark`), thin gold lines,
  navy hero with bordeaux glow (`nk-hero-bg`), typographic book covers (`BookCover`).
- Layout container: `nk-container` (max 1280, 16px gutter on phones).
- Must work at 360–430px phones, 768–1024 tablets, 1280+ laptops. No horizontal scroll.
  The phone bottom tab bar (shop and admin) covers the bottom 72px — pages already get `pb-24`.
- Animations available: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`,
  `animate-float`, `animate-wiggle`, `animate-pop`, skeleton `nk-skeleton`.

### Components to reuse

- `Button` / `buttonVariants({variant,size})` for links styled as buttons.
  Variants: primary (bordeaux), ink (navy), outline, ghost, soft, danger, light, glass.
- `Field`, `Label`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioCard`, `Switch` (`ui/field.tsx`).
- `PhoneInput`, `PasswordInput`, `CopyButton`, `Dropdown`, `confirmDialog()` (`ui/interactive.tsx`).
- `Modal` (bottom sheet on phones), `Segmented`, `ChipLink`/`ChipButton`,
  `Badge`/`OrderStatusBadge`/`CountBubble`, `Card`/`CardHeader`/`SectionTitle`,
  `Skeleton`, `Spinner`, `EmptyState`, `Price`, `RatingStars`, `Avatar`, `Pagination`, `ProgressBar`.
- `BookCover`, `BookCard`, `BookGrid`, `BookCardSkeleton`, `AddToCartButton`.
- `AdminPageHeader`, `AdminCard` for admin pages.
- `useSession()` → `{ user, counters, refreshCounters }` (client).
- Cart: `useCart()` store (`add`, `setQuantity`, `remove`, `removeMany`, `clear`, `lines`),
  `useCartBadge()`. Lines are `{ bookId, format, quantity }`; prices always come from
  the server (`quote_cart`).

## Code style

- Server Components by default; `"use client"` only where needed (state, effects, browser APIs).
- Mutations: Server Actions in a colocated `actions.ts` (`"use server"`), validate input
  with zod, return `{ ok: true, ... } | { ok: false, error: CODE }` (CODE = key of `errors`
  namespace or your own namespace), never throw to the client for expected errors.
  After writes call `revalidatePath(...)` for affected pages.
- Client forms: `useActionState` or `useTransition` + toast (`sonner`). Disable buttons while pending.
- Lint rules are strict (React compiler rules): don't call setState synchronously inside
  `useEffect`; derive state during render; use event handlers. Run `npx eslint <files>`.
- Accessibility: labels for inputs, `aria-label` on icon buttons, focus states, alt text.
- No `any`. Keep components small and readable; comments only where non-obvious.
- Money is integer tenge; display with `formatPrice()`. Dates with `formatDate*()` (Asia/Almaty).
- Phone numbers: store/compare normalized (`normalizePhone`), display `formatPhone`.

## Verifying your work

- `npx tsc --noEmit -p tsconfig.json` must pass (other features are being written
  at the same time — only fix errors in your own files; report others).
- `npx eslint <your files>` must pass.
- A dev server runs at http://localhost:3000 (do not start another one, do not run
  `next build`). You may `curl` your pages and use
  `MSYS_NO_PATHCONV=1 node scripts/screenshot.mjs /path C:/absolute/out/dir light 390 1280`
  to screenshot pages (PNG you can open with the Read tool). Use a Windows-style absolute
  output path. For signed-in pages set `COOKIES=<file.json>` (Playwright cookie list).
- Supabase CLI is logged in: `npx -y supabase@2.121.0 db query --linked "select ..."`
  runs read-only checks against the real database (do not modify data except
  test rows you create and delete again).
