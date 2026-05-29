# Theme System — 4-Theme Token Migration + Theme Switcher

**Date:** 2026-05-29  
**Branch:** master  
**Status:** Ready to implement

---

## Goal

Replace all hard-coded Tailwind color classes (`bg-zinc-50`, `text-zinc-900`, `bg-white`, `border-zinc-200`, `bg-violet-600`, etc.) with a semantic CSS custom property token system. Ship all 4 theme variants with a theme switcher in the header, persistent via `localStorage`. Applies to all pages and all components.

---

## 4 Themes

| Key | Name | Background | Accent | Inspired by |
|---|---|---|---|---|
| `saas` | Clean SaaS | Near-black `oklch(0.07)` | Teal `oklch(0.72 0.14 180)` | Linear, Vercel, Stripe |
| `creative` | Creative Gallery | Dark purple `oklch(0.10 0.01 280)` | Cyan + pink | Expressive, visual |
| `docs` | Developer Docs | Off-white `oklch(0.97)` | Indigo `oklch(0.55 0.15 250)` | Technical, calm |
| `premium` | Premium Workspace | Warm cream `oklch(0.98 0.005 60)` | Amber `oklch(0.55 0.12 45)` | Elegant, polished |

Default: `saas`. Theme stored in `localStorage` under key `artifact-hub-theme`.

---

## Token semantics (used everywhere in place of zinc classes)

| Token class | Replaces | Used for |
|---|---|---|
| `bg-background` | `bg-zinc-50`, `bg-white` (page bg) | Page background |
| `bg-card` | `bg-white` (card/panel) | Card and section backgrounds |
| `text-foreground` | `text-zinc-900` | Primary text |
| `text-muted-foreground` | `text-zinc-500`, `text-zinc-400` | Secondary/meta text |
| `border-border` | `border-zinc-200` | All borders |
| `bg-secondary` | `bg-zinc-100` | Tag pills, muted fills |
| `bg-input` | `bg-white` on inputs | Input backgrounds |
| `bg-primary` | `bg-violet-600` | Primary action buttons |
| `text-primary-foreground` | `text-white` on primary buttons | Button text |
| `hover:bg-primary/90` | `hover:bg-violet-700` | Primary button hover |
| `text-primary` | `text-violet-600` | Accent text, active states |
| `focus:ring-ring` | `focus:ring-violet-600` | Focus rings |
| `accent-primary` | `accent-violet-600` | Radio/checkbox accent |

---

## Batch 1 — Foundation

**Files:**
- `src/app/globals.css` — full replacement
- `src/components/ThemeProvider.tsx` — new file
- `src/components/ThemeSwitcher.tsx` — new file
- `src/app/layout.tsx` — wrap with ThemeProvider

### `src/app/globals.css`

Full replacement with:
1. `@import "tailwindcss"` and `@import "tw-animate-css"` (tw-animate-css already in new design; check if available, else skip)
2. `@custom-variant dark (&:is(.dark *))`
3. `:root, .theme-saas` — Clean SaaS dark palette (near-black bg, teal primary)
4. `.theme-creative` — Dark purple bg, cyan/pink primary
5. `.theme-docs` — Off-white bg, indigo primary
6. `.theme-premium` — Warm cream bg, amber primary
7. `.dark` — matches saas palette (for `prefers-color-scheme` fallback)
8. `@theme inline` block — maps all `--color-*` tokens to CSS vars
9. `@layer base` — `* { @apply border-border outline-ring/50 }`, `body { @apply bg-background text-foreground }`
10. Keep existing: `button, [role="button"], label[for], summary { cursor: pointer }` (move into `@layer base`)
11. Keep `:focus-visible` but update to use `var(--ring)` instead of hardcoded `#7f22fe`
12. Add: `card-glow` CSS class (gradient border glow on hover via `::before` pseudo-element)
13. Add: `skeleton-shimmer` animation class
14. Add: `@keyframes fadeInUp` + `.animate-fade-in-up`
15. Add: custom scrollbar styles using token vars

