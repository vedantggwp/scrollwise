# Changelog

All notable changes to Scrollwise are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Documentation

- **README and repo readiness:** README rewritten to reflect current product and thinking: what Scrollwise does and why, current state (Library, Feed, Reader, tests), design and data-flow philosophy, project structure, getting started, and doc index. .gitignore updated to exclude `playwright-report/`, `test-results/`, and optionally `.cursor/`. CHANGELOG reference to project conventions generalized (no path to uncommitted files). Local path in `docs/STATUS.md` replaced with generic `cd scrollwise`. CHANGELOG comparison URLs kept as `your-org` with a comment and README note to replace with your GitHub username after push. Docs table in README includes `docs/README.md` index.

### Added

- **Life cases and automated tests:** [docs/LIFE_CASES.md](docs/LIFE_CASES.md) defines user journeys and acceptance criteria for every feature (highlight, note, bookmark, themes, TOC, search, feed loop, Library, Settings), with critical questions: easy to find? easy to remove? saved? [docs/TEST_COVERAGE.md](docs/TEST_COVERAGE.md) maps tests to life cases. New Vitest tests: SelectionToolbar (11 tests — Highlight/Remove highlight, Add note disabled when highlighted, Bookmark/Remove bookmark, touch targets), reader-store (3 tests — theme, fontSize, clamp), AnnotationSidebar (10 tests — list from DB, Clear all confirm/cancel, onSelectCfi). Playwright E2E: navigation (Feed/Library/Settings, aria-current, Settings theme controls), reader (invalid id error; with SCROLLWISE_TEST_BOOK_ID: theme buttons, TOC, Annotations sidebar). `npm run test:e2e`; run `npx playwright install chromium` once.
- **Stress test report:** [docs/STRESS_TEST_REPORT.md](docs/STRESS_TEST_REPORT.md) — full pass mimicking user behaviour: intended vs verified vs manual for every flow (A–I) from TESTING_WORKFLOW; automated tests 23/23, build OK, browser nav verified; reader theme/selection flagged for manual re-verify.
- **Tests:** Vitest + React Testing Library for unit and integration tests. `npm run test` runs 23 tests: BookCard (list/grid variants, menu, Open/Re-extract/Remove), BookGrid (layout, callbacks), Library page (empty, Ready to read, Processing, summary, mixed). See `tests/` and `vitest.config.ts`.
- **Library UI (Ready-first + grid + overflow menu):** Library shows **Ready to read** first (grid of cover tiles, 2–4 columns); tap tile opens book; ⋮ on each tile opens menu (Open, Re-extract, Remove). **Processing** and **Errors** in a separate section below (list layout). Remove book now asks for confirmation before deleting.

### Fixed

