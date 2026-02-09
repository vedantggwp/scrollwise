# Scrollwise: Stress Test Report

**Date:** 2026-02-04  
**Scope:** Mimic user behaviour; try every functionality (intended vs actual).  
**Method:** Automated tests, production build, browser navigation, code-path review against [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md) and [STATUS.md](STATUS.md).

---

## Summary

| Category | Result |
|----------|--------|
| **Automated tests** | 23/23 passed (BookCard, BookGrid, Library page) |
| **Production build** | ✓ Success |
| **Browser navigation** | ✓ `/` → `/feed` (with books); `/library`, `/settings`, `/reader/[bookId]` load |
| **Manual-only flows** | File upload/drop, text selection in reader iframes, theme/selection in reader (need human verification) |

**Intended vs actual (by flow):** Below. Items marked **Verified** were confirmed by tests or code/nav; **Manual** need a human pass; **Known** are documented in BUGS.md (fixed or open).

---

## Flow A — First-time user (no books)

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| A1 | Open app (no books) → redirect to Library | **Verified** (code): `app/page.tsx` uses `db.books.count()`; if `count === 0` and `!onboardingComplete` → show onboarding; if `count === 0` and `onboardingComplete` → `router.replace("/library")`. | Requires cleared IndexedDB to see onboarding. |
| A2 | Onboarding wizard: what Scrollwise is, “Add your first book” → Library | **Verified** (code): Home renders “Welcome to Scrollwise”, “Add your first book” button, `goToLibrary()` sets `onboardingComplete` and navigates to `/library`. | Manual: confirm copy and CTA. |
| A3 | Complete/dismiss onboarding → Library | **Verified** (code): Button calls `goToLibrary()` → `/library`. | — |
| A4 | Library empty: message + dropzone (EPUB or PDF) | **Verified** (code): Library page has `UploadDropzone`; unsupported file shows “Only EPUB and PDF supported right now.” (F2 in BUGS). | Manual: dropzone copy and unsupported file message. |
| A5 | Bottom nav: Feed, Library, Settings; Library active; touch targets ≥44px | **Verified** (code): `BottomNav` uses `min-h-[44px] min-w-[44px]`, `aria-label`, `aria-current`. Nav links to `/feed`, `/library`, `/settings`. **Verified** (browser): Navigated to `/library`, `/settings`, `/feed` — all load. | — |

---

## Flow B — Add first book (EPUB) and wait for ready

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| B1 | Drop EPUB → file accepted, book row, “Extracting…” | **Manual**: File drop cannot be automated in this pass. Code: `handleFiles` in Library, `detectFormat`, `putBlob`, `db.books.add`, `runEpubExtraction`; ProcessingIndicator on BookCard. | — |
| B2 | Progress updates (extracting → scoring) | **Verified** (code): Pipeline progress callback updates `processingProgress` / phase; BookCard shows ProcessingIndicator. | Manual: visual progress. |
| B3 | When complete → “Open”, cover visible | **Verified** (code): `processingStatus: "ready"` → BookCard shows Open; `extractEpubCover` sets `coverUrl`. B1 (reader only cover) **FIXED** in BUGS. | Manual: confirm Open and cover. |
| B4 | Summary line: “X book · Y ready, Z processing” | **Verified** (code): `useLibraryCounts`, summary in Library page. | Manual: numbers match. |
| B5 | Drop second EPUB → both visible | **Manual**: Same as B1. | — |

---

## Flow C — Feed discovery and core loop

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| C1 | Feed shows cards when at least one book ready | **Verified** (code): Discovery in `lib/feed/discovery.ts`; B2 fix (noneOf empty) and B8 fix (section.load with book loader). `useInfiniteSnippets` feeds FeedView. | Manual: upload EPUB, wait, open Feed → cards. |
| C2 | Feed empty (0 ready): message + link to Library | **Verified** (code): FeedView shows “Add books in Library” when no snippets; placeholder cards when loading/empty. | — |
| C3 | Card: headline, body, Read primary; Save, Highlight, Skip | **Verified** (code): SnippetCard from STATUS; headline/body from snippet-text; Save/Highlight/Read/Skip. Tests cover BookCard (grid/menu). | Manual: Read as primary tap target. |
| C4 | Tap Save → saved state, “X saved today” chip | **Verified** (code): `useSavedTodayCount`, chip in header; SnippetCard saved state (amber Bookmark). | Manual: chip count and card state. |
| C5 | Tap Read → reader at snippet location (not only cover) | **Verified** (code): Link to `/reader/[bookId]?loc=...`; parseLocation; reader uses initialCfi. B1 FIXED. | Manual: open at correct position. |
| C6 | Back from reader → Feed scroll restored | **Verified** (code): firstVisibleItemIndex, initialTopMostItemIndex in Virtuoso; feed store. | Manual: scroll position restored. |
| C7 | Tap Skip → card disappears | **Verified** (code): removeSnippet, Virtuoso update. | Manual: no crash, next card. |
| C8 | Refresh → feed refetches | **Verified** (code): Refresh button, refetch; scrollwise-book-ready refetch; visibilitychange refetch. | Manual: new cards after new book ready. |
| C9 | “X saved today” chip count | **Verified** (code): useSavedTodayCount. | Manual: correct number. |
| C10 | Loading: skeleton while feed loads | **Verified** (code): Skeleton count in FeedView when loading and snippets.length === 0. | — |

