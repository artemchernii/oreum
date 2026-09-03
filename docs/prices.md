# Prices

How Oreum stores finalized historical prices today, and how that layer relates
to the future live and intraday market-data layers.

## Data clocks

The final architecture separates market data by update clock:

| Layer | Purpose | Current status |
| --- | --- | --- |
| Live/near-live | Current price, near-live volume, market status, provider timestamp | Not implemented |
| Intraday | Observations, anomalies, signals, possible attention updates | Not implemented |
| Event-driven | Earnings, news, macro events, material announcements | Not implemented |
| Daily | Finalized OHLCV, daily intelligence, email | Historical OHLCV/cache implemented; intelligence and email planned |

`daily_bars` must remain historical and finalized. It must not be used as a
pretence for a live quote during market hours. The current UI reads the newest
available daily close because the current provider integration is daily-only;
that is a provider limitation, not the target product architecture.

## The provider

Massive, formerly Polygon.io. The API host is `api.massive.com`; `polygon.io`
301-redirects and existing keys are unchanged.

Free **Stocks Basic** tier, which is sufficient for the current historical
cache:

| | Basic |
| --- | --- |
| Rate limit | 5 requests / minute |
| Freshness | End of day, and **never the current day** |
| History | ~2 years |
| Grouped daily | included |
| News | included |

The endpoint that makes the free tier workable is
`/v2/aggs/grouped/locale/us/market/stocks/{date}` — every US ticker for one
date in a single response, about 12,500 rows and 1.3 MB. The whole ingestion
universe — 25 companies plus 5 benchmark ETFs — therefore costs **one request
per trading day**, and the five-per-minute ceiling stops mattering.

### What Basic will not do

Ask for the current day and it answers 403:

```text
Attempted to request today's data before end of day.
```

That was still true at 19:00 ET, three hours after the close. So the current
historical integration can only provide the **previous trading day**, and prices
must be labelled with their date rather than presented as live. Phase 0 will add
a separate live/near-live capability instead of weakening this historical
contract.

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
LOG=/tmp/oreum-backfill.log

fails=0
while :; do
  out=$(curl -s --max-time 120 -H "Authorization: Bearer $CRON_SECRET" \
        "$BASE/api/cron/prices?days=800&max=5" 2>&1)

  # A blank or non-JSON response must not end a run that takes hours. Three
  # consecutive ones should.
  if ! node -e 'JSON.parse(process.argv[1])' "$out" 2>/dev/null; then
    fails=$((fails + 1))
    echo "$(date -u +%H:%M:%S) BAD RESPONSE ($fails/3)" | tee -a "$LOG"
    [ "$fails" -ge 3 ] && break
    sleep 60; continue
  fi
  fails=0

  node -e 'const j=JSON.parse(process.argv[1]);
    console.log(new Date().toISOString().slice(11,19),
      "remaining="+j.remaining, "wrote="+Object.keys(j.written).length,
      j.rateLimited?"[rate limited]":"", j.exhausted?"[exhausted]":"");
    process.exit(j.remaining===0||j.exhausted?1:0);' "$out" | tee -a "$LOG" || break
  sleep 60
done
```

The failure counter is not defensive padding. A run of 2024-12 to 2026-09 took
two transient blank responses overnight, both when the machine slept and woke.
A bare `|| break` treats those as completion: the loop exits, the last log line
looks ordinary, and the cache is left half-filled with no error anywhere.

The `sleep 60` is what respects the five-per-minute limit at `max=5`. Running
hotter is safe but pointless: the route stops the run on a 429, reports
`rateLimited`, and keeps everything already written.

Re-running is always harmless — every write is an upsert, so an interrupted
backfill resumes rather than duplicating, and a split that restates history
overwrites cleanly.

### Is it finished?

```bash
tail -3 /tmp/oreum-backfill.log     # DONE, or [exhausted], means finished
pgrep -f oreum-backfill             # silent means the loop is no longer running
```

`[exhausted]` is the expected ending, not `remaining=0`: the loop walks back
into the two-year retention edge and the provider starts refusing dates as too
old. Every symbol should hold the same number of bars — companies and
benchmarks are written from one grouped response, so an unequal count means
something filtered them apart.

```bash
set -a; source .env.local; set +a
curl -s -I "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/daily_bars?select=symbol" \
  -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Prefer: count=exact" | grep -i content-range
