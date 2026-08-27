# Ideas

Things worth doing that don't belong to a milestone yet. Not a backlog — a
holding pen, so an idea can be recorded without becoming scope.

Anything here that earns a milestone moves into `PLAN.md`. Anything that stops
looking good gets deleted with a line saying why.

## Guest mode

Let someone use the app without an account: pick tickers, see the feed, nothing
persisted. A notice on entry saying picks won't be saved, and a prompt to sign
up on the way out.

**Why it's parked.** The scope rule says the MVP is what I use myself, daily,
and guest mode serves visitors rather than me. It also doubles the data layer —
every watchlist read and write would need a browser-storage path alongside the
RLS-protected rows, plus a merge when a guest signs up. Two sources of truth is
exactly what RLS exists to avoid. And it reintroduces client components (a
toast, an exit-intent listener) to an app that currently ships none.

**What would change my mind.** Evidence people bounce off the sign-in wall.
That means having visitors first, which means getting past the M5 gate.

**Note on the exit prompt.** "Want to save your progress?" on the way out is an
acquisition tactic for a product with users. Worth revisiting only if there are
users to acquire, and worth doing gently even then.

## Command palette

The design bundle's search field reads "Search ticker or command", implying
⌘K. Nothing in `PLAN.md` covers one, and searching events needs an index that
doesn't exist until M4.

## Onboarding stepper

The bundle draws a two-step "Build your watchlist" flow. M2 folds this into the
empty state instead, which does the same job for one user. Revisit if several
people sign up and stall on the empty screen.
