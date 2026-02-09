# Scrollwise: Known Bugs and Issues

Use this in the next session to fix issues in silos. Each item has: **symptom**, **likely area**, and **suggested checks**.

---

## B1. Reader only shows cover / does not open to full reader — FIXED

**Symptom:** From Library, user taps a book. Only the cover is visible; the full reader (scrollable book content) does not appear or does not behave as expected.

**Likely area:** Reader / epub.js integration.

**Fix (Silo 0b):** (1) Default epub.js manager shows one section at a time (often the cover). Switched to scrollable full content by passing `manager: "continuous"` and `flow: "scrolled"` to `renderTo()` in `EpubRenderer`. (2) Container could have zero size when `renderTo()` ran; added `whenContainerSized()` that waits for the container to have non-zero `clientWidth`/`clientHeight` (via ResizeObserver) before creating the rendition so percentage dimensions work.

**Suggested checks (for reference):**

1. **EpubRenderer** (`components/reader/EpubRenderer.tsx`): After `rendition.display()` or `display(initialCfi)`, does the rendition actually render content? Check for:
   - Errors in console (e.g. `book.package` undefined — was partially fixed by waiting for `book.opened` and using ArrayBuffer).
   - Rendition container: epub.js often renders into an iframe; confirm the container ref is the one epub.js attaches to and that it has non-zero size (e.g. `height: 100%` on parent chain).
2. **Layout / CSS:** Reader page and `EpubRenderer` wrapper use `min-h-0 flex-1` and `h-full`. Ensure the scrollable content area is not collapsed (flex layout and overflow).
3. **epub.js version / API:** Confirm `rendition.display()` and `attachTo(element)` are used as per current epub.js docs; check for breaking changes or needed options (e.g. `spread`, `flow`).
4. **Blob vs ArrayBuffer:** Reader now converts blob to `ArrayBuffer` before `ePub(buffer)`. If the same bug persists, verify that the blob passed from the reader page is the same one stored (e.g. no corruption when reading from OPFS/IDB).

**Repro:** Upload an EPUB → wait until ready → open from Library → observe only cover.

---

## B2. Feed empty after book is fully processed — FIXED

**Fix (Silo 0a):** The EPUB extractor opened the book with `ePub(blob)` (Blob cast to string), which epub.js does not handle; the book never loaded, so extraction returned zero chunks. Fixed by converting the blob to `ArrayBuffer` before opening in `lib/extraction/epub-extractor.ts` and `lib/utils/cover-extractor.ts`: `const buffer = await blob.arrayBuffer(); const book = ePub(buffer as unknown as string);`

**Fix (additional):** Even with snippets in DB, the feed could stay empty because discovery used `db.snippets.where("bookId").noneOf([...excluded])`. When no books are excluded, `excluded` is empty; in Dexie, **`.noneOf([])` returns no results**. Fixed in `lib/feed/discovery.ts`: when `excluded.size === 0`, use `db.snippets.filter((s) => s.heuristicScore >= 0.15).toArray()` instead of `.noneOf([]).and(...)`.

**Symptom:** Book shows as “ready” and processing completes, but the Feed tab shows no snippet cards (empty or “No snippets yet”).

**Likely area:** Extraction pipeline and/or feed discovery query.

**Suggested checks:**

1. **Extraction success:** After processing:
   - In DevTools → Application → IndexedDB → ScrollwiseDB, check:
     - `books`: relevant book has `processingStatus: "ready"`.
     - `snippets`: there are rows with that book’s `bookId`.
   - Or add temporary logging in `lib/extraction/pipeline.ts`: after `db.snippets.bulkAdd(snippets)`, log `snippets.length` and any caught errors.
2. **Extraction failures:** If `snippets` is empty for that book, extraction may be failing:
   - `lib/extraction/epub-extractor.ts`: `section.load()` or DOM parsing may fail (e.g. in a context where `document`/DOM isn’t as expected, or section URL resolution fails).
   - Check console for uncaught errors during “Extracting…” / “Scoring…”.
