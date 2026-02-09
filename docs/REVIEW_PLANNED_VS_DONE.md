# Scrollwise: Planned vs Done Review

Use this with **docs/NEXT_STEPS.md** and **docs/STATUS.md** to see what was planned, what’s done, and what to test.

---

## Summary

| Priority | Silo | Planned | Status | Notes |
|----------|------|---------|--------|------|
| **0** | 0a — Feed empty after processing (B2) | Fix extraction/query so Feed shows cards when book ready | **Done** | ArrayBuffer in EPUB extractor; B2 FIXED |
| **0** | 0b — Reader only cover (B1) | Full scrollable reader, not just cover | **Done** | continuous + scrolled; whenContainerSized; B1 FIXED |
| **1** | 1 — Core loop | Upload → Feed cards → tap Read → reader at location → Back → scroll restored | **Done** | Scroll restore via initialTopMostItemIndex |
| **2** | 2 — Annotations | Selection toolbar, Highlight/Note/Bookmark, persist, sidebar, themes, font size, “X saved today” | **Done** | Phase 3 + follow-up (TOC, search for EPUB) |
| **2.5** | 2b — Audit short-term | Note modal, 44px targets, reduced motion, theme in Settings, BookCard Retry/Remove, Error boundary | **Done** | |
| **2.5** | 2c — Audit medium-term | Onboarding, Feed refresh, reader typography, unsupported-file message | **Done** | Optional items deferred (skeleton, “skipped everything”, header collapse) |
| **3** | 3 — PDF | PDF upload, extractor, cover, reader, feed snippets, reader parity (highlights, sidebar, theme, zoom) | **Done** | Silo 3 + 3b |
| **3** | Phase 3 follow-up | TOC drawer (EPUB); in-book search (EPUB) | **Done** | |
| **—** | PDF in-book search | (Not in original NEXT_STEPS; added as “or PDF search if desired”) | **Done** | searchPdf; Search drawer for PDF; jump to page |
| **—** | PDF TOC (outline) | (Not in original; “or PDF TOC if desired”) | **Done** | getPdfOutline; TOC drawer shows outline when present; “page:N” → jumpToPage |
| **4** | 4 — AI + Topic mode | AI provider, enricher, Topic mode | **Not started** | |
| **4** | 5 — Study + Time Travel | Study mode, Time Travel, feed mode selector, onboarding (done), feed settings | **Not started** | Onboarding already in 2c |
| **4** | 6 — PPTX + polish | PPTX parser/renderer, PWA/offline, a11y audit | **Not started** | |

---

## Planned vs Done — Detail

### Completed (matches plan)

- **Bugs:** B1 (reader cover), B2 (feed empty), B5 (duplicate highlights, clear all) — all fixed per BUGS.md.
- **Phase 1:** Scaffold, Dexie, storage, Library, upload (EPUB+PDF), extraction (EPUB+PDF), reader route, EpubRenderer, PdfRenderer, app shell, home redirect, error boundary, storage tip, a11y baseline.
- **Phase 2:** EPUB extractor, scorer, pipeline, discovery, Feed, SnippetCard, card→reader, scroll restore, Skip.
- **Phase 3:** Annotations table, selection, toolbar, persist, sidebar, themes, font size, “X saved today”, TOC drawer (EPUB), in-book search (EPUB).
- **UI/UX audit:** Quick wins, 2b (short-term), 2c (medium-term) per STATUS.
- **PDF (Silo 3):** Full PDF support and reader parity as above.
- **Extra (beyond original plan):** PDF in-book search; PDF TOC from outline when present.

### Deferred / not done (per plan)

- **Shared-element transition** (card → reader): deferred.
- **Extraction in Web Worker:** still main-thread with yields.
- **PDF Note/Bookmark:** only highlights for PDF; Note/Bookmark deferred.
- **Silo 2c optional:** Home loading skeleton, “You’ve skipped everything” empty state, reader header collapse (Aa popover) — deferred.
- **Priority 4:** Silo 4 (AI/Topic), 5 (Study/Time Travel), 6 (PPTX) — not started.

### Doc vs implementation (quick check)

- **NEXT_STEPS:** “PDF in-book search” and “PDF TOC (outline)” are marked done; “Next: Priority 4.”
- **STATUS:** TOC row and in-book search row mention PDF (outline + search); Key Files list pdf-search.ts and pdf-outline.ts.
- **TESTING_WORKFLOW:** Flow E updated so E2 expects Search for PDF and E3/E6 cover TOC (outline when present, empty when not).

---

## What to test (high level)

1. **First-time + Library (Flow A, B):** No books → Library, onboarding → add EPUB → processing → “Open”, summary line.
2. **Feed (Flow C):** Cards after ready, Save/Read/Skip, Back restores scroll, Refresh, “X saved today.”
3. **Reader EPUB (Flow D):** Full content, themes, font size, selection toolbar, Highlight/Note/Bookmark, sidebar, TOC drawer, Search drawer, Back.
4. **Reader PDF (Flow E):** Same chrome, **Search** (new), **TOC** with outline when PDF has bookmarks (new), highlights, sidebar.
5. **Library errors (Flow F):** PDF upload, unsupported file message, Retry/Remove.
6. **Settings + shell (Flow G):** Theme, nav, storage tip.
7. **Errors + a11y (Flow H, I):** Error boundary, clear-all confirm, reduced motion, touch targets, aria-labels.

Use **docs/TESTING_WORKFLOW.md** for the full step-by-step pass and findings table.

---

## Verification (automated)

- **Build:** `npm run build` — passes (Next.js 16, webpack).
- **Lint:** `npm run lint` — reports **4 errors, 5 warnings** (pre-existing; not from PDF search/TOC work):
  - **Errors:** (1) Reader page: `setTocEntries` called synchronously in effect (react-hooks/set-state-in-effect). (2) EpubRenderer: `flattenToc` used before declaration in useCallback (react-hooks/immutability). (3–4) PdfRenderer: ref updated during render + ref in useMemo (react-hooks/refs).
  - **Warnings:** `next/image` preferred over `<img>` (SnippetCard, BookCard); unused vars in EpubRenderer; useEffect missing deps in EpubRenderer.

Fix these in a dedicated lint-cleanup pass if you want zero lint issues before release.
