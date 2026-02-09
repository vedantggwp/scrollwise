# Scrollwise: Test Coverage vs Life Cases

**Purpose:** Map every automated test to the life cases in [LIFE_CASES.md](LIFE_CASES.md). Compare *what is tested* to *what should happen* so gaps are visible.

**Run tests:** `npm run test` (Vitest, 47 unit/component tests). `npm run test:e2e` (Playwright; requires `npx playwright install chromium` once). For reader E2E with a real book, set `SCROLLWISE_TEST_BOOK_ID` to a book id from your DB.

---

## Life case → Test matrix

| Life case | Intended behaviour | Vitest | E2E | Notes |
|-----------|-------------------|--------|-----|------|
| **1. Highlight** | Select text → toolbar → Highlight / Remove highlight; no duplicate; saved to DB; sidebar list | SelectionToolbar: Highlight vs Remove highlight; touch targets; Add note disabled when hasHighlight | — | Selection *inside* epub.js iframe not automated (manual or frame + selectText in Playwright). Persist/re-apply tested via EpubRenderer logic (not isolated). |
| **2. Note** | Add note modal; no duplicate; Remove clears note | SelectionToolbar: Add note click; disabled when hasHighlight | — | Note modal in EpubRenderer; full flow not isolated. |
| **3. Bookmark** | Bookmark / Remove bookmark; saved; sidebar; jump | SelectionToolbar: Bookmark vs Remove bookmark; click handlers | — | Jump (displayCfi) in reader; not isolated. |
| **4. Reader themes & font** | Theme and font in header; apply immediately; persist | reader-store: setReaderTheme (Light/Dark/Sepia/Midnight); setFontSize + clamp | reader.spec: theme buttons present and clickable (when BOOK_ID set) | Persist via zustand; E2E asserts theme chips and aria-pressed. |
| **5. TOC & search** | TOC drawer; Search drawer; jump | — | reader.spec: TOC opens (when BOOK_ID set) | Search E2E not added yet. |
| **6. Feed → Read → Back** | Feed cards; Read opens at loc; Back restores scroll; location persisted | — | navigation.spec: Feed/Library/Settings nav | Full loop (card → reader → back) needs seeded DB or manual. |
| **7. Library** | Upload; error Retry/Remove; Remove confirm | BookCard: Open, Retry, Remove, menu; Library page: empty, grid | navigation.spec: Library loads | Upload (file drop) not automated. |
| **8. Annotations sidebar** | List from DB; tap → jump; Clear all with confirm | AnnotationSidebar: list from mock DB; onSelectCfi; Clear all confirm/cancel; empty state | reader.spec: sidebar opens, list or empty | DB mocked in Vitest; E2E opens sidebar. |
| **9. Settings theme** | Light/Dark/System; app theme | — | navigation.spec: Settings has theme controls | |
| **10. A11y** | aria-labels; touch targets ≥44px | SelectionToolbar: min-h-[44px]; aria-label assertions in BookCard, AnnotationSidebar | navigation.spec: aria-current on nav | |

---

## Test files and what they cover

### Vitest (unit / component)

| File | Life cases | Count |
|------|------------|-------|
| `tests/components/reader/SelectionToolbar.test.tsx` | 1 Highlight (toolbar, Remove highlight, touch targets), 2 Note (Add note, disabled when highlighted), 3 Bookmark (Bookmark, Remove bookmark) | 11 |
| `tests/stores/reader-store.test.ts` | 4 Reader themes & font (theme, fontSize, clamp) | 3 |
| `tests/components/reader/AnnotationSidebar.test.tsx` | 8 Annotations sidebar (list from DB, empty state, onSelectCfi, Clear all confirm/cancel) | 10 |
| `tests/components/library/BookCard.test.tsx` | 7 Library (Open, error Retry/Remove, grid menu) | 12 |
| `tests/components/library/BookGrid.test.tsx` | 7 Library (grid layout, callbacks) | 6 |
| `tests/app/library/page.test.tsx` | 7 Library (empty, grid, summary) | 5 |

**Total Vitest:** 47 tests.

### Playwright (E2E)

| File | Life cases | Notes |
|------|------------|-------|
| `e2e/navigation.spec.ts` | 6 Feed/Library/Settings nav; 9 Settings; 10 A11y (nav aria-current) | No book id required. |
| `e2e/reader.spec.ts` | 4 Reader themes (buttons); 5 TOC; 8 Annotations sidebar open; reader error (invalid id) | Reader chrome tests skip when `SCROLLWISE_TEST_BOOK_ID` not set. |

**E2E with real book:** Set `SCROLLWISE_TEST_BOOK_ID=<uuid>` to run reader theme, TOC, and Annotations sidebar tests.

---

## Gaps (not yet automated)

- **Selection in reader iframe:** Toolbar appears on selection (EPUB/PDF). Requires Playwright frame locator + text selection in iframe; or manual.
- **Highlight persist and re-apply:** DB add + loadStoredAnnotations + visual re-apply. Covered by EpubRenderer integration; no isolated test.
- **Full loop:** Feed card → Read → reader at CFI → Back → scroll restored. Requires seeded IndexedDB or fixture.
- **File upload:** Library drop or file input. Playwright can set input files; not added yet.
- **Search drawer:** Open, type, results, jump. E2E doable; not added yet.
- **Reduced motion:** useReducedMotion in Feed; manual or a11y test.

---

## How to add tests for a life case

1. Open [LIFE_CASES.md](LIFE_CASES.md) and find the life case (e.g. "Highlight").
2. Check **Success criteria** and **Easy to find? Easy to remove? Saved?**.
3. Add or extend:
   - **Vitest:** Component or store test with assertions that match those criteria (e.g. "Remove highlight button when hasHighlight").
   - **E2E:** Playwright test that mimics user (e.g. open reader, click theme, assert aria-pressed).
4. Update this matrix and the test file list above.
