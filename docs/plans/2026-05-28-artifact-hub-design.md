# Artifact Hub — Design Document
_2026-05-28_

---

## 1. Product Scope & Intentional Cuts

### In scope
- Public gallery with tag/type filtering
- Artifact detail page with file preview, feedback list, and feedback summary panel
- Structured feedback form: `reviewer_name`, `reviewer_role`, `feedback_type` (approval/suggestion/issue/question), `status` (open/resolved/needs_review), `comment`
- "Summarize Feedback" — Claude generates a structured digest; result is cached and only regenerated when feedback count changes or explicitly refreshed
- Expiring share links — DB-backed tokens, validated server-side; expired tokens are blocked
- Visibility model: `public` (gallery + direct URL) vs `unlisted` (share link only; `/artifacts/[id]` returns 403)
- Auto-created share link when publishing an unlisted artifact from the web UI
- Open publish form in the web UI (no key gate; suitable for demo/reviewer access)
- MCP server (stdio) with 7 tools; protected write actions use `x-api-key` via `/api/mcp/*` routes
- Seed data: 3 public artifacts (PDF, image, HTML) with 4–6 feedback entries each

### Intentional cuts
- No user accounts or auth system
- No edit or delete of artifacts (append-only)
- No version history
- No notifications or email
- No natural language search (tag + type filter is sufficient for demo scale)
- No artifact thumbnail generation
- No rate limiting (demo environment, noted in WRITEUP)

### Key tradeoff
Cutting NL search keeps the LLM story focused on feedback summarization, which directly addresses the stated pain point of scattered feedback. A gallery filter is sufficient for a demo-sized catalog.

---

## 2. Architecture

**Next.js App Router on Vercel** — single deployable unit.

```
Routes:
  /                                  → Gallery (public artifacts only)
  /artifacts/[id]                    → Detail page (public only; unlisted → 403)
  /share/[token]                     → Validates DB token, renders artifact inline
  /publish                           → Open publish form (no key required in web UI)

  /api/artifacts                     → GET list, POST create
  /api/artifacts/[id]                → GET artifact
  /api/artifacts/[id]/feedback       → GET list, POST add
  /api/artifacts/[id]/summarize      → POST → Claude (cache-first) + upsert
  /api/artifacts/[id]/preview        → GET → signed URL
  /api/share                         → POST create share link
  /api/share/[token]                 → GET validate token + signed URL

  /api/mcp/artifacts                 → x-api-key — GET, POST
  /api/mcp/artifacts/[id]            → x-api-key — GET (bypasses visibility check)
  /api/mcp/feedback                  → x-api-key — POST add, PATCH status
  /api/mcp/share                     → x-api-key — POST create
  /api/mcp/summarize                 → x-api-key — POST (cache-first)
```

**Supabase Postgres** — four tables (see schema).

**Supabase Storage** — one private `artifacts` bucket. All signed URLs are generated server-side after access checks. No public bucket URLs exposed directly.

**Signed URL rules:**
- Public artifact on web → 1-hour signed URL
- Unlisted via share link → signed URL with TTL = `min(1h, expires_at − now())`
- Expired or invalid token → 403, no URL generated

**MCP server** — Node.js stdio process in `/mcp`. Reviewer adds it to Claude Desktop config with `ARTIFACT_HUB_API_KEY` env var. MCP tools call `/api/mcp/*` with `x-api-key` header.

**Gemini API** — called server-side from `src/lib/services/summarize.ts` using `@google/genai`. Cache-first: if `feedback_summaries.feedback_count` matches current count, return cached. Only calls Gemini when summary is missing, stale, or `force_refresh: true`. Model configured via `GEMINI_MODEL` env var (default: `gemini-2.5-flash`).

**Service layer** — `/api/*` and `/api/mcp/*` routes are thin. All logic lives in `src/lib/services/`. MCP routes add only the `auth.ts` key check before calling the same service functions.

---

## 3. Database Schema

### Enums
```sql
CREATE TYPE artifact_type       AS ENUM ('pdf', 'image', 'html');
CREATE TYPE artifact_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE feedback_type       AS ENUM ('approval', 'suggestion', 'issue', 'question');
CREATE TYPE feedback_status     AS ENUM ('open', 'resolved', 'needs_review');
```

