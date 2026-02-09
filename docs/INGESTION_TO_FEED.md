# How ingestion turns EPUB/PDF into feed cards

This doc explains the **exact path** from dropping a file to seeing cards in the Feed, and where it can fail.

---

## 1. Upload (Library page)

**What happens**

1. You drop an EPUB or PDF on the Library page.
2. `handleFiles` in `app/library/page.tsx` runs:
   - `detectFormat(file)` → `"epub"` or `"pdf"`.
   - `putBlob(storageKey, file)` stores the file bytes (OPFS or IndexedDB).
   - `db.books.add(book)` creates a book row with `processingStatus: "extracting"`.
   - For **EPUB**: `runEpubExtraction(bookId, file, onProgress)` is called (and never awaited — it runs in the background).
   - For **PDF**: `runPdfExtraction(bookId, file, onProgress)` is called the same way.

**If extraction throws** (e.g. invalid file, runtime error), the `.catch()` in the Library page sets the book to `processingStatus: "error"`. You’ll see “Error · Retry or remove” and no snippets are added.

**If you never see “Extracting…”** the book row may not be updating (check IndexedDB `books` table and the library store).

---

## 2. Extraction (EPUB)

**What happens** in `lib/extraction/pipeline.ts` and `lib/extraction/epub-extractor.ts`:

1. **Open the book:** `extractChunksFromEpub(blob, onProgress)`:
   - Converts blob to `ArrayBuffer` and opens it with epub.js: `ePub(buffer)`.
   - Waits for `book.ready`.
   - Iterates the **spine** (sections/chapters). For each section:
     - `section.load()` loads that section’s HTML.
     - Uses `section.document` and `section.contents` to run `querySelectorAll` for `h1–h6`, `blockquote`, `li`, `figcaption`, `p`.
     - For each element with at least 10 characters of text, builds a **chunk**: `sectionIndex`, `rawText`, `location` (CFI), `type` (heading, quote, list, paragraph).
   - Returns an array of **raw chunks**. If the book has no spine or every section fails to load, this array is **empty**.

2. **Score and select** (back in `pipeline.ts`):
   - Each chunk is scored by `scoreChunk()` (heuristic: position, length, structure, key phrases). Score is 0–1.
   - Chunks with `score >= 0.15` go into the “above threshold” list. **All chunks** are kept in a full list for a fallback.
   - We pick up to 200 snippets, with variety across sections (not all from one chapter).
   - **Fallback:** If after that we still have **zero** snippets but we had at least one chunk, we take the top chunks by score anyway (so short or low-scoring books still produce feed cards).
   - Snippets are built with `rawChunkToSnippet()`. The stored `heuristicScore` is at least 0.15 so discovery will include them.

3. **Write to DB:**
   - `db.snippets.bulkAdd(snippets)` — inserts all snippets for this book.
   - `db.books.update(bookId, { processingStatus: "ready", ... })`.
   - `onProgress(100, { phase: "done" })` runs; the Library page listens and can fire `scrollwise-book-ready`.

**Where it can break**

- **epub.js / ArrayBuffer:** If the blob isn’t converted to ArrayBuffer or the book doesn’t open, extraction fails and the book goes to error.
- **Section loading:** Sections must be loaded with the book’s loader: `section.load((path) => book.load(path))`. If you call `section.load()` with no request, the default request tries to fetch relative paths from the network and fails (0 chunks, book still marked ready).
- **Spine/sections:** If `spine.length` is 0 or every `section.load()` throws (e.g. broken EPUB), `rawChunks` is empty → we still run scoring → 0 chunks → fallback uses 0 items → **0 snippets**, but book is marked **ready**. So you get “Open” but no feed cards.
- **Scoring:** We now have a fallback: if no chunk passes 0.15 we still take the best chunks and store them with at least 0.15 so they appear in the feed.

---

## 3. Extraction (PDF)

**What happens** in `lib/extraction/pipeline-pdf.ts` and `lib/extraction/pdf-extractor.ts`:

1. **Extract text:** `extractChunksFromPdf(blob, onProgress)`:
   - Uses pdfjs to open the document and, for each page, call `getTextContent()`.
   - Splits page text into paragraphs (by double newlines), filters very short ones, and creates **raw chunks** with `sectionIndex` = page index and `location` = serialized PDF location.

2. **Score and select:** Same idea as EPUB: score every chunk, prefer those ≥ 0.15, add section variety, then **fallback** if we have chunks but none selected (take top by score, store with at least 0.15).