3. **Discovery query:** `lib/feed/discovery.ts`:
   - Gets `readyBooks` and `validBookIds`, then `db.snippets.where("bookId").noneOf([...excluded]).and((s) => s.heuristicScore >= 0.15)`.
   - If `excluded` is wrong or Dexie `.and()` behaves differently (e.g. in Dexie 4), the query might return no rows. Log `snippets.length` after the query and after `snippets.filter((s) => validBookIds.has(s.bookId))`.
4. **Heuristic filter:** All snippets with `heuristicScore < 0.15` are filtered out. If every chunk scores below that, feed will be empty. Log score distribution or temporarily lower `MIN_SCORE` in `pipeline.ts` to confirm.

**Repro:** Upload EPUB → wait until “ready” → go to Feed → see no cards.

---

## B3. (Historical) “Cannot read properties of undefined (reading 'package')”

**Symptom:** Red error in overlay: `Cannot read properties of undefined (reading 'package')` in epub.js `Rendition.start` (e.g. `rendition.js` ~213).

**Status:** Mitigated by:
- Waiting for `book.opened` (not only `book.ready`) before calling `renderTo`.
- Passing `ArrayBuffer` (from `blob.arrayBuffer()`) to `ePub()` instead of Blob.

If this reappears, ensure no code path creates a Rendition before `book.opened` has resolved and that the value passed into `ePub()` is the expected type (e.g. ArrayBuffer for binary).

---

## B4. Possible: Double render or flicker in reader

**Symptom:** Cover or first page appears to render twice or flicker.

**Likely area:** React Strict Mode double-mount + epub.js lifecycle.

**Suggested checks:** `destroyedRef` and cleanup in `EpubRenderer` are intended to avoid double-init. If flicker remains, consider ensuring only one rendition is created per mount (e.g. guard with a ref that blocks the second effect run in dev).

---

## B5. Highlight duplicate / no clear all — FIXED (revised)

**Symptom:** Highlighting the same passage again added duplicates in the sidebar. No way to clear all highlights. Toggle/selectionchange behavior was reverted due to wacky UX.

**Fix (revised):** (1) **No duplicates:** Before adding a highlight, note, or bookmark we check if an annotation already exists at the same `cfiRange` for that type; if so we do not add again (selection is cleared). (2) **Clear all:** Annotation sidebar has a "Clear all" link. It fetches the current list from the DB (does not use React state), calls the reader’s `removeHighlights(cfiRanges)` to remove visuals first, then deletes all annotations for the book from DB. The reader gets a stable `removeHighlights` via `onRenditionReady` so the callback is always valid.

**Fix:** Before adding a highlight or note, check for an existing annotation at the same `cfiRange` (same book, type highlight or note). If found: delete from DB and call `rendition.annotations.remove(cfiRange, "highlight")`, then clear selection. Reference: e-readers use one highlight per passage. Toolbar shows “Remove highlight” / “Remove bookmark” when the current selection already has one (aria-label and behavior).

**Reference:** E-readers (e.g. Apple Books, Kindle) use one highlight per passage; remove via tap-on-highlight menu or a list with delete. No duplicate entries for the same range.

---

## B6. Library file picker only accepted EPUB — FIXED

**Symptom:** Dropzone says “Drop EPUB or PDF here” but the file picker (click to browse) only allowed selecting EPUBs; PDFs could only be added by drag-and-drop.

**Fix:** `UploadDropzone` default `accept` was `.epub,application/epub+zip` only. Updated to `.epub,application/epub+zip,.pdf,application/pdf` so the file input accepts both EPUB and PDF.

---

## B8. EPUBs not appearing in feed — FIXED

**Symptom:** PDF snippets show in the feed; EPUB snippets do not (EPUB books are “ready” but no cards).

