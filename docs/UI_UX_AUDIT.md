# Scrollwise: UI/UX Audit

**Purpose:** Single pass over the app to capture current state, mistakes, corrections needed, and gaps for delivering the full intended (and addictive) experience. Use with `docs/DESIGN.md` and `docs/STATUS.md`.

**Where this fits in the plan:** Quick wins, **Silo 2b (short-term)**, and **Silo 2c (medium-term)** are **done**. Next: Priority 3 (PDF) or Phase 3 follow-up (TOC, search). STATUS.md has a “UI/UX audit” subsection that tracks done vs not started.

---

## 1. What the app is and where it’s at

- **Product:** Personal reading app: upload EPUBs → feed of snippets (discovery) → tap to read at location. Reader has themes, font size, annotations (highlight, note, bookmark), sidebar, position sync.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Dexie (IndexedDB), epub.js, Zustand, react-virtuoso.
- **Implemented:** Library (upload, processing, grid), Feed (infinite snippets, Save/Highlight/Read/Skip, scroll restore), Reader (continuous scroll, location persist, selection toolbar, annotation sidebar, themes, font size), Settings (placeholder), PWA manifest, error boundary, storage tip, theme (system/light/dark).
- **Known bugs (per BUGS.md):** B1 and B2 marked FIXED; B4 (possible flicker), B3 (historical). No new blocking bugs called out in this audit.

---

## 2. Mistakes and what needs correction

**Quick wins (saved state, Back label, upload copy, BookCard status) are done** — see [STATUS.md](STATUS.md) and CHANGELOG [Unreleased]. Remaining rows are scheduled in [NEXT_STEPS.md](NEXT_STEPS.md) (Silo 2b / 2c).

### 2.1 Design spec vs implementation

| Issue | Where | Fix |
|-------|--------|-----|
| **Saved state not visible on card** | DESIGN.md: “Snippet card: default, **saved state**, after Skip”. SnippetCard updates `interactionType: "saved"` and `savedAt` but has no visual difference for saved. | Show saved state: e.g. filled Bookmark icon, subtle “Saved” label or accent border when `snippet.interactionType === "saved"`. |
| **Reader Back is context-agnostic** | Reader header Back button `aria-label="Back to library"` and copy “Back”. User may have come from Feed; “Back to library” is wrong and breaks trust. | Use `router.back()` (keep) but set `aria-label` to “Back” only, or derive from referrer (e.g. “Back to feed” / “Back to library”) if you add referrer tracking. |
| **Note uses `window.prompt`** | EpubRenderer: Add note used `window.prompt`. | **Done (Silo 2b):** Replaced with in-app modal (placeholder, optional, Add note / Cancel). |

### 2.2 Accessibility and design language

| Issue | Where | Fix |
|-------|--------|-----|
| **Reduced motion not applied** | DESIGN: “Motion has meaning” and “Respect prefers-reduced-motion”. | **Done (Silo 2b):** useReducedMotion used in FeedView; Virtuoso `followOutput` is false when reduced motion preferred. |
| **Touch targets** | DESIGN: “Min height/width (e.g. 44px) for tappable areas”. | **Done (Silo 2b):** SnippetCard actions, BottomNav, SelectionToolbar use min-h-[44px] min-w-[44px]. |
| **Focus after Skip** | After Skip, next card appears; focus is not moved. Keyboard/screen-reader user may lose context. | After removing snippet, move focus to next card or a “Skip successful” live region, then to next focusable card. |

### 2.3 Copy and consistency

| Issue | Where | Fix |
|-------|--------|-----|
| **Upload dropzone says “EPUB, PDF, or PPTX”** | UploadDropzone and Library only accept EPUB; PDF/PPTX are Phase 4/7. | Use “Drop EPUB here” (and “or click to browse”) until PDF/PPTX ship; avoid promising unsupported formats. |
| **BookCard shows “EPUB · ready”** | Ready books show format + status. “ready” is internal; “Open” or nothing is clearer. | For `processingStatus === "ready"` show “Open” or just format; hide raw “ready” from users. |
| **Settings is a dead end** | Theme lived in app store but Settings didn’t expose it. | **Done (Silo 2b):** Theme selector (Light/Dark/System) in Settings; placeholder updated for AI/feed in later phases. |

### 2.4 Data and state

| Issue | Where | Fix |
|-------|--------|-----|
| **Feed doesn’t refetch after Library processing** | If user is on Feed while a book finishes processing, new snippets don’t appear until refresh or re-navigation. | When Library processing completes, invalidate or refresh feed (e.g. event/callback, or Feed subscribes to ready-count and refetches when it increases). |
| **useInfiniteSnippets initialScrollIndex** | `initialScrollIndex` is only read on first mount (empty deps). Returning to Feed with a new scroll index works because the component remounts; if Feed ever persisted in layout, scroll restore could break. | Document that scroll restore depends on Feed remounting; or pass scroll index into a key so initial load is correct when re-entering. |

### 2.5 Small / polish

| Issue | Where | Fix |
|-------|--------|-----|
| **Home loading is bare** | “Loading…” with no branding or skeleton. | Use a minimal branded loader or skeleton that matches Feed/Library (e.g. logo + “Loading…” or pulse). |
| **Error boundary always “Go to Feed”** | ErrorBoundary recovers with “Go to Feed”. If user was in Library or Reader, they might expect “Go to Library” or “Retry”. | Keep primary CTA as “Go to Feed”; add “Go to Library” as secondary, or “Retry” that resets error state. |
| **Reader header crowded on small screens** | Title + theme pills + font size in header can wrap or feel cramped. | Consider collapsing theme/font into a single “Aa” or “Settings” control that opens a small popover. |

---

## 3. What’s missing for the full (and addictive) experience

