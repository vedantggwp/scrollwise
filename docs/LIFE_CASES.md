# Scrollwise: Life Cases (User Journeys & Acceptance Criteria)

**Purpose:** Define real-world user journeys and success criteria so we can test every feature and compare *what should happen* to *what actually happens*. Use this to drive automated tests and manual QA.

**Critical questions per feature:** Is the option easy to find? Is it easy to undo/remove? Is it saved properly? Does it behave the same across formats (EPUB vs PDF) where intended?

---

## 1. Highlight (EPUB & PDF)

### Life case: "I want to highlight a word or passage"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User selects text in the book | Selection is captured (epub.js "selected" or fallback mouseup/contextmenu on iframe). | Selection is not lost; no need to long-press or use obscure gesture. | — | — | — |
| 2. Toolbar appears | Floating toolbar appears near selection with **Highlight**, **Add note**, **Bookmark**. | Toolbar visible within ~300ms; not covered by browser UI; touch targets ≥44px. | **Yes** if toolbar appears immediately on selection. **No** if user must right-click or search. | — | — |
| 3. User taps **Highlight** | Selection is highlighted (yellow/theme-aware); annotation is written to DB; highlight is re-applied on next open. | Visual highlight appears; `db.annotations` has one row (type highlight, correct bookId, cfiRange, text). Re-open book → highlight still visible. | **Yes** if Highlight is the first or second button and clearly labeled (aria-label "Highlight"). | — | **Yes** if persisted and re-applied on load. |
| 4. User selects same range again and taps Highlight | No duplicate. Toolbar shows **Remove highlight** (or highlight is toggled off). | Only one annotation per range; no duplicate in sidebar. | — | **Yes** if "Remove highlight" is shown when selection already has a highlight and one tap removes it. | **Yes** if duplicate is prevented and DB stays consistent. |
| 5. User opens Annotations sidebar | List shows all highlights (and notes/bookmarks). Entry shows text excerpt. | Sidebar opens from header button; list sorted (e.g. newest first); tap entry → jumps to location and closes sidebar. | **Yes** if Annotations is in header and clearly labeled. | **Yes** if "Clear all" is available and confirms before removing. | **Yes** if list is read from DB and stays in sync. |

**Comparison checklist (automated / manual):**

- [ ] Selection triggers toolbar (EPUB: first section and after scroll; PDF: text selection).
- [ ] Toolbar shows Highlight and Remove highlight when applicable; no duplicate highlight for same range.
- [ ] Highlight persists to DB and re-appears on reload; sidebar list matches DB.
- [ ] Remove highlight (single) and Clear all (with confirm) work; sidebar and DB updated.

---

## 2. Note (EPUB only for now)

### Life case: "I want to add a note to a passage"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User selects text, toolbar appears | Same as Highlight. | — | — | — | — |
| 2. User taps **Add note** | In-app modal opens (no `window.prompt`). Placeholder e.g. "Add a note (optional)". | Modal is accessible (focus in input); Cancel and "Add note" buttons; touch targets ≥44px. | **Yes** if Add note is visible in same toolbar as Highlight. | — | — |
| 3. User types and submits | Note is saved (type "note", noteBody set); same passage gets a visual highlight; modal closes; selection clears. | One annotation (type note); highlight visual; sidebar shows note with body. | — | **Yes** if Clear all removes notes and highlight. | **Yes** if noteBody and cfiRange persisted; re-open shows note in sidebar and highlight in book. |
| 4. User selects same range again | Toolbar shows note/highlight state; Add note can be disabled when range already has a note (or "Remove" offered). | No duplicate note for same range; Remove highlight removes note+highlight. | — | **Yes** if removing highlight for that range removes the note from sidebar and DB. | **Yes** if no duplicate; DB consistent. |

**Comparison checklist:**

- [ ] Add note opens in-app modal; note saved and shown as highlight + sidebar entry.
- [ ] No duplicate note for same range; Remove highlight removes note and DB entry.

---

## 3. Bookmark (EPUB & PDF for jump; visual only EPUB)

