# Artifact Hub — Writeup

**Live app:** https://artifact-hub-green.vercel.app
**Stack:** Next.js 16 (App Router) · Supabase (Postgres + private Storage) · Gemini 2.5 Flash · standalone stdio MCP server
**Status:** Deployed, seeded, and verified end-to-end. CI green (lint + typecheck + 24 tests). MCP verified live in Claude Desktop across all 9 tools.

---

## What I built and why

Teams generate PDFs, mockups, reports, and HTML docs with AI tools every day. The generation is solved — the *lifecycle after generation* is where it falls apart: files land in blob storage behind CLI commands, access is a URL pasted into a DM, and feedback scatters across Slack threads. There's no way to see what exists, no structured review, and no access control beyond URL expiry.

Artifact Hub closes that lifecycle: **publish → browse → review → summarize → share → manage**, available both as a web product and conversationally through Claude Desktop via an MCP server.

Three decisions shaped how it feels.

**Frictionless review.** The gallery is open — no login to browse or leave feedback. Anyone with a share link can review an unlisted artifact in under 30 seconds from a cold start. This is deliberate: structured feedback only has value if it's effortless to give. Adding an auth wall before that loop is proven would have traded the product's core value for a checkbox.

**One complete lifecycle over feature breadth.** Every flow that ships works fully and correctly — publish, visibility enforcement, signed-URL access, feedback, AI summarization, expiring share links, and owner edit/delete. I chose depth over a wider surface with gaps, which is exactly the timebox tradeoff the brief asks for.

**One sharp LLM feature, not three shallow ones.** AI is focused on the single place it most directly attacks the stated pain — synthesizing scattered reviewer feedback into an actionable digest. It feels like part of the product, not a bolted-on demo, and the rest of the app degrades gracefully if the model is unavailable.

---

## Product decisions: what I deliberately scoped out

These are intentional cuts under a 2-day timebox, each made to protect the core experience rather than dilute it.

**No user accounts / RBAC.** Full auth is 4–6 hours of plumbing with little payoff at demo scale, and it would gate the frictionless-review loop that makes the product worth using. The access model is still fully demonstrated *without* it: a **Visitor/Owner toggle** (`?view=owner`) shows exactly what an anonymous user sees versus a publisher; the `public`/`unlisted` boundary is enforced at the API *and* database layers; private Storage serves files only through server-generated signed URLs; share tokens are the access grant for unlisted artifacts; and MCP routes require an API key. A reviewer can watch every access boundary work without signing in. Crucially, the model is *scoped for* real auth — adding Supabase Auth later is additive, not a rewrite.

**No natural-language search.** Tag + type filtering is sufficient for a demo-sized catalog and degrades gracefully if AI is down — NL search would not. More importantly, keeping one LLM feature sharp beats two that feel thin.

**`update_feedback_status` is MCP/API-only.** Closing or re-opening another reviewer's issue is a trusted review-management action. Anonymous web users shouldn't be able to dismiss feedback others left, so this lives only behind key-gated MCP routes — a clear trust boundary without needing full auth.

**Append-first storage with owner-gated mutation.** Artifacts are immutable by default; edit and delete exist but are surfaced only in Owner mode, keeping the public surface safe while still demonstrating full CRUD.

---

## Architecture

**Single repository, two deployables.** `src/` is the Next.js app (Vercel); `mcp/` is a standalone Node.js stdio MCP server the reviewer runs locally. They share nothing at runtime except the HTTP contract.

**Service-layer pattern — the spine of the design.** All business logic lives in `src/lib/services/` (`artifacts`, `feedback`, `share`, `summarize`). Route handlers are thin: parse input, check auth, call a service function, return JSON. Both route trees — the open web routes (`/api/*`) and the key-gated MCP adapter routes (`/api/mcp/*`) — call the *same* service functions. There is no logic duplication between them, which is what lets the web UI and the conversational MCP workflow stay behaviorally identical.

```
Web routes (/api/*)        ─┐
                            ├─► src/lib/services/  ─►  Supabase (Postgres + Storage)  /  Gemini
MCP adapter (/api/mcp/*)    ─┘     (single source of truth)
   ▲ x-api-key
   │
mcp/ (stdio) ── HTTP ───────┘
```

