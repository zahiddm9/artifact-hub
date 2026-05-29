# Product Correctness Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three verified product-correctness issues: RLS missing on all Supabase tables (anon key bypasses entire access model), unlisted publish silently producing an unviewable artifact (web + MCP), and a stray live URL in `.env.example`.

**Architecture:** All server-side data access already goes through `createAdminClient()` (service role), which bypasses RLS. The two other exported Supabase clients (`createBrowserClient`, `createSupabaseServerClient`) are dead code — never called outside `supabase.ts`. So enabling restrictive RLS requires only a new migration and no service-layer changes. The publish-orphan fix adds an error branch to two API routes, a warning branch to the success screen, and a warning branch to the MCP tool text output.

**Tech Stack:** Next.js 15 App Router, Supabase (postgres + storage), MCP SDK, TypeScript, `npx supabase db push` to apply migrations to the linked hosted project.

---

## Task 1: Delete stray URL from `.env.example`

**Files:**
- Modify: `.env.example` (last line)

### Step 1: Delete line 22

The last line of `.env.example` is a bare URL with no variable name:
```
https://artifact-hub-green.vercel.app/share/Kcc2M72dZ_QSONHNQMmlJ
```
Delete that line. The file should end at line 21 (`ARTIFACT_HUB_BASE_URL=https://your-app.vercel.app`).

### Step 2: Verify

The file must end with:
```
ARTIFACT_HUB_BASE_URL=https://your-app.vercel.app
```
No trailing URL line.

### Step 3: Commit

```bash
git add .env.example
git commit -m "fix: remove stray share link URL from .env.example"
```

---

## Task 2: Enable Row-Level Security on all four Supabase tables