### `src/components/ThemeProvider.tsx`

```tsx
"use client"
// Context: { theme, setTheme }
// On mount: read localStorage key "artifact-hub-theme", default to "saas"
// On theme change: write to localStorage, swap CSS class on document.documentElement
// Classes: "theme-saas" | "theme-creative" | "theme-docs" | "theme-premium"
// Export: ThemeProvider (wraps children), useTheme hook
```

### `src/components/ThemeSwitcher.tsx`

```tsx
"use client"
// Reads { theme, setTheme } from useTheme()
// Renders a <select> or segmented button group with 4 options:
//   "saas" → "SaaS", "creative" → "Creative", "docs" → "Docs", "premium" → "Premium"
// Styled with token classes: bg-secondary, text-foreground, border-border
// Size: small (h-8, text-xs or text-sm)
```

### `src/app/layout.tsx`

Wrap `<body>` children with `<ThemeProvider>`. No other changes.

**Verify:** `npm run build` clean. Theme class applied to `<html>` on load. Switching themes in browser console via `localStorage.setItem("artifact-hub-theme", "theme-docs")` + reload changes palette.

---

## Batch 2 — Header

**Files:**
- `src/components/Header.tsx` — new shared component
- `src/app/page.tsx` — replace inline header with `<Header />`
- `src/app/artifacts/[id]/page.tsx` — replace inline header with `<Header backHref="/" backLabel="← Gallery" />`
- `src/app/share/[token]/page.tsx` — replace inline header with `<Header backHref="/" backLabel="← Gallery" />`
- `src/app/publish/page.tsx` — replace inline header with `<Header backHref="/" backLabel="← Gallery" />`

### `src/components/Header.tsx`

```tsx
// Props: backHref?: string, backLabel?: string
// Structure:
//   <header sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl>
//     <div container mx-auto px-4 md:px-6 lg:px-8>
//       <div flex h-16 items-center justify-between>
//         Logo:
//           <Link href="/">
//             [icon badge: w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20]
//               <Layers className="h-5 w-5 text-primary" />
//             "Artifact Hub" text-lg font-semibold tracking-tight text-foreground
//           </Link>
//         Actions:
//           <ThemeSwitcher />
//           {backHref
//             ? <Link href={backHref} text-sm text-muted-foreground hover:text-foreground transition-colors>{backLabel}</Link>
//             : <Link href="/publish" bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors>Publish</Link>
//           }
```

**Verify:** All 4 pages render identical header. Logo icon badge visible. Theme switcher present. Back link vs Publish button renders correctly per page.

---

## Batch 3 — Gallery + FilterTabs + ArtifactCard

**Files:**
- `src/app/page.tsx` — gallery heading, subtitle, new grid layout, loading overlay
- `src/components/GalleryFilter.tsx` — pill group with icons + count badges (counts require server data — see note)
- `src/components/ArtifactCard.tsx` — colored badges, card-glow, ArrowUpRight animation, token classes

### `src/app/page.tsx` changes

1. Remove inline header (replaced by Batch 2 Header)
2. Page wrapper: `min-h-screen bg-background` (remove `bg-zinc-50`)
3. Below header, add page title section:
   ```tsx
   <div className="mb-8">
     <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Gallery</h1>
     <p className="text-muted-foreground">Browse and manage your generated artifacts</p>
   </div>
   ```
