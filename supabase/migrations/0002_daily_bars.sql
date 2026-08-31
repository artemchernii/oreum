-- Oreum M3 — the daily price cache.
--
-- Run once in the Supabase SQL editor. Idempotent, so re-running is safe.
--
-- Every external price call lands here first. The provider's free tier gives
-- one grouped call per trading day for the entire US market, which is generous
-- until something calls it per render — then it is gone in a minute.
--
-- One table serves both the current price and the sparkline: the price is the
-- latest row for a symbol, the sparkline is the last N rows. M9's chart reads
-- the same rows over a longer window, so it needs no new ingestion.

-- ---------------------------------------------------------------------------
-- daily_bars — one row per symbol per trading day
-- ---------------------------------------------------------------------------

create table if not exists public.daily_bars (
  -- The foreign key is what keeps the universe fixed. Ingestion fetches all
  -- ~12,500 US tickers in one call and only the 25 in `companies` can land,
  -- so a bug in the filter fails loudly instead of quietly widening the
  -- universe to all of NASDAQ.
  symbol     text not null references public.companies (symbol) on delete cascade,

  -- The trading day in UTC. Massive stamps every row in a grouped response
  -- with the same close timestamp (20:00Z during EDT), so a response is
  -- exactly one date. Timezone conversion is a display concern, not a
  -- storage one.
  trade_date date not null,

  -- Prices are money: numeric, never float.
  open  numeric not null,
  high  numeric not null,
  low   numeric not null,
  close numeric not null,
  vwap  numeric,

  -- Volume is numeric for a different reason. Massive returns *fractional*
  -- volume on the large majority of rows — 11,367 of 12,518 on 2026-08-28,
  -- e.g. AAPL at 38649398.679189. `bigint` would silently truncate every one.
  volume numeric,
  trades integer,

  primary key (symbol, trade_date)
);

-- The primary key already serves "latest bar for a symbol" and "last N bars
-- for a symbol". This index serves the other query shape: "which trading
-- dates do we already have", which is how ingestion finds its gaps.
create index if not exists daily_bars_trade_date_idx
  on public.daily_bars (trade_date desc);

alter table public.daily_bars enable row level security;

-- Reference data, same posture as `companies`: readable by anyone, including
-- signed-out visitors, because a price is not per-user information.
drop policy if exists "daily bars are readable by everyone" on public.daily_bars;
create policy "daily bars are readable by everyone"
  on public.daily_bars
  for select
  to anon, authenticated
  using (true);

-- Deliberately no insert, update or delete policy. Nothing holding a
-- publishable key may write here; ingestion authenticates with the secret key,
-- which bypasses RLS. An absent policy is a denial, so this is enforced rather
-- than merely intended.

-- ---------------------------------------------------------------------------
-- market_days — which dates the US market actually traded
-- ---------------------------------------------------------------------------
-- Without this, ingestion cannot tell "we have not fetched this date yet" from
-- "we fetched it and the market was shut". Both look identical in `daily_bars`
-- — no rows — so every public holiday would be re-fetched on every run, and a
-- backfill loop walking two years would never finish: roughly eighteen
-- holidays would stay permanently outstanding.
--
-- Deriving it from responses rather than shipping a holiday calendar keeps it
-- correct without maintenance, including for half-days and unscheduled
-- closures, which is exactly the sort of thing a hardcoded list gets wrong.

create table if not exists public.market_days (
  trade_date date primary key,
  is_trading boolean not null,
  checked_at timestamptz not null default now()
);

alter table public.market_days enable row level security;

drop policy if exists "market days are readable by everyone" on public.market_days;
create policy "market days are readable by everyone"
  on public.market_days
  for select
  to anon, authenticated
  using (true);

-- Same posture as `daily_bars`: no write policy, ingestion uses the secret key.
