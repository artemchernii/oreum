# Logo

오름 means "ascent". The mark is the same line the name is: a rise that also
reads as a price chart.

## Where things live

```text
public/favicon.svg          browser tab icon
public/brand/oreum-logo.svg mark + wordmark, for social and press kit
public/brand/oreum-mark.svg mark only, for avatars
src/components/logo.tsx     what actually renders in the interface
```

Files in `public/brand/` are sources for everything **outside** the app:
the GitHub avatar, a Twitter card, a deck. They are not used inside the
interface.

## In the interface — the component only

```tsx
import { Logo, LogoMark } from "@/components/logo";

// header
<Logo className="text-neutral-900 dark:text-neutral-50" />

// collapsed sidebar
<LogoMark className="text-neutral-900 dark:text-neutral-50" />
```

Colour is inherited from the parent through `currentColor`. Separate versions
for light and dark do not exist and should not.

**Do not render the logo through `next/image` or `<img>`.** In an external
file `currentColor` does not resolve — the mark goes black and disappears in
dark mode. That is why the component inlines the SVG.

## Stroke rule

The mark is an icon, not a picture. Its weight has to match the other icons.

- icons (lucide): `strokeWidth={1.75}` at 24px
- mark in the header: 26–28px
- do not render below 20px outside the favicon — the stroke becomes a hair

Set icon stroke width once in a wrapper, while there are still few of them.

## Why the logo has no colour

Green and red are reserved for price movement. That is the only colour
semantic in the product and it has to read instantly. A coloured logo would
compete with the data for attention and would mean nothing.

## The favicon is the exception

`public/favicon.svg` is the only file with hardcoded colours and a
`prefers-color-scheme` media query, because `currentColor` does not work in a
browser tab.

Its stroke is proportionally heavier than the mark's — at 16px the original
weight turns into a hair. That is an optical correction, not a mistake. Do not
normalise it.

Wired up in `app/layout.tsx`:

```tsx
export const metadata = {
  title: "Oreum",
  icons: { icon: "/favicon.svg" },
};
```

## Debt

- [ ] convert the wordmark text from `<text>` to `<path>` — the font in
  `oreum-logo.svg` currently depends on the viewer's system
- [ ] `favicon.ico` 32×32 for older browsers
- [ ] OG image 1200×630
