
# Handoff: Oreum Dashboard (M2 — Auth + Persistent Watchlist UI shell)

## Overview
Oreum is a fintech news-filtering tool that maps tech/market news onto a curated graph of ~25 companies so a user only sees stories that affect their watchlist. This bundle covers the four core screens needed for M2: Feed, Ticker detail, Login/Register, and Not Found.

## About the Design Files
The included HTML files are **design references, not production code**. They are static prototypes built to show exact layout, spacing, color, and typography — not markup meant to be copy-pasted into the app. Recreate these screens in the target codebase's existing stack (Next.js/React) using its established component patterns, data fetching, and routing — not by embedding this HTML.

`Oreum Dashboard Dark.dc.html` is the current/approved version (dark, rounded, monochrome + green/red). `Oreum Dashboard.dc.html` is an earlier light "Modernist" exploration kept only for reference — build from the dark version unless told otherwise.

## Fidelity
**High-fidelity baseline, not a frozen spec.** Colors, spacing and type are the visual north star and should be matched closely — but this is expected to be polished further, and it is not the authority on scope or product behaviour.

> **Read `docs/design-system.md` before implementing anything from this bundle.**
> That file is the reconciled token layer the code actually uses, and it records
> where this bundle was deliberately deviated from. The rule: **the design decides
> how it looks, `PLAN.md` decides what it says and when it exists.**
>
> Known deviations: impact arrows stay monochrome, light mode is required, the
> `#f04438` red is lightened to pass AA on cards, and figures use Geist Mono
> rather than Archivo. `PLAN.md` has a screen-to-milestone map — this bundle is
> labelled M2 but spans most of the roadmap.

## Design Tokens
- Background: `#131215`; Surface (cards/panels): `#201f22`; Text: `#ffffff`
- Divider: `rgba(255,255,255,0.20)`
- Accent (brand mark, primary buttons, focus): `#ffffff` on this dark theme (mono scheme)
- Up/positive: `#22c55e`; Down/negative: `#f04438`
- Neutral ramp (light→dark on dark ground): 100 `#201f22`, 200 `#29282b`, 300 `#343337`, 400 `#47454a`, 500 `#625f66`, 600 `#918e94`, 700 `#b5b2b7`, 800 `#dcdadd`, 900 `#ffffff`
- Radius: sm `8px`, md `12px`, lg `18px`
- Shadow (elevated surfaces): `0 20px 40px rgba(0,0,0,0.55)`
- Type: heading font weight 800 for numerics/labels/brand; body text at `13–15px`; small muted labels at `11–13px`, uppercase+letter-spacing `0.06em` for metric labels
- Base font family/scale comes from the Modernist design system (Archivo heading/body) — carry over the family, not the light-mode color tokens

## Screens

### 1. Feed (home)
**Purpose:** Default landing screen — shows watchlist + a filtered news feed of only what's relevant.
**Layout:** Top nav bar, full-width. Below: 2-column grid `260px | 1fr`. Left = watchlist sidebar (fixed width, right border 2px divider). Right = feed (padded content column).

**Nav bar:** logo mark (18×18 white square, 8px radius) + "OREUM" wordmark, then two tab links ("Feed" active with 2px bottom underline in accent + bold, "Ticker" plain), a centered search input (with search icon, `380px` wide, placeholder "Search ticker or command"), market-status text ("Open · 14:31 ET"), and a 32×32 circular avatar (initials, dark-on-light).

**Watchlist sidebar:** heading "Watchlist" (muted, 55% opacity). Rows: symbol (bold, 52px fixed width) + inline sparkline SVG (60×20, polyline) + right-aligned change value colored green/red with an arrow (↑/↓). First row (AVGO) is the "selected" state: solid white background, dark text, 12px radius. Other rows are plain with a 1px bottom divider. Below the list: full-width ghost "+ Add ticker" button.

**Feed column:** header row = 3-option segmented control ("All" / "Affecting you" / "Macro", "All" selected) left, muted timestamp text ("Since yesterday · 4") right. Feed items stacked, each separated by a 2px top divider, `padding: 32px 0` (space-4 vertical). Each item: small tag chip (variant depends on category — see below) + muted source/time line; then an `<h4>` headline; then a body line with a colored arrow (↑ green / ↓ red / blank), bold ticker symbols, an em dash, and the causal mechanism in muted text. Tag variants: "Second-order" → neutral gray tag; "Direct" → outlined tag; "Macro" → accent-tinted tag. Footer line below the feed: muted text "14 items filtered out as unrelated to your watchlist".

**Content (from mock data — replace with live data):**
- Watchlist: AVGO (selected, +0.6 up), NVDA (+1.4 up), MSFT (−0.8 down), GOOGL (−1.2 down), TSM (+2.0 up).
- 4 feed items: "Microsoft raises FY27 capex guidance" (second-order, ↑, AVGO/NVDA), "Anthropic is staffing an in-house AI chip design team" (second-order, ↑, AVGO), "New export limits on advanced chips to China" (direct, ↓, NVDA), "CPI prints at 3.4%, above consensus" (macro, no arrow, "All 8 positions").

