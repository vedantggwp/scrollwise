# Library UI: Brainstorm & Alternate Options

**Purpose:** Capture alternate Library UI ideas so we can remove/reprocess books and improve layout and hierarchy. Use with `docs/DESIGN.md` and `docs/UI_UX_AUDIT.md`.

---

## Current state (baseline)

- **Header:** "Library" + status line (e.g. "2 books · 2 ready").
- **Upload:** Single dropzone: "Drop EPUB or PDF here" / "or click to browse".
- **Ready to read (first):** Grid of cover tiles (2 cols mobile, 3–4 on larger). Tap tile → Open. ⋮ on each tile → menu: Open, Re-extract, Remove. No inline buttons on tiles.
- **Processing & errors (below):** Vertical list of book cards (cover + title/author + status + Re-extract + Remove for error; processing shows progress, no actions).
- **Remove:** Confirmation dialog before deleting book, snippets, and annotations.
- **Empty:** "Add your first book" + dropzone.

---

## Alternate UI options (brainstorm)

### A. List with row actions (current direction)

- Keep vertical list; each row = cover + title/author + status + **Re-extract** + **Remove**.
- **Pros:** Simple, scannable, one primary action (Open) via tap on card; secondary actions visible.
- **Cons:** Many books → long scroll; no grouping.

### B. Grid of covers

- Library as a **grid of cover thumbnails** (2–3 columns on mobile, more on desktop). Tap cover → open. Long-press or small menu icon on each tile → **Open / Re-extract / Remove**.
- **Pros:** Visual, compact, familiar (e.g. Kindle, Apple Books).
- **Cons:** Less room for title/author on tile; need a way to expose actions (long-press, overflow menu, or swipe).

### C. List + overflow menu per card

- Keep list layout but **one “more” (⋮) button** per card. Tap ⋮ → menu: **Open**, **Re-extract**, **Remove**.
- **Pros:** Cleaner default look; actions hidden until needed.
- **Cons:** Extra tap for Remove/Re-extract; discoverability of Re-extract lower.

### D. Two zones: “Ready” and “Other”

- **Ready:** Grid or list of books that are “Open” (tap to read). Each has small Remove/Re-extract.
- **Other:** Collapsible or separate section for “Processing” and “Error” (with Retry/Remove).
- **Pros:** Clear separation; “what I can read” vs “what’s pending/broken”.
- **Cons:** More UI complexity; two lists to maintain.

### E. Shelf / section by format or date

- Group by **format** (EPUB, PDF) or **date added** (This week, Older). Each group is a horizontal shelf or a sub-list.
- **Pros:** Scales to many books; easier to find “recent” or “all PDFs”.
- **Cons:** More logic and UI; may be overkill until library is large.

### F. Search + filters

- Add a **search** bar (filter by title/author) and optional **filters** (Ready, Processing, Error; or Format).
- **Pros:** Essential once library grows.
- **Cons:** Implementation cost; not needed for tiny libraries.

---

---

## Best option for addictive use (core audience)

**Core audience:** People who want to read more from their own library—discovery via snippets in the Feed, save/read/skip, return daily. Library is the **gateway** (add content, see “what I have”); Feed is the **habit surface** (snippets, one-tap Read). Addictive use = coming back, feeling progress, low friction to “next read.”

**Addictive-design checklist applied to Library:**

| Principle | Library implication |
|-----------|----------------------|
| **Clear next action** | “Add a book” or “Open” is the obvious next step; after upload, immediate feedback (“Preparing your feed…”) so they know it’s working. |
| **Progress visible** | “X books · Y ready” is good; optional: “Z new snippets in feed” or “Last added today” to reinforce that Library → Feed. |
| **Low friction** | One tap to Open; visual grid = faster “pick a book” and more satisfying scan (covers as variable reward). |
| **Variable reward** | Grid of covers is more rewarding than a plain list; “Recently added” or “Ready” first creates a “something new / something to read” hit. |
| **Reversibility** | Remove / Re-extract available; no permanent delete without confirm. |

**Evaluation of options A–F for habit-forming use:**

- **A (List + row actions):** Clear and scannable, but long list = more scrolling, less “browse and pick.” Primary action (Open) is clear; secondary actions can clutter the row.
- **B (Grid of covers):** Best fit for **addictive** Library UX: visual, familiar (Kindle/Apple Books), one-tap Open, satisfying to scan. Covers act as variable reward. Needs a clean way for Re-extract/Remove (long-press or ⋮).
- **C (List + overflow ⋮):** Cleaner default; one extra tap for Remove/Re-extract. Good if we keep list layout and want to reduce visual noise.
- **D (Two zones: Ready vs Other):** Strong for habit: **“Ready to read” first** = clear next action; Processing/Error in a separate section so the main view is “what I can open now.”
- **E (Shelf by format/date):** Helps at scale (find “recent” or “PDFs”); secondary to “ready vs not” for the core loop.
- **F (Search + filters):** Essential when library is large; supports finding, not primary driver of addiction.

**Recommended direction for best addictive UI/UX:**

1. **Lead with “Ready to read” (two zones, D):** Put **ready** books first—grid or list—so the first thing the user sees is “books I can open now.” Processing and Error in a compact section below (or collapsible) so the main surface is about **action** (Open / Add), not housekeeping.
2. **Use a grid for Ready books (B):** Grid of cover thumbnails for ready books: 2–3 columns on mobile, more on desktop. Tap cover → Open. Long-press or small ⋮ on each tile → Open / Re-extract / Remove. This gives variable reward (covers), low friction (one tap), and aligns with DESIGN (“Library: grid” in handoff).
3. **Overflow menu (C) on grid tiles:** Keep the grid uncluttered: primary = tap to Open; secondary = ⋮ menu with Open, Re-extract, Remove. No inline buttons on the tile face.
4. **Optional layout toggle later:** List vs grid for users who prefer a list; default = grid for ready books.

**Summary:** **Grid of ready books first (B + D)** + overflow menu (C) on each tile. Processing/Error in a separate, secondary section. This maximizes “clear next action,” “progress visible,” and “variable reward” while staying within DESIGN (one primary action per context, state visible, calm).

---

## Recommended short-term

1. **Keep current list + row actions** (Remove and Re-extract on every card for ready/error). Already implemented.
2. **Consider grid (B)** as a **layout toggle** (list vs grid) in a later pass if the library feels long.
3. **Consider overflow menu (C)** if the row feels too busy (e.g. replace inline Re-extract/Remove with a single ⋮ that opens Open / Re-extract / Remove).
4. **For addictive use:** Move toward **Ready-first + grid (B + D)** and **⋮ per tile (C)** as the next Library iteration (see “Best option for addictive use” above).

---

## Design tokens to align

- **Touch targets:** Re-extract and Remove buttons ≥ 44px (already in place).
- **Hierarchy:** Open = primary (tap card); Remove = destructive (red on hover); Re-extract = secondary (neutral icon).
- **Empty state:** Keep “Add your first book” and single dropzone; optional “Re-extract refreshes snippets in the feed” hint near the dropzone or in Settings.

---

## Links

- **DESIGN.md** — Surfaces: Library (grid, empty, one book processing).
- **UI_UX_AUDIT.md** — Mistakes and gaps.
- **STATUS.md** — What’s implemented (Library, BookCard, Retry/Remove).
