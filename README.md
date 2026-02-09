# Scrollwise

**Your books, one feed. Read where you left off.**

Scrollwise is a personal reading app that turns your EPUB and PDF library into a discovery-style feed of highlights—then lets you open any book and read in place, with your position and annotations saved. No cloud lock-in: everything runs in the browser and lives in your IndexedDB and local storage.

---

## What it does (and why it exists)

Most of us collect articles and books we mean to read. Scrollwise starts from a simple idea: **what if your library could surface the best bits first?**

You upload EPUBs or PDFs. The app extracts meaningful chunks (headings, quotes, strong paragraphs), scores them with simple heuristics, and builds a feed of snippet cards—like a timeline of “posts” from your books. Tap a card and you jump straight into the reader at that location. When you’re done, your place is saved. You can highlight, add notes, and bookmark; those annotations persist and show up in a sidebar so you can jump back later.

So: **discovery in the feed, depth in the reader.** The feed stays light and scannable; the reader is built for sustained reading (themes, font size, TOC, in-book search). The goal is to make it easy to *start* from a compelling line and then stay in the book.

---

## Current state (what’s built)

- **Library** — Drag-and-drop EPUB or PDF. Files are stored locally (OPFS with IndexedDB fallback). Each book is processed in the background: extraction → scoring → snippets written to the DB. The UI shows **Ready to read** first (grid of cover tiles; tap to open, overflow menu for Re-extract / Remove), then **Processing** and **Errors** in a list. Remove asks for confirmation.
- **Feed** — Infinite scroll of snippet cards. Each card shows book, headline, and a short body; actions: Save, Highlight, Read, Skip. Saved state is visible (e.g. “3 saved today” chip). Placeholders (short quotes/jokes) appear only when there are no real snippets yet; they disappear once you have books. Scroll position is restored when you come back from the reader.
- **Reader** — Format-agnostic: same chrome for EPUB and PDF. Themes (Light, Dark, Sepia, Midnight), font size +/- , TOC drawer (EPUB from nav, PDF from outline when present), in-book search (EPUB and PDF), annotations sidebar. Select text → floating toolbar (Highlight, Note, Bookmark). Highlights and notes persist and re-apply on load; bookmarks jump to location. Location is synced so reopening takes you to where you left off.
- **Settings** — App theme (Light / Dark / System). Placeholder for future feed tuning and AI options.
- **Tests** — Unit and component tests (Vitest + React Testing Library, 47 tests) for Library, Feed-related components, reader store, selection toolbar, annotation sidebar. E2E (Playwright): navigation and reader flows. Life cases in `docs/LIFE_CASES.md` drive acceptance criteria; `docs/TEST_COVERAGE.md` maps tests to those cases.

Design, data flow, and UX decisions are written down so the product and the code stay aligned: see **Design & docs** below.

---

## How we think about it

- **One source of truth** — IndexedDB (Dexie) holds books, snippets, feed config, and annotations. Blob storage (OPFS / IDB) holds file bytes. All UI state is derived from these; no duplicate “upload count” or “processed count” store. If something looks wrong (e.g. “2 books but 0 in feed”), the answer is in the DB: `books.processingStatus` and whether `snippets` has rows for that book. See `docs/DATA_FLOW.md` and `docs/INGESTION_TO_FEED.md`.
- **Calm feed, deep reader** — The feed is for discovery and light engagement; the reader is for focus. One primary action per context; state (loading, empty, error) is always visible; motion is meaningful and respects `prefers-reduced-motion`. Details in `docs/DESIGN.md`.
- **Test what matters** — We define user journeys and acceptance criteria (e.g. “easy to find? easy to remove? saved?”) in `docs/LIFE_CASES.md`, then map automated and manual tests to them. That keeps coverage aligned with real behaviour. See `docs/TESTING_WORKFLOW.md` and `docs/TEST_COVERAGE.md`.
- **Incremental execution** — Work is split into silos (e.g. Silo 0: fix feed/reader bugs, Silo 1: core loop, Silo 2: annotations, Silo 3: PDF). Each silo is done when the corresponding life cases and tests pass. Status and next steps live in `docs/STATUS.md` and `docs/NEXT_STEPS.md`.

---

## Project structure