**Data model.** Four tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries` (migration `001_initial.sql`). Enums for type/visibility/feedback-type/status, GIN index on tags, FK cascades so deleting an artifact cleans up its feedback, links, and summary.

**Storage & signed URLs.** Every file lives in one **private** Supabase bucket. Signed URLs are generated server-side in `src/lib/storage.ts` and *only after the relevant access check passes* — public artifacts get a 1-hour URL; unlisted-via-share-link URLs are capped at `min(1h, time remaining on the link)`. Raw bucket paths (`storage_path`) are stripped from every API response and never reach the client.

**Visibility enforcement, two layers deep.**
- `public` → gallery + `/artifacts/[id]`.
- `unlisted` → `/artifacts/[id]` returns 403; reachable only via `/share/[token]` or an MCP key.
- Publishing an unlisted artifact from the web auto-creates a 30-day share link shown on the success screen — otherwise the publisher would have no way back to their own artifact.
- **RLS** (`002_rls.sql`) is enabled on all four tables so even direct anon-key REST access only ever sees public data; all server code uses the service-role key and bypasses RLS intentionally. Defense in depth, not just app-layer checks.

**Auth.** MCP routes validate `x-api-key` against `ARTIFACT_HUB_ADMIN_KEY` with `crypto.timingSafeEqual` (constant-time, to prevent timing-based key enumeration).

**Rate limiting.** `src/middleware.ts` applies per-IP fixed-window limits on the four open POST endpoints — publish 10/min, feedback 30/min, share 20/min, summarize 5/min (Gemini is the most expensive). Returns 429 + `Retry-After`. The store is in-memory (correct for a single-instance demo) with the Upstash/Redis upgrade path documented inline, and the window/count algorithm is extracted as a pure function and unit-tested.

**Frontend / UX.** Next.js App Router with a shared sticky glassmorphism `Header`, a 4-theme token system (SaaS / Creative / Docs / Premium) driven entirely by CSS custom properties with a no-flash inline script that applies the saved theme before hydration, and Lucide iconography. Tag search is client-side (`startsWith` prefix match over a bounded fetch) with the server-side-search migration path documented where the assumption lives — a deliberate, labeled tradeoff rather than a hidden one.

---

## How the MCP integration works — a conversational workflow, not CRUD wrappers

The MCP server (`mcp/`) is a Node.js stdio process the reviewer adds to Claude Desktop:

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_ADMIN_KEY": "your-admin-key",
        "ARTIFACT_HUB_BASE_URL": "https://artifact-hub-green.vercel.app"
      }
    }
  }
}
```

Each of the **9 tools** makes an HTTP call to its `/api/mcp/*` adapter, with `x-api-key` attached automatically by `mcp/src/client.ts`. The adapter does auth → service call → strips internal fields → returns JSON. Because the adapters hit the same service layer as the web app, the conversational and visual experiences never drift.

Two design choices make it *feel* like a workflow rather than an API surface:

**1. Human-readable, conversation-shaped responses.** Tools return formatted text blocks — not raw JSON — so Claude can surface results naturally. A feedback summary comes back as titled sections; a published artifact comes back with its share URL and expiry spelled out.

**2. Every response ends with a contextual next step.** This is the difference between CRUD and a workflow. The tools guide the conversation forward:

- `list_artifacts` → "Use `get_artifact` with any ID above for full details and feedback."
- `get_artifact` (with feedback) → "Use `summarize_feedback` to get an AI digest of these N items." (with none → "Use `add_feedback` to leave the first review.")
- `add_feedback` → "Call `get_artifact` for the full thread, or `summarize_feedback` for an AI digest."
- `update_feedback_status` → on *resolve*: "Call `summarize_feedback` with `force_refresh=true` to update the digest."
- `publish_artifact` (unlisted) → returns the share link and "Recipients can view and leave feedback directly."

So a reviewer can say *"List the artifacts, summarize the roadmap feedback, mark the API-versioning issue resolved, then refresh the summary"* and the tools chain that into a coherent review session.

| Tool | What it does |
|---|---|
| `list_artifacts` | Browse with optional type/tag/visibility filters |
| `get_artifact` | Full detail: metadata, all feedback, signed preview URL |
| `publish_artifact` | Upload a base64 file; auto-creates a share link for unlisted |
| `add_feedback` | Leave structured feedback (any type) on any artifact |
| `update_feedback_status` | Mark feedback open / resolved / needs_review (MCP-only) |
| `create_share_link` | Create an expiring share link with configurable TTL |
| `summarize_feedback` | Get or regenerate the AI feedback digest (cache-first) |
| `delete_artifact` | Permanently remove an artifact and all associated data |
| `update_artifact` | Edit title, description, tags, or visibility |

---

## Where and why I used the LLM

