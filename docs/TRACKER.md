# Artifact Hub Tracker

## Current phase

Phase 6 — Seed + Deploy + Verification

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

### Phase 4 — MCP Core Slice (complete)

API MCP routes (all require `x-api-key`, call same services as web routes, no visibility restriction):
* `GET /api/mcp/artifacts` — list with optional type/tags/visibility/limit/offset filters
* `GET /api/mcp/artifacts/[id]` — full detail: artifact + feedback list + 1-hour signed URL
* `POST /api/mcp/share` — create share link (delegates to createShareLink service)
* `POST /api/mcp/summarize` — cache-first summarize with artifact_id + force_refresh in body

MCP server (`mcp/` package — Node.js stdio, ESM):
* `mcp/src/client.ts` — HTTP helper reads `ARTIFACT_HUB_ADMIN_KEY` + `ARTIFACT_HUB_BASE_URL`
* `mcp/src/tools/artifacts.ts` — `list_artifacts`, `get_artifact` (human-readable text output)
* `mcp/src/tools/share.ts` — `create_share_link`
* `mcp/src/tools/summarize.ts` — `summarize_feedback`
* `mcp/src/index.ts` — McpServer + StdioServerTransport entry point
* `mcp/tsconfig.json` — node16 module resolution, compiles to `mcp/dist/`
* `ARTIFACT_HUB_BASE_URL` added to `.env.example`
* `mcp/dist/` added to `.gitignore`
* Web `npm run build` clean — 15 routes (4 new MCP routes registered)
* `cd mcp && npm run build` clean — 6 JS files compiled, TypeScript OK

### Phase 5 — MCP Extended (complete)

* `src/lib/services/feedback.ts` — added `updateFeedbackStatus` (PGRST116 → 404, else 500)
* `POST /api/mcp/artifacts` — publish artifact; same validation + auto share-link logic as web route
* `POST /api/mcp/feedback` — add feedback (no visibility gate; MCP key = access grant)
* `PATCH /api/mcp/feedback` — update feedback status (MCP/API-only)
* `mcp/src/client.ts` — added `patch()` helper
* `mcp/src/tools/publish.ts` — `publish_artifact` (returns URL or share link based on visibility)
* `mcp/src/tools/feedback.ts` — `add_feedback`, `update_feedback_status`
* All 7 MCP tools registered in `mcp/src/index.ts`
* Web build clean — 17 routes; MCP `tsc` clean

### Pre-Phase-6 MCP hardening (complete)

Fixes from MCP workflow review before Phase 6:
* **B1 — env var name** — `ARTIFACT_HUB_API_KEY` → `ARTIFACT_HUB_ADMIN_KEY` in `WRITEUP.md` and design doc; now matches `mcp/src/client.ts` and `src/lib/auth.ts`
* **B2 — startup warning** — `mcp/src/index.ts` writes to stderr (not stdout) when `ARTIFACT_HUB_ADMIN_KEY` or `ARTIFACT_HUB_BASE_URL` is missing, so misconfigured Claude Desktop shows a clear error instead of opaque 401s
* **I1 — baseUrl deduplication** — exported from `mcp/src/client.ts`; `share.ts` and `publish.ts` import it instead of re-reading the env var inline
* **I2 — feedback failure surface** — `GET /api/mcp/artifacts/[id]` now returns `feedbackError: string | null`; `get_artifact` tool renders "(Could not load feedback: …)" and "Feedback (unavailable):" header instead of silent empty list
* **I3 — URLSearchParams.size** — replaced with `params.toString().length > 0` for Node 18 LTS compatibility
* **I4 — timing-safe auth** — `src/lib/auth.ts` uses `crypto.timingSafeEqual` with same-length guard
* **P2 — approval_count: 0** — always shown in `summarize_feedback` output (was omitted when zero)
* Both builds clean: web (17 routes), mcp (tsc)

### Phase 6 — Seed + Deploy + Verification (code complete; deployment pending)

Code deliverables:
* `supabase/seed-files/product-roadmap.html` — HTML product roadmap (AI-generated design doc)
* `supabase/seed-files/brand-mockup.svg` — SVG brand identity mockup (image artifact)
* `supabase/seed.sql` — placeholder comment pointing to seed script
* `supabase/seed.mjs` — full seed script: uploads 3 files to Supabase Storage, inserts 3 artifacts + 15 feedback entries (5 per artifact, all 4 types); idempotent with --force flag; inline PDF generator with correct xref byte offsets
* `package.json` — added `"seed": "node supabase/seed.mjs"` script
* `CLAUDE.md` — updated seed command documentation
* `mcp/README.md` — Claude Desktop config JSON, env var table, all 7 tools documented, example conversation
* `WRITEUP.md` — complete final writeup (all draft sections replaced with prose)
* Build clean — 17 routes, TypeScript OK

Manual steps remaining:
1. Run `npm run seed` to populate Supabase with sample data
2. Deploy to Vercel with all 6 env vars set
3. Smoke-test key flows on live URL
4. Run all 7 MCP tools against deployed URL in Claude Desktop
5. Fill in live URL + demo admin key in WRITEUP.md
6. Copy session logs to `sessions/` folder per requirements.md

## In progress

* Manual deployment and verification

## Blockers and decisions

* Live URL and demo admin key not yet committed — fill in WRITEUP.md after Vercel deploy

## Blockers and decisions

* **LLM provider switched to Gemini** — `@anthropic-ai/sdk` removed; `@google/genai` installed. Summarization will use `GEMINI_API_KEY` + `GEMINI_MODEL` (default `gemini-2.5-flash`). Decision: avoid unnecessary Anthropic API costs; Gemini Flash is sufficient for text-only feedback summarization.
* **Manual Supabase setup required before Phase 2 can use real data:**
  1. Create a Supabase project
  2. Run `supabase/migrations/001_initial.sql` (`npx supabase db push`)
  3. Create a private `artifacts` storage bucket
  4. Fill in `.env.local` with real credentials (`GEMINI_API_KEY` instead of `ANTHROPIC_API_KEY`)
* No code blockers
