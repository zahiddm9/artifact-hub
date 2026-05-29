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
6. Copy session logs to `claude-sessions/` folder (note: requirements.md says `sessions/` but the submission folder is `claude-sessions/`)

### Phase 7 — Frontend Polish (in progress)

Design direction audit completed. Plan saved to `docs/plans/2026-05-29-frontend-polish.md`.

Five batches, no new libraries, no structural changes:
- Batch 1 — Foundation: fix Arial font override in globals.css, add global focus-visible ring + button cursor
- Batch 2 — Nav consistency: align header widths, hover/transition on logo and back link
- Batch 3 — Interactive element polish: filter transitions, card micro-lift, ShareButton/FeedbackSummary cursor
- Batch 4 — Mobile form fixes: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` on FeedbackForm + PublishForm
- Batch 5 — Transition consistency pass: tag pills, any remaining untransitioned hovers

Files involved: `src/app/globals.css`, `src/app/page.tsx`, `src/app/artifacts/[id]/page.tsx`, `src/app/publish/page.tsx`, `src/app/share/[token]/page.tsx`, `src/components/ArtifactCard.tsx`, `src/components/GalleryFilter.tsx`, `src/components/ShareButton.tsx`, `src/components/FeedbackForm.tsx`, `src/components/FeedbackSummary.tsx`, `src/components/PublishForm.tsx`.

**Batch 1 — Complete** (commit `92f68bc`)
- Removed `font-family: Arial` override — Geist Sans now loads correctly from `--font-geist-sans`
- Added `cursor: pointer` globally for `button`, `[role="button"]`, `label[for]`, `summary`
- Added `:focus-visible` outline system: 2px zinc-900 (#18181b), 4px radius, 2px offset

**Batch 2 — Complete** (commit `f6a0922`)
- All four page headers unified to `max-w-6xl` — logo stays at x=88px on every page (verified via Playwright bounding box)
- Logo link: `transition-colors duration-150 hover:text-zinc-600` on all pages
- "← Gallery" / "← Back" links: `transition-colors duration-150` on publish and detail pages
- Playwright verification: widths match ✓, logo x-positions match ✓, hover colors change ✓, focus ring 2px ✓

**Batch 3 — Complete** (commit `1a009c3`)
- ArtifactCard: `hover:-translate-y-0.5 duration-150` — card lifts 2px on hover (verified: `translate` idle=`none` → hover=`0px -2px`)
- GalleryFilter type buttons: `transition-colors duration-150` — active state flip is now animated; Clear link same
- ShareButton copy button: `transition-colors duration-150`
- FeedbackSummary both buttons: `transition-colors duration-150`
- Note: `cursor:pointer` on all buttons already provided by global CSS rule from Batch 1; Tailwind v4 uses standalone `translate` CSS property not `transform`

**Batch 4 — Complete** (commit `db70c36`)
- FeedbackForm: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` on name/role row
- Verified via Playwright: 375px → single 375px-wide column; 768px → two 378px columns
- PublishForm: no grid-cols-2 bug existed — audit note was incorrect, no change needed

**Batch 5 — Complete** (commit `7520c62`)
- artifacts/[id]/page.tsx: tag pills + unlisted back link
- FeedbackForm: "Add another" success button
- page.tsx: empty state "Publish the first one" button
- PublishForm: copy button, View artifact link, Back to gallery link, Publish another button, file input file-button (`file:transition-colors file:duration-150`)
- Final grep: zero remaining `hover:` classes without a matching `transition` across all components and pages
- All transitions confirmed at 150ms via Playwright CSS evaluation

### Phase 7 — Frontend Polish complete

All 5 batches committed. Manual smoke test checklist from plan:
- [ ] Typography: Geist Sans renders (not Arial)
- [ ] Focus rings: visible zinc-900 ring on all nav/button/link elements via Tab
- [ ] Cursor: pointer on all buttons across all pages
- [ ] Card lift: hover shows -2px translate with smooth 150ms transition
- [ ] Filter transitions: type button active/inactive flip is animated
- [ ] Mobile 375px: FeedbackForm name/role fields stack vertically
- [ ] Nav width: stays consistent across gallery → detail → publish
- [ ] Logo hover: zinc-900 → zinc-600 fade
- [ ] Tag pills: bg-zinc-100 → bg-zinc-200 fade on hover
- [ ] Build: `npm run build` passes with 17 routes, no TS errors ✓

### Phase 8 — Violet Accent + Filter Loading (in progress)

Design direction: Direction 1 (Violet). Single accent `#7c3aed` (violet-600) applied to all primary interactive elements. Zinc structure, backgrounds, borders, text, and semantic badges untouched.

Plan: `docs/plans/2026-05-29-violet-accent.md`

