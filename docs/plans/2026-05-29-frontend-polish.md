# Frontend Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate Artifact Hub from a functional generic-Tailwind UI to a premium, trustworthy SaaS tool through targeted interaction-quality and visual-polish fixes — no new libraries, no structural changes.

**Architecture:** All changes are isolated to `src/app/globals.css` and `src/components/*.tsx` plus the three `page.tsx` files. No service, API, or data-layer files are touched. Each batch is independently shippable and testable.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Geist font (already loaded in `layout.tsx`), no new dependencies.

---

## Batch 1 — Foundation (globals.css)

**Files:**
- Modify: `src/app/globals.css`

**Problem:** `body { font-family: Arial }` in globals.css overrides the Geist font loaded in `layout.tsx`. Every word on the page renders in Arial. Additionally, buttons have no global `cursor: pointer` and focus-visible rings are only on inputs.

**Step 1: Fix the font override**

Remove the `font-family: Arial, Helvetica, sans-serif` line from the `body` rule. The `@theme inline` block already maps `--font-sans` to `--font-geist-sans`. The body's font-family should come from Tailwind's `font-sans` utility (applied via `layout.tsx`'s `${geistSans.variable}` className chain) — not be hardcoded in globals.

**Step 2: Add global button cursor and focus-visible system**

Add after the existing `body` block:

```css
button,
[role="button"],
label[for],
summary {
  cursor: pointer;
}

:focus-visible {
  outline: 2px solid #18181b;
  outline-offset: 2px;
}

a:focus-visible,
button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid #18181b;
  outline-offset: 2px;
  border-radius: 4px;
}
```

`#18181b` is `zinc-900` — matches the existing button bg and ring color used on inputs (`focus:ring-zinc-900`).

**Step 3: Verify font**

Run `npm run dev`, open `http://localhost:3000`. Text should render in Geist Sans (clean, geometric) instead of Arial (narrower, more compressed). Check the gallery heading, card titles, and nav logo.

**Step 4: Verify focus rings**

Tab through the page. Focus ring should appear on the "Publish" button, the "Artifact Hub" logo link, and filter type buttons — visible dark outline, not the browser default blue.

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Fix font override and add global cursor/focus-visible foundation"
```

---

## Batch 2 — Nav consistency

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/artifacts/[id]/page.tsx`
- Modify: `src/app/publish/page.tsx`
- Modify: `src/app/share/[token]/page.tsx`

**Problem:** Each page inlines its own `<header>`. The nav logo has no hover state. The "← Gallery" back link has no `transition`. The detail page uses `max-w-4xl` for the header while gallery uses `max-w-6xl`, making the sticky nav shift width on navigation.

**Step 1: Align container widths**

In `artifacts/[id]/page.tsx`, the header's inner div uses `max-w-4xl`. The gallery uses `max-w-6xl`. Change the detail-page header container to `max-w-6xl` so the nav doesn't jump when navigating between pages. The main content stays `max-w-4xl`.

**Step 2: Add hover + focus-visible to nav logo**

On the "Artifact Hub" `<Link>` in every page header, add `transition-colors hover:text-zinc-600`:

```tsx
<Link href="/" className="text-lg font-bold text-zinc-900 transition-colors hover:text-zinc-600">
  Artifact Hub
</Link>
```

**Step 3: Add transition to back link**

In `artifacts/[id]/page.tsx`, the "← Gallery" link:

```tsx
<Link href="/" className="text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-900">
  ← Gallery
</Link>
```

**Step 4: Check publish/share pages**

`publish/page.tsx` and `share/[token]/page.tsx` — check their headers and apply the same logo hover pattern.

**Step 5: Verify**

Navigate gallery → detail → back. Nav width should stay consistent. Logo should fade on hover. Back link transitions smoothly.

**Step 6: Commit**

```bash
git add src/app/page.tsx src/app/artifacts/[id]/page.tsx src/app/publish/page.tsx src/app/share/[token]/page.tsx
git commit -m "Align nav widths and add hover transitions to nav links"
```

---

## Batch 3 — Interactive element polish

**Files:**
- Modify: `src/components/GalleryFilter.tsx`
- Modify: `src/components/ShareButton.tsx`
- Modify: `src/components/FeedbackSummary.tsx`
- Modify: `src/components/ArtifactCard.tsx`

**Problem:** Filter type buttons have no `cursor-pointer` and no transition on active state flip. ShareButton and FeedbackSummary buttons lack `cursor-pointer` (now partially fixed by global CSS but explicit is safer for Tailwind v4 purging). ArtifactCard hover is shadow+border only — a micro lift makes it feel premium.

**Step 1: GalleryFilter — transition on type buttons**

Add `transition-colors duration-150` to the type button classes. Both the active and inactive variants need it so the flip is animated:

```tsx
// inactive
"text-zinc-600 hover:bg-zinc-100 transition-colors duration-150"
// active  
"bg-zinc-900 text-white transition-colors duration-150"
```

**Step 2: GalleryFilter — cursor-pointer explicit**

Add `cursor-pointer` to both button class strings (belt-and-suspenders with the global rule).

**Step 3: ShareButton — cursor-pointer + copy button transition**

The main action button: add `cursor-pointer`. The copy button inside the done state: add `transition-colors duration-150 cursor-pointer`.

**Step 4: FeedbackSummary — cursor-pointer on both buttons**

"Summarize feedback" and "Regenerate" buttons: add `cursor-pointer` to each.

**Step 5: ArtifactCard — micro-lift hover**

Change the card `className` to add `-translate-y-0` baseline and `group-hover:-translate-y-0.5` with `transition-[box-shadow,transform,border-color] duration-150`:

```tsx
className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-[box-shadow,transform,border-color] duration-150 hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5"
```

Note: `hover:-translate-y-0.5` is `translateY(-2px)` — subtle, not bouncy.

**Step 6: Verify**

- Filter: click All → PDF → Image. The active state should slide/fade, not flash.
- Card: hover over a card. Tiny lift + shadow should feel smooth.
- Share: hover the share button, click it; loading state should show cursor-pointer + opacity-50.
- Summarize: button should show pointer cursor on hover and focus ring on tab.

**Step 7: Commit**

```bash
git add src/components/GalleryFilter.tsx src/components/ShareButton.tsx src/components/FeedbackSummary.tsx src/components/ArtifactCard.tsx
git commit -m "Polish interactive elements: transitions, cursor, micro-lift on cards"
```

---

## Batch 4 — Mobile form fixes

**Files:**
- Modify: `src/components/FeedbackForm.tsx`
- Modify: `src/components/PublishForm.tsx`

**Problem:** Both forms use `grid grid-cols-2` for the name/role row with no `sm:` guard. At 375px (iPhone SE) the two inputs are cramped at ~168px each with label + padding + border.

**Step 1: Fix FeedbackForm name/role grid**

Find the `grid grid-cols-2 gap-4` wrapping the name and role inputs. Change to:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
```

**Step 2: Fix PublishForm — check for same pattern**

Same change wherever `grid-cols-2` is used for the name/role row.

**Step 3: Verify at 375px**

Open Chrome DevTools, set viewport to 375px width. Both forms should show name and role inputs stacked vertically. At 640px+ they should be side by side.

**Step 4: Commit**

```bash
git add src/components/FeedbackForm.tsx src/components/PublishForm.tsx
git commit -m "Fix mobile layout: stack form name/role inputs below sm breakpoint"
```

---

## Batch 5 — Transition consistency pass

**Files:**
- Modify: `src/app/artifacts/[id]/page.tsx` (tag pill links)
- Modify: `src/components/ShareButton.tsx` (copy transition)

**Problem:** Tag links on the detail page have `hover:bg-zinc-200` with no transition. The ShareButton copy text changes color on hover with no transition.

**Step 1: Tag pill transitions**

In `artifacts/[id]/page.tsx`, the tag `<Link>` elements:

```tsx
className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors duration-150 hover:bg-zinc-200"
```

**Step 2: ShareButton copy button transition (if not done in Batch 3)**

Ensure the copy text button has `transition-colors duration-150`.

**Step 3: Final pass — grep for untransitioned hovers**

Run a search for `hover:` classes in components that lack a `transition` sibling. Fix any remaining ones.

**Step 4: Verify**

Hover over tags on the detail page. Background should fade, not flash.

**Step 5: Final build check**

```bash
npm run build
npm run lint
```

Both should pass clean.

**Step 6: Commit**

```bash
git add src/app/artifacts/[id]/page.tsx src/components/ShareButton.tsx
git commit -m "Transition consistency pass: tag pills and copy button"
```

---

## Manual test checklist (run after all batches)

- [ ] Typography: Gallery heading, card titles, nav logo all render in Geist Sans (not Arial)
- [ ] Focus rings: Tab through gallery nav → Publish button → filter buttons → card links. Each shows a visible zinc-900 ring.
- [ ] Cursor: Hover all buttons across gallery, detail, publish, share pages. All show pointer.
- [ ] ArtifactCard lift: Hover a card. Subtle `-2px` translate + shadow. Smooth at 150ms.
- [ ] Filter transition: Click type filter buttons. No flash; smooth color transition.
- [ ] Mobile forms: 375px viewport. FeedbackForm and PublishForm name/role fields stack vertically.
- [ ] Nav consistency: Navigate gallery → detail. Sticky header width stays the same.
- [ ] Logo hover: Hover "Artifact Hub" in nav. Text fades to zinc-600 smoothly.
- [ ] Back link: Hover "← Gallery". Zinc-500 to zinc-900 transition.
- [ ] Tag links: Hover tags on detail page. Background fades to zinc-200.
- [ ] ShareButton: Click share. Loading state shows opacity-50 + pointer. Done state: copy button transitions.
- [ ] Summarize: Focus the summarize button via Tab. Focus ring visible.
- [ ] Build: `npm run build` passes with 17 routes, no TypeScript errors.

---

## What NOT to change

- Zinc monochrome palette and all badge color coding (pdf=red, image=blue, html=green)
- Tailwind v4 `@theme inline {}` setup
- Page layout widths (max-w-6xl/4xl) and container padding
- All service, API, storage, auth, and database code
- Dark mode CSS variables
- shadcn-style utility patterns on inputs (focus:ring-2 focus:ring-zinc-900)
