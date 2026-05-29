# Owner Delete and Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the artifact owner the ability to delete artifacts (gallery card + detail page) and edit metadata (title, description, tags, visibility) inline on the detail page, all gated to owner mode.

**Architecture:** Two new service functions (`deleteArtifact`, `updateArtifact`) + two new API routes (`DELETE` and `PATCH /api/artifacts/[id]`) + three new client components (`DeleteCardButton`, `ArtifactActions`, propagation of `isOwnerView` through GalleryFilter → ArtifactCard). Detail page reads `?view=owner` from searchParams to show owner controls. MCP gets `delete_artifact` and `update_artifact` tools. No schema migration — `ON DELETE CASCADE` already handles related rows.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase JS client, Tailwind CSS v4, MCP TypeScript SDK.

---

## Task 1: Add service functions — deleteArtifact and updateArtifact

**Files:**
- Modify: `src/types/index.ts` — add `UpdateArtifactBody`
- Modify: `src/lib/services/artifacts.ts` — add two exports

**Step 1: Add `UpdateArtifactBody` to types**

In `src/types/index.ts`, add after `CreateArtifactBody`:

```ts
export interface UpdateArtifactBody {
  title?: string;
  description?: string | null;
  tags?: string[];
  visibility?: ArtifactVisibility;
}
```

**Step 2: Add `deleteArtifact` to `src/lib/services/artifacts.ts`**

Append after `createArtifact`:

```ts
export async function deleteArtifact(id: string): Promise<ServiceResult<void>> {
  const supabase = createAdminClient();

  const { data: artifact, error: fetchErr } = await supabase
    .from("artifacts")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: fetchErr.message };
  }

  const { error: storageErr } = await supabase.storage
    .from("artifacts")
    .remove([artifact.storage_path]);

  if (storageErr) return { ok: false, status: 500, message: `Storage delete failed: ${storageErr.message}` };

  const { error: deleteErr } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (deleteErr) return { ok: false, status: 500, message: deleteErr.message };
  return { ok: true, data: undefined };
}
```

**Step 3: Add `updateArtifact` to `src/lib/services/artifacts.ts`**

Append after `deleteArtifact`. Also add the import for `UpdateArtifactBody` and `ArtifactPublic` at the top of the file (they are already in types, just add to the import line):

```ts
export async function updateArtifact(
  id: string,
  body: UpdateArtifactBody
): Promise<ServiceResult<ArtifactPublic>> {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if ("description" in body) updates.description = body.description ?? null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.visibility !== undefined) updates.visibility = body.visibility;

  if (Object.keys(updates).length === 0) {
    return { ok: false, status: 400, message: "No fields to update" };
  }

  const { data, error } = await supabase
    .from("artifacts")
    .update(updates)
    .eq("id", id)
    .select("id, title, description, tags, type, mime_type, visibility, file_size, original_filename, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: error.message };
  }

  return { ok: true, data: data as ArtifactPublic };
}
```

**Step 4: Update the import line at the top of artifacts.ts**

The current import is:
```ts
import type { Artifact, ArtifactType, ArtifactVisibility, CreateArtifactBody, ServiceResult } from "@/types";
```

Replace with:
```ts
import type { Artifact, ArtifactPublic, ArtifactType, ArtifactVisibility, CreateArtifactBody, UpdateArtifactBody, ServiceResult } from "@/types";
```

**Step 5: Typecheck**

```bash
npm run typecheck 2>&1
```

Expected: no errors.

**Step 6: Commit**

```bash
git add src/types/index.ts src/lib/services/artifacts.ts
git commit -m "feat: add deleteArtifact and updateArtifact service functions"
```

---

## Task 2: Add DELETE and PATCH API routes

**Files:**
- Modify: `src/app/api/artifacts/[id]/route.ts` — add DELETE and PATCH handlers

**Step 1: Add DELETE and PATCH to the route file**

