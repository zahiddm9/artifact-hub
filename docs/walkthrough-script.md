# Artifact Hub — 5-Minute Walkthrough Script

**Format:** Screen recording with voiceover
**Target:** ~5 minutes. Keep moving — dead air kills demos.
**Live URL:** https://artifact-hub-green.vercel.app

---

## Timing overview

| Segment | Duration | What's on screen |
|---|---|---|
| 1. Product — gallery & visibility | ~1:30 | Live app |
| 2. Product — review loop & LLM | ~1:00 | Live app |
| 3. MCP — Claude Desktop | ~1:15 | Claude Desktop |
| 4. Architecture — Supabase + WRITEUP | ~0:45 | Supabase dashboard + WRITEUP.md |
| 5. Engineering quality — GitHub | ~0:30 | GitHub repo |

---

## Segment 1 — Gallery & Visibility (0:00 – 1:30)

### On screen
1. Open `https://artifact-hub-green.vercel.app` cold.
2. Let the gallery load. Do not scroll yet.
3. Click the **HTML** type filter. Then **PDF**. Then click back to show all.
4. Click the **Publisher Demo** toggle in the top-right of the gallery.
5. Point to the amber-badged unlisted artifact.
6. Click any public artifact card to open the detail page.
7. Let the preview render (HTML iframe or image).
8. Point to the share-link expiry timestamp below the title.

### What to say

> "This is Artifact Hub — a platform for publishing, reviewing, and sharing AI-generated content. Teams are generating PDFs, mockups, and reports with AI tools every day. The lifecycle after generation is where things break down: files in blob storage, feedback in Slack threads, access via a URL in a DM."

> "The gallery is open — no login to browse or leave feedback. Anyone with a share link can review an unlisted artifact in under 30 seconds."

> _(after clicking Publisher Demo)_ "This toggle shows the visibility model without requiring real auth. Visitors only see public artifacts. Publisher Demo reveals everything the owner sees — unlisted artifacts with an amber badge, edit and delete controls, and the full management surface."

> _(after clicking through to detail)_ "Every file lives in a private Supabase bucket. That preview is served through a server-generated signed URL — the raw storage path is never sent to the client."

### 💡 Highlight — impress the reviewer
- **Signed URL design:** "Unlisted artifacts accessed via share link get a signed URL capped at `min(1 hour, time remaining on the link)` — the file access window never outlives the share token."
- **Sandboxed iframe:** The HTML artifact renders inside a sandboxed iframe. Mention it briefly if the reviewer is technical.

---

## Segment 2 — Review Loop & LLM Feature (1:30 – 2:30)

### On screen
1. Scroll to the feedback form at the bottom of the detail page.
2. Fill in: Name = **"Demo Reviewer"**, Role = **"Engineer"**, Type = **Issue**, Comment = **"The mobile layout breaks at 375px — overflow on the preview container."**
3. Submit. Watch it appear in the thread immediately.
4. Notice the **"Feedback has changed"** stale badge appear on the summary panel.
5. Click **"Summarize feedback"** at the top of the summary panel.
6. Wait for the Gemini response. Point to the sections as they render.
7. Click **"Summarize feedback"** a second time immediately. It returns instantly.
8. Click **Share** in the top-right. Copy the link. Open it in a new tab.

### What to say

> "Structured feedback — type, status, reviewer role — not a comment box."

> _(after submitting)_ "The stale badge means new feedback arrived since the last summary was generated. One click regenerates it."

> _(while Gemini loads)_ "This calls Gemini 2.5 Flash server-side. The result is structured — an overall assessment, then separate sections for open issues, suggestions, questions, and approvals. Each section only appears if it has content."

> _(second click is instant)_ "Cache-first — if the feedback count hasn't changed, the cached summary is returned without calling the model. Gemini is only invoked when the data is actually stale, or you explicitly force a refresh."

> _(pointing to footer)_ "Model name, prompt version, feedback count, generation timestamp — all stored with the summary. It's never a black box."

> _(share link)_ "Time-limited share links — the token is validated server-side and the signed URL TTL is capped to however long the link has left."

### 💡 Highlight — impress the reviewer
- **Cache design:** The model is not called unless the data changed. This is the right engineering decision, not a demo shortcut.
- **Summary validation:** Before storing, the response is checked against the expected shape. A malformed Gemini response returns a 502 — it never persists garbage to the database.

---

## Segment 3 — MCP / Claude Desktop (2:30 – 3:45)

### Setup (before recording)
- Claude Desktop open with `artifact-hub` visible in the MCP connections list.
- Start a fresh conversation.

### One prompt — copy and paste this exactly

```
List all the artifacts in the hub, then pull up the full details and feedback for the product roadmap, summarize the feedback, mark Tom Wright's API versioning issue as resolved, and regenerate the summary to reflect that change.
```

_Claude will chain all five tools in sequence: `list_artifacts` → `get_artifact` → `summarize_feedback` → `update_feedback_status` → `summarize_feedback(force_refresh=true)`. Watch each tool call appear as Claude works through the request._

**What each tool call shows:**
- `list_artifacts` — all 3 artifacts with IDs, types, tags
- `get_artifact` — full roadmap detail: 5 feedback items including Tom Wright's open issue
- `summarize_feedback` — Gemini digest: 2 approvals, 1 open issue, 2 suggestions, 1 question
- `update_feedback_status` — issue marked resolved; tool suggests regenerating the summary
- `summarize_feedback(force_refresh)` — digest updates: open issues drops to 0