### `artifacts`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
title             text NOT NULL
description       text
tags              text[]              DEFAULT '{}'
type              artifact_type       NOT NULL
mime_type         text                NOT NULL
visibility        artifact_visibility NOT NULL DEFAULT 'public'
storage_path      text                NOT NULL   -- path inside private bucket
file_size         int8                           -- bytes
original_filename text
created_at        timestamptz         DEFAULT now()
```
Indexes: `visibility`, `tags` (GIN), `created_at`.

### `feedback`
```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
artifact_id    uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE
reviewer_name  text NOT NULL
reviewer_role  text
feedback_type  feedback_type   NOT NULL
status         feedback_status NOT NULL DEFAULT 'open'
comment        text NOT NULL
created_at     timestamptz DEFAULT now()
```
Index: `artifact_id`.

### `share_links`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
artifact_id  uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE
token        text UNIQUE NOT NULL   -- nanoid
expires_at   timestamptz NOT NULL
label        text
created_at   timestamptz DEFAULT now()
```
Indexes: `token` (unique), `expires_at`, `artifact_id`.

### `feedback_summaries`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
artifact_id     uuid UNIQUE NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE
summary         jsonb NOT NULL
  -- { overall_assessment, open_issues[], suggestions[], questions[], approval_count }
feedback_count  int4 NOT NULL          -- count at generation time; staleness indicator
model           text                   -- e.g. "gemini-2.5-flash"
prompt_version  text                   -- e.g. "v1"
generated_at    timestamptz NOT NULL
```
Index: `artifact_id` (unique).

**Staleness check:** compare `feedback_summaries.feedback_count` against `COUNT(feedback WHERE artifact_id = ?)`. If different, show "Feedback has changed — Regenerate." Upsert on regeneration.

---

## 4. Repo Structure

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Gallery
│   │   ├── artifacts/[id]/page.tsx           # Detail (public only)
│   │   ├── share/[token]/page.tsx            # Share link view
│   │   ├── publish/page.tsx                  # Open publish form
│   │   └── api/
│   │       ├── artifacts/
│   │       │   ├── route.ts                  # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET artifact
│   │       │       ├── feedback/route.ts     # GET list, POST add
│   │       │       ├── summarize/route.ts    # POST → cache-first Claude
│   │       │       └── preview/route.ts      # GET → signed URL
│   │       ├── share/
│   │       │   ├── route.ts                  # POST create share link
│   │       │   └── [token]/route.ts          # GET validate + signed URL
│   │       └── mcp/                          # x-api-key required on all
│   │           ├── artifacts/route.ts
│   │           ├── artifacts/[id]/route.ts
│   │           ├── feedback/route.ts
│   │           ├── share/route.ts
│   │           └── summarize/route.ts
│   ├── components/
│   │   ├── ArtifactCard.tsx
│   │   ├── ArtifactPreview.tsx               # image / PDF embed / sandboxed HTML iframe
│   │   ├── FeedbackForm.tsx
│   │   ├── FeedbackList.tsx
│   │   ├── FeedbackSummary.tsx               # digest + stale badge + regenerate
│   │   ├── GalleryFilter.tsx
│   │   ├── PublishForm.tsx
│   │   └── ShareButton.tsx
│   ├── lib/
│   │   ├── services/
│   │   │   ├── artifacts.ts                  # CRUD — shared by web + MCP routes
│   │   │   ├── feedback.ts
│   │   │   ├── share.ts                      # create + validate tokens
│   │   │   └── summarize.ts                  # Claude call + cache upsert
│   │   ├── storage.ts                        # signed URL generation
│   │   ├── supabase.ts                       # server + browser Supabase clients
│   │   └── auth.ts                           # x-api-key check for /api/mcp/*
│   └── types/index.ts
├── mcp/
│   ├── src/
│   │   ├── index.ts                          # stdio MCP server entry
│   │   └── tools/
│   │       ├── artifacts.ts
│   │       ├── feedback.ts
│   │       ├── share.ts
│   │       └── summarize.ts
│   └── package.json
├── supabase/
│   ├── migrations/001_initial.sql
│   ├── seed.sql
│   └── seed-files/                           # PDF, image, HTML committed here
├── docs/
│   └── plans/
│       └── 2026-05-28-artifact-hub-design.md
├── WRITEUP.md
├── requirements.md
└── package.json
```

---

## 5. User Flows

**Browse & View**
`/` → public artifacts, tag/type filter → click card → `/artifacts/[id]`. Server confirms `visibility = 'public'`, generates 1-hour signed URL, renders preview + feedback list + summary panel.

**Leave Feedback**
Detail page → `FeedbackForm` (reviewer_name, reviewer_role, feedback_type, comment) → POST `/api/artifacts/[id]/feedback` → appended to list. If `COUNT(feedback)` exceeds `feedback_summaries.feedback_count`, summary panel shows stale badge.

**Summarize Feedback**
"Summarize Feedback" → POST `/api/artifacts/[id]/summarize` → cache check → if stale or missing, call Claude → upsert `feedback_summaries` (model, prompt_version, feedback_count, generated_at) → render digest: overall assessment / open issues / suggestions / questions / approval count.