- **Reader theme and font size buttons still not real-time (required refresh):** Theme and font size were applied via epub.js `themes.select()`/`fontSize()` and a loop over `getContents()`, which in continuous mode can return an empty or stale list. We now apply styles directly to the same documents used for selection: **manager.visible()** for each visible view’s document (background, color, fontSize, typography). Font size and body typography are applied in the same pass so both theme and font-size changes take effect immediately without refresh. Fallback to `getContents()` when `visible()` is empty.
- **Reader selection and theme still broken in continuous scroll:** The scroll listener was attached to the rendition container (inner div) instead of the element that actually scrolls (the wrapper with `overflow-auto`), so scroll events never fired and new sections never got selection listeners or theme. We now pass the scrollable element (`containerRef.current.parentElement`) into the fallback so selection works after scrolling. Theme is also applied to every visible view inside the scroll handler (via `getTheme()`) so newly loaded iframes get the current reader theme immediately.
- **Reader selection toolbar and right-click:** Fallback selection listeners were only attached to views visible at init; in continuous scroll, new sections never got listeners so highlight/notes toolbar didn’t appear when selecting text in later chapters. We now attach on init and **on scroll** to all visible views (with idempotent marking so we don’t double-attach). Right-click and mouseup on any section now set selection and show the toolbar.
- **Reader themes not applying:** Theme rules now use `!important` so they override EPUB styles; reader container uses the same theme background so the reading area matches Light/Dark/Sepia/Midnight.
- **Reader theme change not instant:** Clicking a theme (Light/Dark/Sepia/Midnight) only applied after leaving and re-entering the reader. We now apply the theme immediately by setting `background` and `color` on every content document’s `body` in the same effect that runs on theme change, so the update is visible on click instead of after remount.
- **Settings theme options had no effect:** Tailwind v4 uses the `prefers-color-scheme` media query for `dark:` by default, so Light/Dark/System only updated the store and the `<html>` class; the UI kept following system preference. Added a class-based `@custom-variant dark` in `globals.css` so `dark:` utilities respond to the `.dark` class on `<html>`. Theme toggle (Light / Dark / System) now changes the app theme as intended.
- **EPUBs not appearing in feed:** EPUB extraction was calling `section.load()` without passing the book’s loader. When the book is opened from an ArrayBuffer, sections must be loaded via `book.load(path)` so content is fetched from the archive; otherwise the default request tries to fetch relative paths (e.g. `OEBPS/chapter1.xhtml`) from the network and fails. The extractor now passes `(path) => book.load(path)` to `section.load(request)`, so EPUB sections load and chunks/snippets are written; EPUB snippets now show in the feed.
- **PDF Open crash (4 errors):** `highlightPlugin()` from @react-pdf-viewer/highlight uses React Hooks internally and was being called inside `useMemo`, which violates the Rules of Hooks. It is now called at the top level of `PdfRenderer`; annotations are kept in a ref and read in `renderHighlights` so the plugin sees the latest data. The blob URL effect was simplified (sync setState in effect) to avoid hook-order issues. This fixes "Do not call Hooks inside useMemo", hook-order change, and the downstream "destroy" TypeError.

### Fixed (previous)

- **PDF worker:** Worker is now served from the app (`public/pdf.worker.min.js`) instead of unpkg, avoiding CORS and CDN failures. Copy from `node_modules/pdfjs-dist/build/pdf.worker.min.js` after upgrading pdfjs-dist.
- **PDF worker failed to load (earlier):** pdfjs-dist was configured to load the worker from `pdf.worker.min.mjs`; unpkg only serves `pdf.worker.min.js` for that version. Updated `lib/utils/pdf-worker.ts` and `components/reader/PdfRenderer.tsx` to use `.min.js`, fixing "Setting up fake worker failed" and allowing PDF processing and reader to work.
- **Library file picker only accepted EPUB:** Dropzone copy said “Drop EPUB or PDF here” but the file input `accept` was EPUB-only; click-to-browse could not select PDFs. `UploadDropzone` now accepts `.epub,application/epub+zip,.pdf,application/pdf`.
- **Feed not auto-updating:** Feed now refetches when the tab/window becomes visible again (Page Visibility API), so returning from Library or switching back to the app tab shows new snippets without manual Refresh. Book-ready event refetch was already in place.
- **Feed always empty (root cause):** Discovery used `db.snippets.where("bookId").noneOf([...excluded])`. When no books are excluded, `excluded` is empty; in Dexie, `.noneOf([])` returns no results. Discovery now uses `.filter()` when `excluded.size === 0` so all snippets are considered; once real snippets exist, the feed shows book cards.
- **Feed empty despite “X ready”:** When Feed showed 0 cards but library had ready books, discovery was not retried. Feed now refetches once when it shows 0 snippets and `readyCount > 0` (and library counts refresh on window focus) so cards appear after extraction finishes or when returning from Library.
- **EPUB selection toolbar not appearing:** Toolbar could fail to show when selecting text (e.g. when epub.js “selected” did not fire). Fallback added: right-click (contextmenu) or mouseup on the book iframe now detects selection and shows the same toolbar. Context menu is prevented so the browser menu does not cover the toolbar; long-press on touch often fires contextmenu, so selection actions are available without the floating toolbar.
- **Selection toolbar actions:** Toolbar now shows “Remove highlight” when the selection already has a highlight or note (tap to remove and clear selection), and “Remove bookmark” when the selection already has a bookmark. Add note is disabled when the range is already highlighted.

