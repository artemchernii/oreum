---
name: ship
description: Take a change from a clean master to a merged PR — branch, verify, commit, push, open the PR, merge, clean up. Use when starting a new piece of work, when a change is ready to commit or push, or when asked to ship, open a PR, or land something.
---

# Ship

The loop this repo uses. Every one of its merged PRs went through these steps;
this file exists so they don't get re-derived each time.

## Before branching

Never branch from wherever you happen to be standing. Merging a PR on GitHub
does not touch the local clone, so `master` is usually stale, and the branch
you are on may already be merged.

```bash
git checkout master && git pull --ff-only origin master
git fetch --prune
```

Then branch. Prefix matches the commit type: `feat/`, `fix/`, `docs/`,
`chore/`.

```bash
git checkout -b feat/thing
```

If work is already in progress on the wrong branch, `git stash` it, do the
above, then `git stash pop`.

## Verify before committing

Run all four. They are fast, and a green build is not evidence that any of the
others pass.

```bash
pnpm check    # typecheck + eslint + markdownlint — what CI runs
pnpm build    # not in CI; Vercel builds every PR
```

`pnpm check` is the same command CI runs, so a green local run means a green
PR. Run `pnpm build` too when the change touches code — it catches things
typecheck alone does not.

`typecheck` runs `next typegen` first. `LayoutProps` and `PageProps` are
generated into `.next/types/`, so without it `tsc` passes on a machine that has
built before and fails on a fresh checkout. CI caught exactly that on its first
run.

**Then verify the actual claim.** The commands above prove the code compiles,
not that it does what you say. Check the built output — grep the emitted HTML
or CSS, curl the endpoint, compute the number. See the "verify, don't assert"
rule in `CLAUDE.md`.

Adding a route? `pnpm build` regenerates `.next/types`; `tsc` fails against a
route it has never seen until you do.

## Commit

Imperative mood, small. Body explains why, not what — the diff covers what.
Include any decision that shaped the change.

```text
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## PR

```bash
git push -u origin feat/thing
gh pr create --base master --head feat/thing --title "..." --body "..."
```

The body carries a **Verification** section listing what was actually checked
and what came back. Not "tests pass" — the command and its output. Also state
anything you could *not* verify, especially visual behaviour.

## Merge and clean up

Confirm the state rather than assuming; the user often merges from GitHub
between turns.

```bash
gh pr view <n> --json state --jq .state
gh pr merge <n> --merge --delete-branch
git checkout master && git pull --ff-only origin master
git branch -d feat/thing
git push origin --delete feat/thing   # if the remote branch survived
git fetch --prune
```

Merging is the user's call unless they have said otherwise. Default to opening
the PR and stopping.

## After

An architectural decision becomes a row in the decision log in `PLAN.md` —
date, decision, reason. Decisions do not live in chat.

If the change closes a milestone item, tick it in `PLAN.md` in the same PR.
Only tick what is actually true; a checkbox for work that is merely written
is worse than an empty one.