**Feedback summarization** is the single AI feature, and it maps directly onto the brief's first suggested use case — "summarizing feedback across multiple reviewers" — because that *is* the stated pain point.

On any detail page (and via the `summarize_feedback` MCP tool), "Summarize feedback" runs `src/lib/services/summarize.ts`:

1. **Cache-first.** Query `feedback_summaries`. If the stored `feedback_count` equals the live count and no force-refresh, return the cached summary — **no model call**. This keeps the feature cheap and instant in the common case.
2. **Generate only when needed.** If the summary is missing, stale (new feedback arrived), or `force_refresh: true`, build a prompt from the full thread and call `gemini-2.5-flash` via `@google/genai` with `responseMimeType: "application/json"`.
3. **Validate before trusting.** The response is checked against the expected shape (`overall_assessment`, `open_issues[]`, `suggestions[]`, `questions[]`, `approval_count`); a malformed or empty response returns 502 rather than persisting garbage. This guard (`isValidSummaryData`) is unit-tested.
4. **Store with provenance.** The validated digest is upserted with `model`, `prompt_version`, `feedback_count`, and `generated_at` — all surfaced in the UI footer and MCP output, so the summary is never a black box.

The UI renders a 1–2 sentence assessment plus sections for issues, suggestions, questions, and an approval count (each shown only if non-empty), a **stale badge** when feedback has changed since generation, and a one-click **Regenerate**. The seeded artifacts ship with 5 feedback entries each across all four types, so the feature produces a meaningful digest on first load.

The LLM stays invisible in the right way: it's a button that produces a useful artifact, the rest of the app works without it, and provenance is always on screen.

---

## How the deployed system is verified

Evidence the system works, not just claims:

- **CI on every push/PR to `main`** (`.github/workflows/ci.yml`): `lint` → `typecheck` → `test:run`.
- **24 unit tests across 4 files**, focused on the highest-consequence pure logic: MCP auth (`isMcpAuthorized`), summary-shape validation (`isValidSummaryData`), share-link expiry boundary (`isShareLinkExpired`), and the rate-limit window/count algorithm (`checkRateLimit`). These are the functions where a silent bug would mean a security or correctness failure, so they're the ones worth pinning down with tests.
- **Live smoke test** against the Vercel URL: gallery + filters, preview rendering for all three types (HTML iframe, SVG image, PDF with an "open in new tab" fallback for mobile Safari), feedback submit, summarize, share-link create/open, and publish (public lands in gallery; unlisted shows only the share link).
- **Unlisted enforcement confirmed live:** `/artifacts/[id]` → 403, `/share/[token]` → full detail.
- **MCP verified in Claude Desktop** against the deployed URL across all 9 tools, including cache-first behavior on `summarize_feedback` and the auto-share-link path on unlisted `publish_artifact`.

---

## Deployment approach

