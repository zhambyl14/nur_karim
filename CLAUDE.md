@AGENTS.md

# Nur Karim — online bookstore (Next.js 16 + Supabase)

- Product requirements: `docs/SPEC.md`. Architecture & conventions: `docs/ARCHITECTURE.md` (read before coding).
- Design source: `design/unpacked/template.html` (Claude Design export, unpacked).
- Supabase project ref `shwlwcnjwvvdhaajvyzn`; CLI is linked (`npx -y supabase@2.121.0 ...`).
  Migrations live in `supabase/migrations` and are applied with `db push --linked`;
  regenerate types with `gen types typescript --linked --schema public > src/types/database.ts`.
- UI text is never hard-coded: Kazakh (`src/i18n/kk`) defines the keys, Russian (`src/i18n/ru`) must match.
- Light and dark themes: only use the design tokens (`bg-card`, `text-ink`, `bg-wine`, ...).
- Checks: `npx tsc --noEmit -p tsconfig.json`, `npx eslint src`, `npm run build`.
- Test accounts (dev): client 87000000001 / NurKarim-test-1, admin 87000000002 / NurKarim-admin-1.
- Visual QA: `MSYS_NO_PATHCONV=1 node scripts/screenshot.mjs /path C:/abs/out light 390 1280`
  (`COOKIES=.qa/client-cookies.json` for signed-in pages; create with `scripts/make-cookies.mjs`).