### What to say

> _(before pasting)_ "The MCP server is a standalone Node.js process the reviewer adds to Claude Desktop with the admin key and the deployed URL. One conversation can drive the entire artifact lifecycle."

> _(while Claude is running the tools)_ "Watch the tools chain — each one calls back to the deployed Vercel API. Every response ends with a contextual next step, which is what lets one prompt drive five tool calls in sequence."

> _(after the final summary appears)_ "That's the full review lifecycle in one conversation — browsing, reviewing, resolving an issue, and updating the AI digest — without leaving the chat."

### 💡 Highlight — impress the reviewer
- **9 tools, full lifecycle:** list, get, publish, add feedback, update status, share, summarize, delete, update metadata.
- **Visibility bypass by design:** MCP callers with a valid key can access unlisted artifacts directly — the key is the access grant. The WRITEUP explains this trust model explicitly.
- **Auth is constant-time:** The x-api-key check uses `crypto.timingSafeEqual` — prevents timing-based key enumeration. Worth a quick mention if asked about security.

---

## Segment 4 — Vercel + Supabase (3:45 – 4:30)

### On screen
**Vercel dashboard (`vercel.com/dashboard`):**
1. Open the project. Show the **Deployments** tab — latest deployment green, domain live.
2. Click into **Settings → Environment Variables** — show the variable names (not values). 6 vars: the two Supabase keys, the admin key, Gemini key and model, anon key.

**Supabase dashboard (`supabase.com/dashboard`):**
3. Click **Table Editor** — show all 4 tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`.
4. Click **Authentication → Policies** — show the RLS policy on `artifacts` (`anon_read_public_artifacts`).
5. Click **Storage** — show the `artifacts` bucket is **Private**.

### What to say

> _(on Vercel)_ "Deployed to Vercel — zero-config Next.js hosting. Six environment variables, none of them in the repo."

> _(on env vars)_ "The admin key, Gemini key, and Supabase service role key never leave the server. The model name is an env var — swapping Gemini Flash for Pro or a different provider is a config change, not a code change."

> _(on tables)_ "Four tables in Supabase Postgres. FK cascades — deleting an artifact cleans up its feedback, share links, and cached summary in one operation."

> _(on RLS)_ "Row Level Security on all four tables. Even direct REST calls with the anon key only return public artifacts — the visibility boundary is enforced at the database layer, not just the application layer."

> _(on storage)_ "Private bucket. Every file preview goes through a server-generated signed URL after the access check passes. The raw storage path is never sent to the client."

### 💡 Highlight — impress the reviewer
- **No secrets in repo:** Vercel env vars panel shows the names but not the values — make sure no values are visible on screen.
- **RLS as defense in depth:** App-layer visibility checks + database-layer RLS = two independent enforcement points. Neither alone is sufficient.
- **Model as config:** The `GEMINI_MODEL` env var is worth pointing at — it signals that the LLM choice is an operational decision, not hardcoded.

---

## Segment 5 — Engineering Quality & GitHub (4:30 – 5:00)

### On screen
1. Open **GitHub → Actions tab** — show the green CI run named "Quality Checks".
2. Click in to show the 3 steps: Lint, Typecheck, Test.
3. Open **`src/lib/auth.test.ts`** or **`src/lib/services/summarize.test.ts`** briefly.
4. Open **`docs/plans/`** directory — show the plan files dated 2026-05-29.
5. Optionally: show `docs/TRACKER.md` briefly to show the phase history.

### What to say

> "24 unit tests across 4 files. Not testing everything — testing the highest-consequence logic: MCP auth, Gemini response validation, share link expiry boundary, and the rate-limit window algorithm. These are the functions where a silent bug means a security or correctness failure."

> "CI runs on every feature branch push and every pull request. Feature branches carry the test gate — main stays clean by the time it lands."

> _(on docs/plans)_ "Every phase started with a written implementation plan committed to the repo before any code was written. This is the full build trace: design decisions, implementation history, and the tradeoffs made under a 2-day timebox."

### 💡 Highlight — impress the reviewer
- **Rate limiting is also tested:** `checkRateLimit` is extracted as a pure function and has 4 tests covering the window/count algorithm — shows the middleware was designed to be testable, not just functional.
- **CI job name:** "Quality Checks" — not "CI" — reflects that it's lint + typecheck + tests, not a full build pipeline. Shows precision in how the work is framed.

---

## Before you record — checklist

- [ ] Live app loads at `https://artifact-hub-green.vercel.app`
- [ ] Gallery shows 3 artifacts (HTML roadmap, SVG brand, PDF API guide)
- [ ] Summarize works on at least one artifact (Gemini is live)
- [ ] Share link creates and opens successfully
- [ ] Claude Desktop has `artifact-hub` connected and `list_artifacts` returns data
- [ ] Supabase dashboard logged in and on the correct project
- [ ] GitHub repo public and Actions tab shows a green run
- [ ] No `.env` files, terminal with secrets, or Supabase service key visible on screen at any point

---

## Things NOT to say

- Don't apologize for missing features or explain what you "would have done with more time" during the demo — save that for questions
- Don't say "as you can see" — just show it
- Don't over-narrate the UI — let the tool responses and the UI speak
- The walkthrough section of WRITEUP.md covers the same flows in writing — you don't need to read from it, just use this script
