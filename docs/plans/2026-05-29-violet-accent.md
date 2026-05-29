# Violet Accent + Filter Loading Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply violet-600 (#7c3aed) as the single brand accent across all primary interactive elements, replacing coal-black zinc-900 on buttons/active states/focus rings; add a useTransition spinner to GalleryFilter so filter switches have visible feedback.

**Architecture:** No structural changes. Two concerns: (1) a mechanical color swap — every primary button and focus ring changes from zinc-900 to violet-600, leaving all backgrounds, borders, text, and semantic badge colors untouched; (2) a React useTransition wrapper in GalleryFilter that exposes an isPending flag for a lightweight spinner. Both are isolated to their respective files with no cross-cutting dependencies.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, React 19 (useTransition built-in). No new dependencies.

---

### Scope: what changes and what does NOT

**Changes to violet-600 (`#7c3aed`):**
- `:focus-visible` outline in `globals.css`
- Every primary `bg-zinc-900 hover:bg-zinc-700 text-white` button/link
- Every `focus:ring-zinc-900` on form inputs and textareas
- Every `accent-zinc-900` on radio inputs
- Active filter tab `bg-zinc-900 text-white` in GalleryFilter
- `file:bg-zinc-900 hover:file:bg-zinc-700` on the file input in PublishForm

**Does NOT change:**
- `text-zinc-*` body/label/secondary text — all stays zinc
- `bg-zinc-50`, `bg-zinc-100`, `bg-white` backgrounds — all stays
- `border-zinc-200` borders — all stays
- Secondary/outlined buttons (`bg-white border-zinc-200`) — stays zinc
- Semantic badge colors (red/green/blue/amber) — untouched
- Navigation logo hover `hover:text-zinc-600` — stays zinc
- `← Gallery` back link hover — stays zinc
- `FeedbackSummary` "Regenerate" outlined button — stays zinc (secondary action)
- All layout, spacing, typography — zero changes

---

## Task 1: globals.css — focus-visible accent

**Files:**
- Modify: `src/app/globals.css`

**What:** Change the `:focus-visible` outline color from zinc-900 (`#18181b`) to violet-600 (`#7c3aed`). This is the single source of truth for all keyboard focus rings on links and buttons.

**Current state (line 34–38):**
```css
:focus-visible {
  outline: 2px solid #18181b;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Step 1: Apply the change**

Replace `#18181b` with `#7c3aed`:
```css
:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Step 2: Verify**

Run `npm run build` — must pass clean.

Start dev server (`npm run dev`), open `http://localhost:3000`, press Tab. The focus ring on the "Artifact Hub" logo link and the "Publish" button should be violet, not black.

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Apply violet-600 to focus-visible outline"
```

---

## Task 2: page.tsx — Publish button + empty state CTA

**Files:**
- Modify: `src/app/page.tsx`

**What:** Two buttons in the gallery page: the "Publish" nav button and the "Publish the first one" empty-state button. Both use `bg-zinc-900 hover:bg-zinc-700`.

**Current state:**

Line 31–35 (Publish nav button):
```tsx
<Link
  href="/publish"
  className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
>
```

Line 54–57 (empty state CTA):
```tsx
<Link
  href="/publish"
  className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-700"
>
```

**Step 1: Apply changes**

Nav button — change `bg-zinc-900` → `bg-violet-600`, `hover:bg-zinc-700` → `hover:bg-violet-700`, `transition` → `transition-colors duration-150`:
```tsx
className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700"
```

Empty state button — same swap:
```tsx
className="mt-4 inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700"
```

**Step 2: Verify**

Open `http://localhost:3000`. The "Publish" button in the top-right nav should be violet. Navigate to a filtered empty state (e.g. `/?type=pdf` with no PDF artifacts) — the "Publish the first one" CTA should be violet.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Violet accent on gallery Publish button and empty state CTA"
```

---

## Task 3: GalleryFilter — active tab + focus ring + filter loading spinner

**Files:**
- Modify: `src/components/GalleryFilter.tsx`

**What:** Three changes in one file:
1. Active filter tab changes from `bg-zinc-900 text-white` → `bg-violet-600 text-white`
2. Tag input focus ring: `focus:ring-zinc-900` → `focus:ring-violet-600`
3. Add `useTransition` so clicking a filter shows an inline spinner during the server re-render delay (typically 200–600ms)

**How useTransition works here:** `startTransition(() => router.push(...))` marks the navigation as a React transition. `isPending` is `true` from the moment the button is clicked until the new server-rendered content lands. We use it to show a spinner and set `aria-busy`.

**Full replacement for `src/components/GalleryFilter.tsx`:**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ArtifactType } from "@/types";

const TYPES: { value: ArtifactType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "html", label: "HTML" },
];

export function GalleryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentType = searchParams.get("type") ?? "";
  const currentTag = searchParams.get("tag") ?? "";

  function update(key: string, value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilter = currentType || currentTag;

  return (
    <div className="flex flex-wrap items-center gap-3" aria-busy={isPending}>
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("type", value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              currentType === value
                ? "bg-violet-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Filter by tag…"
        value={currentTag}
        onChange={(e) => update("tag", e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-600"
      />

      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-900 underline"
        >
          Clear
        </button>
      )}

      {isPending && (
        <svg
          className="h-4 w-4 animate-spin text-zinc-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
    </div>
  );
}
```