### 2. Ticker detail
**Purpose:** Deep dive on one company — price, chart, fundamentals, and the specific news items moving it, ranked.
**Layout:** Same nav + same watchlist sidebar as Feed (Ticker tab active instead). Right column:
- Header row: ticker `<h1>` + large price (26px bold) + colored change (18px bold, e.g. `+2.31 (+0.55%)` in green) + company name pushed right (muted).
- Subtitle line: sector/category tags as plain muted text ("Semiconductors · custom ASIC · networking").
- 5-option segmented range control (1D/5D/1M/6M/1Y, 1D selected).
- Chart panel: bordered box (2px divider, 12px radius) containing a full-width SVG line chart (180px tall) with two vertical reference lines and small numbered markers (1, 2) tying to the "Why it's moving" list below. Caption below: muted text explaining the numbered marks.
- Metrics strip: 5 equal columns, divided by 2px top/bottom rule + 1px column dividers. Each: uppercase muted label (11px, letter-spacing) + bold value (20px). Mock: P/E 34.2, Revenue +22%, FCF +14%, Debt/EBITDA 2.1, China rev 18%.
- Summary bar: surface-colored rounded strip — "Last 30 days" muted + bold "6 tailwinds · 2 headwinds", with muted "every one links to a source" on the right.
- "Why it's moving" list: numbered rows (bold number, left border divider), each with a colored arrow + headline (15px semibold) and a muted meta line (source · time · causal link explanation).
- "Connections" section: outlined tag chips describing company relationships (e.g. "Customers → MSFT · GOOGL · META", "Foundry → TSM", "Competes with → NVDA · MRVL").
- Footer line: muted "7 items filtered out as unrelated to Broadcom".

### 3. Login / Register
**Purpose:** Auth entry point — sign in or create account, email or Google.
**Layout:** Full-viewport dark background, centered card. Card: 400px wide, surface background, 1px divider border, 18px radius, generous padding (space-8 vertical / space-6 horizontal).
**Card contents (top to bottom):** brand mark (22×22 square) centered; heading "Welcome back" + muted subtext "Sign in to see what's moving your watchlist"; a 2-option segmented control filling the card width ("Sign in" / "Create account"); a secondary full-width button "Continue with Google" with Google "G" icon; a divider row with centered muted "or with email" text; email field (labeled "Email", placeholder "you@firm.com") and password field (labeled "Password", masked placeholder); a full-width primary button "Continue" (bold, 12px radius).
**States to implement:** toggling the segmented control swaps copy/behavior between sign-in and create-account (fields likely differ — confirm with product). Standard field validation, loading state on submit, and error messaging (not shown in mock — use existing app patterns).

### 4. Not Found (404)
**Purpose:** Fallback for unknown routes/tickers outside the tracked universe.
**Layout:** Full nav bar (logo + Feed/Ticker links, no active state) at top. Below, centered vertically and horizontally: large "404" numeral (96px bold), heading "This ticker isn't in the universe", muted body copy ("Oreum tracks around 25 curated companies. Whatever you're looking for isn't one of them, or the page moved.", max-width 420px, centered), and a primary button "Back to Feed" linking home.

## Interactions & Behavior
- Nav tabs: active tab has 2px bottom border in accent color + bold weight.
- Watchlist row selection: selected ticker gets solid white/dark-text treatment; clicking a row should navigate to that ticker's detail screen.
- Segmented controls (filter, range, sign-in/register): single-select, native radio-based — style the checked `<span>` as filled/active.
- Feed/Why-moving arrows and tag colors are the only color-coded elements: green `#22c55e` for positive moves, red `#f04438` for negative, none for neutral/macro items with no directional read.
- All feed/why-moving items should link out to source (not implemented in mock — add real navigation/links).
- "Add ticker" button should open a ticker-add flow (not designed yet — flag if needed).

## State Management
- Current user + watchlist (list of ticker symbols with live price/quote data) — needed on Feed and Ticker screens.
- Feed items: fetched/filtered against the user's watchlist graph (only show news whose causal chain touches a watched company).
- Selected ticker + selected time range (1D/5D/1M/6M/1Y) on Ticker screen.
- Auth state/session (mode: sign-in vs. create-account) on Login screen.
- 404 has no state — static fallback route.

## Assets
No image assets — logo is a plain rounded square placeholder (swap for real Oreum mark). Google icon is inline SVG (included in the HTML, reusable as-is). All charts are placeholder SVG polylines — replace with real chart data/library.

## Logo
Wordmark is lowercase "oreum". Nav/brand mark icon: `oreum-mark-white-512.png`. Full lockup (mark + wordmark), for larger placements: `oreum-logo-white.png`. Both are white/transparent — for light surfaces only, not used in this dark UI.

## Additional screens (M2+ exploration, not yet prioritized)
`Oreum New States.dc.html` — 10 additional screens in the same dark token system, covering states/features likely needed soon: Onboarding (first watchlist), Empty watchlist, Loading/skeleton, Error/offline, Search results dropdown, Account/profile settings, Alert settings, Portfolio weighting, Share-watchlist dialog, Daily digest (with an AI-generated summary card). Treat these as directional, not final — confirm scope/priority with product before building.

## Files
- `Oreum Dashboard Dark.dc.html` — the four core M2 screens (current/approved dark version), plus mock data (see `<script data-dc-script>` at the bottom).
- `Oreum New States.dc.html` — 10 additional exploratory screens/states, same dark system (see above).
- `Oreum Dashboard.dc.html` — earlier light "Modernist" version, included for reference only.
- `oreum-mark-white-512.png`, `oreum-logo-white.png` — logo assets.

All HTML files are self-contained; open directly in a browser to view.
