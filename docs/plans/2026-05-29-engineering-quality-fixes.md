# Engineering Quality Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 2 existing ESLint errors, add Vitest with high-signal pure-logic tests, add a GitHub Actions CI workflow (lint + typecheck + test), and remove dead code from `supabase.ts` — all without refactoring broadly or touching submission docs.

**Architecture:** All changes are isolated to: source files with lint errors, test files (new), config files (new), and one dead-code removal. No new abstractions. No changes to API routes, services logic, or pages beyond the lint fixes.

**Tech Stack:** Vitest (test runner), GitHub Actions (CI), TypeScript, Next.js 16, ESLint 9.

**Decisions made in brainstorm:**
- Test framework: Vitest (native TS/ESM, no config friction)
- Test scope: Option A — pure logic only (`isMcpAuthorized` + `isValidSummaryData`), no Supabase mocking
- CI: typecheck (`tsc --noEmit`) + lint + vitest run, NO `next build` (avoids secrets/prerender failure)
- `.gitignore`: already correct, no change needed

---

## Task 1: Verify the lint errors before touching anything

**Files:**
- Read: none (just run the linter)

**Step 1: Run lint and capture the exact errors**

```bash
npm run lint 2>&1
```

Expected: 2 errors — one in `src/components/ThemeProvider.tsx`, one in `src/app/share/[token]/page.tsx`. Note the exact rule names for both.

---

## Task 2: Fix lint error in ThemeProvider.tsx

The rule `react-hooks/set-state-in-effect` fires because `setThemeState(stored)` is called directly inside a `useEffect`. Fix: move the localStorage read into a lazy `useState` initializer (runs once on client mount), then use a separate effect that only applies the theme class to the DOM (no `setState`).

**Files:**
- Modify: `src/components/ThemeProvider.tsx`

**Step 1: Replace the `useState` + `useEffect` block**

Replace lines 25–33 (the `useState` call and the mount-only `useEffect`) with:

```tsx
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored && isValidTheme(stored) ? stored : DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
```

- The lazy initializer (`() => ...`) runs once on the client. The `typeof window === "undefined"` guard ensures SSR doesn't throw.
- The new `useEffect` only calls `applyTheme` (a DOM mutation, not `setState`) whenever `theme` changes — satisfies `react-hooks/set-state-in-effect`.
- The `setTheme` function defined below remains unchanged.

**Step 2: Run lint to confirm the ThemeProvider error is gone**

```bash
npm run lint 2>&1
```

Expected: ThemeProvider error is gone, share page error still present.

---

## Task 3: Fix lint error in src/app/share/[token]/page.tsx

The rule fires on line 50: `Date.now()` is called inline. Fix: capture the current time as a variable before it's used in a comparison.

**Files:**
- Modify: `src/app/share/[token]/page.tsx`

**Step 1: Extract `Date.now()` to a variable**

Replace line 50:
```tsx
  const isExpiringSoon = (expiresDate.getTime() - Date.now()) / 3_600_000 < 24;
```

With:
```tsx
  const now = Date.now();
  const isExpiringSoon = (expiresDate.getTime() - now) / 3_600_000 < 24;
```

**Step 2: Run lint to confirm zero errors**

```bash
npm run lint 2>&1
```

Expected output: `0 problems` (or only warnings, no errors).

**Step 3: Commit both lint fixes**

```bash
git add src/components/ThemeProvider.tsx src/app/share/[token]/page.tsx
git commit -m "fix: resolve two ESLint errors (setState-in-effect, impure Date.now)"
```

---

## Task 4: Remove dead code from supabase.ts

`createBrowserClient` and `createSupabaseServerClient` are exported but never called anywhere in the codebase. Their presence implies a cookie-based SSR auth layer that doesn't exist. Removing them simplifies the file and eliminates the misleading `@supabase/ssr` import.

**Files:**
- Modify: `src/lib/supabase.ts`

**Step 1: Delete the dead exports and the import**

Replace the entire file content with:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client — service role key, server-side only.
// All service functions use this; no cookie-based or browser auth is implemented.
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
```

**Step 2: Run typecheck to confirm no references broke**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors related to supabase.ts. If any file imported `createBrowserClient` or `createSupabaseServerClient`, the error will appear here — check with grep first if unsure:

```bash
grep -r "createBrowserClient\|createSupabaseServerClient" src/ --include="*.ts" --include="*.tsx"
```

Expected: no matches (these were never called).

**Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "refactor: remove unused createBrowserClient and createSupabaseServerClient exports"
```

---

## Task 5: Install Vitest and add config + scripts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

**Step 2: Create vitest.config.ts at the repo root**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- `environment: "node"` — no DOM needed; auth and summarize tests are pure Node.
- The `@` alias mirrors `tsconfig.json` `"paths": { "@/*": ["./src/*"] }` so `@/lib/...` imports resolve in tests.

**Step 3: Add scripts to package.json**

Add three scripts to the `"scripts"` block:
- `"test": "vitest"` — interactive watch mode for development
- `"test:run": "vitest run"` — single-pass for CI
- `"typecheck": "tsc --noEmit"` — used by CI instead of full build

Final `"scripts"` block:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "seed": "node supabase/seed.mjs",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

**Step 4: Verify vitest is runnable (no tests yet — should pass with 0 tests)**

```bash
npm run test:run 2>&1
```

Expected: `No test files found` or exits 0 with 0 tests.

---

## Task 6: Export `isValidSummaryData` and write auth tests

`isValidSummaryData` is currently a module-private function in `summarize.ts`. Adding `export` is the only source change — the function logic and signature are unchanged.

**Files:**
- Modify: `src/lib/services/summarize.ts` (add `export` keyword)
- Create: `src/lib/auth.test.ts`

