# Scrollwise: Full Testing Workflow

**Purpose:** Simulate a human using every feature, notice what’s broken, what’s off from the intended UI/UX, and what engineering failures caused it. Use this to run a full pass and capture bugs in one place.

**Related:** [DESIGN.md](DESIGN.md) (spec), [UI_UX_AUDIT.md](UI_UX_AUDIT.md) (gaps), [BUGS.md](BUGS.md) (log issues), [STATUS.md](STATUS.md) (what’s implemented).

---

## How to use this workflow

1. **Run the app:** `npm run dev`, open http://localhost:3000 (or your dev URL).
2. **Optional fresh state:** DevTools → Application → Storage → “Clear site data” (or IndexedDB → delete ScrollwiseDB) to test first-time and empty states.
3. **Go flow by flow.** For each step:
   - Do the **Action**.
   - Check **Observe** (expected vs actual).
   - If something is wrong: note **DESIGN/UX** (which principle or spec it breaks) and **Engineering** (likely code/data cause).
   - In the **Findings** section at the end, add a row and optionally add to [BUGS.md](BUGS.md).
4. **After the pass:** Fill the summary lists (What’s broken, Not right, Not according to UI/UX, Engineering failures) so you have a single place to fix from.

**Conventions:**
- ☐ = unchecked, ☑ = passed, ✗ = failed / note in findings.
- “Primary action” = main thing on the screen (DESIGN: one primary action per context).

---

## Prerequisites

| Item | Check |
|------|--------|
| Dev server runs | `npm run dev` |
| At least one test EPUB | Small file, valid EPUB3, with a nav/TOC is ideal |
| Optional: one test PDF | For PDF reader and feed |
| Optional: clear IndexedDB | For Flow A (first-time) and empty Feed |

---

## Flow A — First-time user (no books)

**Goal:** New user lands, sees onboarding, is guided to add a book.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| A1 | Open app (no books in DB) | Redirect to Library (not Feed). No white screen. | Home redirect: no books → Library. | Wrong redirect logic in `app/page.tsx` or app store. | ☐ |
| A2 | See onboarding | Short wizard: what Scrollwise is, “Add your first book” (or similar) → CTA to Library. | Onboarding on first visit (Silo 2c). | onboardingComplete not set, or wizard not shown when 0 books. | ☐ |
| A3 | Complete / dismiss onboarding | Goes to Library. No dead end. | State is visible; no dead ends. | State not persisted or next step missing. | ☐ |
| A4 | Library empty state | Clear message + dropzone: “Drop EPUB here” (or “EPUB or PDF”). No raw “0 books”. | DESIGN copy; upload only promised formats. | Wrong copy in UploadDropzone / Library. | ☐ |
| A5 | Bottom nav | Feed, Library, Settings. Library is active. Touch targets ≥44px. | A11y; touch targets. | Nav items too small or wrong active state. | ☐ |

**Notes:** _______________________________________________

---

## Flow B — Add first book (EPUB) and wait for ready

**Goal:** Upload works, processing is visible, book becomes “Open”.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| B1 | Drop an EPUB on Library | File accepted. Book row appears. Processing indicator (e.g. “Extracting…”) visible. | State is always visible (loading). | Upload handler not firing; blob not stored; book not added to DB. | ☐ |
| B2 | Wait for processing | Progress updates (extracting → scoring or similar). No indefinite “Loading…” with no change. | Processing UI (ProcessingIndicator). | Pipeline not writing progress; UI not reading DB or store. | ☐ |
| B3 | When complete | Book shows “Open” (not “ready”). Cover visible. No “Error” unless extraction failed. | BookCard: ready → “Open”. | processingStatus not set to "ready"; copy still “ready”. | ☐ |
| B4 | Summary line | e.g. “1 book · 1 ready, 0 processing”. Numbers match. | Library summary (DATA_FLOW). | Counts from DB wrong or not refreshed. | ☐ |
| B5 | Drop a second EPUB | Both books visible. No duplicate rows for same file if that’s intended. | — | Idempotency / dedup if we have it. | ☐ |

**Notes:** _______________________________________________

---

## Flow C — Feed discovery and core loop

