# Artifact Hub Tracker

## Current phase

Phase 4 — MCP Core Slice

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

### Phase 2 — Core Web (complete)

* `src/lib/services/artifacts.ts` — listArtifacts, getArtifact, createArtifact
* `src/lib/services/share.ts` — createShareLink, validateShareLink (expiry checked)
* API routes: `GET/POST /api/artifacts`, `GET /api/artifacts/[id]`, `GET /api/artifacts/[id]/preview`, `POST /api/share`, `GET /api/share/[token]`
* Components: ArtifactCard, GalleryFilter (URL-based filter state), ArtifactPreview (image/PDF/sandboxed HTML), ShareButton, PublishForm
* Pages: gallery (`/`), artifact detail (`/artifacts/[id]`, 403 for unlisted), share link view (`/share/[token]`), publish (`/publish`)
* Auto-share-link created on publish for unlisted artifacts; success screen shows copy-able URL
* `npm run build` clean — all 9 routes registered

### Phase 3 — Feedback + LLM (complete)

* `src/lib/services/feedback.ts` — listFeedback, addFeedback
* `src/lib/services/summarize.ts` — getCachedSummary, getSummary (cache-first: returns cached if feedback_count unchanged; calls Gemini + upserts when missing, stale, or force_refresh=true)
* API routes: `GET/POST /api/artifacts/[id]/feedback`, `POST /api/artifacts/[id]/summarize`
* Components: FeedbackList (server, type/status badges), FeedbackForm (client, router.refresh() on submit), FeedbackSummary (client, stale badge + generate/regenerate button, digest panels)
* Detail page and share link page both updated with feedback + summary sections
* Prompt version stored as "v1"; model name stored per summary row for transparency
* `npm run build` clean — 11 routes registered

### Pre-Phase-4 hardening (complete)

TypeScript reviewer findings addressed before MCP integration:
* **Gemini JSON validation** — `getCachedSummary` now propagates real DB errors (only returns null on PGRST116); `getSummary` distinguishes artifact 404 vs 500; `response.text` checked for empty before `JSON.parse`; parsed result validated with `isValidSummaryData` guard before storing
* **Enum input validation** — `POST /api/artifacts` validates `type` and `visibility` against allowed enum values, validates `tags` shape, builds typed `CreateArtifactBody` (no more `as any`); `POST /api/artifacts/[id]/feedback` validates `feedback_type` enum and builds typed `CreateFeedbackBody`
* **Pagination guard** — `GET /api/artifacts` returns 400 on non-integer or negative `limit`/`offset` (was passing NaN to Supabase)
* **`storage_path` stripped** — removed from all public API responses: `GET/POST /api/artifacts`, `GET /api/artifacts/[id]`, `GET /api/share/[token]`; `ArtifactPublic = Omit<Artifact, "storage_path">` added to types
* **`createShareLink` existence check** — service now verifies artifact exists before insert; bad `artifact_id` returns clean 404 instead of raw FK constraint error
* **Visibility on feedback GET** — `GET /api/artifacts/[id]/feedback` now checks visibility and returns 403 for unlisted artifacts (matching `/api/artifacts/[id]` policy); POST still allows feedback from share-link holders
* Build clean — all 11 routes, TypeScript OK

## In progress

* Phase 4 — MCP Core Slice (not started yet)

## Blockers and decisions

* **LLM provider switched to Gemini** — `@anthropic-ai/sdk` removed; `@google/genai` installed. Summarization will use `GEMINI_API_KEY` + `GEMINI_MODEL` (default `gemini-2.5-flash`). Decision: avoid unnecessary Anthropic API costs; Gemini Flash is sufficient for text-only feedback summarization.
* **Manual Supabase setup required before Phase 2 can use real data:**
  1. Create a Supabase project
  2. Run `supabase/migrations/001_initial.sql` (`npx supabase db push`)
  3. Create a private `artifacts` storage bucket
  4. Fill in `.env.local` with real credentials (`GEMINI_API_KEY` instead of `ANTHROPIC_API_KEY`)
* No code blockers
