-- Oreum M2 — the universe and the per-user watchlist.
--
-- Run once in the Supabase SQL editor. Idempotent, so re-running is safe.
--
-- RLS is enabled in the same statement block that creates each table. A table
-- that exists for even a moment without RLS is readable by anyone holding the
-- publishable key, which ships to every browser.

-- ---------------------------------------------------------------------------
-- companies — the fixed, hand-curated universe
-- ---------------------------------------------------------------------------
-- Identity only at this stage. M4 adds metrics and exposures to these rows,
-- which makes it an UPDATE rather than an INSERT.

create table if not exists public.companies (
  symbol      text primary key,
  name        text not null,
  sector_line text not null,
  created_at  timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Reference data: readable by everyone, writable by no one holding a
-- publishable key. Seeding and enrichment go through the SQL editor or a
-- secret key, never the client.
drop policy if exists "companies are readable by everyone" on public.companies;
create policy "companies are readable by everyone"
  on public.companies
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- watchlist — per user
-- ---------------------------------------------------------------------------

create table if not exists public.watchlist (
  user_id  uuid not null references auth.users (id) on delete cascade,
  symbol   text not null references public.companies (symbol) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create index if not exists watchlist_user_id_idx on public.watchlist (user_id);

alter table public.watchlist enable row level security;

-- Every policy is scoped to the caller's own rows. `with check` on insert
-- matters as much as `using` on select: without it a user could insert rows
-- attributed to someone else.
drop policy if exists "own watchlist rows are readable" on public.watchlist;
create policy "own watchlist rows are readable"
  on public.watchlist
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "own watchlist rows are insertable" on public.watchlist;
create policy "own watchlist rows are insertable"
  on public.watchlist
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "own watchlist rows are deletable" on public.watchlist;
create policy "own watchlist rows are deletable"
  on public.watchlist
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- No update policy. A watchlist row has nothing to change — you add it or you
-- remove it.

-- ---------------------------------------------------------------------------
-- Seed the universe
-- ---------------------------------------------------------------------------
-- Twenty-five companies. The list is the asset: densely connected, so one
-- company's capex is another's revenue. It is never widened to a sector
-- filter or to "all of NASDAQ".

insert into public.companies (symbol, name, sector_line) values
  ('AAPL',  'Apple Inc.',                             'Consumer hardware · Silicon design, services'),
  ('MSFT',  'Microsoft Corporation',                  'Software · Cloud infrastructure, productivity, licensing'),
  ('GOOGL', 'Alphabet Inc.',                          'Internet · Search advertising, cloud, custom TPU silicon'),
  ('AMZN',  'Amazon.com, Inc.',                       'Internet · Retail, AWS cloud infrastructure, custom silicon'),
  ('META',  'Meta Platforms, Inc.',                   'Internet · Social advertising, AI infrastructure'),
  ('NVDA',  'NVIDIA Corporation',                     'Semiconductors · Accelerated computing, data centre GPUs'),
  ('AVGO',  'Broadcom Inc.',                          'Semiconductors · Custom silicon, networking, infrastructure software'),
  ('TSM',   'Taiwan Semiconductor Manufacturing Co.', 'Semiconductors · Contract manufacturing, advanced packaging'),
  ('AMD',   'Advanced Micro Devices, Inc.',           'Semiconductors · CPUs, accelerators, adaptive computing'),
  ('INTC',  'Intel Corporation',                      'Semiconductors · CPUs, foundry services'),
  ('MU',    'Micron Technology, Inc.',                'Semiconductors · DRAM, NAND, high-bandwidth memory'),
  ('QCOM',  'QUALCOMM Incorporated',                  'Semiconductors · Mobile SoCs, modem licensing'),
  ('ARM',   'Arm Holdings plc',                       'Semiconductors · CPU architecture licensing'),
  ('MRVL',  'Marvell Technology, Inc.',               'Semiconductors · Custom silicon, optical interconnect'),
  ('ASML',  'ASML Holding N.V.',                      'Semiconductor equipment · EUV lithography'),
  ('AMAT',  'Applied Materials, Inc.',                'Semiconductor equipment · Deposition, etch, inspection'),
  ('LRCX',  'Lam Research Corporation',               'Semiconductor equipment · Etch and deposition'),
  ('KLAC',  'KLA Corporation',                        'Semiconductor equipment · Process control, inspection'),
  ('ORCL',  'Oracle Corporation',                     'Software · Database, cloud infrastructure'),
  ('CRM',   'Salesforce, Inc.',                       'Software · Customer relationship management, platform'),
  ('NOW',   'ServiceNow, Inc.',                       'Software · Workflow automation, enterprise platform'),
  ('SNOW',  'Snowflake Inc.',                         'Software · Cloud data warehousing'),
  ('PANW',  'Palo Alto Networks, Inc.',               'Software · Network and cloud security'),
  ('ANET',  'Arista Networks, Inc.',                  'Networking · Data centre switching, cloud networking'),
  ('DELL',  'Dell Technologies Inc.',                 'Hardware · Servers, storage, AI infrastructure systems')
on conflict (symbol) do update
  set name = excluded.name,
      sector_line = excluded.sector_line;