**Fix:** In `lib/extraction/epub-extractor.ts`, sections were loaded with `section.load()` (no request). When the book is opened from an ArrayBuffer, the default request tries to fetch section URLs from the network and fails. Sections must be loaded with the book’s loader: `section.load((path) => book.load(path))` so content is fetched from the archive.

---

## B7. PDF worker failed to load — FIXED

**Symptom:** Console error: "Setting up fake worker failed: Cannot load script at: ... pdf.worker.min.mjs". PDFs fail to process (book in error); reader/extraction that use pdfjs can break.

**Fix:** Worker is now served from the app: copy `node_modules/pdfjs-dist/build/pdf.worker.min.js` to `public/pdf.worker.min.js` and set `workerSrc` to `/pdf.worker.min.js` so it loads same-origin (avoids CORS/CDN failures).

---

## B9. Reader selection and theme broken in continuous scroll — FIXED

**Symptom:** Text selection toolbar and reader themes still didn’t work properly: selecting text in later chapters didn’t show the toolbar; theme changes didn’t apply to sections that loaded as you scrolled.

**Likely area:** EpubRenderer fallback selection listeners and theme application.

**Fix:** (1) The scroll listener was attached to the rendition container (the inner div passed to `renderTo`), but the element that actually scrolls is the outer wrapper div with `overflow-auto`. Scroll events therefore never fired, so we never re-ran “attach to visible views” and new sections never got selection listeners or theme. We now pass the scrollable element (`el.parentElement ?? el`) into `addFallbackSelectionListeners`. (2) Theme was only applied in the theme useEffect via `getContents()`; new iframes that appeared on scroll weren’t in that list. We now apply theme to every visible view inside the scroll handler using a `getTheme()` callback so new sections get the current reader theme as soon as they become visible.

**Repro:** Open a long EPUB from Library, scroll down, select text in a later chapter → toolbar should appear; change theme → all visible sections (including newly scrolled-into view) should update.

---

## B10. Reader theme and font size buttons not real-time — FIXED

**Symptom:** Clicking Light/Dark/Sepia/Midnight or changing font size did not update the reading content until the page was refreshed.

**Likely area:** EpubRenderer theme useEffect was applying styles only via `getContents()`, which in continuous scrolled mode can return an empty array or a stale list, so no iframe documents were updated.

**Fix:** Apply theme and font size directly to the same documents we use for selection: **manager.visible()** to get the current on-screen views, then set `doc.body.style` (background, color, fontSize, fontFamily, lineHeight, margin) on each view’s document. Fallback to `getContents()` when `visible()` is empty. Theme and font size now update immediately on button click.

**Repro:** Open a book → click Dark (or Sepia/Midnight) or change font size → content should update without refresh.

---

## Bug-fix order suggested for next session

1. **B2 (Feed empty)** — FIXED (Silo 0a).
2. **B1 (Reader only cover)** — FIXED (Silo 0b).
3. **B5 (Duplicate + clear all)** — FIXED (revised).
4. **B9 (Reader selection/theme in continuous scroll)** — FIXED.
5. **B10 (Reader theme/font not real-time)** — FIXED.
6. B3 only if it resurfaces; B4 as polish.

---

## How to add new bugs

For each new bug, add a short section with:

- **Symptom** (what the user sees).
- **Likely area** (which part of the app).
- **Suggested checks** (concrete places to look or log).
- **Repro** (minimal steps).

Keep this file updated as bugs are fixed or new ones found.

---

## Full testing workflow (human-simulation pass)

Use **[docs/TESTING_WORKFLOW.md](TESTING_WORKFLOW.md)** to run a full pass as a human would: every flow (first-time, upload, feed, reader EPUB/PDF, settings, errors, a11y). For each step you can note what’s broken, what violates DESIGN/UI_UX, and what engineering failure likely caused it. Log any new bugs here in BUGS.md using the template above; in the bug section you can add “Found in TESTING_WORKFLOW Flow X, step Y.”
