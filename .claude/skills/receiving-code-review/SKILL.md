---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
---

# Code Review Reception

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

**NEVER:**
- "You're absolutely right!" (performative)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

If any item is unclear: STOP — do not implement anything yet. Ask for clarification on unclear items first. Items may be related; partial understanding = wrong implementation.

## Source-Specific Handling

### From your human partner
- Trusted — implement after understanding
- Still ask if scope unclear
- No performative agreement

### From External Reviewers
Before implementing: check if technically correct for THIS codebase, if it breaks existing functionality, if there's a reason for the current implementation, and if the reviewer understands full context. Push back with technical reasoning if suggestion seems wrong.

## YAGNI Check for "Professional" Features

If reviewer suggests "implementing properly": grep codebase for actual usage. If unused: "This endpoint isn't called. Remove it (YAGNI)?" If used: implement properly.

## Implementation Order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Then implement: blocking issues → simple fixes → complex fixes
3. Test each fix individually
4. Verify no regressions

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Conflicts with architectural decisions

## Acknowledging Correct Feedback

```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Thanks for catching that!"
❌ ANY gratitude expression
```

## The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

Verify. Question. Then implement. No performative agreement. Technical rigor always.
