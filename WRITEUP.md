# Artifact Hub — Writeup

---

## What I built and why

Artifact Hub is a platform for publishing, browsing, reviewing, and sharing AI-generated content. Teams generate PDFs, images, and HTML documents with AI tools every day; the lifecycle after generation is where things break down — files live in blob storage, feedback is scattered across Slack threads, and access control is a shared URL in a DM.

The product I shipped addresses that lifecycle end-to-end: a gallery where reviewers can browse and filter artifacts, a detail page with structured feedback and an AI-generated digest, expiring share links for controlled distribution, and an MCP server so the entire workflow can happen conversationally through Claude Desktop.

Three decisions shaped the product feel:

**Frictionless reviewer experience.** The publish form is open — no login required. Anyone with the URL can browse, leave structured feedback, and generate summaries. This is the primary UX constraint: a reviewer should be able to participate in under 30 seconds from a cold start, with no key setup or account creation.

**One complete lifecycle over breadth.** I prioritized a polished end-to-end flow (publish → browse → view → feedback → summarize → share) over adding more surface area. Every feature that ships works fully and correctly. A working core is worth more than a sprawling system with gaps.

**One sharp LLM feature.** Rather than using AI in several shallow ways, I focused the LLM work on one feature that directly addresses the stated pain point: synthesizing scattered feedback into an actionable digest. The result is a feature that feels like it belongs in the product, not a bolt-on demo.

---

## What I chose not to build and why

**No user auth or RBAC.** Full authentication adds 4–6 hours of complexity with little benefit at demo scale. The access model is still fully demonstrated through the public/unlisted visibility distinction, private Supabase Storage with server-side signed URLs, expiring share link tokens, and API-key-protected MCP routes. A reviewer can observe every access control boundary working without signing in.

**No edit or delete of artifacts.** Append-only publish keeps the data model and the UI simple. Editing and versioning would require conflict resolution, audit trails, and additional UI that's out of scope for this build.

**No natural language search.** Removed in favour of tag-plus-type filtering, which is sufficient for a demo-sized catalog. More importantly, keeping one LLM feature sharp is better than two shallow ones. Tag filtering also degrades gracefully if the AI service is unavailable; NL search would not.

**No rate limiting.** This is a demo environment. Rate limiting is straightforward to add (middleware on the feedback and publish endpoints) but adds implementation overhead with no reviewer benefit. It is an explicit omission, not an oversight.

**`update_feedback_status` is MCP/API-only.** Changing a feedback item's status — marking an issue resolved, re-opening a question — is a trusted review-management action. Anonymous public users should not be able to close or dismiss issues left by others. Restricting this to key-gated MCP routes keeps the trust boundary clear without needing full auth.

---

## Architecture overview

**Next.js 16 App Router** deployed to Vercel. Single repository, two packages: `src/` for the web app and `mcp/` for the standalone MCP server.