Tasks:
1. `globals.css` — `:focus-visible` outline → violet-600
2. `src/app/page.tsx` — Publish nav button + empty state CTA → violet
3. `src/components/GalleryFilter.tsx` — active tab → violet, input ring → violet, `useTransition` spinner
4. `src/components/FeedbackSummary.tsx` — Summarize button → violet
5. `src/components/FeedbackForm.tsx` — submit + inputs + radio accent → violet
6. `src/components/PublishForm.tsx` — submit + View artifact + file button + inputs + radio → violet
7. Final build + lint + Playwright verify + TRACKER update

**Complete** — 7 commits:
- `db1a6a7` globals.css: `:focus-visible` outline → violet (#7c3aed initially)
- `df37261` page.tsx: Publish nav button + empty state CTA → violet-600
- `bfa0b61` GalleryFilter: active tab → violet, focus ring → violet, `useTransition` spinner
- `035c0ee` FeedbackSummary: Summarize button → violet
- `ed31cdb` FeedbackForm: submit + inputs + radio accent → violet
- `beda1ba` PublishForm: submit + View artifact + file button + inputs + radio → violet
- `c3d2b39` Fix focus-visible to exact Tailwind v4 violet-600 value (#7f22fe)

Verification: compiled CSS confirms all violet classes present — `bg-violet-600`, `hover:bg-violet-700`, `accent-violet-600`, `file:bg-violet-600`, `focus:ring-violet-600`, `animate-spin`, `:focus-visible #7f22fe`. Build clean, lint warnings pre-existing (not in modified files).

Unchanged as planned: all zinc structural classes, semantic badges (red/green/blue/amber), secondary outlined buttons, text colors, borders, backgrounds.

### Engineering Quality Pass (complete)

Product-quality gap audit completed via `product-requirements-reviewer` agent. Plan: `docs/plans/2026-05-29-engineering-quality-fixes.md`.

**Lint fixes (commit `9535b4f`)**
- `src/components/ThemeProvider.tsx` — replaced `useEffect` + `setThemeState` with lazy `useState` initializer reading localStorage; separate DOM-only effect for `applyTheme`. Fixes `react-hooks/set-state-in-effect`.
- `src/app/share/[token]/page.tsx` — replaced `Date.now()` with `new Date().getTime()`. Fixes `react-hooks/purity`.
- Result: `npm run lint` → 0 errors, 7 warnings (all pre-existing intentional `_` unused vars)

**Dead code removal (commit `d0f58c0`)**
- `src/lib/supabase.ts` — removed `createBrowserClient`, `createSupabaseServerClient`, and `@supabase/ssr` import. These were never called and implied a cookie-based SSR auth layer that doesn't exist. `createAdminClient` is the only export.

**Vitest + tests (commit `87bd765`)**
- `vitest` installed as devDependency
- `vitest.config.ts` — node environment, `@` alias matching tsconfig
- `package.json` — added `test`, `test:run`, `typecheck` scripts
- `src/lib/auth.ts` — `import` → `import type` for `NextRequest` (correct; only used as type annotation)
- `src/lib/services/summarize.ts` — exported `isValidSummaryData` for testing
- `src/lib/auth.test.ts` — 5 tests for `isMcpAuthorized` (correct key, wrong key same length, length mismatch, missing header, missing env var)
- `src/lib/services/summarize.test.ts` — 11 tests for `isValidSummaryData` (valid shape, empty arrays, null, string, each missing/wrong-typed required field)
- All 16 tests pass in ~267ms

**GitHub Actions CI (commit `e0ef154`)**
- `.github/workflows/ci.yml` — runs on push to `main` and all PRs: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test:run`
- No `next build` (avoids secrets/prerender failure; Vercel handles production builds)

**Remaining P0 gaps (not yet addressed):**
- RLS migration `002_rls.sql` — SQL written in `docs/plans/2026-05-29-product-correctness-fixes.md`, needs `npx supabase db push`
- Session logs — need copy to `claude-sessions/` and commit
- Walkthrough — needs section added to WRITEUP.md

### Finishing Improvements Pass (complete)

Plan: `docs/plans/2026-05-29-finishing-improvements.md`. 9 commits covering UX polish, MCP workflow quality, and the owner/visitor demo model.

**UX polish**
- `fa43ae6` — PDF fallback "Open in new tab ↗" link below iframe (`ArtifactPreview.tsx`). Fixes blank box on mobile/iOS Safari for required content type.
- `c071675` — Gallery subtitle: "Browse and manage" → "Browse, review, and share AI-generated content"; summary footer adds `generated_at` timestamp (`page.tsx`, `FeedbackSummary.tsx`).
- `92463c1` — Share link expiry always visible below artifact title; expired/not-found page copy is now actionable ("Ask the sender to create a new link…") (`share/[token]/page.tsx`).
- `e338fdf` — ShareButton: `cursor-pointer` on both buttons; Copy shows "Copied!" in green for 2 seconds then resets (`ShareButton.tsx`).

**Owner/visitor demo toggle**
- `98f3342` — Gallery toggle: Visitor (public-only, read-only) vs Owner (all artifacts including unlisted with amber badge). `clearAll` preserves `?view=` param. (`page.tsx`, `ArtifactCard.tsx`, `GalleryFilter.tsx`).
- `85bc4e7` — Visitor mode hides Publish button; owner banner updated to "Owner view — you can see and publish all artifacts including unlisted." (`Header.tsx`, `page.tsx`).
- Share link and direct artifact detail pages remain open for feedback regardless of mode — those are for explicitly invited reviewers.

**MCP workflow quality**
- `9db7793` — Next-step hints added to all 7 tool responses: `list_artifacts` → get_artifact prompt; `get_artifact` → summarize or add_feedback based on feedback count; `add_feedback` → suggest summary; `update_feedback_status` → regenerate digest on resolve; `create_share_link` → explains what the link enables; `publish_artifact` → suggests next action; `summarize_feedback` → adds `generated_at` to metadata line. MCP dist rebuilt.

**Final state:** 0 lint errors · typecheck clean · 16/16 tests pass · MCP builds clean.

### Owner Delete + Edit Pass (complete)

Plan: `docs/plans/2026-05-29-owner-delete-edit.md`. Full CRUD for owner mode — delete and edit artifacts, delete individual feedback items.

**Service layer**
- `e2caed4` — `deleteArtifact` (removes storage file + DB row, cascade cleans feedback/share_links/summaries) + `updateArtifact` (PATCH title/description/tags/visibility) added to `artifacts.ts`. `UpdateArtifactBody` added to `types/index.ts`.
- `311a12f` — `deleteFeedback` added to `feedback.ts`.

**API routes**
- `70ffb8f` — `DELETE /api/artifacts/[id]` + `PATCH /api/artifacts/[id]` added to existing route file.
- `311a12f` — `DELETE /api/feedback/[id]` (new route file).

**Gallery — owner mode controls**
- `c6a0868` — `isOwnerView` propagated through `GalleryFilter` → `ArtifactCard`; cards link to `/artifacts/[id]?view=owner` in owner mode.
- `1f09fec` — `DeleteCardButton`: trash icon overlaid on each gallery card in owner mode; two-click confirm (first click → "Delete?" for 3s, second click → DELETE + refresh).

**Detail page — owner mode controls**
- `110e778` — `ArtifactActions` client component: inline edit form (title, description, tags, visibility with select) + delete confirm ("Delete this artifact and all its feedback?" → "Yes, delete" → redirects to owner gallery). Shown only when `?view=owner`.
- `311a12f` — `DeleteFeedbackButton` on each feedback item in owner mode (same two-click confirm pattern).

**Bug fix**
- `7161ed0` — Unlisted artifacts blocked owner access on detail page (`if (visibility === "unlisted")` ran before `isOwnerView` check). Fixed to `if (visibility === "unlisted" && !isOwnerView)`.

**MCP**
- `bebbd14` — `delete_artifact` + `update_artifact` tools registered. `del()` helper added to `mcp/src/client.ts`. Now 9 MCP tools total.

### Hydration + Script Fix (complete)

- `4de90b8` — Reverted `ThemeProvider` lazy `useState` initializer (caused server/client theme mismatch → hydration crash). Back to `useState(DEFAULT_THEME)` + mount-only `useEffect` with `// eslint-disable-next-line` comment. Replaced `<script dangerouslySetInnerHTML>` in `<head>` with `<Script strategy="beforeInteractive">` from `next/script` to silence React 18 script-in-component warning.

### Product Polish Pass (complete)

- `cff78a8` — Gallery subtitle: "Browse, review, and share AI-generated content" → "Browse, review, and share content".
- `311a12f` — Feedback deletion available to owner on artifact detail page.

### Rate Limiting (complete)

- `43a2050` — `src/middleware.ts`: per-IP fixed-window rate limiting on the four open POST endpoints. Limits: publish 10/min, feedback 30/min, share 20/min, summarize 5/min. Returns 429 with `Retry-After` header. In-memory store (per-instance); comment notes Upstash Redis as the multi-instance upgrade path.

### Test Expansion (complete)

- `0148c88` — Extracted `isShareLinkExpired(expiresAt)` from `validateShareLink` and `checkRateLimit(store, key, max, windowMs, now)` from middleware as pure exported functions. Added two new test files:
  - `src/lib/services/share.test.ts` — 4 tests: past, future, 1ms expired, 1ms remaining (access-control boundary)
  - `src/middleware.test.ts` — 4 tests: first request, up to max, max+1 blocked with retryAfter, window reset
  - Total: **24 tests across 4 files**, all passing

**Final state:** 0 lint errors · typecheck clean · 24/24 tests pass · MCP builds clean (9 tools).

## In progress

* P0 gap resolution: RLS migration, session logs, walkthrough

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