### 3.1 Core loop and habit

- **Onboarding:** **Done (Silo 2c):** First visit (0 books, !onboardingComplete) shows short wizard: what Scrollwise is, “Add your first book” → Library.
- **Pull-to-refresh / Feed refresh:** **Done (Silo 2c):** Feed has Refresh button that refetches discovery; Feed also refetches when a book becomes ready (scrollwise-book-ready event).
- **Saved feedback beyond the chip:** “X saved today” is good; no celebration or micro-animation on Save. Consider a short confirmation (e.g. “Saved” toast or icon animation) to reinforce the action.
- **Skip feedback:** Skip removes the card but there’s no animation (DESIGN defers shared-element; Skip direction/duration is TBD). A quick slide-out or fade makes Skip feel responsive and intentional.

### 3.2 Discovery and feed

- **Feed mode selector:** Only “discovery” is active; study/topic/time-travel are in feedConfig but not exposed. Until then, the feed is “discovery only” with no way to switch — acceptable but worth surfacing in Settings or empty state (“Discovery mode”).
- **Empty state when all skipped:** If every snippet is dismissed, Feed can be empty with a generic “No snippets yet” and Library counts. Consider a dedicated empty state: “You’ve skipped everything in this batch. Add more books or refresh later.”
- **Card → reader transition:** DESIGN: “Shared element (cover + title)”. Deferred. Currently hard navigation. When prioritized, shared-element transition (e.g. view transition API or animation) will make Feed → Reader feel like one surface.

### 3.3 Reader

- **TOC drawer:** Deferred (Phase 3 follow-up). Missing for “deep in the reader” wayfinding (jump to chapter).
- **In-book search:** Deferred. Important for power users and study.
- **Reader typography:** **Done (Silo 2c):** Reader body uses serif stack (Literata, Merriweather, Georgia, Cambria), line-height 1.6, body margins per DESIGN.
- **Selection toolbar position:** Toolbar is fixed “bottom-6 center”. Long selections can cover the selection. Consider positioning near selection (above/below) or allowing drag.

### 3.4 Library and upload

- **Upload progress:** Multiple files are processed in parallel; no per-file or global “3 of 5 processing” or queue visibility. Add at least a simple “Processing X books” or per-card progress (already there) plus a summary.
- **Error recovery:** **Done (Silo 2b):** BookCard error state has Retry (re-run extraction) and Remove (delete book + blob + snippets + annotations).
- **Unsupported file feedback:** **Done (Silo 2c):** Dropping non-EPUB shows inline message “Only EPUB supported right now.” (auto-dismisses).

### 3.5 Settings and identity

- **Theme control:** App theme (system/light/dark) is in app store and ThemeProvider but not exposed in Settings. Add theme selector in Settings.
- **Export / data:** DESIGN/NEXT_STEPS mention “Export my data” (e.g. annotations). Not implemented. Adds trust and control; implement when polishing core loop.
- **AI / Topic / Study:** Later phases; no action needed for this audit.

### 3.6 Performance and perception

- **Performance budget:** DESIGN: LCP &lt; 2.5s, FCP &lt; 1.5s, feed first paint &lt; 200ms, tap &lt; 300ms. No instrumentation in repo. Add simple marks or use Vercel Analytics / Web Vitals and track against budget.
- **Skeleton shape:** SnippetCardSkeleton layout doesn’t exactly match SnippetCard (card has cover + meta + headline + body + actions; skeleton is simpler). Align skeleton structure with real card for less layout shift.

### 3.7 Addictive-design checklist (high level)

- **Variable reward:** Discovery already has randomness (serendipity). “Saved today” chip and possible “streak” or gentle stats could reinforce habit.
- **Clear next action:** Feed and Library do this well (Read, Open, Add book). Reader could surface “X highlights in this book” or “Continue from last time” more prominently.
- **Low friction to start:** One-tap Read from card is good. Home redirect (no books → Library, has books → Feed) is correct.
- **Progress visible:** “X saved today”, processing progress, and reader position are good. Could add “X snippets left in this book” or “X% read” in reader header later.
- **Reversibility:** Skip is soft (dismissed, not deleted). Clear-all annotations has confirm. Add “Undo Skip” (e.g. restore last skipped card) if you want to push reversibility further.

---

## 4. Suggested priority order

1. **Quick wins (same session):**  
   - SnippetCard saved state.  
   - Reader Back aria-label (“Back” or context-aware).  
   - Upload copy: “Drop EPUB here” and only accept EPUB in UX.  
   - BookCard: hide “ready”, show “Open” or format only.

2. **Short term (Silo 2b — done):**  
   - Replace `window.prompt` for notes with in-app modal/input.  
   - Touch targets ≥44px on card actions and nav.  
   - useReducedMotion in Feed (Virtuoso followOutput).  
   - Theme selector in Settings.  
   - Error state on BookCard: Retry + Remove.  
   - Error boundary: Retry, Go to Library (and Go to Feed).

3. **Medium term (Silo 2c — done):**  
   - Onboarding (short wizard on first visit).  
   - Feed refresh (Refresh button + refetch on book-ready event).  
   - Reader serif font and typography from DESIGN.  
   - Unsupported file message (inline, auto-dismiss).

4. **Later (silos):**  
   - Shared-element card → reader.  
   - TOC drawer, in-book search.  
   - Export data, Study/Topic modes.

---

## 5. File reference

- **Design spec:** `docs/DESIGN.md`  
- **Status:** `docs/STATUS.md`  
- **Bugs:** `docs/BUGS.md`  
- **Next work:** `docs/NEXT_STEPS.md`  
- **Data flow:** `docs/DATA_FLOW.md`

This audit should be updated when major UI/UX work is done or when design spec changes.
