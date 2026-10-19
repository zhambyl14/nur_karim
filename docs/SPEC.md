# Nur Karim — product specification

Online bookstore for Kazakhstan (Astana-based). Works on phones, tablets and
laptops. Languages: Kazakh (default) and Russian. Light and dark theme.
Visual design: `design/unpacked/template.html` (Claude Design mockup) — navy +
bordeaux + thin gold, Lora + Manrope, typographic book covers.

## Roles

| Role | Can |
|------|-----|
| Guest (not signed in) | browse home, catalog, search & filters, book pages, reviews, authors, info pages; add to cart (stored locally); open a gift link; read free preview pages of an e-book |
| Client | everything a guest can + checkout, orders & payment receipts, e-book library & reader, reviews (only for purchased books), private questions to the seller, favorites, gifts (send / receive), profile settings |
| Admin | everything: dashboards, orders, books (paper & e-book), genres, promotions, promo codes, banners, customers, reviews moderation, messages, settings |

- One login page for everybody: phone + password. There is no role switch on the login page.
- Registration is ONLY through the Telegram bot (proves a real person + real phone).
  Nobody can register as admin; admins are promoted in the database / with `scripts/create-user.mjs`.
- Phone is the login. Supabase Auth stores it as e-mail `87XXXXXXXXX@karim.kz`.

## Registration via Telegram

1. Site `/register` explains the 3 steps and has a big «Telegram арқылы тіркелу» button
   → `https://t.me/<bot>?start=register` (`telegramBotLink("register")`).
2. Bot `/start` → greeting + reply keyboard button «📱 Тіркелу» (`request_contact: true`)
   + text «Тіркелу үшін төмендегі батырманы басып, нөміріңізбен бөлісіңіз».
3. User shares contact → bot checks `contact.user_id === from.id` (own number only),
   normalizes the phone (87XXXXXXXXX) and:
   - new phone → creates a one-time `register` token (30 min) and sends an inline
     button «Тіркелуді аяқтау» → `${SITE_URL}/register/complete?token=…`;
   - phone already registered → sends a `reset` token link «Құпиясөзді жаңарту» → `/reset?token=…`.
4. `/register/complete?token=` → shows the masked phone, asks full name + password (min 8)
   + confirmation → server creates the auth user (service role, email_confirm) with metadata
   `{ phone, full_name, telegram_id, telegram_username, locale }`, marks the token used,
   signs the user in and redirects to `/` (or `next`). Bot sends «Тіркелу сәтті аяқталды».
5. Forgot password: `/forgot` → «Telegram ботқа өтіп, /reset жіберіңіз» (button opens
   `t.me/<bot>?start=reset`) → bot asks to share the contact again → reset link →
   `/reset?token=` → new password.
6. Bot also understands `/orders` (last 5 orders with status for the linked account),
   `/help`. Bot texts are in Kazakh or Russian by Telegram `language_code`.
7. Webhook: Supabase Edge Function `telegram-bot` (verify `X-Telegram-Bot-Api-Secret-Token`).

## Catalog

- Home: navy hero with the hadith quote (texts from settings), search, stats
  (books in catalog, e-books, «ҚР бойынша жеткізу»), stacked covers + «Аптаның кітабы»
  (featured book). Admin banners carousel (auto-sliding, swipe, dots) right below the hero.
  Sections: genre chips, new books, discounted books, e-books, popular, «Досыңа сыйла» promo
  block, e-book promo block («бір рет сатып алыңыз, мәңгі оқыңыз»), why us / delivery info.
- Catalog `/catalog`: search `q`, filters (genre, format paper/e-book, price range, language,
  on sale, in stock, author), sort (new, popular, price ↑↓, rating, title), pagination,
  active filter chips, mobile filter sheet. Empty state.
- Book page `/books/[slug]`: cover (+ gallery), title, author, № catalog, genre, rating,
  format switch (paper / e-book with prices & discount), stock, description (kk/ru),
  details (publisher, year, pages, ISBN, cover type, language), add to cart, buy as a gift,
  favorite, «Сатушыға сұрақ» (private chat), e-book preview («Үзінді оқу») when preview pages > 0,
  reviews list + review form (only buyers; others see why they cannot review),
  related books (same genre / author). Share link. SEO metadata + JSON-LD Book/Offer.
- Authors `/authors`: alphabetical list with counts → catalog filtered by author.
- Info pages: `/delivery`, `/payment`, `/contacts`, `/about` (texts + store settings).

## Cart & checkout

- Cart works for guests (localStorage) and is synced to the account for signed-in users
  (same cart on phone and laptop). Prices always from `quote_cart`.
- Promo code field («Промокод — Қолдану») with clear error messages.
- Checkout requires login (guest → `/login?next=/checkout`).
- Delivery (only if there are paper books):
  - **Astana courier — 1000 ₸** (setting): street, house, apartment/office, entrance/floor,
    comment, recipient name & phone (prefilled from the account).
  - **Kazakhstan, Kazpost — 1500 ₸** (setting): region (17 oblasts + Almaty, Shymkent),
    city/settlement (list + «other»), postal index (6 digits), street, house, apartment,
    recipient full name (as in ID) and phone.
  - E-books only → no delivery.
  - Optional free-delivery threshold (setting).
