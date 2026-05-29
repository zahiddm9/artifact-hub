# Finishing Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply 8 targeted finishing improvements that make Artifact Hub feel production-minded across UX, MCP integration, and LLM transparency dimensions.

**Architecture:** All changes are presentational or tool-output formatting only. No schema migrations, no new dependencies, no API route changes, no service changes. MCP tools require a dist rebuild after source changes.

**Tech Stack:** Next.js 16 (React server + client components), TypeScript, Tailwind CSS v4, MCP TypeScript SDK.

---

## Task 1: PDF fallback link

A blank box is shown on mobile/iOS Safari for PDF artifacts because iframes don't render inline. Add an "Open in new tab" anchor below the iframe as a one-line fallback.

**Files:**
- Modify: `src/components/ArtifactPreview.tsx`

**Step 1: Replace the PDF branch**

Replace the entire `if (type === "pdf")` block (lines 25–36) with:

```tsx
  if (type === "pdf") {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-border overflow-hidden" style={{ height: 700 }}>
          <iframe
            src={signedUrl}
            title={title}
            className="h-full w-full"
            loading="lazy"
          />
        </div>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          Open PDF in new tab ↗
        </a>
      </div>
    );
  }
```

**Step 2: Verify lint is clean**

```bash
npm run lint 2>&1 | tail -3
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/components/ArtifactPreview.tsx
git commit -m "fix: add PDF fallback open-in-new-tab link for browsers that don't render inline PDFs"
```

---

## Task 2: Gallery subtitle copy + summary footer generated_at

Two one-line changes that fix a false promise in the UI and complete the transparency claim in WRITEUP.md.

**Files:**
- Modify: `src/app/page.tsx` (line 48)
- Modify: `src/components/FeedbackSummary.tsx` (line 112)

**Step 1: Fix gallery subtitle**

In `src/app/page.tsx` line 48, replace:
```tsx
          <p className="text-muted-foreground">Browse and manage your generated artifacts</p>
```
With:
```tsx
          <p className="text-muted-foreground">Browse, review, and share AI-generated content</p>
```

**Step 2: Add generated_at to summary footer**