**Share Link (Web UI)**
Detail page → Share button → POST `/api/share` (artifact_id, expires_in, label) → DB token created → `/share/[token]` URL shown with copy button.

**Access via Share Link**
`/share/[token]` → validate token → check `expires_at > NOW()` → fetch artifact (visibility bypassed) → generate signed URL capped at `min(1h, time_remaining)` → render full detail view.

**Publish — Public**
`/publish` → fill form → POST `/api/artifacts` → success screen shows `/artifacts/[id]` URL + "View in gallery."

**Publish — Unlisted**
Same flow, `visibility = unlisted` → server auto-creates a 30-day share link → success screen shows only the `/share/[token]` URL with copy button and note: "This artifact is unlisted — this link is the only way to access it."

**MCP Flow**
Claude Desktop → tool call → `/api/mcp/*` with `x-api-key` → same service layer as web routes → result returned to Claude → Claude surfaces it to the user.

---

## 6. MCP Tool List

| Tool | Description | Key params |
|---|---|---|
| `list_artifacts` | List artifacts with optional filters | `type`, `tags`, `visibility`, `limit`, `offset` |
| `get_artifact` | Full detail + feedback list + signed preview URL | `artifact_id` |
| `publish_artifact` | Upload and publish an artifact | `title`, `description`, `tags`, `type`, `visibility`, `file_base64`, `mime_type`, `filename` |
| `add_feedback` | Leave structured feedback | `artifact_id`, `reviewer_name`, `reviewer_role`, `feedback_type`, `comment` |
| `update_feedback_status` | Mark feedback resolved or needs_review | `feedback_id`, `status` |
| `create_share_link` | Generate expiring share link | `artifact_id`, `expires_in_hours`, `label` |
| `summarize_feedback` | Get cached summary or regenerate if stale | `artifact_id`, `force_refresh` |

**Access notes:** MCP callers with a valid API key bypass the `visibility` check — the key is the access grant. `summarize_feedback` is cache-first; `force_refresh: true` triggers a Claude call regardless of staleness.

---

## 7. Phased Implementation Plan

**Phase 1 — Foundation (~3h)**
Init Next.js (App Router, TypeScript, Tailwind). Supabase project: run `001_initial.sql`, create private `artifacts` bucket. `supabase.ts`, `storage.ts`, `auth.ts`. Shared types. `.env.local` with all vars documented.

**Phase 2 — Core Web (~4h)**
Gallery page (public artifacts, tag/type filter, ArtifactCard). Artifact detail page (access check → 403 for unlisted, signed URL, ArtifactPreview for image/PDF/sandboxed HTML). Publish form (upload → POST, auto-share-link for unlisted, success screen). `/share/[token]` page (validate token + expiry, signed URL, full detail view). ShareButton on detail page.

**Phase 3 — Feedback + LLM (~3h)**
FeedbackForm + FeedbackList on detail page. POST `/api/artifacts/[id]/feedback`. `summarize.ts` service (cache-first, Claude fallback, upsert with model + prompt_version). POST `/api/artifacts/[id]/summarize`. FeedbackSummary component (digest sections, stale badge, regenerate button).

**Phase 4 — MCP Core Slice (~2h)**
`/mcp` package: MCP TypeScript SDK, stdio transport, tool registrations. `/api/mcp/*` routes: auth check + service call. Implement and verify with Claude Desktop:
- `list_artifacts`
- `get_artifact`
- `create_share_link`
- `summarize_feedback`

**Phase 5 — MCP Extended (~1.5h)**
Remaining MCP tools in order:
- `publish_artifact` (base64 upload, auto-share-link if unlisted)
- `add_feedback`
- `update_feedback_status`

**Phase 6 — Seed + Deploy + Verification (~2h)**
Seed: commit PDF/image/HTML to `supabase/seed-files/`, run `seed.sql`, verify summarization produces a meaningful digest. Deploy to Vercel with all env vars. Smoke-test all flows on live URL. Verify unlisted enforcement: share link works, `/artifacts/[id]` returns 403. Claude Desktop: run all 7 MCP tools against deployed URL. Fill in WRITEUP.md.

---

## Implementation Constraints (carry forward)

1. **Unlisted access** — signed URLs only generated after the relevant check passes (public detail check, or valid non-expired share token). `/api/mcp/*` bypasses visibility but still requires API key.
2. **MCP architecture** — `/mcp` is the stdio process; `/api/mcp/*` are HTTP adapters. Both call the same `src/lib/services/` functions. No logic duplication.
3. **Summarization cost** — cache-first always. Return cached summary if `feedback_count` unchanged. Call Claude only when missing, stale, or `force_refresh: true`.