- Payment: bank transfer to the store's phone number (Kaspi). After placing the order the
  client sees the amount, phone, recipient name, the order number to write in the comment,
  can upload a receipt (image/PDF) and press «Төледім». Admin confirms → e-books unlock.
  Unpaid orders auto-cancel after N hours (setting, default 72) and stock returns.
- Order page `/orders/[number]`: status timeline, items, delivery, totals, payment block,
  tracking number (Kazpost), cancel (only while unpaid), «Сұрақ қою» about the order.

## «Досыңа сыйла» — gift a book (signature feature)

- Start from a book page («Сыйлау») or switch checkout to «Сыйлық» mode.
- Gift settings: friend's name & phone, postcard theme (Туған күн, Рахмет, Құттықтаймын,
  Мереке, Ұстазыма, Отбасыма, Жай ғана, Классика) with a live postcard preview, personal
  message (600 chars), sign as me / anonymously, optional «ашылу уақыты» (reveal date —
  the gift page shows a countdown and hides books & message until then), hide prices,
  gift wrap (+price from settings) for paper books.
- Paper delivery for gifts: «Мекенжайды өзім жазамын» (normal address) or
  «Досым өзі жазсын» — only choose Astana courier / Kazpost (fee), the friend fills the
  address on the gift page (phone check).
- After payment confirmation the sender gets a gift link `/gift/<code>` + QR code +
  share buttons (WhatsApp, Telegram, copy). If the friend already has an account with that
  phone, the bot notifies them.
- Gift page: animated envelope/box opening, postcard with message and sender, books,
  e-books → «Кітапханама қосу» (sign in with the gift phone → added to library),
  address form when needed, delivery status, «Рахмет айту» (thank-you note shown to the
  sender + Telegram notification).
- `/gifts` landing page explains the feature; `/account/gifts` lists sent and received gifts.

## E-books

- Admin uploads a PDF; the browser renders pages to WebP and uploads them to the private
  bucket `ebook-pages/<bookId>/v<version>/<page>.webp`. Original PDF optionally kept in
  `ebook-sources` (admin only). Never public.
- Reader `/read/[bookId]`: pages are served by `/api/reader/<bookId>/<page>` only to
  owners (or preview pages to anyone) with a visible watermark burned into the image
  (phone + name + date), `no-store`, rate limit (settings), device limit (settings),
  access log. Pages are drawn on `<canvas>`, no text layer, no right click / drag / select,
  print blocked, blur when the tab is hidden. Reading progress is saved
  («Оқып жатырсыз · 62% · Жалғастыру»). Zoom, page jump, keyboard / swipe navigation,
  light / sepia / dark reading background.
- Library `/account/library`: e-books with progress + orders summary (design screen
  «Менің кітаптарым»).

## Reviews & questions

- Reviews: rating 1–5 + text, only if the client bought the book (`has_purchased`).
  One per book, editable. Admin can hide, reply, delete.
- «Сатушыға сұрақ»: private conversation client ↔ store about a book (or an order or general).
  Visible only to that client and admins. Realtime chat UI. `/account/messages` and
  `/admin/messages`. Telegram notifications both ways. Unread badges.

## Admin

- Dashboard (design 1e): greeting, date range presets (today, 7 days, 30 days, this
  month, last month, this year, custom), KPI cards with change vs previous period
  (revenue, orders, average order, items sold, new customers), «to do» (payments to check,
  orders to ship, gifts waiting for address, low stock, unread messages), revenue & orders
  by day chart, by month (12 months), by city (bar + table), top books, by genre (donut),
  paper vs e-book, delivery methods, order status distribution, weekday × hour heatmap,
  promo code usage, top customers, low stock list, recent orders. All data from `admin_dashboard`.
- Orders: list with filters (status tabs with counts, search by number/name/phone, city,
  delivery method, date range, gift), detail page (items, prices, discounts, promo, delivery
  & recipient, gift info, payment receipt preview, status history, admin note), actions
  (confirm payment, back to «await payment», ship with Kazpost tracking number, delivered,
  cancel with reason), print packing slip, CSV export, Telegram notification to the client
  on every status change.
- Books: list (search, genre, format, published/draft, low stock), create/edit form:
  titles, author, genre, descriptions kk/ru, language, publisher, year, pages, ISBN,
  cover type, tags, cover upload (+ gallery), typographic cover palette, paper (price,
  stock), e-book (price, PDF upload via EbookUploader, preview pages), featured,
  published, slug (auto transliteration). Duplicate, delete (or unpublish if ordered).
- Genres CRUD (kk/ru names, slug, order, active).
- Promotions («акция»): percent/fixed, scope all / genre / chosen books, format scope,
  dates, active; preview of affected books.
- Promo codes: code, percent/fixed, scope, format, min order, total limit, per-user limit,
  dates, active, usage stats.
- Banners: image (desktop + mobile), titles/subtitles/button kk/ru, link, text theme,
  order (drag or arrows), dates, active; preview.
- Customers: search, sort, totals, detail (orders, e-books, devices reset, conversations).
- Reviews moderation; Messages inbox; Settings (store contacts, payment details, delivery
  prices, free delivery threshold, gift options, e-book protection, hero texts, auto-cancel,
  Telegram notifications, delete demo data).
