# Artifact Hub — Writeup

> **Status: DRAFT — decision log only. Final writeup to be completed after implementation.**

---

## What I built and why

_[Final writeup: describe the running system, key flows, and product feel. Fill in after implementation.]_

**Draft decisions:**
- Chose a frictionless demo workspace — reviewers can browse, leave feedback, summarize, share, and publish test artifacts at the deployed URL without any login or key setup. The reviewer experience was the primary UX constraint.
- Prioritized a polished end-to-end artifact lifecycle (publish → browse → detail → feedback → summarize → share) over broad feature count. A complete, working core is worth more than a sprawling system with gaps.
- Skipped NL search to keep the LLM story focused on one feature that directly addresses the stated pain point.

---

## What I chose not to build and why

_[Final writeup: enumerate cuts and rationale. Fill in after implementation.]_

**Draft decisions:**
- **No user auth or RBAC** — full auth adds 4–6 hours of complexity for a 2-day build. Access control is still demonstrated through the public/unlisted visibility model, private Supabase Storage with signed URLs, expiring share link tokens, and API-key-protected MCP routes. A reviewer can observe the access model working without needing to sign in.
- **No edit or delete of artifacts** — append-only publish keeps the data model and UI simple. Not needed for the evaluation scope.
- **No NL search** — removed in favour of tag/type filtering, which is sufficient for a demo-sized catalog. Keeping one LLM feature sharp is better than two shallow ones.
- **No rate limiting** — demo environment only; noted here so it is not mistaken for an oversight.
- **`update_feedback_status` is MCP/API-only** — changing a feedback item's status (open → resolved → needs_review) is a trusted review-management action. Anonymous public users should not be able to close or re-open issues left by others. Restricting this to API-key-protected MCP routes keeps the trust boundary explicit without needing full auth.

---

## Architecture overview

_[Final writeup: system diagram or prose description. Fill in after implementation.]_

**Draft notes:**
- Next.js App Router on Vercel — single deployable unit
- Supabase Postgres for four tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`
- Supabase Storage — private bucket only; all signed URLs generated server-side after access checks
- Visibility model: `public` artifacts appear in the gallery and at `/artifacts/[id]`; `unlisted` artifacts return 403 at that route and are only accessible via `/share/[token]`
- Separated normal web API routes (`/api/*`, open for demo) from protected MCP adapter routes (`/api/mcp/*`, require `x-api-key`). Both call the same `src/lib/services/` functions — no logic duplication.

---

## How the MCP integration works

_[Final writeup: MCP config snippet, tool list, example conversation. Fill in after implementation.]_

**Draft notes:**
- MCP server is a Node.js stdio process in `/mcp`. Reviewer adds it to Claude Desktop config with `ARTIFACT_HUB_API_KEY` and `ARTIFACT_HUB_BASE_URL` env vars.
- MCP tools call `/api/mcp/*` HTTP adapter routes. The API key is the access grant — MCP callers can list and access unlisted artifacts, bypass the visibility check, and perform write actions.
- MCP is on the critical path. Minimum required tools verified before final deploy: `list_artifacts`, `get_artifact`, `create_share_link`, `summarize_feedback`. Then: `publish_artifact`, `add_feedback`, `update_feedback_status`.
- 7 tools total: `list_artifacts`, `get_artifact`, `publish_artifact`, `add_feedback`, `update_feedback_status`, `create_share_link`, `summarize_feedback`.

---

## Where and why I used LLM capabilities

_[Final writeup: describe the summarization feature, prompt design, caching behaviour. Fill in after implementation.]_

**Draft notes:**
- **Feedback summarization** — chosen because it directly addresses the stated pain point: feedback scattered across Slack threads with no synthesis. On any artifact detail page, "Summarize Feedback" produces a structured digest: overall assessment, open issues, suggestions, questions, approval count.
- Cache-first: result stored in `feedback_summaries` with `feedback_count` at generation time. If current count matches, the cached summary is returned without calling Claude. Only regenerates when feedback has been added since the last summary, or `force_refresh` is set.
- `model` and `prompt_version` are stored with each summary for transparency in this writeup.
- Feature is immediately testable from seeded artifacts (pre-populated with feedback across all four types).

---

## Deployment approach

_[Final writeup: live URL, env var list, Supabase project details. Fill in after implementation.]_

**Draft notes:**
- Next.js app deployed to Vercel from this repo
- Supabase hosted project (Postgres + private Storage bucket)
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ARTIFACT_HUB_ADMIN_KEY`, `ANTHROPIC_API_KEY`

---

## Demo admin key

_[Fill in after deployment — document the demo API key here for the reviewer's MCP config and direct API testing.]_

---

## What I'd do next with another week

_[Final writeup: honest prioritized list. Fill in after implementation.]_

**Draft ideas:**
- User accounts with artifact ownership (Supabase Auth)
- NL search using pgvector embeddings
- Feedback status management in the web UI (currently MCP/API-only)
- Artifact versioning
- Rate limiting on feedback and publish endpoints
