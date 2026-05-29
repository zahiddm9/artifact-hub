# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Artifact Hub — a platform for publishing, browsing, reviewing, and sharing AI-generated content. Full design: `docs/plans/2026-05-28-artifact-hub-design.md`.

## Commands

```bash
# Web app (Next.js)
npm run dev          # dev server on localhost:3000
npm run build        # production build
npm run lint         # ESLint

# MCP server (from /mcp)
npm run build        # compile TypeScript
npm run start        # run stdio server (for testing outside Claude Desktop)

# Database
# Apply migrations manually via Supabase dashboard or:
npx supabase db push
npx supabase db reset --linked   # reset + re-seed on hosted project
```

## Architecture

Two packages: `src/` (Next.js app, deploys to Vercel) and `mcp/` (Node.js stdio MCP server, run locally by reviewer).

**Request path for all features:**
- Web routes (`/api/*`) — open for demo use, no auth
- MCP adapter routes (`/api/mcp/*`) — require `x-api-key` header, checked in `src/lib/auth.ts`
- Both route groups call the same `src/lib/services/` functions — no logic lives in route handlers

**Storage:** All artifacts in a single private Supabase bucket. Signed URLs are generated server-side in `src/lib/storage.ts` and only after the relevant access check passes. Never expose raw bucket paths or public URLs.

**Visibility enforcement:**
- `public` artifacts: gallery + `/artifacts/[id]`
- `unlisted` artifacts: `/artifacts/[id]` returns 403; only accessible via `/share/[token]` or MCP routes (key = access grant)
- When a new unlisted artifact is published from the web UI, a 30-day share link is auto-created and shown on the success screen — otherwise the publisher would have no way to view it

**Feedback summarization (the LLM feature):**
- Entry point: `src/lib/services/summarize.ts`
- Cache-first: compare `feedback_summaries.feedback_count` against current `COUNT(feedback)`. Return cached if equal. Call Claude only when missing, stale, or `force_refresh: true`.
- Result stored in `feedback_summaries` as JSONB with `model`, `prompt_version`, `feedback_count`, `generated_at`
- Summary shape: `{ overall_assessment, open_issues[], suggestions[], questions[], approval_count }`

**MCP server** (`/mcp/src/index.ts`): stdio transport, 7 tools. Tools call `/api/mcp/*` with the API key from env. Minimum working set: `list_artifacts`, `get_artifact`, `create_share_link`, `summarize_feedback`. `update_feedback_status` is MCP/API-only — not exposed in the web UI.

## Key env vars

| Var | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (storage + admin queries) |
| `ARTIFACT_HUB_ADMIN_KEY` | `/api/mcp/*` auth check + MCP server config |
| `ANTHROPIC_API_KEY` | `summarize.ts` service |

## Database

Four tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`. Migration in `supabase/migrations/001_initial.sql`. Seed data in `supabase/seed.sql` + `supabase/seed-files/` (3 public artifacts, 4–6 feedback entries each — enough for summarization to produce a meaningful digest on first load).

## Constraints to carry forward

- Never generate a signed URL before the access check passes
- Route handlers are thin; all logic goes in `src/lib/services/`
- No logic duplication between `/api/*` and `/api/mcp/*` routes
- Summarization is always cache-first — do not call Claude if `feedback_count` is unchanged
- Append-only artifacts: no edit or delete endpoints