```
Scrollwise/
├── app/                    # Next.js App Router pages
│   ├── feed/               # Feed page
│   ├── library/            # Library (upload, grid, processing)
│   ├── reader/[bookId]/    # Reader by book ID (?loc= for deep link)
│   ├── settings/           # Settings
│   ├── layout.tsx
│   ├── page.tsx            # Home (redirects to Library or Feed)
│   └── manifest.ts         # PWA manifest
├── components/
│   ├── feed/               # FeedView, SnippetCard, placeholders, skeletons
│   ├── library/            # BookCard, BookGrid, UploadDropzone, ProcessingIndicator
│   ├── reader/             # EpubRenderer, PdfRenderer, SelectionToolbar,
│   │                       # AnnotationSidebar, TocDrawer, SearchDrawer
│   └── shared/             # AppShell, BottomNav, ThemeProvider, ErrorBoundary, StorageTip
├── hooks/                  # useInfiniteSnippets, useLibraryCounts, useReducedMotion, useSavedTodayCount
├── lib/
│   ├── db/                 # Dexie schema and DB access
│   ├── extraction/         # EPUB/PDF extractors, heuristic scorer, pipelines
│   ├── feed/               # Discovery algorithm, placeholder content
│   ├── content/            # Content types
│   └── utils/              # file-storage, format-detector, snippet-text, pdf-cover, pdf-search, etc.
├── stores/                 # Zustand: app, library, feed, reader
├── docs/                   # Design, status, bugs, next steps, data flow, life cases, tests
├── tests/                  # Vitest unit/component tests
├── e2e/                    # Playwright E2E specs
└── public/                 # Static assets (including pdf.worker.min.js)
```

---

## Getting started

**Requirements:** Node 18+ (or as required by Next.js 16).

```bash
git clone https://github.com/<your-username>/scrollwise.git
cd scrollwise
npm install
npm run dev
```

Replace `<your-username>` with your GitHub username. After pushing to your own repo, replace `your-org` in the comparison URLs at the bottom of `CHANGELOG.md` with your username so the version links work.

Open [http://localhost:3000](http://localhost:3000). With no books, the app redirects to Library. Drop an EPUB or PDF to see upload → processing → feed → reader flow.

**Scripts**

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server (webpack; needed for pdfjs-dist). |
| `npm run build` | Production build. |
| `npm run start` | Run production build. |
| `npm run lint` | ESLint. |
| `npm run test` | Unit/component tests (Vitest). `npm run test:watch` for watch mode. |
| `npm run test:e2e` | Playwright E2E. Run `npx playwright install chromium` once. For reader E2E with a real book, set `SCROLLWISE_TEST_BOOK_ID=<book-uuid>`. |
| `npm run test:e2e:ui` | Playwright UI mode. |

**PDF worker:** The app expects `public/pdf.worker.min.js`. If you upgrade `pdfjs-dist`, copy it from `node_modules/pdfjs-dist/build/pdf.worker.min.js`.

---

## Design & docs

These docs explain what’s implemented, how data flows, and how we decide what to build next.

| Doc | Purpose |
|-----|--------|
| [docs/README.md](docs/README.md) | Short index of design and status docs (start here for a new session). |
| [docs/STATUS.md](docs/STATUS.md) | What’s implemented, tech stack, key files. Single source of truth for “does it work?” |
| [docs/DESIGN.md](docs/DESIGN.md) | Design philosophy, principles, and handoff (typography, motion, surfaces, a11y). |
| [docs/DATA_FLOW.md](docs/DATA_FLOW.md) | IndexedDB as source of truth; upload → process → feed flow. |
| [docs/INGESTION_TO_FEED.md](docs/INGESTION_TO_FEED.md) | Step-by-step path from file drop to feed cards; where it can break. |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | Work silos and priorities (what’s done, what’s next). |
| [docs/BUGS.md](docs/BUGS.md) | Known issues and fixes. |
| [docs/LIFE_CASES.md](docs/LIFE_CASES.md) | User journeys and acceptance criteria (easy to find? easy to remove? saved?). |
| [docs/TEST_COVERAGE.md](docs/TEST_COVERAGE.md) | Test-to-life-case matrix. |
| [docs/UI_UX_AUDIT.md](docs/UI_UX_AUDIT.md) | UI/UX audit: mistakes, corrections, gaps. |
| [docs/LIBRARY_UI_OPTIONS.md](docs/LIBRARY_UI_OPTIONS.md) | Library UI brainstorm and options. |
| [CHANGELOG.md](CHANGELOG.md) | Version history and notable changes. |

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript  
- **Styling:** Tailwind 4  
- **State:** Zustand (app, library, feed, reader stores)  
- **Database:** Dexie 4 (IndexedDB) — `books`, `snippets`, `feedConfig`, `annotations`  
- **Storage:** OPFS primary, IndexedDB blob fallback  
- **Reading:** epub.js (EPUB), pdfjs-dist + @react-pdf-viewer (PDF)  
- **Feed list:** react-virtuoso  
- **Testing:** Vitest, React Testing Library, Playwright  

---

## Version

Version is in `package.json` (`version`). Release history and conventions are in [CHANGELOG.md](CHANGELOG.md).

---

## License

MIT License. See [LICENSE](LICENSE).