### Life case: "I want to bookmark a place"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User selects text (or place), toolbar appears | Same as Highlight. | — | — | — | — |
| 2. User taps **Bookmark** | Bookmark is saved (type bookmark, cfiRange); no visual highlight; sidebar shows bookmark. | DB has one row; sidebar entry; tap entry → jump to location. | **Yes** if Bookmark is in same toolbar. | **Yes** if "Remove bookmark" shown when selection has bookmark; one tap removes. | **Yes** if persisted; re-open book → bookmark in sidebar; jump works. |
| 3. User selects same range again | Toolbar shows **Remove bookmark**. | No duplicate bookmark for same range. | — | **Yes** if Remove bookmark visible and one tap removes. | **Yes** if duplicate prevented. |

**Comparison checklist:**

- [ ] Bookmark saved without visual highlight; sidebar shows it; jump works.
- [ ] Remove bookmark visible when range has bookmark; removal updates DB and sidebar.

---

## 4. Reader themes and font size

### Life case: "I want to read in dark mode / bigger text"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User opens reader | Reader shows current theme (Light/Dark/Sepia/Midnight) and font size from store. | Theme and font size match last used (persisted). | — | — | **Yes** if reader store persisted. |
| 2. User taps theme (e.g. Dark) | All visible content (including newly scrolled sections) updates immediately; no flash of wrong theme. | Background and text color change in viewport and in new sections as user scrolls. | **Yes** if theme chips are in header and clearly labeled (e.g. aria-label "Theme: Dark"). | N/A (choice, not undo). | **Yes** if theme persisted to reader store. |
| 3. User taps font + or − | Font size changes; min/max respected; applies to all content. | Rendition and any direct body styles update; size persists on re-open. | **Yes** if +/- are next to theme in header. | N/A | **Yes** if fontSize persisted. |

**Comparison checklist:**

- [ ] Theme and font size controls in header; change applies immediately and to newly loaded sections (EPUB).
- [ ] Theme and font size persist across sessions (reader store).

---

## 5. TOC and in-book search

### Life case: "I want to jump to a chapter or find a word"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User taps TOC (list icon) | Drawer opens from left; EPUB: nested TOC from book.navigation; PDF: outline if present, else "No table of contents for this PDF". | Tap entry → navigates to chapter (EPUB: displayTarget(href); PDF: jumpToPage). Drawer closes or stays open per design. | **Yes** if TOC is first or second icon in header with aria-label "Open table of contents". | N/A | N/A |
| 2. User taps Search (magnifier) | Search drawer opens; user types query; Search runs (EPUB: spine; PDF: pages). Results show excerpt and location (CFI or "Page N"). | Tap result → jump to location. Empty query or no results: no crash; clear message. | **Yes** if Search is in header next to TOC. | N/A | N/A |

**Comparison checklist:**

- [ ] TOC opens and entries jump correctly (EPUB and PDF).
- [ ] Search opens; results and jump work (EPUB and PDF); empty state handled.

---

## 6. Feed → Read → Back (full loop)

### Life case: "I discover a snippet and read it in context"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User is on Feed | Cards show headline, body, Save, Highlight, Read, Skip. "X saved today" if > 0. | Primary action is Read (tap body/card). | **Yes** if Read is obvious (card tappable or "Read" button). | — | — |
| 2. User taps Read on a card | Reader opens at snippet location (EPUB: CFI; PDF: page). Not only cover. | URL has `?loc=...`; reader displays correct position. | — | — | **Yes** if location passed and applied. |
| 3. User taps Back in reader | Returns to Feed; scroll position restored (same card visible). | firstVisibleItemIndex / initialTopMostItemIndex used; no jump to top. | **Yes** if Back is clearly labeled (aria-label "Back"). | N/A | **Yes** if feed store restores scroll. |
| 4. User opens same book again later | Reader opens at last position (furthestLocation). | initialCfi / initialPage from book.furthestLocation. | — | N/A | **Yes** if furthestLocation persisted on relocate. |

**Comparison checklist:**

- [ ] Feed shows cards when books are ready; Read opens reader at snippet location.
- [ ] Back restores feed scroll position.
- [ ] Re-opening book restores last reading position.

---

## 7. Library: upload, errors, Remove

