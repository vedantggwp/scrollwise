# Scrollwise: Current Status

**Last updated:** Library UI: Ready-first zones (grid for ready books, list for processing/errors); overflow menu on grid tiles; Remove confirm. Use this as the single source of truth for what is implemented and what works.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind 4
- **State:** Zustand (app, library, feed, reader stores)
- **DB:** Dexie 4 (IndexedDB) — tables: `books`, `snippets`, `feedConfig`, `annotations`
- **Storage:** OPFS primary, IndexedDB blob fallback (`lib/utils/file-storage.ts`)
- **EPUB:** epub.js (direct, no react-reader)
- **Feed list:** react-virtuoso
- **Icons:** Lucide React

---

## What Is Implemented

### Phase 1 (Foundation)

| Area | Status | Notes |
|------|--------|-------|
| Next.js scaffold | Done | App Router, Tailwind, PWA manifest |
| Dexie schema | Done | Book, Snippet, FeedConfig (v2) |
| File storage | Done | OPFS + IDB fallback, `putBlob` / `getBlob` |
| Library page | Done | Upload dropzone (EPUB/PDF); **Ready to read** first (grid of cover tiles, tap to Open, ⋮ menu: Open / Re-extract / Remove); **Processing & errors** section (list); summary line; Remove confirms before delete |
| Book upload | Done | EPUB and PDF; store blob, create Book, extract cover in background; BookCard shows “Open” when ready, “Error · Retry or remove” when error |
| Extraction pipeline | Done | `runEpubExtraction()` (EPUB) and `runPdfExtraction()` (PDF in `pipeline-pdf.ts`) — extract → score → filter → `db.snippets.bulkAdd`, book → ready |
| Processing UI | Done | ProcessingIndicator on BookCard (extracting/scoring) |
| EPUB cover | Done | `extractEpubCover()` after add; cover shows when ready |
| Reader route | Done | `/reader/[bookId]`, optional `?loc=`; routes by `book.format` to EpubRenderer or PdfRenderer |
| EpubRenderer | Done | epub.js with ArrayBuffer + `book.opened` wait; continuous + scrolled; display(cfi), relocated → persist location; container sized before renderTo |
| PdfRenderer | Done | @react-pdf-viewer/core + highlight plugin; dynamic import; initial page, theme, fontSize→scale; PDF highlights persist, load from DB, jumpToPage; same chrome as EPUB |
| PDF extractor | Done | `lib/extraction/pdf-extractor.ts` — getTextContent per page, paragraph grouping → RawChunk[] |
| PDF cover | Done | `lib/utils/pdf-cover.ts` — first page rendered to canvas, data URL (dynamic import) |
| App shell | Done | BottomNav (Feed / Library / Settings), AppShell, ThemeProvider |
| Home redirect | Done | No books → Library; has books → Feed |
| Error boundary | Done | Root ErrorBoundary with recovery UI |
| Storage tip | Done | One-time tip when OPFS not available |
| A11y baseline | Done | useReducedMotion, aria-labels on nav/cards |
| Tests | Done | Vitest + React Testing Library; BookCard, BookGrid, Library page (23 tests); `npm run test` |

### Phase 2 (Extraction + Feed)

| Area | Status | Notes |
|------|--------|-------|
| EPUB extractor | Done | `lib/extraction/epub-extractor.ts` — spine iteration, DOM chunks, CFI |
| Heuristic scorer | Done | `lib/extraction/heuristic-scorer.ts` — score 0–1, rawChunkToSnippet |
| Pipeline | Done | `lib/extraction/pipeline.ts` — runEpubExtraction, progress callback |
| Discovery algorithm | Done | `lib/feed/discovery.ts` — score + variety + serendipity |
| Feed page | Done | FeedView, useInfiniteSnippets, react-virtuoso; feed starts at top, no auto-scroll; placeholders only when no real snippets (disappear once books processed); at bottom load more real or more placeholders; optional “Add books” hint when library empty |
| SnippetCard | Done | Headline + body from `lib/utils/snippet-text.ts` (normalize concatenated text, first sentence/72 chars headline, no duplicate in body); Save / Highlight / Read / Skip; saved state (filled amber Bookmark) |
| Card → reader | Done | Link to `/reader/[bookId]?loc=...` |
| Scroll restore | Done | firstVisibleItemIndex in feed store, initialTopMostItemIndex in Virtuoso |
| Skip | Done | Updates snippet, removeSnippet from list |

### Phase 3 (Annotations)