**Web app — Vercel.** Connect the repo and set six environment variables in Project Settings:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Data API → `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Data API → `service_role` key |
| `ARTIFACT_HUB_ADMIN_KEY` | Any strong random string (`openssl rand -hex 32`) |
| `GEMINI_API_KEY` | Google AI Studio → API Keys |
| `GEMINI_MODEL` | `gemini-2.5-flash` (or omit for the default) |

**Database — Supabase.** Apply migrations in order: `001_initial.sql` (tables + indexes), then `002_rls.sql` (RLS policies) — `npx supabase db push`. Create a private `artifacts` Storage bucket.

**Seed.** `npm run seed` (with `.env.local` pointed at the hosted project) uploads the three sample artifacts and 15 feedback entries; `npm run seed -- --force` wipes and re-seeds.

**MCP server.** `cd mcp && npm run build`, then add `mcp/dist/index.js` to Claude Desktop config (see `mcp/README.md`). It calls the deployed Vercel URL over HTTP.

**Live URL:** https://artifact-hub-green.vercel.app

---

## Production evolution

Supabase + Vercel were chosen *on purpose* for this challenge: they buy a real hosted Postgres, private object storage, and global app hosting with near-zero ops overhead, which is exactly right for shipping a polished, reviewable system inside a 2-day box. They are the correct tool for *fast hosted delivery*. A production deployment inside an enterprise would evolve along these lines — each item is **future work**, not implemented here:

- **Cloud + IaC.** Move to a primary enterprise cloud (e.g. **Azure** — managed Postgres, Blob Storage, Container Apps/AKS) with the entire footprint defined in **Terraform**, so environments are reproducible and reviewable in PRs rather than clicked together in a dashboard.
- **Environment isolation.** Separate dev / staging / prod projects, networks, and data stores — no shared keys across stages, private networking between app and database.
- **Managed secrets.** Replace env-var secrets with a managed secret store (Azure Key Vault / HashiCorp Vault) with rotation and per-environment scoping.
- **Real authentication + RBAC.** Replace the demo Visitor/Owner toggle and shared admin key with SSO/OIDC and role-based authorization (owner / reviewer / viewer). The current visibility model and the `update_feedback_status` trust boundary are already shaped for this.
- **Audit logging.** Append-only audit trail for publish, edit, delete, status changes, and share-link creation — who did what, when.
- **Observability.** Structured logging, metrics, distributed tracing, and error tracking (e.g. OpenTelemetry + a managed backend), plus alerting on the Gemini and Storage dependencies.
- **Production MCP model.** Replace the local stdio + shared-key server with a hosted **remote MCP** endpoint (streamable HTTP) behind OAuth, so access is per-user and revocable instead of a single shared admin key.
- **Distributed rate limiting.** Swap the in-memory limiter for Upstash/Redis (already flagged in `middleware.ts`) so limits hold across instances.

The point is that none of this is rework — the service-layer boundary, the visibility model, and the provenance-tracked summarization all anticipate it. The demo stack is a starting line chosen for speed, not a dead end.

---

## What I'd do next with another week

Product-feature priorities (distinct from the infrastructure evolution above):

1. **User accounts with ownership** (Supabase Auth). The access model is already scoped for it; the Visitor/Owner toggle demonstrates the intended UX. Additive, not a rewrite.
2. **Feedback status management in the web UI.** Owners can delete feedback today; the next step is marking items resolved / needs_review from the web, closing the loop with the MCP workflow.
3. **Semantic search with pgvector.** Embed titles, descriptions, and tags on publish; query by cosine similarity. Tag filtering is fine at demo scale; a real catalog needs full-text + semantic search.
4. **Artifact versioning.** Track revisions of the same artifact and attach feedback to a specific version — which makes summarization even more valuable across iterative review cycles.
5. **Webhook / email notifications.** Notify the owner on new feedback or a regenerated summary — a Supabase Edge Function on row insert.

---

## Walkthrough (key flows)

A written step-by-step covering the core experience. All flows are live at https://artifact-hub-green.vercel.app.

**Web — review lifecycle**
1. **Browse as Visitor.** Open `/` — public artifacts only, no Publish button. Filter by type; type a tag prefix to narrow client-side.
2. **Switch to Owner.** Click the **Owner** toggle (`?view=owner`). The unlisted artifact now appears with an amber badge, and the Publish button unlocks.
3. **Open an artifact.** Click a card → detail page with the rendered preview (HTML iframe / image / PDF), the feedback thread, and the summary panel.
4. **Edit inline (Owner).** Use the edit form to change title / description / tags / visibility and save.
5. **Leave feedback.** Submit name, role, type, and comment — it appears in the thread immediately, and the summary panel shows a stale badge.
6. **Summarize.** Click **Summarize feedback** → structured digest (assessment, issues, suggestions, questions, approvals) with model + timestamp provenance. Click again to see it served instantly from cache.
7. **Share.** Click Share → a copyable expiring link; open `/share/[token]` to see the full detail view (and confirm `/artifacts/[id]` returns 403 for an unlisted artifact).

**MCP — conversational review in Claude Desktop**
1. *"List the artifacts in the hub."* → `list_artifacts`
2. *"Show me the roadmap details."* → `get_artifact` (suggests summarizing)
3. *"Summarize the feedback."* → `summarize_feedback`
4. *"Mark the API-versioning issue resolved, then refresh the summary."* → `update_feedback_status` → `summarize_feedback(force_refresh)`
5. *"Publish this HTML as unlisted."* → `publish_artifact` returns a ready-to-share link.

A 5-minute screen recording of these flows accompanies the submission.

---

## How this was built (AI tooling)

This project was built primarily with **Claude Code**. The workflow is visible in the repo: design and execution plans live in `docs/plans/`, phase-by-phase execution state in `docs/TRACKER.md`, and the full Claude Code session logs are included with the submission under `claude-sessions/` per the brief. No other AI coding tools were used.

---

## Demo admin key

The demo `ARTIFACT_HUB_ADMIN_KEY` (for MCP config and direct API testing) is provided privately with the submission — never committed to this repository, per the secret-safety rules in `CLAUDE.md`.