# total / 30 should be a whole number
```

### Wall-clock estimates do not survive a laptop

The 100-minute figure is 100 minutes of *awake* time. One overnight run
stretched across ten hours because the machine slept between iterations; gaps
of 15 to 50 minutes in the log are sleep, not failure.

### The daily cron will not finish a backfill

It is the same endpoint, but it takes the defaults — `days=10`. It scans the
last ten calendar days, so it closes recent gaps and can never reach a
two-year-old hole. An abandoned backfill stays abandoned until the wide-window
loop is run again; nothing repairs the deep tail on its own.

## Payload validation

Responses are parsed with a zod schema, not asserted with `as`. A type
assertion over third-party JSON is a promise the compiler cannot keep: if
Massive changes a field, TypeScript believes the assertion and a wrong number
reaches `daily_bars` with nothing raising a hand.

The envelope is validated loosely and rows are validated strictly, but **only
for symbols in the universe**. We keep 30 rows (25 companies and 5 benchmark
ETFs) out of ~12,500, so validating the rest would be slower and more fragile — a malformed row belonging to some
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

## Provider entitlements

Probed against the live keys on 2026-09-02 rather than read from marketing
pages. Anything not listed here was not tested.

### Massive — Basic tier

| Endpoint | Result | Use |
| --- | --- | --- |
| `/v2/aggs/grouped/…` | 200 | every US ticker for one date, one request |
| `/v1/marketstatus/now` | 200 | live market open/closed |
| `/v2/reference/news` | 200 | headline, publisher, url, `tickers[]`, description |
| `/v3/reference/tickers/{t}` | 200 | market cap, CIK, SIC, company description |
| `/vX/reference/financials` | 200 | reported statements, quarterly and TTM |
| `/v2/snapshot/…` | **403** | live prices — not entitled |
| `/benzinga/v1/earnings` | **403** | earnings calendar and estimates — not entitled |

Two consequences. Live prices are not available here at any hour, which is why
the live layer is its own phase rather than part of the foundation. And the
grouped endpoint already returns benchmark ETFs — they arrive in the same
response the universe is filtered out of, so relative-performance data costs no
additional requests.

The news `tickers[]` array is **not** a statement of relevance. A verified
example: an article about Serve Robotics returned `["SERV","NVDA","SYM"]`.
Ingesting news by ticker without a relevance filter reproduces exactly the
noise the product exists to remove.

The response also carries a provider-written `description`. Treat it as input
to classification, never as stored content: the rule is headline, link, and our
own summary.

### Finnhub — free tier

`/api/v1/quote` returns **real-time** US equity quotes. Verified: NVDA quoted
at `18:49:58Z` against a wall clock of `18:50:22Z`, a 24-second lag — not the
15-minute delay a free tier usually implies.

`/api/v1/stock/candle` answers *"You don't have access to this resource"*, so
there is **no intraday volume and no candles** on this tier. That is survivable
because finalized daily bars already carry volume, and the daily email is built
from those. Live volume would need a different provider, and no feature
currently requires it.

Documented limit is 60 requests a minute, which is not something a single probe
can confirm; treat it as unverified.

### FRED

`/fred/series/observations` works with the free key. Verified against
`CPIAUCSL`.

### Anthropic

Keys created as **identity-linked** require an `anthropic-workspace-id` header
on every request, and `/v1/organizations/workspaces` returns an empty list when
the organisation only has the implicit default workspace — so the id cannot be
discovered through the API. A workspace-scoped key avoids the header entirely.

### Resend

A send-only key returns 401 on `/domains`, which is the key restriction working
rather than a fault. Without a verified domain the free tier sends from
`onboarding@resend.dev` **to the account owner's own address**, which covers a
personal daily email. Sending anywhere else needs a domain, and that is blocked
on owning one.