4. Filter row: `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8`
5. Grid: `grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
6. Error state: replace `border-red-200 bg-red-50 text-red-700` with token equivalents (`border-destructive/30 bg-destructive/10 text-destructive`)
7. Empty state: replace `border-zinc-200 bg-white` with `border-border bg-card`
8. Empty state CTA: replace `bg-violet-600 hover:bg-violet-700` with `bg-primary hover:bg-primary/90 text-primary-foreground`
9. Add staggered card animation: wrap each `<ArtifactCard>` in a `<div className="animate-fade-in-up" style={{ animationDelay: \`${index * 50}ms\` }}>` 

**Note on counts in FilterTabs:** The gallery is server-rendered and already fetches all artifacts. Pass count totals as props to `GalleryFilter`. Add a `counts` prop: `{ all: number; pdf: number; image: number; html: number }`. Compute from the `artifacts` array before rendering.

### `src/components/GalleryFilter.tsx` changes

1. Add props: `counts?: { all: number; pdf: number; image: number; html: number }`
2. Filter container: replace `border-zinc-200 bg-white` with `bg-secondary/50 border border-border`
3. Each filter button:
   - Add icon (Layers / FileText / Image / Code) from `lucide-react`
   - Active: `bg-card text-foreground shadow-sm` (remove `bg-violet-600 text-white`)
   - Inactive: `text-muted-foreground hover:text-foreground hover:bg-secondary/80`
   - Count badge: `px-1.5 py-0.5 text-xs rounded-md` — active: `bg-primary/10 text-primary`, inactive: `bg-muted text-muted-foreground`
4. Tag input: replace `border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-violet-600` with `bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring`
5. Clear button: replace `text-zinc-500 hover:text-zinc-900` with `text-muted-foreground hover:text-foreground`
6. Spinner: replace `text-zinc-400` with `text-muted-foreground`
7. Loading overlay: add full-grid overlay when `isPending` — `absolute inset-0 bg-background/50 backdrop-blur-sm` with centered spinner

### `src/components/ArtifactCard.tsx` changes

1. Wrapper `<Link>`: replace `border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300` with:
   ```
   border-border bg-card hover:border-primary/30 hover:bg-card/80
   hover:shadow-lg hover:shadow-primary/5 card-glow
   ```
2. Title: `text-zinc-900` → `text-card-foreground group-hover:text-primary transition-colors`
3. Type badge — replace ring-based badges with colored icon badges:
   ```tsx
   const TYPE_CONFIG = {
     pdf:   { icon: FileText, label: "PDF",   cls: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
     image: { icon: Image,    label: "Image", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
     html:  { icon: Code,     label: "HTML",  cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
   }
   // Render: <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border ${cls}`}><Icon className="h-3 w-3" />{label}</span>
   ```
4. Description: `text-zinc-500` → `text-muted-foreground`
5. Tags: `bg-zinc-100 text-zinc-600` → `bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground`
6. Footer: add `border-t border-border/50 pt-3 flex items-center justify-between`
   - Left: `<Calendar className="h-3.5 w-3.5" />` + formatted date in `text-muted-foreground text-xs`
   - Right: `<ArrowUpRight>` with animation: `opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300`

**Verify:** Run dev server. Gallery renders in dark SaaS theme. Switch theme via switcher — all 4 palettes apply. Cards show colored badges + arrow animation. Filter tabs show icons + counts.

---

## Batch 4 — Detail + Share pages

**Files:**
- `src/app/artifacts/[id]/page.tsx`
- `src/app/share/[token]/page.tsx`
- `src/components/ArtifactPreview.tsx` (if it has hard-coded zinc classes)
- `src/components/ShareButton.tsx`

### Token replacements for both pages

| Old class | New class |
|---|---|
| `bg-zinc-50` | `bg-background` |
| `bg-white` | `bg-card` |
| `border-zinc-200` | `border-border` |
| `text-zinc-900` | `text-foreground` |
| `text-zinc-500`, `text-zinc-400` | `text-muted-foreground` |
| `text-zinc-600` | `text-muted-foreground` |
| `bg-zinc-100` | `bg-secondary` |
| `bg-red-50 border-red-200 text-red-700` | `bg-destructive/10 border-destructive/30 text-destructive` |

### Specific changes

- Remove inline header markup — replaced by `<Header backHref="/" backLabel="← Gallery" />`
- Artifact title: `text-foreground`
- Artifact meta (type badge, date, visibility): use same `TYPE_CONFIG` colored badges from ArtifactCard
- Tags: `bg-secondary text-muted-foreground`
- Preview container: `bg-card border border-border rounded-xl`
- Section headings ("Feedback", "AI Summary"): `text-foreground font-semibold`
- Section containers: `bg-card border border-border rounded-xl p-6`
- Unlisted 403 error state: `bg-background` page, `text-foreground` heading, `text-muted-foreground` body, `text-primary` back link

**Verify:** Detail page for a public artifact renders cleanly in all 4 themes. 403 state for unlisted artifact renders correctly.

---

## Batch 5 — Publish + Feedback components

**Files:**
- `src/app/publish/page.tsx`
- `src/components/PublishForm.tsx`
- `src/components/FeedbackForm.tsx`
- `src/components/FeedbackSummary.tsx`
- `src/components/FeedbackList.tsx`

### Token replacements (all files)

Same zinc → token mapping as Batch 4, plus:

| Old class | New class |
|---|---|
| `bg-violet-600 hover:bg-violet-700 text-white` | `bg-primary hover:bg-primary/90 text-primary-foreground` |
| `focus:ring-violet-600` | `focus:ring-ring` |
| `accent-violet-600` | `accent-primary` |
| `file:bg-violet-600 file:hover:bg-violet-700` | `file:bg-primary file:hover:bg-primary/90` |
| Input borders | `border-border bg-input` |
| Input focus rings | `focus:ring-ring` |

### PublishForm specific

- Remove inline header — publish page uses `<Header backHref="/" backLabel="← Gallery" />`
- Form container: `bg-card border border-border rounded-xl`
- All `<input>`, `<textarea>`, `<select>`: `bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-ring`
- Radio groups: `accent-primary`
- Submit button: `bg-primary hover:bg-primary/90 text-primary-foreground`
- "View artifact" success link: `text-primary hover:text-primary/80`
- File input: `file:bg-primary file:text-primary-foreground`

### FeedbackForm specific

- Same input/button token swaps
- Submit button: `bg-primary hover:bg-primary/90 text-primary-foreground`
- "Add another" button after success: `bg-secondary text-foreground hover:bg-secondary/80`

### FeedbackSummary specific

- "Summarize feedback" + "Regenerate" buttons: `bg-primary hover:bg-primary/90 text-primary-foreground`
- Summary panels (overall assessment, issues, suggestions): `bg-card border border-border rounded-lg`
- "Stale" badge: keep amber — semantic color, not accent-dependent

### FeedbackList specific

- Feedback type/status badges: keep existing red/green/blue/amber semantic colors — these are intentional semantic signals, not accent-dependent
- Container/item borders: `border-border`
- Text: `text-foreground` / `text-muted-foreground`

**Verify:** Publish form works in all 4 themes. Feedback form submits and list updates. Summary generates and displays. All inputs have correct focus rings per theme.

---

## Implementation order

```
Batch 1 → Batch 2 → Batch 3 → Batch 4 → Batch 5
```

Each batch ends with `npm run build` (must be clean) + dev server visual check across all 4 themes before proceeding to the next batch.

## Files created (new)

- `src/components/ThemeProvider.tsx`
- `src/components/ThemeSwitcher.tsx`
- `src/components/Header.tsx`

## Files modified

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/artifacts/[id]/page.tsx`
- `src/app/share/[token]/page.tsx`
- `src/app/publish/page.tsx`
- `src/components/ArtifactCard.tsx`
- `src/components/GalleryFilter.tsx`
- `src/components/PublishForm.tsx`
- `src/components/FeedbackForm.tsx`
- `src/components/FeedbackSummary.tsx`
- `src/components/FeedbackList.tsx`
- `src/components/ArtifactPreview.tsx` (token sweep if zinc classes present)
- `src/components/ShareButton.tsx` (token sweep if zinc classes present)

## Success criteria

- All 4 themes apply instantly on switcher change, persist across page navigations and browser refreshes
- `npm run build` clean after each batch and at the end
- No `zinc-`, `violet-6` or `white` hardcoded color classes remaining in any `src/app/` or `src/components/` file (grep to verify)
- Dev server visual check: gallery, detail, share, publish all look correct in saas + docs themes (the two most different palettes)
