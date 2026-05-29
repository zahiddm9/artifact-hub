---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully** — don't skip past errors; read stack traces completely
2. **Reproduce Consistently** — can you trigger it reliably? If not reproducible, gather more data
3. **Check Recent Changes** — git diff, recent commits, new dependencies, config changes
4. **Gather Evidence in Multi-Component Systems** — add diagnostic instrumentation at each component boundary, run once to gather evidence showing WHERE it breaks, THEN analyze
5. **Trace Data Flow** — where does bad value originate? Keep tracing up until you find the source. Fix at source, not at symptom.

### Phase 2: Pattern Analysis

1. Find working examples similar to what's broken
2. Compare against references completely (don't skim)
3. Identify every difference, however small
4. Understand dependencies and assumptions

### Phase 3: Hypothesis and Testing

1. Form a single specific hypothesis: "I think X is the root cause because Y"
2. Make the SMALLEST possible change to test it
3. One variable at a time — don't fix multiple things at once
4. Verify before continuing; if wrong, form NEW hypothesis

### Phase 4: Implementation

1. Create failing test case first
2. Implement single fix addressing the root cause
3. Verify fix — test passes, no regressions
4. **If 3+ fixes failed:** Question the architecture. Each fix revealing new problems elsewhere = architectural issue, not a symptom issue. Discuss with your human partner before attempting more.

## Red Flags - STOP and Follow Process

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**

**ALL of these mean: STOP. Return to Phase 1.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check |
| "Multiple fixes at once saves time" | Can't isolate what worked; causes new bugs |
| "One more fix attempt" (after 2+) | 3+ failures = architectural problem |

## Related Skills

- **superpowers:test-driven-development** — For creating failing test case (Phase 4)
- **superpowers:verification-before-completion** — Verify fix worked before claiming success