**Context:** The Supabase anon key is shipped to the browser (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Without RLS, any visitor can query the Supabase REST API directly and read all unlisted artifacts, read `storage_path` values, and write/delete any row — bypassing all Next.js visibility enforcement.

All server-side code uses `createAdminClient()` (service role key), which bypasses RLS regardless of policies. So restrictive policies have zero effect on existing app functionality.

**Files:**
- Create: `supabase/migrations/002_rls.sql`

### Step 1: Create the migration file

Create `supabase/migrations/002_rls.sql` with this exact content:

```sql
-- Enable RLS on all tables.
-- All server-side queries use the service role key (createAdminClient) and bypass RLS.
-- These policies protect against direct anon-key REST API access.

ALTER TABLE artifacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_summaries ENABLE ROW LEVEL SECURITY;

-- artifacts: anon can only read public artifacts
CREATE POLICY "anon_read_public_artifacts"
  ON artifacts FOR SELECT
  USING (visibility = 'public');

-- feedback: anon can only read feedback for public artifacts
CREATE POLICY "anon_read_feedback_for_public_artifacts"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      WHERE a.id = artifact_id AND a.visibility = 'public'
    )
  );

-- share_links: no anon access (token lookup is done server-side via service role)
-- No SELECT policy = anon gets nothing.

-- feedback_summaries: anon can only read summaries for public artifacts
CREATE POLICY "anon_read_summaries_for_public_artifacts"
  ON feedback_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      WHERE a.id = artifact_id AND a.visibility = 'public'
    )
  );
```

No INSERT / UPDATE / DELETE policies are created for the anon role. All writes go through the service role via the API layer.

### Step 2: Push the migration to the linked Supabase project

```bash
npx supabase db push
```

Expected output: migration applied successfully, no errors.

### Step 3: Verify RLS is active

Run a quick sanity check — this should return an empty array or only public artifacts (not unlisted):

```bash
curl "$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)/rest/v1/artifacts?select=id,visibility" \
  -H "apikey: $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)" \
  -H "Authorization: Bearer $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)"
```

All rows returned should have `visibility: "public"`. If any `unlisted` rows appear, the policy is not applied.

Alternatively, check the Supabase dashboard → Table Editor → artifacts → RLS tab — should show the new policy listed.

### Step 4: Run `npm run build` to confirm no regressions

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

### Step 5: Commit

```bash
git add supabase/migrations/002_rls.sql
git commit -m "fix: enable RLS on all tables — restrict anon key to public artifacts only"
```

---

## Task 3: Fix unlisted publish orphaning — API routes

**Context:** When `createShareLink` fails for an unlisted artifact, both API routes fall through to `return NextResponse.json({ artifact: publicArtifact }, { status: 201 })` with no `shareLink`. The frontend then renders a "View artifact" link to `/artifacts/[id]`, which returns 403 for unlisted — a dead end. This task adds a distinct `shareError` flag to the 201 response so the frontend and MCP tool can detect and surface the failure.

**Files:**
- Modify: `src/app/api/artifacts/route.ts` lines 106–117
- Modify: `src/app/api/mcp/artifacts/route.ts` lines 106–118

### Step 1: Fix `src/app/api/artifacts/route.ts`

Replace the current unlisted block (lines 106–117):

```typescript
  // Auto-create 30-day share link for unlisted artifacts
  if (result.data.visibility === "unlisted") {
    const shareResult = await createShareLink({
      artifact_id: result.data.id,
      expires_in_hours: 24 * 30,
      label: "Auto-generated on publish",
    });
    if (shareResult.ok) {
      return NextResponse.json({ artifact: publicArtifact, shareLink: shareResult.data }, { status: 201 });
    }
  }

  return NextResponse.json({ artifact: publicArtifact }, { status: 201 });
```

With:

```typescript
  // Auto-create 30-day share link for unlisted artifacts
  if (result.data.visibility === "unlisted") {
    const shareResult = await createShareLink({
      artifact_id: result.data.id,
      expires_in_hours: 24 * 30,
      label: "Auto-generated on publish",
    });
    if (shareResult.ok) {
      return NextResponse.json({ artifact: publicArtifact, shareLink: shareResult.data }, { status: 201 });
    }
    // Share link creation failed — artifact is saved but inaccessible via web UI.
    // Return the artifact ID so the caller can recover via MCP create_share_link.
    return NextResponse.json(
      {
        artifact: publicArtifact,
        shareError: `Artifact saved (ID: ${result.data.id}) but share link creation failed. Use the MCP create_share_link tool with this ID to recover.`,
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ artifact: publicArtifact }, { status: 201 });
```

### Step 2: Apply the identical fix to `src/app/api/mcp/artifacts/route.ts`

Replace the equivalent unlisted block (lines 106–118) with the same pattern:

```typescript
  // Auto-create 30-day share link for unlisted artifacts
  if (result.data.visibility === "unlisted") {
    const shareResult = await createShareLink({
      artifact_id: result.data.id,
      expires_in_hours: 24 * 30,
      label: "Auto-generated on publish",
    });
    if (shareResult.ok) {
      return NextResponse.json({ artifact: publicArtifact, shareLink: shareResult.data }, { status: 201 });
    }
    return NextResponse.json(
      {
        artifact: publicArtifact,
        shareError: `Artifact saved (ID: ${result.data.id}) but share link creation failed. Use the MCP create_share_link tool with this ID to recover.`,
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ artifact: publicArtifact }, { status: 201 });
```

### Step 3: Run `npm run build` to verify no TypeScript errors

```bash
npm run build
```

Expected: clean build.

---

## Task 4: Fix unlisted publish orphaning — PublishForm success screen

**Context:** `PublishForm` sets `success.shareToken = data.shareLink?.token`. When `shareToken` is undefined and `visibility === "unlisted"`, it currently falls into the public artifact branch ("Your artifact is live in the gallery" + "View artifact" → 403). This task adds a third branch that surfaces the `shareError` message.

**Files:**
- Modify: `src/components/PublishForm.tsx`

### Step 1: Update `SuccessState` interface to include `shareError`

Current interface (lines 31–35):
```typescript
interface SuccessState {
  visibility: ArtifactVisibility;
  artifactId: string;
  shareToken?: string;
}
```

Replace with:
```typescript
interface SuccessState {
  visibility: ArtifactVisibility;
  artifactId: string;
  shareToken?: string;
  shareError?: string;
}
```

### Step 2: Capture `shareError` from the API response

Current `setSuccess` call (lines 89–93):
```typescript
      setSuccess({
        visibility,
        artifactId: data.artifact.id,
        shareToken: data.shareLink?.token,
      });
```

Replace with:
```typescript
      setSuccess({
        visibility,
        artifactId: data.artifact.id,
        shareToken: data.shareLink?.token,
        shareError: data.shareError,
      });
```

### Step 3: Add the error branch to the success screen

Current success render (lines 111–165) has two branches:
1. `success.visibility === "unlisted" && shareUrl` → share link display
2. else → public artifact display

Add a third branch between them. Replace the outer `if` structure starting at line 120:

```tsx
  if (success) {
    const shareUrl = success.shareToken
      ? `${window.location.origin}/share/${success.shareToken}`
      : null;

    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-green-900">Artifact published!</h2>

        {success.visibility === "unlisted" && shareUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-green-800">
              This artifact is unlisted — this link is the only way to access it.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-card px-3 py-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Copy
              </button>
            </div>
          </div>
        ) : success.visibility === "unlisted" && !shareUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-amber-800">
              Your artifact was saved but the share link could not be created.
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Artifact ID: {success.artifactId}
            </p>
            <p className="text-xs text-muted-foreground">
              Use the MCP <code>create_share_link</code> tool with this ID to generate an access link.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-green-800">Your artifact is live in the gallery.</p>
            <div className="flex gap-3">
              <Link
                href={`/artifacts/${success.artifactId}`}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                View artifact
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Back to gallery
              </Link>
            </div>
          </div>
        )}

        <button onClick={reset} className="text-sm text-muted-foreground transition-colors hover:text-foreground underline">
          Publish another
        </button>
      </div>
    );
  }
```

Note: the outer div should use `border-amber-200 bg-amber-50` when `success.visibility === "unlisted" && !shareUrl` to distinguish the warning state. Update the outer `div` className to conditionally apply the right color:

```tsx
    return (
      <div className={`rounded-xl border p-6 space-y-4 ${
        success.visibility === "unlisted" && !shareUrl
          ? "border-amber-200 bg-amber-50"
          : "border-green-200 bg-green-50"
      }`}>
        <h2 className={`text-lg font-semibold ${
          success.visibility === "unlisted" && !shareUrl ? "text-amber-900" : "text-green-900"
        }`}>
          {success.visibility === "unlisted" && !shareUrl ? "Artifact saved — action required" : "Artifact published!"}
        </h2>
```

### Step 4: Run `npm run build`

```bash
npm run build
```

Expected: clean build with no TypeScript errors on the new `shareError` field.

---

## Task 5: Fix unlisted publish orphaning — MCP tool output

**Context:** `mcp/src/tools/publish.ts` has two branches: `unlisted + shareLink` (correct) and the implicit else (shows the public `/artifacts/[id]` URL, which 403s for unlisted). Add an explicit warning branch for `unlisted + no shareLink`.

**Files:**
- Modify: `mcp/src/tools/publish.ts` lines 47–68

### Step 1: Add the missing branch

Replace the current return logic (lines 47–68):

```typescript
      if (artifact.visibility === "unlisted" && shareLink) {
        const shareUrl = `${baseUrl}/share/${shareLink.token}`;
        const expires = new Date(shareLink.expires_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          content: [{
            type: "text" as const,
            text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nShare link (expires ${expires}):\n${shareUrl}`,
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: public\n\nURL: ${baseUrl}/artifacts/${artifact.id}`,
        }],
      };
```

With:

```typescript
      if (artifact.visibility === "unlisted" && shareLink) {
        const shareUrl = `${baseUrl}/share/${shareLink.token}`;
        const expires = new Date(shareLink.expires_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          content: [{
            type: "text" as const,
            text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nShare link (expires ${expires}):\n${shareUrl}`,
          }],
        };
      }

      if (artifact.visibility === "unlisted" && !shareLink) {
        return {
          content: [{
            type: "text" as const,
            text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nWARNING: Share link creation failed. The artifact is saved but inaccessible via the web UI.\nTo recover, call create_share_link with artifact_id: ${artifact.id}`,
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: public\n\nURL: ${baseUrl}/artifacts/${artifact.id}`,
        }],
      };
```

### Step 2: Build the MCP server

```bash
cd mcp && npm run build
```

Expected: clean TypeScript compilation, no errors.

### Step 3: Commit all publish-orphan fixes together

```bash
cd ..
git add src/app/api/artifacts/route.ts src/app/api/mcp/artifacts/route.ts src/components/PublishForm.tsx mcp/src/tools/publish.ts mcp/dist
git commit -m "fix: surface error when unlisted publish share-link creation fails (web + MCP)"
```

---

## Validation checklist after all tasks

1. `npm run build` passes with no errors
2. `cd mcp && npm run build` passes with no errors
3. `.env.example` ends at the `ARTIFACT_HUB_BASE_URL` line — no trailing URL
4. `supabase/migrations/002_rls.sql` exists and contains all four `ENABLE ROW LEVEL SECURITY` statements
5. `npx supabase db push` applied the migration cleanly
6. Direct anon key REST query returns only `visibility: "public"` rows
7. `PublishForm` success screen has three branches: share-link display, amber warning (unlisted + no token), and public artifact links
8. MCP `publish_artifact` tool output has an explicit WARNING branch for unlisted + no shareLink
