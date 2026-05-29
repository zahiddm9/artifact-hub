---
name: feedback-verify-yourself
description: User expects Claude to self-verify all frontend changes by running the dev server and checking behavior before reporting completion
metadata:
  type: feedback
---

Always verify changes yourself — run the dev server and confirm the behavior works before reporting a batch or task as complete. Do not rely solely on `npm run build` passing.

**Why:** User explicitly said "Always verify yourself" after noticing that a build-pass alone doesn't confirm UI behavior.

**How to apply:** After any frontend change, start the dev server (or use the `verify` skill) and check the actual browser behavior — font rendering, hover states, focus rings, responsive layout — before marking a batch complete or asking for approval.
