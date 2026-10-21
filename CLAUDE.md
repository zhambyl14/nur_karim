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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Token economy (weekly limit was hit once — keep usage low)

- Do the work inline. Do NOT start Workflow runs or fan out subagents for routine edits; one focused agent at most, and only for genuinely independent large tasks. Never use workflows for QA sweeps or design passes unless the owner asks.
- Start from the graph (`graphify query`), read only the lines it points to, and use `Grep`/`Read` with offsets instead of whole files.
- Do not screenshot every page at every width: check the one page you changed, 390px + 1280px, light only unless dark mode is the point.
- `/compact` when the conversation gets long; keep tool output short (`| head`, `tail`).
- After code changes: `graphify update .` (AST only, free), then commit and `git push origin dev:main` then `git push origin dev` (Vercel deploys main).
