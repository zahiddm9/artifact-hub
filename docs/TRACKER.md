# Artifact Hub Tracker

## Current phase

Phase 2 — Core Web

## Done

* Design plan completed (`docs/plans/2026-05-28-artifact-hub-design.md`)
* WRITEUP.md skeleton started with draft decision notes
* `requirements.md` present

### Phase 1 — Foundation (complete)

* Next.js 16 initialized (App Router, TypeScript, Tailwind v4, ESLint)
* Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`, `nanoid`
* `supabase/migrations/001_initial.sql` — full schema: enums, `artifacts`, `feedback`, `share_links`, `feedback_summaries` tables with indexes
* `src/types/index.ts` — all domain types + service result helper
* `src/lib/supabase.ts` — browser client, SSR server client, admin client
* `src/lib/storage.ts` — signed URL generation (public 1h, share-link capped at `min(1h, remaining)`) + upload helper
* `src/lib/auth.ts` — `requireMcpAuth` / `isMcpAuthorized` for `/api/mcp/*` routes
* `.env.example` + `.env.local` template (no real values committed)
* `.gitignore` protects `node_modules`, `.next`, and all `.env*.local` files
* `npm run build` passes clean (TypeScript OK, no warnings)

## In progress

* Phase 2 — Core Web (not started yet)

## Blockers and decisions

* **LLM provider switched to Gemini** — `@anthropic-ai/sdk` removed; `@google/genai` installed. Summarization will use `GEMINI_API_KEY` + `GEMINI_MODEL` (default `gemini-2.5-flash`). Decision: avoid unnecessary Anthropic API costs; Gemini Flash is sufficient for text-only feedback summarization.
* **Manual Supabase setup required before Phase 2 can use real data:**
  1. Create a Supabase project
  2. Run `supabase/migrations/001_initial.sql` (`npx supabase db push`)
  3. Create a private `artifacts` storage bucket
  4. Fill in `.env.local` with real credentials (`GEMINI_API_KEY` instead of `ANTHROPIC_API_KEY`)
* No code blockers
