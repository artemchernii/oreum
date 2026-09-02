-- Oreum Phase 0 — benchmark rows and machine-readable sectors.
--
-- Run once in the Supabase SQL editor. Idempotent, so re-running is safe.
--
-- The grouped-daily response already contains every US ticker, so benchmark
-- ETFs arrive free in the same request the universe is filtered out of —
-- ingestion just has to stop throwing them away. This migration gives
-- `companies` the vocabulary for that: which rows are the product's universe
-- and which are calibration series, plus the sector reference data that
-- relative-performance work needs.
--
-- No new table, so RLS needs no change: `companies` already has RLS enabled
-- with a select-only policy (0001), and policies cover new columns
-- automatically. The write posture is unchanged — no write policy exists, so
-- writes still require the secret key.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

-- Which kind of row this is. Benchmarks live in `companies` rather than a
-- second table because `daily_bars.symbol` foreign-keys here — that FK is
-- what keeps ingestion's filter honest, and benchmarks need bars too.
alter table public.companies
  add column if not exists kind text not null default 'company';

-- Machine-readable sector, distinct from the display-only `sector_line`.
-- Null for benchmarks: an ETF proxies a cohort, it does not belong to one.
alter table public.companies
  add column if not exists sector text;

-- The cohort-proxy ETF for sector-relative return. This is deliberately a
-- per-company column and not derivable from `sector`: the cohorts are not
-- index membership. SOXX proxies semiconductors *and* equipment; XLK stands
-- in for four different one-to-three-member sectors, because a peer-average
-- would be permanently zero for AAPL, ANET and DELL (each alone in its
-- sector). The FK guarantees the proxy is itself an ingested row, so its
-- bars exist whenever the company's do.
alter table public.companies
  add column if not exists benchmark_symbol text references public.companies (symbol);

alter table public.companies
  drop constraint if exists companies_kind_check;
alter table public.companies
  add constraint companies_kind_check
  check (kind in ('company', 'benchmark'));

-- ---------------------------------------------------------------------------
-- Seed the benchmarks
-- ---------------------------------------------------------------------------
-- Seeded before the company updates below, because `benchmark_symbol`
-- foreign-keys to these rows.
--
-- SPY is the market benchmark for all 25 companies. SOXX, IGV and XLK are the
-- sector cohort proxies referenced per company. QQQ is ingested but not yet
-- referenced by anything — held for calibrating the eventual choice of market
-- benchmark, which is cheaper to backtest later if its history accumulates
-- from day one.

insert into public.companies (symbol, name, sector_line, kind) values
  ('SPY',  'SPDR S&P 500 ETF Trust',                    'Benchmark · S&P 500 market proxy',            'benchmark'),
  ('QQQ',  'Invesco QQQ Trust',                         'Benchmark · Nasdaq-100, held for calibration', 'benchmark'),
  ('SOXX', 'iShares Semiconductor ETF',                 'Benchmark · Semiconductor cohort proxy',      'benchmark'),
  ('IGV',  'iShares Expanded Tech-Software Sector ETF', 'Benchmark · Software cohort proxy',           'benchmark'),
  ('XLK',  'Technology Select Sector SPDR Fund',        'Benchmark · Large-cap tech cohort proxy',     'benchmark')
on conflict (symbol) do update
  set name = excluded.name,
      sector_line = excluded.sector_line,
      kind = excluded.kind;

-- ---------------------------------------------------------------------------
-- Sector and cohort proxy for the 25 companies
-- ---------------------------------------------------------------------------
-- The machine-readable sector follows the `sector_line` prefix that already
-- ships in the UI. The cohorts: SOXX covers the nine semiconductor names plus
-- the four equipment names, IGV the six software names, XLK the remaining six
-- (internet, consumer hardware, networking, hardware).

update public.companies set sector = 'semiconductors',          benchmark_symbol = 'SOXX'
  where symbol in ('NVDA', 'AVGO', 'TSM', 'AMD', 'INTC', 'MU', 'QCOM', 'ARM', 'MRVL');

update public.companies set sector = 'semiconductor-equipment', benchmark_symbol = 'SOXX'
  where symbol in ('ASML', 'AMAT', 'LRCX', 'KLAC');

update public.companies set sector = 'software',                benchmark_symbol = 'IGV'
  where symbol in ('MSFT', 'ORCL', 'CRM', 'NOW', 'SNOW', 'PANW');

update public.companies set sector = 'internet',                benchmark_symbol = 'XLK'
  where symbol in ('GOOGL', 'AMZN', 'META');

update public.companies set sector = 'consumer-hardware',       benchmark_symbol = 'XLK'
  where symbol = 'AAPL';

update public.companies set sector = 'networking',              benchmark_symbol = 'XLK'
  where symbol = 'ANET';

update public.companies set sector = 'hardware',                benchmark_symbol = 'XLK'
  where symbol = 'DELL';

-- ---------------------------------------------------------------------------
-- Enforce completeness — after the backfill above, so adding the constraint
-- validates against rows that already satisfy it
-- ---------------------------------------------------------------------------
-- Companies carry both new facts; the check keeps a future INSERT from
-- quietly creating a company that relative-performance work skips. (The FK
-- cannot also assert the target is a benchmark; the seed above is the only
-- writer and keeps that true.)
alter table public.companies
  drop constraint if exists companies_reference_data_check;
alter table public.companies
  add constraint companies_reference_data_check
  check (kind <> 'company' or (sector is not null and benchmark_symbol is not null));