In `src/components/FeedbackSummary.tsx` lines 111–114, replace:
```tsx
          <p className="text-xs text-muted-foreground">
            Generated from {summary.feedback_count} feedback item{summary.feedback_count === 1 ? "" : "s"}
            {summary.model ? ` · ${summary.model}` : ""}
          </p>
```
With:
```tsx
          <p className="text-xs text-muted-foreground">
            Generated from {summary.feedback_count} feedback item{summary.feedback_count === 1 ? "" : "s"}
            {summary.model ? ` · ${summary.model}` : ""}
            {summary.generated_at
              ? ` · ${new Date(summary.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : ""}
          </p>
```

**Step 3: Verify lint and typecheck**

```bash
npm run lint 2>&1 | tail -3 && npm run typecheck 2>&1
```

Expected: 0 errors on both.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/FeedbackSummary.tsx
git commit -m "fix: correct gallery subtitle copy; add generated_at to summary footer"
```

---

## Task 3: Share-link expiry always visible + improved expired/404 page

The expiry date is currently hidden unless the link is about to expire. Recipients of 30-day links have no idea how much access time remains. Also, the expired/not-found error pages give generic copy with no path forward.

**Files:**
- Modify: `src/app/share/[token]/page.tsx`

**Step 1: Improve the error page (lines 20–38)**

Replace the entire `if (!result.ok)` block with:

```tsx
  if (!result.ok) {
    const isExpired = result.status === 410;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-2xl font-bold text-foreground">
            {isExpired ? "This link has expired" : "Link not found"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isExpired
              ? "The share link you followed is no longer valid. Ask the sender to create a new link, or browse the public gallery."
              : "This share link doesn't exist or has been removed. Check the URL and try again, or browse the public gallery."}
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-primary transition-colors hover:text-primary/80"
          >
            Browse gallery →
          </Link>
        </div>
      </div>
    );
  }
```

**Step 2: Add always-visible expiry line to the artifact header**

In the artifact header section (the `{/* Header */}` block, currently around line 64), add an expiry line at the bottom of the `<div>`. Replace the header block:

```tsx
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{artifact.title}</h1>
          {artifact.description && <p className="mt-1 text-muted-foreground">{artifact.description}</p>}
          {artifact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {artifact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Access link · expires{" "}
            {expiresDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
```

**Step 3: Verify lint**

```bash
npm run lint 2>&1 | tail -3
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add "src/app/share/[token]/page.tsx"
git commit -m "fix: show share-link expiry always; improve expired/not-found page copy"
```

---

## Task 4: ShareButton — Copied! flash + cursor-pointer

The Copy button in the share URL widget has no visual feedback on click and is missing `cursor-pointer`. Add a 2-second "Copied!" confirmation state.

**Files:**
- Modify: `src/components/ShareButton.tsx`

**Step 1: Replace the entire file**

```tsx
"use client";

import { useState } from "react";

export function ShareButton({ artifactId }: { artifactId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_id: artifactId,
          expires_in_hours: 24 * 7,
          label: "7-day link",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.token}`;
      setShareUrl(url);
      setState("done");
      navigator.clipboard.writeText(url).catch(() => {});
    } catch {
      setState("error");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 min-w-0 max-w-sm">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground focus:outline-none"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className={`shrink-0 text-xs transition-colors cursor-pointer ${
            copied ? "text-green-600" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 cursor-pointer"
    >
      {state === "loading" ? "Creating…" : state === "error" ? "Retry" : "Share"}
    </button>
  );
}
```

**Step 2: Verify lint**

```bash
npm run lint 2>&1 | tail -3
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/components/ShareButton.tsx
git commit -m "fix: add Copied! flash and cursor-pointer to ShareButton copy action"
```

---

## Task 5: Owner/visitor demo toggle

Add a two-state toggle to the gallery page: Visitor (default, public only) vs Owner (shows unlisted artifacts with an amber badge). Demonstrates the visibility model concretely to reviewers. No auth, no schema changes — purely a query filter and display change.

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/ArtifactCard.tsx`
- Modify: `src/components/GalleryFilter.tsx`

**Step 1: Update the gallery page (`src/app/page.tsx`)**

Replace the entire file with:

```tsx
import { Suspense } from "react";
import Link from "next/link";
import { listArtifacts } from "@/lib/services/artifacts";
import { GalleryFilter } from "@/components/GalleryFilter";
import { Header } from "@/components/Header";
import type { ArtifactType } from "@/types";

const GALLERY_CLIENT_FILTER_LIMIT = 500;

interface Props {
  searchParams: Promise<{ type?: string; view?: string }>;
}

export default async function GalleryPage({ searchParams }: Props) {
  const { type, view } = await searchParams;
  const isOwnerView = view === "owner";

  const result = await listArtifacts({
    visibility: isOwnerView ? undefined : "public",
    type: (type as ArtifactType) || undefined,
    limit: GALLERY_CLIENT_FILTER_LIMIT,
  });

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Failed to load artifacts: {result.message}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gallery</h1>
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 text-sm">
              <Link
                href={type ? `/?type=${type}` : "/"}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  !isOwnerView
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Visitor
              </Link>
              <Link
                href={type ? `/?view=owner&type=${type}` : "/?view=owner"}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  isOwnerView
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Owner
              </Link>
            </div>
          </div>
          <p className="text-muted-foreground">Browse, review, and share AI-generated content</p>
        </div>

        {isOwnerView && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Owner view — unlisted artifacts are visible here. Visitors browsing the gallery see only public artifacts.
          </div>
        )}

        <Suspense fallback={null}>
          <GalleryFilter artifacts={result.data} />
        </Suspense>
      </main>
    </div>
  );
}
```

**Step 2: Add unlisted badge to ArtifactCard (`src/components/ArtifactCard.tsx`)**

Replace the title + badge block (lines 21–29) — the `{/* Title + badge */}` div — with:

```tsx
      {/* Title + badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-card-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {artifact.title}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-all duration-200 ${cls}`}>
            <TypeIcon className="h-3 w-3" />
            {label}
          </span>
          {artifact.visibility === "unlisted" && (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Unlisted
            </span>
          )}
        </div>
      </div>
```

**Step 3: Update GalleryFilter to preserve `?view=` on clearAll (`src/components/GalleryFilter.tsx`)**

The `clearAll` function currently calls `router.push(pathname)` which drops the `view=owner` param. Replace it:

```ts
  function clearAll() {
    setTagInput("");
    const currentView = searchParams.get("view");
    router.push(currentView ? `${pathname}?view=${currentView}` : pathname);
  }
```

**Step 4: Verify lint and typecheck**

```bash
npm run lint 2>&1 | tail -3 && npm run typecheck 2>&1
```

Expected: 0 errors on both.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/ArtifactCard.tsx src/components/GalleryFilter.tsx
git commit -m "feat: add owner/visitor demo toggle to gallery with unlisted artifact badges"
```

---

## Task 6: MCP workflow next-step hints

The rubric distinguishes "thoughtful workflow" from "CRUD wrappers." Adding contextual next-step hints to tool responses is the clearest signal of that distinction. All changes are in the tool formatters — no API or service changes.

**Files:**
- Modify: `mcp/src/tools/artifacts.ts`
- Modify: `mcp/src/tools/feedback.ts`
- Modify: `mcp/src/tools/share.ts`
- Modify: `mcp/src/tools/summarize.ts`
- Modify: `mcp/src/tools/publish.ts`

### 6a: `mcp/src/tools/artifacts.ts`

**`list_artifacts`** — append a next-step line to the non-empty result:

Replace the return inside the `if (data.length === 0)` else branch:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Found ${data.length} artifact${data.length === 1 ? "" : "s"}.\n\n${lines.join("\n\n")}`,
        }],
      };
```
With:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Found ${data.length} artifact${data.length === 1 ? "" : "s"}.\n\n${lines.join("\n\n")}\n\n→ Use get_artifact with any ID above for full details and feedback.`,
        }],
      };
```

**`get_artifact`** — append feedback-aware next step. Replace the final `return` statement:
```ts
      return { content: [{ type: "text" as const, text }] };
```
With:
```ts
      const nextStep = feedbackError
        ? ""
        : feedback.length === 0
          ? "\n\n→ No feedback yet. Use add_feedback to leave the first review."
          : `\n\n→ Use summarize_feedback to get an AI digest of these ${feedback.length} feedback item${feedback.length === 1 ? "" : "s"}.`;

      return { content: [{ type: "text" as const, text: text + nextStep }] };
```

### 6b: `mcp/src/tools/feedback.ts`

**`add_feedback`** — append next step. Replace the return:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Feedback added.\nID: ${data.id}\nType: ${data.feedback_type} | Status: ${data.status}\nReviewer: ${data.reviewer_name}${role}\nComment: "${data.comment}"`,
        }],
      };
```
With:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Feedback added.\nID: ${data.id}\nType: ${data.feedback_type} | Status: ${data.status}\nReviewer: ${data.reviewer_name}${role}\nComment: "${data.comment}"\n\n→ Call get_artifact for the full thread, or summarize_feedback for an AI digest.`,
        }],
      };
```

**`update_feedback_status`** — append status-aware hint. Replace the return:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Feedback status updated.\nID: ${data.id} | Status: ${data.status}`,
        }],
      };
```
With:
```ts
      const statusHint =
        data.status === "resolved"
          ? "\n\n→ Issue marked resolved. Call summarize_feedback with force_refresh=true to update the digest."
          : data.status === "needs_review"
          ? "\n\n→ Status set to needs_review. Call get_artifact to see the full thread."
          : "";

      return {
        content: [{
          type: "text" as const,
          text: `Feedback status updated.\nID: ${data.id} | Status: ${data.status}${statusHint}`,
        }],
      };
```

### 6c: `mcp/src/tools/share.ts`

Add context about what the link enables. Replace the return:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Share link created.\n\nURL: ${shareUrl}\nExpires: ${expiresDate}`,
        }],
      };
```
With:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Share link created.\n\nURL: ${shareUrl}\nExpires: ${expiresDate}\n\nAnyone with this link can view the artifact and leave feedback directly — no key required.`,
        }],
      };
```

### 6d: `mcp/src/tools/summarize.ts`

Add `generated_at` to the metadata line. Replace:
```ts
      const meta = `Generated from ${data.feedbackCount} feedback item${data.feedbackCount === 1 ? "" : "s"}`;
      const modelTag = data.summary.model ? ` · ${data.summary.model}` : "";
```
With:
```ts
      const meta = `Generated from ${data.feedbackCount} feedback item${data.feedbackCount === 1 ? "" : "s"}`;
      const modelTag = data.summary.model ? ` · ${data.summary.model}` : "";
      const genDate = data.summary.generated_at
        ? ` · ${new Date(data.summary.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "";
```

And update the `text` array to use `genDate`:
```ts
      const text = [
        "Feedback Summary",
        `${meta}${modelTag}${genDate}`,
        "",
        "Overall Assessment:",
        s.overall_assessment,
        issueLines,
        suggLines,
        qLines,
        approvalLine,
      ]
        .filter((x) => x !== "")
        .join("\n");
```

### 6e: `mcp/src/tools/publish.ts`

Add next-step hints to public and unlisted publish responses. Replace the two non-error returns:

Public artifact return:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: public\n\nURL: ${baseUrl}/artifacts/${artifact.id}`,
        }],
      };
```
With:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: public\n\nURL: ${baseUrl}/artifacts/${artifact.id}\n\n→ Use add_feedback to start the review, or create_share_link to generate a controlled-access link.`,
        }],
      };
```

Unlisted with share link return:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nShare link (expires ${expires}):\n${shareUrl}`,
        }],
      };
```
With:
```ts
      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nShare link (expires ${expires}):\n${shareUrl}\n\n→ Share the link above. Recipients can view the artifact and leave feedback directly.`,
        }],
      };
```

**Step after all tool edits: verify MCP TypeScript compiles**

```bash
cd mcp && npm run build 2>&1
```

Expected: clean compile, `mcp/dist/` files updated.

**Step: Run web lint and tests to confirm no regressions**

```bash
cd .. && npm run lint 2>&1 | tail -3 && npm run test:run 2>&1 | tail -5
```

Expected: 0 lint errors, 16 tests pass.

**Step: Commit**

```bash
git add mcp/src/tools/artifacts.ts mcp/src/tools/feedback.ts mcp/src/tools/share.ts mcp/src/tools/summarize.ts mcp/src/tools/publish.ts mcp/dist/
git commit -m "feat: add workflow next-step hints and generated_at to all MCP tool responses"
```

---

## Task 7: Final verification

Run all checks locally to confirm everything is clean.

**Step 1: Lint — 0 errors**

```bash
npm run lint 2>&1 | tail -3
```

Expected: `0 errors`.

**Step 2: Typecheck — clean**

```bash
npm run typecheck 2>&1
```

Expected: no output (clean).

**Step 3: Tests — 16 pass**

```bash
npm run test:run 2>&1
```

Expected: `Tests  16 passed (16)`.

**Step 4: Report**

Summarise: files changed, what each change does for the rubric dimension it targets, and any remaining gaps not addressed in this plan.
