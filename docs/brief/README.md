# Product & Intelligence Brief

`oreum-brief.html` is the source; the PDF is generated from it and is not
committed. It is a standalone document — no build step, no dependencies,
fonts loaded from Google Fonts — so it renders in a browser as-is.

Regenerate:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=15000 \
  --print-to-pdf="docs/brief/Oreum-Product-Intelligence-Brief.pdf" \
  "file://$PWD/docs/brief/oreum-brief.html"
```

`--virtual-time-budget` matters: without it the webfonts have not loaded when
the PDF is written, and the document renders in a fallback face.

The brief states product direction, not implementation status. When a claim in
it becomes false — a phase ships, a provider is chosen, an open question is
answered — update the HTML and regenerate rather than letting the PDF drift.