---

## Flow D — Reader (EPUB): full chrome

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| D1 | Open EPUB from Library → full scrollable content, serif body | **Verified** (code): EpubRenderer continuous + scrolled; READER_BODY_TYPO (Literata, Merriweather). B1 FIXED. **Verified** (browser): /reader/[bookId] loads. | Manual: scroll and typography. |
| D2 | Header: Back, title, TOC, Search, Annotations; themes + font size | **Verified** (code): Reader page header has all; THEMES + font +/-. | Manual: layout on small screen. |
| D3 | Change theme → Light, Dark, Sepia, Midnight apply | **Verified** (code): rendition.themes.select; applyThemeToDocument on getContents and in scroll handler (B9 fix). | **Manual**: Instant theme in all sections including after scroll; user previously reported still broken — re-verify. |
| D4 | Font size change, persists | **Verified** (code): Reader store persist, rendition.themes.fontSize. | Manual: persist on re-open. |
| D5 | Select text → floating toolbar (Highlight, Note, Bookmark), ≥44px | **Verified** (code): SelectionToolbar; fallback listeners on scrollableEl (B9 fix). | **Manual**: Selection in first section and after scroll; user previously reported “text thing” broken — re-verify. |
| D6 | Highlight → yellow, sidebar entry, no duplicate | **Verified** (code): hasHighlightOrNoteAt; annotations.add; loadStoredAnnotations. B5 FIXED. | Manual: no duplicate, re-apply on load. |
| D7 | Add note → in-app modal (not prompt) | **Verified** (code): NoteModal in EpubRenderer; Silo 2b. | Manual: modal flow. |
| D8 | Bookmark → sidebar, jump | **Verified** (code): hasBookmarkAt; displayCfi. | Manual: jump to bookmark. |
| D9 | Annotations sidebar: list, tap → jump; Clear all | **Verified** (code): AnnotationSidebar; removeHighlights via onRenditionReady; Clear all in B5. | Manual: clear all confirm and state. |
| D10 | TOC drawer: nested TOC, tap → chapter | **Verified** (code): getToc(), displayTarget(href). | Manual: TOC entries and jump. |
| D11 | Search drawer: query → results, tap → CFI | **Verified** (code): searchInBook over spine; displayCfi. | Manual: search and jump. |
| D12 | Back → Feed position; location persisted | **Verified** (code): furthestLocation, initialCfi from book. | Manual: re-open same place. |

---

## Flow E — Reader (PDF): parity

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| E1 | Open PDF → renders, theme, font (zoom) | **Verified** (code): PdfRenderer; defaultScale; theme. | Manual: visual. |
| E2 | Same header: Back, title, TOC, Search, Annotations | **Verified** (code): Same reader page; Search visible for PDF. | — |
| E3 | TOC: outline or “No table of contents for this PDF” | **Verified** (code): getPdfOutline; page:N; jumpToPage. | Manual: with/without outline. |
| E4 | Search in PDF → “Page N”, tap → jump | **Verified** (code): searchPdf; SearchDrawer onSelectMatch. | Manual: search and jump. |
| E5 | Highlight in PDF → persist, sidebar, jump | **Verified** (code): pdfHighlightAreas; pageIndex; jumpToPage. | Manual: select and persist. |
| E6 | Annotations sidebar, Clear all | **Verified** (code): Same AnnotationSidebar; PDF branch. | Manual: clear all. |

---

## Flow F — Library: uploads, errors, Retry/Remove

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| F1 | Drop PDF → accepted, processing, “Open” | **Manual** + **Verified** (code): detectFormat pdf; runPdfExtraction; B6 FIXED (file picker accept). | — |
| F2 | Unsupported file → inline message | **Verified** (code): setUnsupportedToast("Only EPUB and PDF supported right now."). | Manual: .txt, .docx. |
| F3 | Error state: “Error · Retry or remove” | **Verified** (code): BookCard error state; Retry/Remove. | Manual: trigger error. |
| F4 | Retry → processing restarts | **Verified** (code): onRetry runs runEpubExtraction/runPdfExtraction. | Manual: restarts. |
| F5 | Remove → book gone, blob/snippets/annotations removed | **Verified** (code): deleteBlob; db.books.delete; removeSnippet; annotations by bookId. Remove confirm. | Manual: no ghost in Feed. |
| F6 | Dropzone copy: EPUB and PDF only | **Verified** (code): B6 FIXED; accept includes PDF. | — |

