# Scrollwise: Next Steps and Work Silos

Use this in a **new chat** to work feature-by-feature or step-by-step. Each silo is self-contained so one session can own it.

**Current state:** Priority 0–3 done. Silo 2 (Annotations) and **Silo 3 (PDF)** done. UI/UX audit, Silo 2b, and Silo 2c done. **Phase 3 follow-up (TOC, in-book search)** done. **PDF in-book search** and **PDF TOC (outline)** done. **Library UI (Ready-first + grid + overflow menu)** done (docs/LIBRARY_UI_OPTIONS.md). **Next:** Priority 4 (later phases).

---

## Priority 0: Fix existing bugs (do first)

Before new features, fix the two blocking issues in [docs/BUGS.md](BUGS.md):

1. **Silo 0a — Feed empty after processing (B2)**  
   - **Goal:** After a book is “ready”, Feed shows snippet cards for that book.  
   - **Focus:** Extraction pipeline (does `bulkAdd` run? any throw?), EPUB extractor (does it return chunks?), discovery query (Dexie filter, `validBookIds`, score threshold).  
   - **Done when:** Upload one EPUB, wait for ready, open Feed → at least one card.

2. **Silo 0b — Reader only shows cover (B1)**  
   - **Goal:** From Library, “Open” opens the full reader with scrollable book content, not only the cover.  
   - **Focus:** `EpubRenderer` (rendition lifecycle, container size, `display()`), reader page layout/CSS, blob/ArrayBuffer path.  
   - **Done when:** Open a book from Library → can scroll and read full content.

---

## Priority 1: Core loop stable

After 0a and 0b:

3. **Silo 1 — Verify full loop** — DONE  
   - Upload EPUB → processing → Feed shows cards → tap card → reader opens at snippet location → Back → feed scroll restored.  
   - **Done:** Scroll restore: `useInfiniteSnippets(initialScrollIndex)` fetches at least `initialScrollIndex + 1` items on mount so Virtuoso can restore position when returning from reader.  
   - Optional: add a minimal “Export my data” (e.g. annotations) or “Quote out” later; not required for this silo.

---

## Priority 2: Phase 3 — Reader annotations (one silo)

4. **Silo 2 — Annotations** — DONE  
   - Text selection, floating toolbar (Highlight, Note, Bookmark), persist to DB, re-apply on load.  
   - Annotation sidebar: list by book, tap to jump. Reader themes + font size. Feed “X saved today” chip.  
   - **Phase 3 follow-up done:** TOC drawer (EPUB from book.navigation; PDF shows empty message), in-book search (EPUB only; search spine, jump to CFI).

---

## Priority 2.5: UI/UX audit follow-up (from docs/UI_UX_AUDIT.md)

Audit quick wins are **done** (saved state on card, Back label, EPUB-only upload copy, BookCard Open/Error). Remaining work is split into short-term and medium-term silos. Full list and rationale: [docs/UI_UX_AUDIT.md](UI_UX_AUDIT.md).

5. **Silo 2b — Audit short-term (UX polish)** — DONE  
   - Replace `window.prompt` for notes with in-app modal/input.  
   - Touch targets ≥44px on card actions and bottom nav.  
   - Use `useReducedMotion` in Feed (e.g. Virtuoso `followOutput`) and anywhere with transitions.  
   - Theme selector in Settings (Light / Dark / System from app store).  
   - BookCard error state: **Retry** (re-run extraction) and **Remove** (delete book + blob + snippets + annotations).  
   - Error boundary: Retry, Go to Feed, Go to Library. Settings placeholder updated.

6. **Silo 2c — Audit medium-term (habit and clarity)** — DONE  
   - Onboarding: short wizard on first visit (what Scrollwise is, “Add your first book” → Library).  
   - Feed refresh: Refresh button + refetch; Feed refetches when a book becomes ready (scrollwise-book-ready event).  
   - Reader typography: serif font stack (Literata, Merriweather, Georgia, Cambria), line-height 1.6, body margins per DESIGN.  
   - Unsupported file feedback: inline message when non-EPUB is dropped (“Only EPUB supported right now”).  
   - Optional (deferred): Home loading branded/skeleton; “You’ve skipped everything” empty state; reader header collapse (Aa popover).

---

## Priority 3: Phase 4 — PDF (one silo)

7. **Silo 3 — PDF** — DONE  
   - PDF renderer (`@react-pdf-viewer/core` + highlight plugin).  
   - PDF extractor (`getTextContent` + paragraph grouping); `runPdfExtraction` in `pipeline-pdf.ts`.  
   - Reader routes by `book.format` to PdfRenderer or EpubRenderer.  
   - PDF cover (first page), snippets in feed.  
   - Library accepts PDF; Retry uses `runPdfExtraction` for PDF books.  
   - **Reader parity (Silo 3b):** Same reader chrome for all formats: annotations sidebar (PDF highlights persisted, jump to page), theme, font/zoom (PDF uses defaultScale). DESIGN: reader is format-agnostic.

---

## Priority 4: Later phases (separate silos)

8. **Silo 4 — AI + Topic mode (Phase 5)**  
   - AI provider abstraction, enricher (headline/tags), optional embeddings + Topic mode.

9. **Silo 5 — Study + Time Travel + Onboarding (Phase 6)**  
   - Study mode (spaced repetition), Time Travel mode, feed mode selector, onboarding wizard, feed settings.

10. **Silo 6 — PPTX + polish (Phase 7)**  
   - PPTX parser and renderer, extractor, slide cards in feed, PWA/offline, a11y audit.

---

## How to use this in a new chat

1. **Start with:** “I’m working on Scrollwise. See docs/STATUS.md, docs/BUGS.md, docs/NEXT_STEPS.md, and docs/UI_UX_AUDIT.md for UX priorities.”
2. **Pick one silo:** e.g. “Let’s do Silo 2b: audit short-term” or “Silo 3: PDF.”
3. **Implement only that silo:** For bugs, verify with repro steps in BUGS.md. For audit items, use UI_UX_AUDIT.md for details.
4. **Then move on:** Mark the silo done in NEXT_STEPS and update STATUS.md (and BUGS.md if you fix or find bugs).

Keep STATUS.md and BUGS.md updated as you fix issues or add new ones.