3. **Write to DB:** Same as EPUB: `db.snippets.bulkAdd(snippets)`, `db.books.update(..., "ready")`.

**Where it can break**

- PDF fails to load or has no extractable text → 0 chunks → 0 snippets, book still becomes “ready”.
- Fallback ensures that any book that yields at least one chunk will get at least one snippet (and thus at least one feed card).

---

## 4. Discovery (Feed)

**What happens** in `lib/feed/discovery.ts` when the Feed asks for snippets:

1. **Ready books:** `db.books.where("processingStatus").equals("ready").toArray()` → `validBookIds`.
2. **Snippets:**  
   - If we’re not excluding any books: `db.snippets.filter((s) => s.heuristicScore >= 0.15).toArray()`.  
   - If we are excluding some: `db.snippets.where("bookId").noneOf([...excluded]).and((s) => s.heuristicScore >= 0.15).toArray()`.  
   (We do **not** use `noneOf([])` — in Dexie that returns no results.)
3. **Filter to ready books only:** `snippets.filter((s) => validBookIds.has(s.bookId))`.
4. **Rank and diversify:** Score for feed (freshness, impressions, serendipity), sort, then limit consecutive same-book to 2.
5. Return the list; Feed renders one card per snippet.

**Where it can break**

- **No ready books** → `validBookIds` empty → after filter, 0 snippets.
- **No snippets in DB** for that book (extraction produced 0 chunks or failed before `bulkAdd`) → 0 cards.
- **Dexie bug:** Previously we used `noneOf([])` when excluding nothing; that returned no rows. Now we use `.filter()` when the exclude list is empty.

---

## 5. Feed UI

**What happens** in `components/feed/FeedView.tsx` and `hooks/useInfiniteSnippets.ts`:

1. On mount, `useInfiniteSnippets` calls `getDiscoverySnippets(initialCount)` and sets state to the result.
2. If the result is empty but library has ready books, Feed runs a **one-time refetch**.
3. Feed **refetches** when: (a) a book becomes ready (`scrollwise-book-ready`), (b) the user returns to the tab/window (`visibilitychange` → visible). So new snippets appear without manual Refresh after processing or when switching back from Library.
4. Library counts are refreshed on window focus so “X ready” is up to date.
5. If there are **no snippets at all**, the Feed shows the **placeholder feed** (quotes/jokes). As soon as discovery returns any snippets, the feed shows **only real cards** (placeholders disappear). Feed always starts at top; no auto-scroll to bottom when refetch runs.

---

## Quick checklist when “no feed cards” appear

1. **Library:** Does the book show **“Open”** (ready) or **“Error”**?  
   - If Error → extraction threw; check console for `[Scrollwise] Extraction failed` and fix the file or the pipeline.
2. **IndexedDB (DevTools → Application → IndexedDB → ScrollwiseDB):**
   - **books:** For that book, is `processingStatus` **"ready"**?
   - **snippets:** Are there rows whose `bookId` equals that book’s `id`?
3. **If book is ready but snippets is empty for that book:**  
   Extraction ran but produced 0 chunks (e.g. EPUB spine/sections didn’t load, or PDF had no text). With the new **fallback**, any book that produces at least one chunk will get at least one snippet; if you still see 0 snippets, the extractor is returning 0 chunks (inspect the EPUB/PDF or add logging in the extractor).
4. **If snippets exist in DB but Feed is empty:**  
   Discovery or Feed hook issue. Confirm `getDiscoverySnippets` is used with no exclude list (or correct list) and that the hook’s initial load and refetch are running (e.g. no early return or wrong `validBookIds`).

---

## Summary flow

```
Drop file → putBlob + db.books.add("extracting")
         → runEpubExtraction / runPdfExtraction (async)
              → extractChunksFromEpub/Pdf → raw chunks
              → scoreChunk (0–1), select (≥0.15 + variety, fallback: top N if none)
              → db.snippets.bulkAdd(snippets)
              → db.books.update("ready")
         → Feed: getDiscoverySnippets() → db.books "ready" + db.snippets (score ≥ 0.15)
         → validBookIds filter → rank → feed cards
```

If no cards appear, the break is either: (1) extraction never finishes or throws, (2) extraction returns 0 chunks, or (3) discovery/DB state (e.g. no snippets for that book, or wrong query). The pipeline fallback and Dexie fix address “0 chunks above threshold” and “empty exclude list”; the checklist above narrows down the rest.