**Goal:** Feed shows cards; Save, Read, Skip work; back from reader restores scroll.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| C1 | Go to Feed (after at least one book ready) | At least one snippet card. No empty “No snippets yet” if book is ready and has snippets. | B2 fix: feed populated after processing. | Discovery query; snippets not in DB; score threshold too high. | ☐ |
| C2 | Feed empty (0 ready books) | Message explains: e.g. add books or X books, Y ready. Link to Library. | Empty state copy (DESIGN, UI_UX_AUDIT). | Empty state copy or logic wrong. | ☐ |
| C3 | Card content | Headline, body preview, book title/source. Read is primary (tap body?). Save, Highlight, Read, Skip visible. | Feed scannable; one primary action (Read). | Snippet data missing; card layout/copy. | ☐ |
| C4 | Tap Save | Card shows saved state (e.g. filled Bookmark, “Saved”). “X saved today” chip updates if in header. | Saved state on card (quick win). | interactionType/savedAt not updated or UI not reflecting. | ☐ |
| C5 | Tap Read | Reader opens at snippet location (EPUB: correct position; PDF: correct page). Not only cover. | Card → reader; B1 fix. | loc param wrong; reader not using loc; EPUB only cover. | ☐ |
| C6 | In reader, tap Back | Returns to Feed. Scroll position restored (same card visible). | Back returns to same place (DESIGN). | firstVisibleItemIndex / initialTopMostItemIndex or remount. | ☐ |
| C7 | Tap Skip | Card disappears; next card visible. No crash. Focus / a11y: next card or live region (optional). | Skip is soft; next card. | removeSnippet; Virtuoso update; focus not moved (UI_UX_AUDIT). | ☐ |
| C8 | Refresh (if button exists) | Feed refetches; new snippets from newly ready books appear. | Feed refresh (Silo 2c). | Refetch not triggered or discovery not re-run. | ☐ |
| C9 | “X saved today” chip | Shows count when > 0; correct number; aria-label. | Chip in header (STATUS). | useSavedTodayCount or display. | ☐ |
| C10 | Loading state | Skeleton or loading indicator while feed loads; no long blank. | State visible (skeletons). | useInfiniteSnippets loading; skeleton shape vs card (UI_UX_AUDIT). | ☐ |

**Notes:** _______________________________________________

---

## Flow D — Reader (EPUB): full chrome

**Goal:** Reader is readable; themes, font, selection, annotations, TOC, search all work.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| D1 | Open EPUB from Library | Full scrollable content (not only cover). Serif body (Literata, Merriweather, etc.), line-height 1.6. | B1 fix; reader typography (Silo 2c). | Container size; rendition config; fonts not applied. | ☐ |
| D2 | Header | Back, title, TOC (list), Search, Annotations (highlighter). Themes + font size controls. Not cramped. | Reader chrome; format-agnostic (DESIGN). | Missing buttons; layout wrap on small screen (UI_UX_AUDIT). | ☐ |
| D3 | Change theme | Light, Dark, Sepia, Midnight apply. No flash of wrong theme. | Reader themes. | reader store; rendition.themes.select. | ☐ |
| D4 | Change font size | Size changes; persists on next open. Min/max respected. | Font size (reader store). | Store not persisted or not applied to rendition. | ☐ |
| D5 | Select text | Floating toolbar appears: Highlight, Note, Bookmark. Touch targets ≥44px. | Selection toolbar (DESIGN). | epub.js selected event; toolbar position (UI_UX_AUDIT: can cover selection). | ☐ |
| D6 | Highlight | Selection gets yellow highlight; sidebar shows entry. No duplicate for same range. | Persist; no duplicate (B5). | annotations.add; duplicate check; re-apply on load. | ☐ |
| D7 | Add note | In-app modal (not window.prompt). Save adds note; sidebar shows it. | Note modal (Silo 2b). | Modal component; noteBody stored. | ☐ |
| D8 | Bookmark | Sidebar shows bookmark; jump works. | Bookmark type. | Same as highlight/note flow. | ☐ |
| D9 | Open Annotations sidebar | List by book; tap entry → jump to location. Clear all: confirms, removes all, highlights disappear. | Sidebar; clear all (B5). | displayCfi; removeHighlights; remount after clear. | ☐ |
| D10 | Open TOC drawer | Left drawer. Nested TOC from book. Tap entry → navigates to chapter. | TOC (Phase 3 follow-up). | getToc(); displayTarget(href); navigation.toc. | ☐ |
| D11 | Open Search drawer | Type query → Search. Results with excerpt; tap → jump to CFI. No crash on empty or long search. | In-book search (EPUB). | searchInBook; spine load/search; displayCfi. | ☐ |
| D12 | Back from reader | Same Feed position (Flow C6). Location persisted (re-open book → same place). | Back; persist location. | furthestLocation; initialCfi. | ☐ |

