---
name: handoff
description: Use when a session has grown long or expensive, when a context-size warning appears, when switching to a different task area, or when asked to hand off, summarise session state, or continue in a fresh session.
---

# Handoff

A long session re-sends its entire context on every turn, so the same work costs
more the later it happens. The cure is a fresh session that starts with only
what matters. This file exists so that summary does not get re-derived each
time, and so nothing load-bearing gets dropped on the way across.

The new session shares the repo, the branch and the working tree. What it does
not have is the reasoning: why this approach, what was already rejected, what
went wrong an hour ago. Carry that, and nothing else.

## Produce one paste-ready block

Output a single fenced block for the clipboard — not a file, not a commit. Five
sections, in this order:

1. **Task** — one sentence: what is being built, and which `PLAN.md` phase it
   sits in.
2. **State** — branch, working tree, what has merged, what is open. Gather it,
   do not recall it.
3. **Decisions** — each with its reason. A decision without its reason gets
   re-litigated in the next session, which is the expensive failure this whole
   exercise exists to prevent.
4. **Next step** — the single next action, concrete enough to start on cold.
5. **Traps** — what already went wrong here, and anything learned that is not
   yet written down anywhere in the repo.

## Gather the state

```bash
git branch --show-current
git status --short
git log --oneline -5
gh pr list --state open --limit 5
```

## Leave out

- Anything already in `CLAUDE.md`, `PLAN.md`, `docs/`, or git history — the new
  session reads those itself. A path beats a paste.
- File contents. Give paths and line numbers.
- The narration of what was tried. Only the conclusions survive.

## Durable facts do not belong in a handoff

A handoff is scaffolding for one crossing. If a fact outlives this task, write it
where it belongs *before* handing off, then reference it in one line:

- Material architectural decisions → `docs/decisions.md`.
- Work beyond the active phase → the later sections of `PLAN.md`.
- How the user wants to work → auto-memory.

A fact that exists only in a pasted block is one session away from being lost.

## Then

Tell the user to start a fresh session and paste the block as its first message.
Do not carry on working in the old session afterwards — that spends exactly what
the handoff was meant to save.
