# Scrollwise Brand — "Curio"

Direction locked 2026-07-11 from a four-way exploration. One line: **curiosity as candy** —
zine energy, chunky type, color-blocked books, hard edges. The feed should feel like a
smart friend's sticker-covered notebook, not a SaaS dashboard.

## Voice

- Questions sound aimed at *you*, mid-scroll: specific tension, under 20 words, second person.
- Answers lead with the surprising bit. "A sharp friend with the book open, not an encyclopedia."
- UI copy is playful-direct: "tap for the receipts →", never "View details".
- Banned: explore, delve, unlock, journey, elevate.

## Type

All from [Fontshare](https://www.fontshare.com) (free, self-hostable — no Google Fonts dependency):

| Role | Face | Usage |
|---|---|---|
| Display / questions | **Clash Display** (semibold/bold) | Question tiles, headlines. Tight (-1%), `text-wrap: balance` |
| Book text / quotes | **Erode** (regular, italic for quotes) | Quote tiles, answer bodies, the reader |
| UI / labels | **General Sans** | Buttons, tags, metadata. Tags uppercase, +12% tracking, 700 |

Scale: 12 (tag) · 14 (meta) · 16 (body) · 19 (tile question) · 24 (answer question) · 32/40 (page headings).

## Color

Paper-and-ink ground, candy book-colors on top.

```css
@theme {
  --color-paper: #FFFDF7;   /* app ground */
  --color-ink:   #17161A;   /* text, borders, shadows */
  --color-mut:   #6D6A75;   /* secondary text */

  /* book-color cycle — each ingested book claims the next one */
  --color-book-1: #FFD84D;  /* marigold  — ink text */
  --color-book-2: #BFE3D0;  /* mint      — ink text */
  --color-book-3: #1D4ED8;  /* cobalt    — paper text */
  --color-book-4: #FF8FA3;  /* rose      — ink text */
  --color-book-5: #B7A6F5;  /* lilac     — ink text */
  --color-book-6: #0F766E;  /* teal      — paper text */

  --color-hi:    #FFD84D;   /* highlight/citation chips */
}
```

Rules: colored tiles get ink or paper text per the table above (contrast is non-negotiable);
quote tiles stay paper-white with ink text (the book's color appears only in the tag);
citations render as ink chips with marigold text. Dark mode v1: keep the feed light —
Curio's world is paper. (Reader keeps its own themes incl. dark; revisit app-wide dark post-MVP.)

## Form

- **Borders:** 2px solid ink on every tile and card. No hairlines.
- **Shadow:** hard offset `4px 4px 0 var(--color-ink)`. No blur, ever.
- **Radius:** 16px tiles, 999px chips, 2px inside the reader (reading is calm; feed is loud).
- **Tags:** may rotate ±1°; at most one rotated element per tile.
- **Masonry:** 2 columns mobile, 3–4 desktop, 14px gap. Tiles hug content — no min-heights.

## Motion

- Snappy, physical: 150–180ms `cubic-bezier(0.2, 0, 0, 1)`.
- Press a tile: it moves 2px toward its shadow (shadow shrinks to 2px) — a real button press.
- New tiles enter with 8px rise + fade, staggered 40ms; `prefers-reduced-motion` gets fade only.
- The reader has NO Curio motion — opening a book is a register change, loud → calm.

## The register switch (core brand behavior)

Feed = zine (Clash, candy, hard shadows). Reader = book (Erode, quiet paper, v1's themes).
The answer page sits between: Curio frame, Erode body. This contrast is the brand —
protect it in every future decision.
