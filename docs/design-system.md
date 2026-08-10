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

### Price movement — the entire colour budget

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

Green and red appear in one component. Nothing else in the UI uses them.

### Deviations from the bundle

| Bundle | Implemented | Why |
| --- | --- | --- |
| Coloured impact arrows | monochrome | direction is inferred from edge type, not observed. Colouring a derived signal gives it the weight of a measured one |
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

- Light mode is derived, not designed. Worth a pass once the dark build lands.
- The bundle's search field reads "Search ticker or command", implying a
  command palette. Nothing in `PLAN.md` covers one.
