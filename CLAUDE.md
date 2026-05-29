# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Artifact Hub — a platform for publishing, browsing, reviewing, and sharing AI-generated content. Full design: `docs/plans/2026-05-28-artifact-hub-design.md`.

## Execution tracking

`docs/TRACKER.md` is the source of truth for execution state.

- At the start of each phase: read `docs/TRACKER.md`, confirm the current phase and active tasks, and list files you plan to create or modify before touching anything
- During implementation: update `docs/TRACKER.md` only after meaningful milestones, blockers, decisions, or phase completion — not as a running diary
- At the end of each phase: run relevant validation checks, summarize what changed, update `docs/TRACKER.md`, and commit the completed phase

## Commands

```bash
# Web app (Next.js — run from repo root)
npm run dev          # dev server on localhost:3000
npm run build        # production build
npm run lint         # ESLint

# MCP server
cd mcp && npm run build   # compile TypeScript
cd mcp && npm run start   # run stdio server (for testing outside Claude Desktop)

# Database
npx supabase db push             # push schema migrations
npm run seed                     # upload seed files + insert 3 artifacts + 15 feedback entries
npm run seed -- --force          # wipe existing data and re-seed

# DESTRUCTIVE — only run after explicit confirmation:
npx supabase db reset --linked   # wipes hosted DB schema; follow with npm run seed
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
- Cache-first: compare `feedback_summaries.feedback_count` against current `COUNT(feedback)`. Return cached if equal. Call Gemini only when missing, stale, or `force_refresh: true`.
- Result stored in `feedback_summaries` as JSONB with `model`, `prompt_version`, `feedback_count`, `generated_at`
- Summary shape: `{ overall_assessment, open_issues[], suggestions[], questions[], approval_count }`

**MCP server** (`/mcp/src/index.ts`): stdio transport, 7 tools. Tools call `/api/mcp/*` with the API key from env. Minimum working set: `list_artifacts`, `get_artifact`, `create_share_link`, `summarize_feedback`. `update_feedback_status` is MCP/API-only — not exposed in the web UI.

## Secret safety

- Never print, commit, or paste real environment variable values
- Use `.env.example` for variable names only — no values
- Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ARTIFACT_HUB_ADMIN_KEY`, or any Vercel tokens in logs, screenshots, commits, or `WRITEUP.md`

## Key env vars

| Var | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (storage + admin queries) |
| `ARTIFACT_HUB_ADMIN_KEY` | `/api/mcp/*` auth check + MCP server config |
| `GEMINI_API_KEY` | `summarize.ts` service |
| `GEMINI_MODEL` | `summarize.ts` service (defaults to `gemini-2.5-flash` if unset) |

## Database

Four tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`. Migration in `supabase/migrations/001_initial.sql`. Seed data in `supabase/seed.sql` + `supabase/seed-files/` (3 public artifacts, 4–6 feedback entries each — enough for summarization to produce a meaningful digest on first load).

## Constraints to carry forward

- Never generate a signed URL before the access check passes
- Route handlers are thin; all logic goes in `src/lib/services/`
- No logic duplication between `/api/*` and `/api/mcp/*` routes
- Summarization is always cache-first — do not call Gemini if `feedback_count` is unchanged
- Append-only artifacts: no edit or delete endpoints
- Work one phase at a time — do not start the next phase until the current phase is validated, `docs/TRACKER.md` is updated, and changes are committed
- Before broad architectural changes, explain the tradeoff and ask for confirmation