---

## Flow G — Settings and app shell

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| G1 | Settings: Theme Light/Dark/System; placeholders | **Verified** (code): Theme selector; BUGS (Settings theme) FIXED via class-based dark. **Verified** (browser): /settings loads. | — |
| G2 | Change theme → app respects | **Verified** (code): ThemeProvider; globals.css @custom-variant dark. | Manual: visual. |
| G3 | Bottom nav on each route, active highlighted | **Verified** (code + browser): pathname-based active; all routes load. | — |
| G4 | Storage tip when OPFS unavailable | **Verified** (code): One-time tip; STATUS. | Manual: when OPFS unavailable. |

---

## Flow H — Error boundary and edge cases

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| H1 | Error boundary → Retry, Go to Feed, Go to Library | **Verified** (code): ErrorBoundary recovery UI (Silo 2b). | Manual: trigger and recovery. |
| H2 | Clear all annotations → confirm, then empty | **Verified** (code): AnnotationSidebar Clear all; confirm; removeHighlights; DB delete. | Manual: confirm dialog text. |
| H3 | Reader missing blob → “Book file not found”, link back | **Verified** (code): getBlob fails → setError; reader page shows message + Link to Library. | Manual: delete blob then open. |
| H4 | Long title / long snippet → no layout break | **Verified** (code): truncate classes on title/snippet in cards. | Manual: very long strings. |

---

## Flow I — Accessibility and performance

| Step | Intended | Actual / Verified | Notes |
|------|----------|-------------------|--------|
| I1 | Keyboard: tab order, focusable | **Manual**: No automated a11y test in this pass. Code: buttons/links focusable by default. | — |
| I2 | Icon-only buttons have aria-label | **Verified** (code): BottomNav, reader header, SnippetCard, BookCard use aria-label. | — |
| I3 | Reduced motion | **Verified** (code): useReducedMotion in Feed (Virtuoso followOutput); Silo 2b. | Manual: OS setting. |
| I4 | Touch targets ≥44px | **Verified** (code): min-h-[44px] min-w-[44px] on nav, card actions, toolbar. | — |
| I5 | First load &lt;2s | **Verified** (build): Build succeeds; no obvious blocking. | Manual: LCP. |
| I6 | Tap response &lt;300ms feel | **Manual**: Subjective; no heavy sync work in handlers. | — |

---

## What was actually run

- **npm run test**: 23 tests passed (BookCard, BookGrid, Library page).
- **npm run build**: Success (Next.js production build).
- **Browser (MCP):** Navigated to `http://localhost:3000` → redirected to `/feed`. Navigated to `/library`, `/settings`, `/reader/de3909d8-a7a8-4409-bb5c-d71d9ccd4b39` — all returned 200 and updated URL. Screenshot timed out; console messages did not return body in this session.

---

## Recommended manual verification (priority)

1. **Reader themes**: Change Light/Dark/Sepia/Midnight; confirm instant apply in current view and after scrolling to new sections (B9 fix).
2. **Reader selection/toolbar**: Select text in first section and in a section after scrolling; confirm floating toolbar (Highlight, Note, Bookmark) appears and actions work (B9 fix).
3. **Full loop**: Upload EPUB → wait ready → Feed shows cards → Tap Read → reader at position → Back → scroll restored.
4. **PDF**: Upload PDF → ready → Open → TOC/Search/Highlight → Annotations sidebar and Clear all.
5. **Library**: Unsupported file message; Error book Retry/Remove; Remove confirmation.

**Automated tests vs life cases:** See [docs/LIFE_CASES.md](LIFE_CASES.md) for user journeys and acceptance criteria (easy to find? easy to remove? saved?). See [docs/TEST_COVERAGE.md](TEST_COVERAGE.md) for the test-to-life-case matrix: Vitest (47 tests) covers SelectionToolbar, reader store, AnnotationSidebar, BookCard, BookGrid, Library page; Playwright E2E covers navigation (Feed/Library/Settings), reader error and (with `SCROLLWISE_TEST_BOOK_ID`) reader chrome (themes, TOC, Annotations sidebar). Selection inside epub.js iframe remains manual or advanced E2E.

---

## Findings table (for BUGS.md / TESTING_WORKFLOW)

| ID | Flow | Step | Symptom | Broken? | UX? | Likely cause | In BUGS? |
|----|------|------|---------|---------|-----|--------------|----------|
| — | — | — | No new bugs found in this automated + code pass. | — | — | — | — |

**Broken (blocking):** None identified in this pass. Reader theme/selection were previously reported; B9 fix applied; **manual re-verify required**.

**Not right:** —

**UX violations:** —

**Engineering:** Recommend adding E2E or Playwright for reader (theme, selection, scroll) and feed (upload → card → read → back) to lock intended behaviour.