### Added

- **Placeholder feed when no snippets:** When the feed has no book snippets (no books yet, or none ready), the feed shows a scrollable list of placeholder cards: short quotes and light jokes, one per card, in the same post-like layout. Copy explains they disappear when book highlights are available. Placeholders are shuffled once per session; real snippets replace them as soon as discovery returns any.
- **PDF in-book search:** Search drawer now works for PDFs: `lib/utils/pdf-search.ts` runs text search over PDF pages via pdfjs getTextContent; results show "Page N" + excerpt; tap jumps to that page. Search button is shown for both EPUB and PDF; SearchDrawer accepts format-agnostic `SearchMatch` (cfi or pageIndex) and `onSelectMatch`.
- **PDF TOC (outline):** TOC drawer shows PDF outline when the document has bookmarks: `lib/utils/pdf-outline.ts` uses pdfjs `getOutline()` and resolves destinations to page indices; entries use href `page:N`; reader page loads outline when TOC opens for PDF and onSelect jumps via `pdfRef.jumpToPage`. Empty state: "No table of contents for this PDF" when outline is missing or empty.

- **Testing workflow:** `docs/TESTING_WORKFLOW.md` — full testing playbook: simulate a human using every feature (flows A–I), observe broken/wrong/UX violations, capture engineering failures, log in BUGS.md. Linked from BUGS.md and STATUS.

- **Phase 3 follow-up (TOC + in-book search):** TOC drawer in reader (left): EPUB uses book.navigation.toc, tap entry to go to chapter; PDF shows “No table of contents for PDF”. In-book search (EPUB only): Search drawer with query input, search across spine sections, results list with excerpt, tap to jump to CFI. Reader header has TOC (List) and Search icons; Search hidden for PDF.

- **UI/UX audit:** `docs/UI_UX_AUDIT.md` — Current state, mistakes, corrections, and gaps for the full intended experience; priority order for fixes.
- **Silo 2b (audit short-term):** Note modal (in-app modal for Add note instead of `window.prompt`); touch targets ≥44px on SnippetCard actions, BottomNav, and SelectionToolbar; theme selector in Settings (Light / Dark / System); BookCard error state has Retry (re-run extraction) and Remove (delete book + blob + snippets + annotations); Error boundary has Retry, Go to Feed, and Go to Library.
- **Silo 2c (audit medium-term):** Onboarding wizard on first visit (what Scrollwise is, “Add your first book” → Library); Feed Refresh button and refetch when a book becomes ready (`scrollwise-book-ready` event); reader serif typography (Literata, Merriweather, Georgia, line-height 1.6, body margins); unsupported-file inline message (“Only EPUB supported right now”) when non-EPUB is dropped.
- **Silo 3 (PDF):** PDF support: upload PDFs in Library; PDF extractor, runPdfExtraction pipeline, PDF cover; reader routes by book.format to PdfRenderer or EpubRenderer; Feed shows PDF snippets. Build uses webpack (canvas fallback for pdfjs).
- **Reader parity (Silo 3b):** Reader experience is format-agnostic: same header (annotations button, themes, font/zoom) and AnnotationSidebar for EPUB and PDF; PDF highlights persist to DB, re-render on load, jump-to-page from sidebar; PDF zoom tied to reader store fontSize. Annotation schema extended with optional pageIndex and pdfHighlightAreas for PDF.

### Changed

