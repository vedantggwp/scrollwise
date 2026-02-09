# Reader: Research, Root Causes, and Redesign Direction

**Purpose:** Address reader bugs and “flat web page” feel with root-cause fixes and a direction informed by how other e-readers handle layout and book-like experience. Use with `docs/DESIGN.md` and `docs/UI_UX_AUDIT.md`.

---

## 1. Research: How Other E-Readers Do It

### 1.1 Layout and reading mode

| Source | Options / workflow | Notes |
|--------|--------------------|--------|
| **Foliate** | Paginated vs continuous scroll; font, spacing, margins, color scheme | Typography and margins adjustable; scroll mode has known UX issues (jumpiness). |
| **KOReader** | Fonts, font size, line spacing, margins, themes; double-column for PDF; reflow, zoom, margin crop | Strong typesetting controls; “Book Map” and multi-page highlights. |
| **Yomu** | Page margins (small / medium / large / custom); vertical spacing; horizontal page-turning or vertical scroll; optional two-column on large screens | “Fluid layout” adjusts text and margins to device + preferences; choice between page-turn (book feel) and continuous scroll. |
| **Margins** | Distraction-free; focus on margins and reading comfort | Few options, high impact. |
| **Kindle / Apple Books** | Font size, font family, margins (limited on Apple); light/sepia/dark; full justification | Apple margin customization is limited; users often want more margin control. |

**Takeaways**

- **Margins** (and sometimes max line width) are central to a book-like feel; presets (narrow / medium / wide) are common.
- **Reading mode:** either **paginated** (page-turn, “book” feel) or **continuous scroll** (current Scrollwise behavior); some apps offer both.
- **Multi-column** is a power feature (especially for PDF / wide screens); not required for v1.
- **Typography:** font, size, line height, and (optionally) alignment are standard; our font size is already there; line height and margins are the next levers.

### 1.2 “Book feel” and visual comfort

- **Color modes:** Day, sepia, grey, dusk, night, black (Yomu-style). Sepia/warm tones mimic paper; we already have light/dark/sepia/midnight.
- **Content width:** Constrained line length (e.g. 45–75 characters) via max-width or margins; avoids full-bleed text across the whole viewport.
- **Page-like framing (optional):** Some apps add subtle shadow, rounded corners, or a “page” background to the content area; not universal but can reinforce “page” metaphor.
- **Noise:** “No unnecessary preferences”; expose a small set of high-impact settings (margins, theme, font size, line spacing).

### 1.3 Workflow summary (for our UI)

- **Theme:** Light / Dark / Sepia / Midnight (we have this; must fix application).
- **Layout / width:** Margin presets (e.g. Narrow / Medium / Wide) or a single “reading width” control; under the hood this is max-width + horizontal margin.
- **Typography:** Font size (done); optional line height (e.g. 1.4 / 1.6 / 1.8) later.
- **Reading mode (later):** Keep continuous scroll as default; consider paginated “page turn” as an option once core is stable.

---

## 2. Current Bugs and Root Causes

### 2.1 Reader themes “don’t work”

- **What we do:** Store has `readerTheme`; EpubRenderer registers and selects epub.js themes with `READER_THEME_RULES` (body background, color, typography).
- **Likely causes:**  
  - epub.js may apply theme rules to `body` while the visible content is in section iframes; the first “page” might be the cover (image), so the body behind it doesn’t show.  
  - Theme might be applied before the rendition is fully laid out, or overridden by inline/EPUB styles.  
- **Direction:** Ensure theme is applied to the correct scoped container (each section’s body or wrapper), re-apply after each section loads if needed, and ensure no global/app CSS overrides reader content background.

### 2.2 Cover rendering as a thin strip

- **Observed:** A thin horizontal strip at the top of the content (cover misrendered).
- **Likely cause:** In continuous scroll, epub.js renders the first spine section (often the cover). The cover is usually an image; if the container or image sizing is wrong (e.g. full width, no height, or wrong aspect ratio), it can appear as a thin band. Alternatively, the first section’s layout (e.g. `min-height` or flex) could be collapsing.
- **Direction:**  
  - Option A: Skip the cover in the reader (start at first text section) so the “book” starts at content.  
  - Option B: Render the cover properly: give the cover section a proper aspect-ratio or max-height so the image displays as a block (e.g. “book cover” proportions), not a strip.  
  - Decide whether the reader should show the cover at all; many e-readers show cover only on the “book card” and start reading at chapter one.

### 2.3 “Flat web page” feel

- **Cause:** Full-width text, no constrained reading column, no margin presets, no “page” or paper-like framing.
- **Direction:**  
  - Add a **reading column**: max-width (e.g. 65ch) and horizontal margins so content doesn’t span the whole viewport.  
  - Add **margin presets** (Narrow / Medium / Wide) that map to padding or max-width.  
  - Optionally add a subtle background or shadow to the content area to suggest a “page” (can be a later polish).

### 2.4 Selection toolbar and right-click (highlight / notes)

- **Observed:** No highlight option on right-click; toolbar that used to appear on selection sometimes doesn’t.
- **Current behavior:** Toolbar shows when `selection` state is set. Selection is set by: (1) epub.js `selected` event, or (2) fallback: `contextmenu` and `mouseup` on **visible** views’ documents.
- **Root cause:** Fallback listeners are attached only to views that are **visible at init time**. In continuous scroll, new sections are added as the user scrolls; their documents were never given `contextmenu` / `mouseup` listeners. So selection works on the first section(s) but not on text in sections that appear later.
- **Direction:** Attach selection/contextmenu listeners to **every** view when it is created or becomes visible (e.g. listen for new views from the rendition/manager, or use a single delegated listener at the container/iframe level that can resolve the target document). Ensure right-click on a selection preserves the selection and shows the toolbar (and optionally a custom context menu with Highlight / Copy).

---

## 3. Proposed Implementation Order

1. **Selection/toolbar (root fix)** — **Done**  
   - Fallback selection listeners now attach to **all visible views**: we run attachment at init and again on **scroll**, so as the user scrolls and new sections appear, their documents get `contextmenu` and `mouseup` listeners. Documents are marked so we don’t attach twice.  
   - Toolbar appears when selection is set (from epub.js `selected` or from fallback).

2. **Reader themes (root fix)** — **Done**  
   - Theme rules now use `!important` on background and color so they override EPUB styles.  
   - Reader container div uses the same theme background (READER_THEME_BG) so the chrome matches the content.

3. **Cover** — **Next**  
   - Either skip cover in reader (start at first text section) or render cover section with correct aspect ratio/sizing so it’s not a thin strip.

4. **Book-like layout** — **Next**  
   - Add reading column (max-width + horizontal margins).  
   - Add margin/width presets (e.g. Narrow / Medium / Wide) in Settings or reader header.  
   - Align EPUB and PDF to the same layout rules where possible.

5. **Optional later**  
   - Line height control.  
   - Paginated “page turn” mode.  
   - Subtle page/paper styling.

---

## 4. Design Principles (long-term)

- **One source of truth:** Reader layout (margins, max-width, theme) should be defined in one place and apply to both EPUB and PDF.
- **No band-aids:** Fix selection at the “attach to all views” level; fix themes at the “apply to content scope” level; fix layout at the “reading column + presets” level.
- **Progressive enhancement:** Get themes, cover, and selection right first; then add layout options without breaking existing behavior.

---

## 5. Links

- **DESIGN.md** — Reader surfaces, format-agnostic experience.
- **UI_UX_AUDIT.md** — Gaps and priorities.
- **STATUS.md** — Current reader implementation (EpubRenderer, PdfRenderer, themes, toolbar).