**Supabase** for Postgres (four tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`) and private Storage for artifact files. All file access goes through server-side signed URLs — the raw bucket path is never exposed to the client or included in API responses.

**Service layer pattern.** All business logic lives in `src/lib/services/`. Route handlers are thin: parse input, check auth, call a service function, return JSON. This is enforced for both the public web routes (`/api/*`) and the protected MCP adapter routes (`/api/mcp/*`), which call the same service functions. No logic duplication between the two route trees.

**Visibility model.** Artifacts are either `public` (gallery + direct URL) or `unlisted` (403 at direct URL; accessible only via share link or MCP key). When a new unlisted artifact is published from the web UI, a 30-day share link is auto-created and shown on the success screen — otherwise the publisher would have no way to view their own artifact. Signed URLs are never generated before the relevant access check passes.

**Auth.** MCP adapter routes require an `x-api-key` header, validated with `crypto.timingSafeEqual` against `ARTIFACT_HUB_ADMIN_KEY`. Possession of the key is the access grant — MCP callers bypass the public/unlisted visibility check and can access any artifact, which is the correct behaviour for a trusted reviewer client.

---

## How the MCP integration works

The MCP server (`mcp/`) is a Node.js stdio process. Reviewers add it to Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/path/to/repo/mcp/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_ADMIN_KEY": "your-admin-key",
        "ARTIFACT_HUB_BASE_URL": "https://artifact-hub-green.vercel.app"
      }
    }
  }
}
```

The MCP server exposes 7 tools. Each tool constructs an HTTP call to the corresponding `/api/mcp/*` adapter route, with `x-api-key` added automatically by `mcp/src/client.ts`. The adapter routes do auth check + service call + strip any internal fields (`storage_path`) before returning JSON.

Tool responses are formatted as readable text blocks designed for Claude to surface naturally in conversation — not raw JSON. For example, `get_artifact` returns a formatted feedback thread; `summarize_feedback` returns a structured digest with section headers.

The 7 tools cover the full artifact lifecycle:

| Tool | What it does |
|---|---|
| `list_artifacts` | Browse with optional type/tag/visibility filters |
| `get_artifact` | Full detail: metadata, all feedback, signed preview URL |
| `publish_artifact` | Upload a base64-encoded file; auto-creates share link for unlisted |
| `add_feedback` | Leave structured feedback (any type) on any artifact |
| `update_feedback_status` | Mark feedback open, resolved, or needs_review |
| `create_share_link` | Create an expiring share link with configurable TTL |
| `summarize_feedback` | Get or regenerate the AI feedback digest |

---

## Where and why I used LLM capabilities

**Feedback summarization** is the single AI feature. It addresses the core pain point directly: feedback is often spread across multiple reviewers in different formats, and synthesizing it manually takes time.

On any artifact detail page (and via the `summarize_feedback` MCP tool), clicking "Summarize feedback" calls `POST /api/artifacts/[id]/summarize`, which runs through the following logic:

1. **Cache check.** Query `feedback_summaries` for this artifact. If the stored `feedback_count` matches the current count, return the cached summary immediately — no LLM call.
2. **Gemini call.** If the summary is missing, stale (new feedback added), or `force_refresh: true` is set, build a prompt with the full feedback thread and call `gemini-2.5-flash` via `@google/genai` with `responseMimeType: "application/json"`.
3. **Validation.** The response is validated against the expected shape (`overall_assessment`, `open_issues[]`, `suggestions[]`, `questions[]`, `approval_count`) before being stored. An empty or malformed response returns a 502 rather than storing bad data.
4. **Upsert.** The validated summary is upserted to `feedback_summaries` along with `model`, `prompt_version: "v1"`, `feedback_count`, and `generated_at` for transparency.

The output is a structured digest: a 1-2 sentence overall assessment, then separate sections for open issues, suggestions, questions, and an approval count. Each section only appears if it has content. A stale badge in the UI signals when new feedback has been added since the last generation, with a one-click "Regenerate" button.

The feature is immediately testable from the seeded artifacts, which have 5 feedback entries each across all four feedback types.

---

## Deployment approach

**Next.js app:** Deployed to Vercel from this repository. Connect the repo in the Vercel dashboard and set the following environment variables in Project Settings → Environment Variables:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → Data API → `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → Data API → `service_role` key |
| `ARTIFACT_HUB_ADMIN_KEY` | Any strong random string — `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google AI Studio → API Keys |
| `GEMINI_MODEL` | `gemini-2.5-flash` (or omit to use the default) |

**Supabase:** Hosted project with the schema from `supabase/migrations/001_initial.sql` (`npx supabase db push`) and a private `artifacts` storage bucket created in the Supabase dashboard.

**Seed data:** After deploying, run `npm run seed` locally (with `.env.local` pointing at the hosted project) to upload the three sample artifacts and their feedback.

**MCP server:** Run locally by the reviewer. Build with `cd mcp && npm run build`, then add to Claude Desktop config as shown in `mcp/README.md`. The server calls the deployed Vercel URL via HTTP.

**Live URL:** `https://artifact-hub-green.vercel.app`

---

## Demo admin key

The demo `ARTIFACT_HUB_ADMIN_KEY` for MCP config and direct API testing will be provided privately with the submission — not committed to this repository.

To test the MCP server, add the key to the Claude Desktop config as shown in `mcp/README.md`.

---

## What I'd do next with another week

In rough priority order:

1. **User accounts with artifact ownership** (Supabase Auth). The access model is already scoped for this — `unlisted` visibility, share links, and the `update_feedback_status` trust boundary all anticipate authenticated ownership. Adding auth would be an additive change, not a rework.

2. **Feedback status management in the web UI.** Currently MCP/API-only. Logged-in artifact owners should be able to mark issues resolved from the detail page without needing Claude Desktop.

3. **Rate limiting on feedback and publish endpoints.** Straightforward to add as Next.js middleware using a sliding-window counter in Supabase or Upstash. The demo environment doesn't need it, but a real deployment would.

4. **NL search with pgvector.** Embed artifact titles, descriptions, and tags on publish; query with cosine similarity. The schema already has room for this without a migration change.

5. **Artifact versioning.** Track revisions of the same artifact rather than publishing a new record each time. Feedback could then be attached to a specific version, making the summarization feature even more useful for iterative review cycles.
