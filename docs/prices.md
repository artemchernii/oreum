# Prices

How the daily price cache is filled and kept full.

## The provider

Massive, formerly Polygon.io. The API host is `api.massive.com`; `polygon.io`
301-redirects and existing keys are unchanged.

Free **Stocks Basic** tier, which is a fit rather than a compromise:

| | Basic |
| --- | --- |
| Rate limit | 5 requests / minute |
| Freshness | End of day, and **never the current day** |
| History | ~2 years |
| Grouped daily | included |
| News | included |

The endpoint that makes the free tier workable is
`/v2/aggs/grouped/locale/us/market/stocks/{date}` — every US ticker for one
date in a single response, about 12,500 rows and 1.3 MB. The whole 25-symbol
universe therefore costs **one request per trading day**, not 25, and the
five-per-minute ceiling stops mattering.

### What Basic will not do

Ask for the current day and it answers 403:

```text
Attempted to request today's data before end of day.
```

That was still true at 19:00 ET, three hours after the close. So the freshest
the app can ever be is the **previous trading day**, and prices must be
labelled with their date rather than presented as live.

403 is also the answer at the far end of the two-year window, so the message —
not the status — is what distinguishes "not published yet" from "too old".
`MassiveEntitlementError.isNotYetPublished` reads it.

## Ingestion

`GET /api/cron/prices`, authenticated with `Authorization: Bearer $CRON_SECRET`.
Vercel sends that header automatically when an environment variable of that
exact name exists.

The job **fills gaps rather than fetching today**. It asks the table which
recent trading dates are missing and writes those, newest first. Since the
publish time is undocumented and demonstrably late, a job pinned to a deadline
would be guessing; a job that fills holes is correct whether data lands late, a
run is skipped, or the deployment was asleep for a week.

`/api/cron` is excluded from the proxy matcher. `updateSession` redirects any
request without a session to `/login`, and a cron request carries no cookies —
left in the matcher, the job looks configured and silently never runs.

### Parameters

| Param | Default | Max | Meaning |
| --- | --- | --- | --- |
| `days` | 10 | 800 | Calendar days to scan for holes |
| `max` | 3 | 5 | Dates fetched per run, one request each |

### Response

```json
{ "ok": true, "checked": 20, "outstanding": 14, "remaining": 9,
  "exhausted": false, "rateLimited": false,
  "written": { "2026-08-20": 25 }, "skipped": {} }
```

`remaining` counts dates still outstanding after the run. `exhausted` means
every date attempted came back "too old" — the history boundary, and the signal
that a backfill is finished. Without it a loop would spin forever at that edge,
because `remaining` stops falling there.

## Is it working?

`GET /api/health` reports the cache's freshness alongside the Supabase
connection check:

```json
{ "ok": true, "prices": { "latestTradeDate": "2026-08-31", "ageDays": 1, "stale": false } }
```

The cron is otherwise unobservable — it runs once a day and logs failures where
nobody reads them, so a silently broken job would surface weeks later as a flat
sparkline. That is the failure the gap-filling design exists to prevent,
arriving by a different route.

`stale` is `ageDays > 4`, not `> 1`. A healthy cache is routinely three days
behind, because Friday's close is the newest data available all weekend and the
current session is never served at all. An alarm that fires every Saturday is
not an alarm. An empty cache counts as stale rather than fresh.

`ok` stays about reachability. Staleness is reported, not treated as an outage:
the app works fine on slightly old closes, and conflating the two would make a
real connection failure harder to spot.

## Backfill

There is no separate script. Backfill is this same endpoint with a wider
window, driven by a loop — one code path cannot drift from itself. (Node 24
strips TypeScript natively but does not resolve the `@/` alias, so a script
would have meant a new devDependency or relative-import contortions in `src/lib`.)

Two years is roughly 500 trading days. At five per minute that is about 100
minutes, run once.

```bash
set -a; source .env.local; set +a          # or point at the deployed URL
BASE=http://localhost:3000

while :; do
  out=$(curl -s -H "Authorization: Bearer $CRON_SECRET" \
        "$BASE/api/cron/prices?days=800&max=5")
  node -e 'const j=JSON.parse(process.argv[1]);
    console.log(new Date().toISOString().slice(11,19),
      "remaining="+j.remaining, "wrote="+Object.keys(j.written).length,
      j.rateLimited?"[rate limited]":"", j.exhausted?"[exhausted]":"");
    process.exit(j.remaining===0||j.exhausted?1:0);' "$out" || break
  sleep 60
done
```

The `sleep 60` is what respects the five-per-minute limit at `max=5`. Running
hotter is safe but pointless: the route stops the run on a 429, reports
`rateLimited`, and keeps everything already written.

Re-running is always harmless — every write is an upsert, so an interrupted
backfill resumes rather than duplicating, and a split that restates history
overwrites cleanly.

## Payload validation

Responses are parsed with a zod schema, not asserted with `as`. A type
assertion over third-party JSON is a promise the compiler cannot keep: if
Massive changes a field, TypeScript believes the assertion and a wrong number
reaches `daily_bars` with nothing raising a hand.

The envelope is validated loosely and rows are validated strictly, but **only
for symbols in the universe**. We keep 25 rows out of ~12,500, so validating
the rest would be slower and more fragile — a malformed row belonging to some
unrelated penny stock must not fail the batch. A malformed row for a symbol we
*do* keep throws `MassiveSchemaError`, because skipping it quietly would write
a gap and report success.

`MassiveSchemaError` is deliberately not caught by the ingestion route the way
403 and 429 are. Those are expected conditions; a schema mismatch means our
assumptions drifted from the provider's, and it should be loud.

## Tables

`daily_bars` — one row per symbol per trading day. Prices are `numeric`
because they are money. **Volume is also `numeric`**, for a different reason:
Massive returns fractional volume on most rows (11,367 of 12,518 on
2026-08-28, e.g. AAPL at `38649398.679189`), and `bigint` would silently
truncate every one.

`market_days` — whether each date traded. It exists because an empty
`daily_bars` cannot distinguish "not fetched yet" from "the market was shut".
Without it every public holiday is re-requested on every run, and a backfill
walking two years never terminates: roughly eighteen holidays stay outstanding
forever.

Both are readable by everyone and writable by no one — no insert policy exists,
so ingestion must use the secret key, which bypasses RLS. Verified: an
anonymous insert is rejected `42501` on both.