The file currently has only GET. Add these two handlers after it. Also add `deleteArtifact` and `updateArtifact` to the import:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getArtifact, deleteArtifact, updateArtifact } from "@/lib/services/artifacts";
import type { UpdateArtifactBody } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getArtifact(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  if (result.data.visibility === "unlisted") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { storage_path: _, ...publicArtifact } = result.data;
  return NextResponse.json(publicArtifact);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteArtifact(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as UpdateArtifactBody;
  const result = await updateArtifact(id, body);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
```

**Step 2: Typecheck**

```bash
npm run typecheck 2>&1
```

Expected: no errors.

**Step 3: Commit**

```bash
git add "src/app/api/artifacts/[id]/route.ts"
git commit -m "feat: add DELETE and PATCH /api/artifacts/[id] routes"
```

---

## Task 3: Propagate isOwnerView through gallery to detail page

Owner mode needs to flow from gallery → cards → detail page so the detail page can show edit/delete controls.

**Files:**
- Modify: `src/components/GalleryFilter.tsx` — add `isOwnerView` prop, pass to card links
- Modify: `src/components/ArtifactCard.tsx` — add `isOwnerView` prop, append `?view=owner` to href
- Modify: `src/app/page.tsx` — pass `isOwnerView` to GalleryFilter

**Step 1: Update ArtifactCard to accept isOwnerView and adjust its link href**

In `src/components/ArtifactCard.tsx`, change the props:

```tsx
export function ArtifactCard({ artifact, isOwnerView = false }: { artifact: Artifact; isOwnerView?: boolean }) {
```

And change the Link href from `href={/artifacts/${artifact.id}}` to:

```tsx
      href={`/artifacts/${artifact.id}${isOwnerView ? "?view=owner" : ""}`}
```

**Step 2: Update GalleryFilter to accept and pass isOwnerView**

In `src/components/GalleryFilter.tsx`:

Change the Props interface:
```ts
interface Props {
  artifacts: Artifact[];
  isOwnerView?: boolean;
}
```

Change the function signature:
```ts
export function GalleryFilter({ artifacts, isOwnerView = false }: Props) {
```

Pass `isOwnerView` to each ArtifactCard:
```tsx
              <ArtifactCard artifact={artifact} isOwnerView={isOwnerView} />
```

**Step 3: Pass isOwnerView from gallery page to GalleryFilter**

In `src/app/page.tsx`, change:
```tsx
          <GalleryFilter artifacts={result.data} />
```
To:
```tsx
          <GalleryFilter artifacts={result.data} isOwnerView={isOwnerView} />
```

**Step 4: Typecheck**

```bash
npm run typecheck 2>&1
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/components/ArtifactCard.tsx src/components/GalleryFilter.tsx src/app/page.tsx
git commit -m "feat: propagate isOwnerView through gallery to artifact detail links"
```

---

## Task 4: DeleteCardButton — trash icon on gallery cards

A small client component rendered as a sibling overlay on each card in owner mode. Two-click confirmation: first click turns red with "Delete?", second click within 3 seconds deletes and refreshes.

**Files:**
- Create: `src/components/DeleteCardButton.tsx`
- Modify: `src/components/GalleryFilter.tsx` — render DeleteCardButton when isOwnerView

**Step 1: Create DeleteCardButton**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteCardButton({ artifactId }: { artifactId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (state === "idle") {
      setState("confirm");
      setTimeout(() => setState((s) => (s === "confirm" ? "idle" : s)), 3000);
      return;
    }

    if (state === "confirm") {
      setState("deleting");
      await fetch(`/api/artifacts/${artifactId}`, { method: "DELETE" });
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "deleting"}
      className={`absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer disabled:opacity-50 ${
        state === "confirm"
          ? "bg-red-500 text-white opacity-100"
          : "bg-background/90 text-muted-foreground hover:bg-red-50 hover:text-red-600 border border-border"
      }`}
    >
      {state === "idle" && <Trash2 className="h-3 w-3" />}
      {state === "confirm" && "Delete?"}
      {state === "deleting" && "…"}
    </button>
  );
}
```

**Step 2: Add DeleteCardButton to GalleryFilter**

In `src/components/GalleryFilter.tsx`, add the import:
```ts
import { DeleteCardButton } from "./DeleteCardButton";
```

In the results grid, change each card wrapper from:
```tsx
            <div
              key={artifact.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ArtifactCard artifact={artifact} isOwnerView={isOwnerView} />
            </div>
```
To:
```tsx
            <div
              key={artifact.id}
              className="relative animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ArtifactCard artifact={artifact} isOwnerView={isOwnerView} />
              {isOwnerView && <DeleteCardButton artifactId={artifact.id} />}
            </div>
```

**Step 3: Typecheck and lint**

```bash
npm run typecheck 2>&1 && npm run lint 2>&1 | tail -3
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/components/DeleteCardButton.tsx src/components/GalleryFilter.tsx
git commit -m "feat: add DeleteCardButton with two-click confirm on gallery cards in owner mode"
```

---

## Task 5: ArtifactActions — inline edit form and delete confirm on detail page

Client component that handles the full edit flow (title, description, tags, visibility) and delete confirmation, shown only when the detail page is in owner mode.

**Files:**
- Create: `src/components/ArtifactActions.tsx`
- Modify: `src/app/artifacts/[id]/page.tsx` — read searchParams, render ArtifactActions when owner

**Step 1: Create ArtifactActions**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtifactPublic, ArtifactVisibility } from "@/types";

interface Props {
  artifact: ArtifactPublic;
}

export function ArtifactActions({ artifact }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmDelete" | "deleting">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(artifact.title);
  const [description, setDescription] = useState(artifact.description ?? "");
  const [tagsInput, setTagsInput] = useState(artifact.tags.join(", "));
  const [visibility, setVisibility] = useState<ArtifactVisibility>(artifact.visibility);

  function startEdit() {
    setTitle(artifact.title);
    setDescription(artifact.description ?? "");
    setTagsInput(artifact.tags.join(", "));
    setVisibility(artifact.visibility);
    setError("");
    setMode("editing");
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/artifacts/${artifact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          tags,
          visibility,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setMode("deleting");
    await fetch(`/api/artifacts/${artifact.id}`, { method: "DELETE" });
    router.push("/?view=owner");
  }

  if (mode === "editing") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Edit artifact</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="design, q2, draft"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ArtifactVisibility)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="public">Public — visible in gallery</option>
              <option value="unlisted">Unlisted — share link only</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={() => setMode("idle")}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={startEdit}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
      >
        Edit
      </button>
      {mode === "confirmDelete" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Delete this artifact and all its feedback?</span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600 cursor-pointer"
          >
            Yes, delete
          </button>
          <button
            onClick={() => setMode("idle")}
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : mode === "deleting" ? (
        <span className="text-sm text-muted-foreground">Deleting…</span>
      ) : (
        <button
          onClick={() => setMode("confirmDelete")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
        >
          Delete
        </button>
      )}
    </div>
  );
}
```

**Step 2: Update the artifact detail page**

In `src/app/artifacts/[id]/page.tsx`:

Add `searchParams` to the Props interface and import:
```ts
import { ArtifactActions } from "@/components/ArtifactActions";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}
```

Destructure in the component:
```ts
export default async function ArtifactDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { view } = await searchParams;
  const isOwnerView = view === "owner";
```

After the artifact header section (the flex div containing title and ShareButton), add `ArtifactActions`:

```tsx
        {/* Owner actions */}
        {isOwnerView && (
          <ArtifactActions artifact={artifact} />
        )}
```

Place this between the header div and the Preview section. The `artifact` variable is `result.data` which is `Artifact` (includes `storage_path`). Since `ArtifactActions` expects `ArtifactPublic`, destructure `storage_path` out:

```ts
  const { storage_path: _sp, ...publicArtifact } = artifact;
```

Then pass `publicArtifact` to `ArtifactActions`:
```tsx
          <ArtifactActions artifact={publicArtifact} />
```

**Step 3: Typecheck and lint**

```bash
npm run typecheck 2>&1 && npm run lint 2>&1 | tail -3
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/components/ArtifactActions.tsx "src/app/artifacts/[id]/page.tsx"
git commit -m "feat: add inline edit form and delete confirm on artifact detail page in owner mode"
```

---

## Task 6: MCP manage tools — delete_artifact and update_artifact

**Files:**
- Modify: `mcp/src/client.ts` — add `del` helper
- Create: `mcp/src/tools/manage.ts`
- Modify: `mcp/src/index.ts` — register manage tools

**Step 1: Add `del` to mcp/src/client.ts**

The `request` function calls `res.json()` but DELETE returns `{ deleted: true }` so JSON parsing works. Add after `patch`:

```ts
export function del(path: string): Promise<unknown> {
  return request(path, { method: "DELETE" });
}
```

**Step 2: Create mcp/src/tools/manage.ts**

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";

interface ArtifactPublic {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  type: string;
  visibility: string;
}

export function registerManageTools(server: McpServer): void {
  server.tool(
    "delete_artifact",
    "Permanently delete an artifact and all its feedback, share links, and summary. Cannot be undone.",
    {
      artifact_id: z.string().describe("The artifact UUID to delete"),
    },
    async ({ artifact_id }) => {
      await client.del(`/api/artifacts/${artifact_id}`);
      return {
        content: [{
          type: "text" as const,
          text: `Artifact ${artifact_id} deleted. All associated feedback, share links, and summaries have been removed.`,
        }],
      };
    }
  );

  server.tool(
    "update_artifact",
    "Update an artifact's title, description, tags, or visibility. Omit any field to leave it unchanged.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
      title: z.string().min(1).optional().describe("New title"),
      description: z.string().nullable().optional().describe("New description (null to clear)"),
      tags: z.array(z.string()).optional().describe("New tag list — replaces existing tags entirely"),
      visibility: z.enum(["public", "unlisted"]).optional().describe("New visibility: public (gallery) or unlisted (share link only)"),
    },
    async ({ artifact_id, title, description, tags, visibility }) => {
      const body: Record<string, unknown> = {};
      if (title !== undefined) body.title = title;
      if (description !== undefined) body.description = description;
      if (tags !== undefined) body.tags = tags;
      if (visibility !== undefined) body.visibility = visibility;

      const data = (await client.patch(`/api/artifacts/${artifact_id}`, body)) as ArtifactPublic;
      const changes = Object.keys(body).join(", ");

      return {
        content: [{
          type: "text" as const,
          text: `Artifact updated.\nID: ${data.id}\nTitle: ${data.title}\nVisibility: ${data.visibility}\nTags: ${data.tags.join(", ") || "none"}\n\nUpdated: ${changes}`,
        }],
      };
    }
  );
}
```

**Step 3: Register in mcp/src/index.ts**

Add import:
```ts
import { registerManageTools } from "./tools/manage.js";
```

Add call after the existing registrations:
```ts
registerManageTools(server);
```

**Step 4: Build MCP**

```bash
cd mcp && npm run build 2>&1
```

Expected: clean compile.

**Step 5: Commit**

```bash
cd .. && git add mcp/src/client.ts mcp/src/tools/manage.ts mcp/src/index.ts
git commit -m "feat: add delete_artifact and update_artifact MCP tools"
```

---

## Task 7: Final verification

**Step 1: Lint**

```bash
npm run lint 2>&1 | tail -3
```

Expected: 0 errors.

**Step 2: Typecheck**

```bash
npm run typecheck 2>&1
```

Expected: no output (clean).

**Step 3: Tests**

```bash
npm run test:run 2>&1 | tail -4
```

Expected: 16 tests pass.

**Step 4: Report**

Summarise files changed, confirm all owner-mode controls are wired up, and list any remaining gaps.