**Step 1: Replace the file**

Write the full content above to `src/components/GalleryFilter.tsx`.

**Step 2: Verify**

Open `http://localhost:3000`. The "All" tab should be violet. Click "PDF" — it should turn violet and "All" should go back to the inactive (zinc-600) style. While the filter is switching you should see a small spinning indicator appear briefly in the filter bar. Tab to the tag input — focus ring should be violet.

**Step 3: Commit**

```bash
git add src/components/GalleryFilter.tsx
git commit -m "Violet active filter tab, violet focus ring, useTransition spinner on filter switch"
```

---

## Task 4: FeedbackSummary — Summarize button

**Files:**
- Modify: `src/components/FeedbackSummary.tsx`

**What:** The "Summarize feedback" primary button (line 59). The "Regenerate" button is a secondary outlined button — it stays zinc.

**Current state (line 58–60):**
```tsx
className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-700 disabled:opacity-50"
```

**Step 1: Apply change**

```tsx
className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700 disabled:opacity-50"
```

**Step 2: Verify**

Open any artifact detail page that has feedback but no summary. The "Summarize feedback" button should be violet. Click it — during generation it should remain violet with `opacity-50` (disabled state). The "Regenerate" button (shown when stale) should remain the existing outlined zinc style.

**Step 3: Commit**

```bash
git add src/components/FeedbackSummary.tsx
git commit -m "Violet accent on Summarize feedback button"
```

---

## Task 5: FeedbackForm — submit button, focus rings, radio accent

**Files:**
- Modify: `src/components/FeedbackForm.tsx`

**What:** Four changes:
1. Submit button (line 139): `bg-zinc-900 hover:bg-zinc-700 transition` → `bg-violet-600 hover:bg-violet-700 transition-colors duration-150`
2. Name input (line 87): `focus:ring-zinc-900` → `focus:ring-violet-600`
3. Role input (line 97): `focus:ring-zinc-900` → `focus:ring-violet-600`
4. Comment textarea (line 130): `focus:ring-zinc-900` → `focus:ring-violet-600`
5. Radio inputs (line 113): `accent-zinc-900` → `accent-violet-600`

**Step 1: Submit button**

Line 139 — change:
```tsx
className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
```
To:
```tsx
className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700 disabled:opacity-50"
```

**Step 2: Name input (line 87), Role input (line 97), Comment textarea (line 130)**

Replace all three occurrences of `focus:ring-zinc-900` → `focus:ring-violet-600`. These are identical patterns, use replace_all or edit each individually.

**Step 3: Radio inputs (line 113)**

```tsx
className="accent-zinc-900"
```
→
```tsx
className="accent-violet-600"
```

**Step 4: Verify**

Open any artifact detail page. Tab into the feedback form — name input focus ring should be violet. The radio buttons (Approval / Suggestion / Issue / Question) should use violet accent when selected. Click "Submit feedback" — button should be violet and turn `opacity-50` while submitting.

**Step 5: Commit**

```bash
git add src/components/FeedbackForm.tsx
git commit -m "Violet accent on FeedbackForm submit, inputs, and radio accent"
```

---

## Task 6: PublishForm — submit button, View artifact link, file input, focus rings, radio accent

**Files:**
- Modify: `src/components/PublishForm.tsx`

