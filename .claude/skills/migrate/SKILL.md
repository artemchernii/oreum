---
name: migrate
description: Add a database migration and get it applied. Use when a change needs a new table, column, index, or RLS policy, or when asked to write or apply a migration.
---

# Migrate

Schema changes go through a numbered SQL file that a human runs in the Supabase
SQL editor. There is no automated apply step — the CLI is not wired up, and the
secret key cannot run DDL through PostgREST.

That handoff is the whole reason this file exists: it happens mid-task, it
blocks everything after it, and it has to be handed over cleanly rather than
improvised twice.

## Write the file

`supabase/migrations/NNNN_short_name.sql`, numbered after the highest existing
file. Match the house style in `0001_init.sql`: heavy comments explaining
*why*, not what.

**Idempotent, always.** `create table if not exists`, `drop policy if exists`
before `create policy`. Re-running must be safe, because it will be re-run when
nobody is sure whether it took.

**RLS in the same file that creates the table.** Not later. A table that exists
for even a moment without RLS is readable by anyone holding the publishable
key, which ships to every browser.

Decide the write posture explicitly:

- Reference data everyone reads (`companies`, `daily_bars`, `market_days`):
  a `select` policy for `anon, authenticated`, and **no write policy at all**.
  Writes then require the secret key, which bypasses RLS. An absent policy is
  a denial, so this is enforced rather than intended.
- Per-user data (`watchlist`): every policy scoped to `auth.uid() = user_id`.
  `with check` on insert matters as much as `using` on select — without it a
  user can insert rows attributed to someone else.

Money is `numeric`, never `float`. Check a real provider payload before
choosing a numeric type at all: counts are not necessarily integers.

## Hand it over

Stop and ask. Give the path and these steps, then wait:

> Supabase dashboard → SQL Editor → New query → paste the contents of
> `supabase/migrations/NNNN_name.sql` → Run.
> It is idempotent, so re-running is safe if you are unsure whether it took.

Do not claim the migration is applied. Only the human knows.

## Verify once they confirm

Never assume it landed. Check, then say what came back.

```bash
set -a; source .env.local; set +a

# table exists and is readable
curl -s -o /dev/null -w "%{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/<table>?select=*&limit=1" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY"

# RLS actually denies an anonymous write
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/<table>" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d '{...}'
# expect 42501 "new row violates row-level security policy"
```

A `42501` is the evidence the policy works. A `201` means it does not.

## Then

Regenerate the types — the schema just changed:

```bash
pnpm db:types
```

A stale `database.types.ts` is worse than none, because it type-checks against
a schema that no longer exists. Run `pnpm check` after.