**Step 1: Export `isValidSummaryData`**

In `src/lib/services/summarize.ts` line 28, change:
```ts
function isValidSummaryData(data: unknown): data is FeedbackSummaryData {
```
To:
```ts
export function isValidSummaryData(data: unknown): data is FeedbackSummaryData {
```

**Step 2: Create `src/lib/auth.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { isMcpAuthorized } from "./auth";

// Build a minimal fake request — avoids importing next/server in the test runner.
// isMcpAuthorized only calls request.headers.get(), so this is sufficient.
function makeRequest(apiKey?: string): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name === "x-api-key" ? (apiKey ?? null) : null,
    },
  } as unknown as NextRequest;
}

describe("isMcpAuthorized", () => {
  const TEST_KEY = "test-secret-key-abcde";
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ARTIFACT_HUB_ADMIN_KEY;
    process.env.ARTIFACT_HUB_ADMIN_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env.ARTIFACT_HUB_ADMIN_KEY = originalKey;
  });

  it("returns true for the correct key", () => {
    expect(isMcpAuthorized(makeRequest(TEST_KEY))).toBe(true);
  });

  it("returns false for a wrong key of the same length", () => {
    // Same length ensures the length-mismatch short-circuit doesn't mask the comparison
    expect(isMcpAuthorized(makeRequest("test-secret-key-xxxxx"))).toBe(false);
  });

  it("returns false for a key of different length", () => {
    expect(isMcpAuthorized(makeRequest("short"))).toBe(false);
  });

  it("returns false when x-api-key header is missing", () => {
    expect(isMcpAuthorized(makeRequest())).toBe(false);
  });

  it("returns false when ARTIFACT_HUB_ADMIN_KEY env var is not set", () => {
    delete process.env.ARTIFACT_HUB_ADMIN_KEY;
    expect(isMcpAuthorized(makeRequest(TEST_KEY))).toBe(false);
  });
});
```

**Step 3: Run auth tests**

```bash
npm run test:run src/lib/auth.test.ts 2>&1
```

Expected: 5 tests pass.

---

## Task 7: Write summarize validation tests

**Files:**
- Create: `src/lib/services/summarize.test.ts`

**Step 1: Create `src/lib/services/summarize.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isValidSummaryData } from "./summarize";

const valid = {
  overall_assessment: "The artifact was well received by reviewers.",
  open_issues: ["Navigation is confusing", "Missing error state"],
  suggestions: ["Add a loading spinner"],
  questions: [],
  approval_count: 3,
};

describe("isValidSummaryData", () => {
  it("accepts a well-formed Gemini response", () => {
    expect(isValidSummaryData(valid)).toBe(true);
  });

  it("accepts when all arrays are empty and approval_count is 0", () => {
    expect(
      isValidSummaryData({
        overall_assessment: "No issues found.",
        open_issues: [],
        suggestions: [],
        questions: [],
        approval_count: 0,
      })
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidSummaryData(null)).toBe(false);
  });

  it("rejects a string primitive", () => {
    expect(isValidSummaryData("not an object")).toBe(false);
  });

  it("rejects when overall_assessment is missing", () => {
    const { overall_assessment, ...rest } = valid;
    void overall_assessment;
    expect(isValidSummaryData(rest)).toBe(false);
  });

  it("rejects when overall_assessment is not a string", () => {
    expect(isValidSummaryData({ ...valid, overall_assessment: 42 })).toBe(false);
  });

  it("rejects when open_issues is not an array", () => {
    expect(isValidSummaryData({ ...valid, open_issues: "issue string" })).toBe(false);
  });

  it("rejects when open_issues contains a non-string element", () => {
    expect(isValidSummaryData({ ...valid, open_issues: ["ok", 99] })).toBe(false);
  });

  it("rejects when suggestions is missing", () => {
    const { suggestions, ...rest } = valid;
    void suggestions;
    expect(isValidSummaryData(rest)).toBe(false);
  });

  it("rejects when approval_count is not a number", () => {
    expect(isValidSummaryData({ ...valid, approval_count: "3" })).toBe(false);
  });

  it("rejects when approval_count is missing", () => {
    const { approval_count, ...rest } = valid;
    void approval_count;
    expect(isValidSummaryData(rest)).toBe(false);
  });
});
```

**Step 2: Run all tests**

```bash
npm run test:run 2>&1
```

Expected: 16 tests pass (5 auth + 11 summarize).

**Step 3: Commit test files and the export change**

```bash
git add src/lib/services/summarize.ts src/lib/auth.test.ts src/lib/services/summarize.test.ts vitest.config.ts package.json
git commit -m "test: add Vitest with auth and summarize validation tests"
```

---

## Task 8: Add GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create `.github/` directory structure and workflow file**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm run test:run
```

Notes:
- No `npm run build` — avoids needing Supabase/Gemini secrets in CI. Vercel handles the production build.
- `cache: "npm"` speeds up subsequent runs by caching `node_modules`.
- Triggers on push to `main` and all PRs.

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint + typecheck + test)"
```

---

## Task 9: Final full verification

Run all checks locally to confirm everything is clean before declaring done.

**Step 1: Lint — zero errors**

```bash
npm run lint 2>&1
```

Expected: no errors.

**Step 2: Typecheck — zero errors**

```bash
npm run typecheck 2>&1
```

Expected: no errors.

**Step 3: Tests — all pass**

```bash
npm run test:run 2>&1
```

Expected: 16 tests pass, 0 fail.

**Step 4: Summarise and report**

Report back:
- Files changed and why
- Which tests were chosen and why
- What CI runs
- Commands run and results
- Any remaining engineering-quality gaps (from the audit that are NOT fixed in this plan)