- **Library BookCard:** Remove and Re-extract (re-process) are now shown for **all** books: ready and error. Ready cards show Open (tap cover/title) plus Re-extract and Remove icon buttons on the right; error cards keep Retry + Remove. Processing cards have no actions (card is non-interactive until done).
- **Feed scroll and placeholders:** Feed always starts at top (`initialTopMostItemIndex={0}`). Auto-scroll to bottom disabled (`followOutput={false}`) so adding books or refetch no longer causes persistent scroll-to-bottom. Placeholder cards appear only when there are no real snippets; once EPUBs/PDFs are uploaded and processed, feed shows only real cards (placeholders disappear). When real snippets first appear, list scrolls to top so user sees their content.
- **Snippet card content:** Extracted text is normalized and split into headline + body: `lib/utils/snippet-text.ts` adds spaces where PDF/EPUB extraction concatenates (e.g. "MASTERYThe" → "MASTERY The", "Conceptso1" → "Concepts o1"). Headline = first sentence or first ~72 chars; body = rest with duplicate headline stripped so cards are readable and not redundant.
- **Feed UI overhaul:** Feed and cards redesigned for a more engaging, editorial look: serif headlines and clearer hierarchy, larger cover thumbnails and rounded-2xl cards with soft shadows and hover states, distinct action bar with rounded buttons and blue accent on "Open", placeholder cards aligned to the same visual language, and a clearer header with serif "Feed" title and amber "saved today" chip. Skeleton loading matches the new card layout.
- **Feed:** Single infinite-scroll list always (Instagram/Twitter style). No separate empty state: one Virtuoso shows real snippet cards first, then placeholder cards (quotes/jokes). When there are no snippets, the list is placeholders only; at bottom, "load more" appends more placeholders so the feed never ends. While loading, skeletons appear in the same list. Optional one-line hint to add books when library is empty.
- **Feed:** SnippetCard shows saved state (filled amber Bookmark, “Saved” aria-label) when snippet is saved.
- **Feed:** Virtuoso `followOutput` respects `prefers-reduced-motion` (no smooth scroll when reduced motion is preferred).
- **Reader:** Back button aria-label is now “Back” (was “Back to library”) since user may have come from Feed.
- **Reader:** Add note uses an in-app modal with optional textarea instead of `window.prompt`.
- **Library:** Upload dropzone copy and accept attribute are EPUB and PDF supported (“Drop EPUB here”; "Drop EPUB or PDF here"; unsupported files show "Only EPUB and PDF supported right now".
- **Library:** BookCard shows “Open” for ready books and “Error · Retry or remove” with Retry/Remove buttons for error state.
- **Settings:** Theme section with Light / Dark / System; placeholder copy updated (AI and feed tuning in later phases).
- **Home:** First-time users (0 books, onboarding not complete) see a short onboarding wizard; “Add your first book” completes onboarding and navigates to Library.
- **Feed:** Refresh button refetches discovery; Feed also refetches when a book finishes processing (book-ready event from Library).
- **Reader:** Body typography uses serif stack and line-height 1.6 per DESIGN.md.
- **Library:** Dropping a non-EPUB file shows an inline message “Only EPUB supported right now” (auto-dismisses).

## [0.2.2] — 2025-02-03

### Changed

- **Annotations reverted and simplified:** Toggle behavior and selectionchange/pointer-events fixes were reverted due to wacky behavior. Toolbar is simple again (Highlight, Note, Bookmark only).

### Fixed

- **No duplicate annotations (B5 revised):** Same passage (same `cfiRange`) no longer adds a second highlight/note/bookmark; we skip add and clear selection. Aligns with e-reader behavior (one per range).
- **Clear all annotations:** Annotation sidebar has a "Clear all" link; confirms then deletes all annotations for the book and removes highlight visuals from the reader.
- **Clear all actually removes highlights from the page:** Previously the list cleared but highlights stayed visible until refresh. Fix: (1) Fetch annotations from the DB before clearing (no stale state). (2) Call removeHighlights then delete from DB. (3) **UX-first:** After clearing, the reader is remounted (key bump) so it reloads with no annotations from DB — highlights disappear immediately without refresh. Scroll position is preserved by tracking current CFI in the reader page and passing it as `initialCfi` when remounting. `onLocationChange` now updates that state so we always restore to the user’s last position.

### Documentation

- docs/BUGS.md: B5 revised (duplicate prevention + clear all; toggle reverted).

## [0.2.1] — 2025-02-03

### Fixed

- **Highlight/note/bookmark toggle (B5):** Clicking Highlight (or Note, or Bookmark) on a selection that already has that annotation now **removes** it instead of adding a duplicate. One annotation per range; no duplicate entries in the sidebar. Toolbar shows “Remove highlight” / “Remove bookmark” (aria-label) when the current selection already has one.

### Documentation

- docs/BUGS.md: B5 added and marked FIXED.

## [0.2.0] — 2025-02-03

### Added

- **Annotations (Silo 2):** Reader annotations with persistence and UI.
  - **DB:** New `annotations` table (highlight, note, bookmark) with bookId, cfiRange, text, noteBody, createdAt.
  - **Selection + toolbar:** Text selection in reader triggers floating toolbar (Highlight, Note, Bookmark). Highlights and notes use epub.js `rendition.annotations.highlight`; bookmarks store position only.
  - **Persistence:** Annotations saved to IndexedDB; highlights and notes re-applied when opening the book.
  - **Annotation sidebar:** Drawer listing all annotations for the current book; tap to jump to location (`displayCfi`).
  - **Reader themes:** Light, dark, sepia, midnight (reader store, persisted); theme selector and font size +/- in reader header.
  - **Feed chip:** “X saved today” in Feed header when any snippet was saved today; count refreshes on visibility change.

### Changed

- **Reader store:** Now persisted (`scrollwise-reader`); adds `readerTheme`, `fontSize`, `setReaderTheme`, `setFontSize`. Min/max font size 14–28, default 18.
- **EpubRenderer:** Forward ref with `displayCfi(cfi)` for sidebar navigation; accepts `readerTheme` and `fontSize`; registers and applies reader themes; applies stored annotations on load.

### Documentation

- STATUS.md: Phase 3 (Annotations) section; Key Files updated; Last updated v0.2.0.
- NEXT_STEPS.md: Silo 2 marked done; TOC/search noted as deferred.

## [0.1.3] — 2025-02-03

### Added

- **Library summary:** Library page shows a status line (e.g. “2 books · 1 ready, 1 processing”) so counts and processing state are visible.
- **Feed empty state:** Feed uses `useLibraryCounts` to show Library status (book count, ready/processing/error) when there are no snippets; contextual copy and “Open Library →” link.
- **docs/DATA_FLOW.md:** Single document for data flow and SOP — IndexedDB as source of truth, upload → process → feed flow, how to interpret Library/Feed state.

### Changed

- **Feed empty state readability:** Empty state split into separate lines (main message, Library status, suggestion, link) with spacing and type hierarchy instead of one dense paragraph.
- **Lint:** ThemeProvider and useReducedMotion use `queueMicrotask()` for initial setState in effects to satisfy `react-hooks/set-state-in-effect`. SnippetCard unused vars removed.

### Documentation

- README, STATUS, and NEXT_STEPS reference `docs/DATA_FLOW.md`. STATUS “Last updated” and Key Files updated for v0.1.3.

## [0.1.2] — 2025-02-03

### Fixed

- **Feed scroll restore (Silo 1):** When returning from the reader, the feed now restores scroll position. `useInfiniteSnippets` accepts an optional `initialScrollIndex` (from the feed store) and fetches at least that many snippets on initial load so Virtuoso can show the list at the correct position.

## [0.1.1] — 2025-02-03

### Fixed

- **Feed empty after processing (B2):** EPUB extractor and cover extractor now open the book with an `ArrayBuffer` instead of a Blob. epub.js does not handle Blob correctly, so the book never loaded and extraction returned zero chunks. Feed now shows snippet cards after a book is ready.
- **Reader only shows cover (B1):** Reader now uses epub.js continuous scrolled mode (`manager: "continuous"`, `flow: "scrolled"`) so the full book is scrollable instead of a single section (often the cover). Rendition is created only after the container has non-zero size (ResizeObserver) so percentage dimensions work.

### Documentation

- `docs/BUGS.md`: B1 and B2 marked FIXED with short fix notes.
- Added project conventions for versioning and documentation updates (see README and docs).

<!-- Replace your-org with your GitHub username so the version comparison links work. -->

[Unreleased]: https://github.com/your-org/scrollwise/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/your-org/scrollwise/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/your-org/scrollwise/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/your-org/scrollwise/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/your-org/scrollwise/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/your-org/scrollwise/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/your-org/scrollwise/compare/v0.1.0...v0.1.1
