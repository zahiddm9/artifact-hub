---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## Directory Selection Process

Follow this priority order:

1. **Check existing directories** — `.worktrees/` (preferred) or `worktrees/`
2. **Check CLAUDE.md** — `grep -i "worktree.*director" CLAUDE.md`
3. **Ask user** if no directory exists and no CLAUDE.md preference

## Safety Verification

**For project-local directories, MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If NOT ignored: add to `.gitignore` and commit first. Prevents accidentally committing worktree contents.

## Creation Steps

```bash
# 1. Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"

# 2. Run project setup (auto-detect)
# Node.js: npm install | Rust: cargo build | Python: pip install -r requirements.txt

# 3. Verify clean baseline — run test suite
# If tests fail: report failures, ask whether to proceed
```

## Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check CLAUDE.md → Ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |

## Common Mistakes

- **Skipping ignore verification** — worktree contents get tracked, pollute git status
- **Assuming directory location** — follow priority: existing > CLAUDE.md > ask
- **Proceeding with failing tests** — can't distinguish new bugs from pre-existing issues

## Integration

**Called by:**
- **brainstorming** — REQUIRED when design is approved and implementation follows

**Pairs with:**
- **finishing-a-development-branch** — REQUIRED for cleanup after work complete
- **executing-plans** or **subagent-driven-development** — Work happens in this worktree