### Life case: "I add a book, something fails, or I want to remove it"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User drops EPUB or PDF | File accepted; book row appears; processing (Extracting…). | No silent fail; ProcessingIndicator visible. | **Yes** if dropzone is prominent and copy says EPUB or PDF. | — | **Yes** if blob stored and book in DB. |
| 2. User drops unsupported file (.txt, .docx) | Inline message: "Only EPUB and PDF supported right now." No crash. | Message visible; dismissible or auto-dismiss. | — | N/A | N/A |
| 3. Book fails (error) | "Error · Retry or remove". Retry and Remove buttons. | Retry re-runs extraction; Remove deletes book + blob + snippets + annotations. | **Yes** if error state is visible and actions are labeled. | **Yes** if Remove asks for confirmation; after confirm, book and data gone. | **Yes** if Remove actually deletes from DB and storage. |
| 4. User removes a ready book | Confirm dialog; after confirm, book gone from grid; Feed no longer shows its snippets. | No ghost snippets; no orphan blob. | — | **Yes** if confirm is clear and Remove is one path. | **Yes** if cleanup complete. |

**Comparison checklist:**

- [ ] Upload accepts EPUB/PDF; unsupported file shows message.
- [ ] Error state has Retry and Remove; Remove confirms and cleans DB + storage.

---

## 8. Annotations sidebar: list, jump, Clear all

### Life case: "I want to see all my highlights and jump to one"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User opens Annotations (highlighter icon) | Sidebar from right; list of highlights, notes, bookmarks (newest first). Each shows text and type. | List from `db.annotations` for current bookId. | **Yes** if icon in header with aria-label "Open annotations". | — | **Yes** if list is live from DB. |
| 2. User taps an entry | Reader jumps to that location (EPUB: displayCfi; PDF: jumpToPage); sidebar can close. | Jump happens; no crash for invalid CFI. | — | — | — |
| 3. User taps "Clear all" | Confirm: "Remove all highlights, notes, and bookmarks in this book?"; on confirm, reader removes highlight visuals, DB cleared for book, sidebar empty; reader can remount to clear visuals immediately. | No orphan highlights on screen; DB has no annotations for that book. | — | **Yes** if Clear all is visible when list non-empty and confirm is clear. | **Yes** if DB and visuals in sync after clear. |

**Comparison checklist:**

- [ ] Sidebar lists all annotations for book; tap entry jumps and optionally closes.
- [ ] Clear all confirms; removes all for book from DB and removes visuals; sidebar empty.

---

## 9. Settings and app theme

### Life case: "I want the app in dark mode"

| Step | Intended behaviour | Success criteria | Easy to find? | Easy to remove? | Saved? |
|------|--------------------|------------------|---------------|-----------------|--------|
| 1. User opens Settings | Theme: Light / Dark / System. Other sections placeholder. | Theme selector works (class-based dark on `<html>`). | **Yes** if Settings in bottom nav and theme is first control. | N/A | **Yes** if app store persisted. |
| 2. User selects Dark | App (Feed, Library, Settings) use dark styles; reader can have its own theme. | No flash; dark utilities apply. | — | N/A | — |

**Comparison checklist:**

- [ ] Settings theme changes app theme; reader theme is independent and also persisted.

---

## 10. Accessibility and performance (life case: "I use keyboard or reduced motion")

| Step | Intended behaviour | Success criteria |
|------|--------------------|------------------|
| Icon-only buttons | All have aria-label (Back, Save, Highlight, Read, Skip, TOC, Search, Annotations, etc.). | Screen reader and tests can assert labels. |
| Touch targets | Buttons and card actions ≥44px. | min-h-[44px] min-w-[44px] or equivalent. |
| Reduced motion | Feed (Virtuoso) and transitions respect prefers-reduced-motion. | useReducedMotion(); no long smooth-scroll when reduced. |

---

## Mapping to tests

- **Unit / component:** SelectionToolbar (visibility, Highlight vs Remove highlight, Bookmark vs Remove bookmark, aria-labels, touch targets). Reader store (theme, fontSize, persist). AnnotationSidebar (list from DB, Clear all confirm, onSelectCfi).
- **Integration:** Feed scroll restore (store + Virtuoso); reader location persist (relocated → DB).
- **E2E (Playwright):** Navigate Feed / Library / Settings; open reader; click theme; open TOC and Annotations sidebar; Back to feed. Optional: seed DB and test full loop (card → reader → back).
- **Manual or advanced E2E:** Selection inside epub.js iframe (toolbar appears, Highlight/Remove highlight); PDF text selection and highlight.

See [docs/TEST_COVERAGE.md](TEST_COVERAGE.md) for test-to-life-case matrix.