| Area | Status | Notes |
|------|--------|-------|
| Annotations table | Done | `annotations` (id, bookId, type, cfiRange, text, noteBody, createdAt); type: highlight \| note \| bookmark |
| Text selection | Done | epub.js `selected` event in EpubRenderer |
| Floating toolbar | Done | SelectionToolbar: Highlight, Note, Bookmark; shown on selection |
| Persist highlights/notes/bookmarks | Done | db.annotations.add; highlights re-applied on reader load via loadStoredAnnotations |
| Annotation sidebar | Done | AnnotationSidebar: list by book, tap to jump (displayCfi via ref) |
| Reader themes | Done | light, dark, sepia, midnight; reader store + rendition.themes |
| Font size | Done | Reader store (persist), +/- in header, rendition.themes.fontSize |
| Feed “X saved today” chip | Done | useSavedTodayCount, chip in FeedView header when count > 0 |
| TOC drawer | Done | Left drawer: EPUB uses book.navigation.toc, tap to display(href). PDF: getPdfOutline(blob) from pdfjs getOutline(), entries use href "page:N", tap to jumpToPage; empty message when PDF has no outline. |
| In-book search | Done | EPUB: Search drawer, searchInBook over spine sections, jump to CFI. PDF: searchPdf over pages, jump to page; same Search drawer, format-agnostic results (cfi vs pageIndex). |

### UI/UX audit (post–Silo 2)

| Area | Status | Notes |
|------|--------|-------|
| UI/UX audit doc | Done | [docs/UI_UX_AUDIT.md](UI_UX_AUDIT.md): current state, mistakes, corrections, gaps, priority order |
| Audit quick wins | Done | SnippetCard saved state; Reader Back aria-label (“Back”); upload EPUB-only copy; BookCard Open/Error status |
| Audit short-term (Silo 2b) | Done | Note modal (in-app); touch targets ≥44px on card actions, nav, toolbar; useReducedMotion in Feed (Virtuoso followOutput); theme selector in Settings; BookCard Retry + Remove on error; Error boundary Retry + Go to Library |
| Audit medium-term (Silo 2c) | Done | Onboarding wizard (first visit); Feed Refresh + refetch on book-ready; reader serif typography (Literata, Merriweather, line-height 1.6); unsupported-file inline message |

### Not Implemented / Deferred

- **Shared-element transition** (card → reader): deferred
- **Extraction in Web Worker:** pipeline runs on main thread with yields
- **PDF annotations:** highlights persist (pageIndex, pdfHighlightAreas); sidebar lists and jump-to-page; Note/Bookmark for PDF deferred (highlight only for now)
- **PPTX:** Phase 7
- **TOC drawer, in-book search:** done (Phase 3 follow-up; EPUB TOC + search; PDF TOC from outline when present — getPdfOutline in lib/utils/pdf-outline.ts; PDF in-book search — searchPdf in lib/utils/pdf-search.ts)
- **AI enrichment, Topic mode, Study, Time Travel, Onboarding:** later phases

---

## Key Files

- **DB:** `lib/db/index.ts`
- **Storage:** `lib/utils/file-storage.ts`
- **Extraction:** `lib/extraction/epub-extractor.ts`, `pdf-extractor.ts`, `heuristic-scorer.ts`, `pipeline.ts`, `pipeline-pdf.ts`
- **Feed:** `lib/feed/discovery.ts`, `hooks/useInfiniteSnippets.ts`, `hooks/useLibraryCounts.ts`, `components/feed/FeedView.tsx`, `SnippetCard.tsx`
- **Reader:** `components/reader/EpubRenderer.tsx`, `PdfRenderer.tsx`, `SelectionToolbar.tsx`, `AnnotationSidebar.tsx`, `TocDrawer.tsx`, `SearchDrawer.tsx`, `app/reader/[bookId]/page.tsx`; `lib/utils/pdf-search.ts` (PDF search), `lib/utils/pdf-outline.ts` (PDF TOC); reader store (theme, fontSize). **Reader redesign:** [docs/READER_REDESIGN.md](READER_REDESIGN.md) — research (Foliate, KOReader, Yomu), root causes (themes, cover, selection), layout/“book feel” direction.
- **Annotations:** `lib/db/index.ts` (Annotation type, annotations table), `hooks/useSavedTodayCount.ts`
- **Library:** `app/library/page.tsx`, `components/library/BookCard.tsx`, `ProcessingIndicator.tsx`
- **Design:** `docs/DESIGN.md`
- **UI/UX audit:** `docs/UI_UX_AUDIT.md` — mistakes, corrections, gaps, priority order
- **Data flow / SOP:** `docs/DATA_FLOW.md` — upload → process → feed; IndexedDB as source of truth
- **Testing:** `docs/TESTING_WORKFLOW.md` — full human-simulation pass; flows A–I, findings table, link to BUGS.md. **Life cases:** [docs/LIFE_CASES.md](LIFE_CASES.md) — user journeys and acceptance criteria (easy to find? easy to remove? saved?). **Coverage:** [docs/TEST_COVERAGE.md](TEST_COVERAGE.md) — test-to-life-case matrix. **Automated:** Vitest (47 tests: BookCard, BookGrid, Library page, SelectionToolbar, reader-store, AnnotationSidebar); Playwright E2E (navigation, reader chrome when SCROLLWISE_TEST_BOOK_ID set). `npm run test`; `npm run test:e2e` (run `npx playwright install chromium` once).

---

## How to Run

```bash
cd scrollwise   # or your clone path
npm install
npm run dev
```

Open http://localhost:3000. With no books, app redirects to Library.