**Notes:** _______________________________________________

---

## Flow E — Reader (PDF): parity and limits

**Goal:** Same chrome as EPUB; highlights, sidebar, TOC, and search all work for PDF.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| E1 | Open PDF from Library | PDF renders; page navigation works. Theme and font (zoom) apply. | Format-agnostic reader. | PdfRenderer; defaultScale; theme. | ☐ |
| E2 | Header | Same as EPUB: Back, title, TOC, **Search**, Annotations. Search visible for PDF. | Reader parity: Search for PDF. | Search button shown; searchPdf wired. | ☐ |
| E3 | TOC for PDF | TOC drawer opens. If PDF has outline: nested entries; tap → jump to page. If no outline: “No table of contents for this PDF”. No crash. | PDF TOC from outline when present. | getPdfOutline; page:N href; jumpToPage. | ☐ |
| E4 | Search in PDF | Open Search drawer; type query → Search. Results show “Page N” + excerpt; tap → jump to that page. No crash on empty. | PDF in-book search. | searchPdf; SearchDrawer onSelectMatch. | ☐ |
| E5 | Highlight in PDF | Select text (if supported); highlight persists; sidebar shows; tap → jump to page. | PDF highlights (STATUS). | pdfHighlightAreas; pageIndex; jumpToPage. | ☐ |
| E6 | Annotations sidebar | List PDF highlights; tap → jump to page. Clear all works. | Same chrome. | PDF branch in sidebar; clear. | ☐ |

**Notes:** _______________________________________________

---

## Flow F — Library: uploads, errors, Retry/Remove

**Goal:** PDF and EPUB upload; unsupported file feedback; error state and recovery.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| F1 | Drop PDF | Accepted; processing; when ready, “Open”. | PDF support (Silo 3). | runPdfExtraction; format detection. | ☐ |
| F2 | Drop unsupported (e.g. .txt, .docx) | Inline message (e.g. “Only EPUB supported right now” or “EPUB and PDF only”). Auto-dismiss or clear. No silent fail. | Unsupported file feedback (Silo 2c). | File type check; message state. | ☐ |
| F3 | Book in error state | “Error · Retry or remove”. Retry and Remove buttons. | BookCard error (Silo 2b). | processingStatus "error"; onRetry/onRemove. | ☐ |
| F4 | Retry | Processing restarts (extracting…). Eventually ready or error again. | Retry re-runs extraction. | runEpubExtraction/runPdfExtraction called again. | ☐ |
| F5 | Remove | Book disappears from grid. Blob and snippets removed (no ghost in Feed). | Remove deletes book + blob + snippets + annotations. | DB + file storage cleanup. | ☐ |
| F6 | Upload dropzone copy | Says EPUB (and PDF) only; no PPTX or other unsupported promised. | Copy consistency (UI_UX_AUDIT). | UploadDropzone text. | ☐ |

**Notes:** _______________________________________________

---

## Flow G — Settings and app shell

**Goal:** Theme control, placeholders, nav and shell consistent.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| G1 | Open Settings | Theme: Light / Dark / System. Other sections placeholder (AI, feed tuning later). | Theme in Settings (Silo 2b). | Theme selector; app store theme. | ☐ |
| G2 | Change theme | App (and reader if open) respect system/light/dark. No flash. | ThemeProvider; reader theme can differ (reader has its own). | — | ☐ |
| G3 | Bottom nav on each route | Feed, Library, Settings. Active tab highlighted. No 404 on direct URL. | Nav; URLs (DESIGN). | Route match; active state. | ☐ |
| G4 | Storage tip (if OPFS unavailable) | One-time tip; dismissible. Not annoying. | Storage tip (STATUS). | Condition; localStorage/sessionStorage for “seen”. | ☐ |

**Notes:** _______________________________________________

---

## Flow H — Error boundary and edge cases

