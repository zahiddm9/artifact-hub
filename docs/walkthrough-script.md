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

### Copy-paste prompts — run these in order

**Prompt 1**
```
List all the artifacts in the Artifact Hub.
```
_Claude calls `list_artifacts`. Shows 3 artifacts with IDs, types, tags, and a suggested next step._

**Prompt 2**
```
Show me the full details and feedback for the product roadmap.
```
_Claude calls `get_artifact` using the roadmap ID from the previous response. Shows 5 feedback items — notice Tom Wright's open issue about API versioning. Claude suggests `summarize_feedback` at the end._

**Prompt 3**
```
Summarize the feedback.
```
_Claude calls `summarize_feedback`. Gemini returns the digest: 2 approvals, 1 open issue (API versioning), 2 suggestions, 1 question._

**Prompt 4**
```
Mark Tom Wright's API versioning issue as resolved.
```
_Claude calls `update_feedback_status`. Response ends with: "Issue marked resolved. Call `summarize_feedback` with `force_refresh=true` to update the digest." — the tool guided the next step._

**Prompt 5**
```
Regenerate the summary now that the issue is resolved.
```
_Claude calls `summarize_feedback(force_refresh=true)`. The digest updates — open issues drops to 0, approvals still 2._

### What to say

> _(showing MCP sidebar)_ "The MCP server is a standalone Node.js stdio process. The reviewer adds it to Claude Desktop config with the admin key and the deployed URL. From there, the entire artifact lifecycle is available conversationally."

> _(after Prompt 2, pointing at the next-step hint)_ "Every tool response ends with a contextual next step. This is the design distinction — it's a workflow tool, not a set of API wrappers. The server guides the conversation forward."

> _(after Prompt 4, pointing at the resolve hint)_ "When you mark an issue resolved, the tool tells you to regenerate the summary. When you add feedback, it tells you to get the full thread or run a digest. The tools chain naturally."

> _(after Prompt 5)_ "One conversation went from browsing to reviewing to resolving an issue to updating the AI digest. That's the full review lifecycle without leaving the chat."

### 💡 Highlight — impress the reviewer
- **9 tools, full lifecycle:** list, get, publish, add feedback, update status, share, summarize, delete, update metadata.
- **Visibility bypass by design:** MCP callers with a valid key can access unlisted artifacts directly — the key is the access grant. The WRITEUP explains this trust model explicitly.
- **Auth is constant-time:** The x-api-key check uses `crypto.timingSafeEqual` — prevents timing-based key enumeration. Worth a quick mention if asked about security.

---

## Segment 4 — Architecture & Supabase (3:45 – 4:30)

### On screen
**In the Supabase dashboard (`supabase.com/dashboard`):**
1. Click **Table Editor** — show all 4 tables: `artifacts`, `feedback`, `share_links`, `feedback_summaries`.
2. Click **Authentication → Policies** — show the RLS policies on `artifacts` (`anon_read_public_artifacts`).
3. Click **Storage** — show the `artifacts` bucket is **Private**.

**In VS Code / the repo (or GitHub):**
4. Open `WRITEUP.md` briefly — scroll through the architecture diagram and the production evolution section.

### What to say

> _(on tables)_ "Four tables. FK cascades on artifact delete clean up feedback, share links, and the summary in one operation."

> _(on RLS)_ "Row Level Security is enabled on all four tables. Direct anon-key REST calls only ever return public data — the visibility enforcement is at the database layer, not just the application layer. Defense in depth."

> _(on storage)_ "Private bucket. Files are never publicly accessible. Every preview goes through a server-generated signed URL after the access check passes."

> _(on WRITEUP)_ "The architectural decisions — what I built, what I cut, and why — are documented here. The production evolution section outlines what a real enterprise deployment looks like: Azure, Terraform, managed secrets, per-user OAuth on the MCP server instead of a shared key."

### 💡 Highlight — impress the reviewer
- **Service layer pattern:** Briefly mention that both the web routes and the MCP adapter routes call the same `src/lib/services/` functions. No logic duplication — both surfaces stay behaviorally identical.
- **Mutations via Server Actions:** Web UI delete and edit go through Next.js Server Actions, not public REST endpoints. The destructive surface has no public HTTP exposure.

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