**What:** Six changes:
1. Submit button (line 247): `bg-zinc-900 hover:bg-zinc-700 transition` → `bg-violet-600 hover:bg-violet-700 transition-colors duration-150`
2. "View artifact" success link (line 147): `bg-zinc-900 hover:bg-zinc-700` → `bg-violet-600 hover:bg-violet-700`
3. File input button (line 179): `file:bg-zinc-900 hover:file:bg-zinc-700` → `file:bg-violet-600 hover:file:bg-violet-700`
4. Title input (line 193), Description textarea (line 204), Tags input (line 215): `focus:ring-zinc-900` → `focus:ring-violet-600`
5. Visibility radio (line 230): `accent-zinc-900` → `accent-violet-600`

"Back to gallery" link (line 153) stays zinc — it's a secondary outlined button.
"Publish another" underline link (line 161) stays zinc — it's a tertiary text link.

**Step 1: Submit button (line 247)**

```tsx
className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700 disabled:opacity-50"
```

**Step 2: View artifact link (line 147)**

```tsx
className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-violet-700"
```

**Step 3: File input button (line 179)**

Replace `file:bg-zinc-900` → `file:bg-violet-600` and `hover:file:bg-zinc-700` → `hover:file:bg-violet-700`.

**Step 4: Three input focus rings (lines 193, 204, 215)**

Replace all three `focus:ring-zinc-900` → `focus:ring-violet-600`.

**Step 5: Visibility radio (line 230)**

```tsx
className="accent-violet-600"
```

**Step 6: Verify**

Open `http://localhost:3000/publish`. The file picker button should be violet. Tab through inputs — all focus rings should be violet. The "Public" / "Unlisted" radio selects should show violet accent when active. Submit a test artifact — the "Publish artifact" button should be violet while uploading. On success, the "View artifact" button should be violet; "Back to gallery" stays outlined/zinc.

**Step 7: Commit**

```bash
git add src/components/PublishForm.tsx
git commit -m "Violet accent on PublishForm submit, file button, inputs, and radio accent"
```

---

## Task 7: Final build + lint check

**Step 1: Run build**

```bash
npm run build
```

Expected: clean compile, 17 routes, zero TypeScript errors.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: no ESLint warnings or errors.

**Step 3: Playwright smoke check**

Run the verification script from the previous polish session to confirm:
- Focus ring is violet (computed outline color should be `#7c3aed` or `lab(...)` equivalent)
- Active filter button background is violet
- Primary buttons have violet background

**Step 4: Update TRACKER.md**

Add Phase 8 entry noting Direction 1 (Violet accent) complete. List all 6 commits.

**Step 5: Commit TRACKER.md + plan**

```bash
git add docs/TRACKER.md docs/plans/2026-05-29-violet-accent.md
git commit -m "Phase 8 complete: violet-600 accent + filter loading spinner"
```

---

## Manual test checklist (run after all tasks)

- [ ] Tab through gallery nav — focus ring on logo and Publish button is **violet**, not black
- [ ] Gallery filter: "All" tab is violet (active). Click PDF/Image/HTML — selected tab turns violet; brief spinner appears while cards refresh
- [ ] Tag input: focus ring is violet
- [ ] Gallery: "Publish" nav button is violet with smooth hover to violet-700
- [ ] Detail page: "Summarize feedback" button is violet; "Regenerate" stays outlined/zinc
- [ ] Feedback form: focus rings on name/role/comment inputs are violet; radio buttons use violet accent; submit button is violet
- [ ] Publish page: file picker button is violet; all input focus rings are violet; visibility radio uses violet; submit is violet
- [ ] Publish success state: "View artifact" is violet; "Back to gallery" stays outlined zinc; "Publish another" stays zinc text
- [ ] Semantic badges (PDF=red, Image=blue, HTML=green, Approval=green, Issue=red etc.) all unchanged
- [ ] Body text, borders, card backgrounds, page background — all unchanged zinc
- [ ] `npm run build` passes clean

---

## What NOT to change

- `text-zinc-*` classes anywhere — text stays zinc
- `bg-zinc-50`, `bg-zinc-100`, `bg-white` surface colors
- `border-zinc-200` borders
- Secondary outlined buttons: `border-zinc-200 bg-white hover:bg-zinc-50`
- The "Regenerate" button in FeedbackSummary
- The ShareButton (outlined style; idle state is secondary)
- Navigation logo hover: `hover:text-zinc-600`
- Back/gallery links: `hover:text-zinc-900`
- Any semantic badge color (red/green/blue/amber)
- Tailwind v4 setup, layout, spacing, typography
- All API, service, storage, auth code