**Goal:** No white screen; recovery options; confirmations where needed.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| H1 | Trigger error boundary (e.g. throw in a component) | Recovery UI: message + Retry, Go to Feed, Go to Library (per UI_UX_AUDIT). No blank screen. | Error boundary (Silo 2b). | ErrorBoundary render; reset state. | ☐ |
| H2 | Clear all annotations | Confirm dialog (“Remove all highlights…”). After confirm: list empty, highlights gone. | Reversibility; confirm (DESIGN). | window.confirm or in-app confirm. | ☐ |
| H3 | Reader with missing blob | Graceful message (e.g. “Book file not found”); link back to Library. | State visible; no dead end. | getBlob fails; error state in reader page. | ☐ |
| H4 | Very long title / long snippet | No layout break; truncation or wrap per DESIGN. | Edge content (DESIGN). | CSS; line-clamp. | ☐ |

**Notes:** _______________________________________________

---

## Flow I — Accessibility and performance (checklist)

**Goal:** DESIGN a11y and performance expectations; no regressions.

| Step | Action | Observe | DESIGN/UX | Engineering red flags | Log |
|------|--------|--------|----------|-----------------------|-----|
| I1 | Keyboard (if applicable) | Tab order makes sense. Buttons and links focusable. | Focus order (DESIGN). | tabIndex; focus management. | ☐ |
| I2 | Icon-only buttons | aria-label present (Back, Save, Highlight, Read, Skip, TOC, Search, Annotations, etc.). | A11y handoff (DESIGN). | Missing aria-label. | ☐ |
| I3 | Reduced motion | Enable “Reduce motion” in OS. Feed scroll (e.g. Virtuoso) doesn’t smooth-scroll; transitions short or instant. | useReducedMotion (Silo 2b). | followOutput; CSS transitions. | ☐ |
| I4 | Touch targets | Buttons and card actions ≥44px (min height/width). | DESIGN; touch targets. | min-h-[44px] min-w-[44px] on actions. | ☐ |
| I5 | First load | No long white screen. Feed or Library appears in &lt;2s (subjective). | Performance budget (DESIGN). | LCP; blocking work. | ☐ |
| I6 | Tap response | Buttons and cards respond quickly (&lt;300ms feel). No obvious lag. | Tap &lt;300ms (DESIGN). | Heavy sync work on tap. | ☐ |

**Notes:** _______________________________________________

---

## Findings (fill as you run)

Use this table to record every issue. Then add to [BUGS.md](BUGS.md) with symptom, likely area, suggested checks, repro.

**Latest stress test:** See [docs/STRESS_TEST_REPORT.md](STRESS_TEST_REPORT.md) (2026-02-04). Automated tests 23/23 pass; build succeeds; browser nav verified (/feed, /library, /settings, /reader/[bookId]). Reader theme and selection (B9 fix) need **manual re-verify**. No new bugs logged in that pass.

| ID | Flow | Step | Symptom (what you saw) | Broken? | UX violation? | Likely cause | In BUGS.md? |
|----|------|------|------------------------|---------|--------------|-------------|-------------|
| 1  |     |      |                        |         |              |             | ☐ |
| 2  |     |      |                        |         |              |             | ☐ |
| 3  |     |      |                        |         |              |             | ☐ |
| 4  |     |      |                        |         |              |             | ☐ |
| 5  |     |      |                        |         |              |             | ☐ |
| …  |     |      |                        |         |              |             | ☐ |

**Broken (blocking or wrong behavior):**  
- (None from 2026-02-04 stress test; reader theme/selection need manual re-check.)

**Not right (works but wrong or confusing):**  
- 

**Not according to UI/UX (DESIGN / UI_UX_AUDIT):**  
- 

**Engineering failures (code/data/architecture to fix):**  
- Consider E2E (e.g. Playwright) for reader theme/selection and feed → read → back loop. 

---

## After the pass: what to fix first

1. **Broken** — Fix before release (data wrong, crash, core flow fails).
2. **Not right** — Fix soon (misleading copy, wrong state, missing feedback).
3. **UX violations** — Triage with DESIGN.md and UI_UX_AUDIT.md; fix by priority (quick wins → short-term → medium-term).
4. **Engineering failures** — Refactors or tests to prevent recurrence; schedule with the above.

When you add a bug to BUGS.md, use the template there (Symptom, Likely area, Suggested checks, Repro). Reference this workflow (e.g. “Found in TESTING_WORKFLOW Flow C, step C1”).
