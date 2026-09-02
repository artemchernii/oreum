# Design system

The reconciled token layer. `design/design_handoff_oreum_dashboard/` is the
visual north star; this file is what the code implements.

## Precedence

The design bundle and `PLAN.md` disagree in two categories, and they resolve
in opposite directions:

| Category | Authority | Covers |
| --- | --- | --- |
| Aesthetics | **the design bundle** | palette, radius, elevation, density, type, layout |
| Invariants and scope | **`PLAN.md` / `CLAUDE.md`** | what the product claims, what ships in which milestone |

In short: **the design decides how it looks, the plan decides what it says and
when it exists.** Where the bundle breaks an invariant, the invariant wins and
the deviation is recorded below, not silently implemented.

## Palette

Dark is the designed baseline. **Light is derived, not designed** — same hue
and chroma character, mirrored lightness. It is correct and accessible but has
not been through visual review, so treat it as provisional.

Every neutral sits at **hue 302°** with chroma 0.004–0.013. The bundle's ramp
is not pure grey, and that is deliberate: a faint violet cast reads as
intentional where a pure neutral reads as unstyled.

### Neutrals

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `oklch(0.985 0.004 302)` | `oklch(0.185 0.006 302)` |
| `card`, `popover` | `oklch(1 0 0)` | `oklch(0.242 0.006 302)` |
| `foreground` | `oklch(0.200 0.008 302)` | `oklch(1 0 0)` |
| `muted-foreground` | `oklch(0.525 0.013 302)` | `oklch(0.651 0.009 302)` |
| `muted`, `accent` | `oklch(0.945 0.006 302)` | `oklch(0.279 0.006 302)` |
| `border`, `input` | `oklch(0.900 0.008 302)` | `oklch(1 0 0 / 20%)` |

Elevation runs the same way in both modes: a card is *lighter* than the ground
it sits on.

### Price movement — the current direction channel

| Token | Light | Dark |
| --- | --- | --- |
| `price-up` | `oklch(0.538 0.150 150)` | `oklch(0.723 0.192 150)` |
| `price-down` | `oklch(0.579 0.180 28)` | `oklch(0.660 0.190 28)` |

Contrast, measured against both the page ground and a card:

| | on background | on card |
| --- | --- | --- |
| light up | 4.84:1 | 5.07:1 |
| light down | 4.82:1 | 5.06:1 |
| dark up | 8.19:1 | 7.20:1 |
| dark down | 5.48:1 | 4.82:1 |

**The bundle's `#f04438` was corrected.** It measured 4.36:1 on `#201f22`,
below AA — and cards are exactly where change values live. Lightness is
raised, hue and chroma unchanged, so the identity survives.

In the current implementation, green and red appear only in the price-change
component. Future direction treatments may reuse those semantics, but attention
must remain visually independent.

## Intelligence semantics

Direction and attention are different signals and must not share visual weight.

| Semantic | Meaning | Visual rule |
| --- | --- | --- |
| Positive direction | Observed or evidence-backed upward direction | Green/up may communicate direction, never attention |
| Negative direction | Observed or evidence-backed downward direction | Red/down may communicate direction, never attention |
| Neutral or ambiguous | No clear direction or conflicting evidence | Monochrome, orange, or muted treatment; never imply certainty |
| Attention | How much this investor should care now | A separate neutral emphasis/scale; never encode it as green/red |
| Observed fact | Measured or source-reported information | Highest factual clarity; show value, timestamp, and source where relevant |
| Inferred relationship | Possible propagation through context or graph | Label as inferred and use lighter/secondary visual weight |
| Confidence/evidence | Reliability of the explanation or inference | Show separately from direction and attention |

The exact attention visual is not final. It must remain legible independently of
direction: a negative move can have low attention, and a small move can have
high attention.

### Deviations from the bundle

| Bundle | Implemented | Why |
| --- | --- | --- |
| Coloured impact arrows | monochrome | inferred impact should not receive the same visual weight as observed price movement |
| Dark only | light and dark | `CLAUDE.md`: both modes work, always |
| `#f04438` | lightness raised | failed AA on cards |
| Archivo for numerics | Geist Mono | numbers need tabular alignment; Archivo has no monospaced cut |

## Type

- **Archivo** — headings and body, per the bundle
- **Geist Mono** — every figure: prices, percentages, ratios, timestamps,
  ticker symbols

Body 13–15px. Small muted labels 11–13px. Metric labels uppercase with
`0.06em` tracking. Headings and brand at weight 800.

Splitting the families is the precedence rule in action: the bundle owns the
text face, the invariant owns the figures.

## Shape and elevation

```css
--radius-sm: 0.5rem    /*  8px */
--radius-md: 0.75rem   /* 12px */
--radius-lg: 1.125rem  /* 18px */
```

Shadow on elevated surfaces — dark `0 20px 40px rgb(0 0 0 / 0.55)`, light
`0 12px 28px rgb(0 0 0 / 0.10)`. The bundle's value is tuned for a dark
ground and reads as soot on a light one.

## Layout

Two columns, `260px | 1fr`. Sidebar has a right divider. Nav is full-width and
sticky. Active nav tab: 2px bottom border plus bold weight.

Segmented controls are native radios, styled through the checked state, so
they stay server-rendered.

## Logo

`docs/logo.md` is the authority and it still holds: the logo renders as an
**inline SVG** through `src/components/logo.tsx`, never through `next/image`
or `<img>`, because `currentColor` will not resolve in an external file and
the mark would go black in dark mode.

The PNGs in the bundle (`oreum-mark-white-512.png`, `oreum-logo-white.png`)
are for **external** use — GitHub avatar, social cards, decks. They are white
on transparent, so they belong on dark grounds. The bundle README says "for
light surfaces only", which is backwards.

## Open

The bundle is the historical base: correct as a visual reference, superseded
as product framing, and silent on two surfaces the product now leads with.

- **The daily email has no design.** It is the primary surface — one or two
  items, a filtered-out counter, and a legible quiet state — and nothing in
  the bundle covers it. Email also cannot use the token layer: no CSS
  variables, no `oklch()`, so the palette needs a resolved hex fallback and a
  layout that survives a mail client.
- **The attention visual is unresolved.** It must read independently of
  direction — a negative move can be low attention, a small move high — so it
  cannot borrow green/red. A neutral emphasis scale is the current intent, not
  a decision.
- Light mode is derived, not designed. Worth a pass once the dark build lands.
- The bundle's search field reads "Search ticker or command", implying a
  command palette. Nothing in `PLAN.md` covers one.
