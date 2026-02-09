# Scrollwise: Data flow and SOP

Single source of truth for **what data we keep** and **how upload → feed** works.

---

## Source of truth

- **IndexedDB** (Dexie, `ScrollwiseDB`): the only persistent store.
  - **`books`** — one row per uploaded file: id, title, format, `processingStatus` (pending | extracting | scoring | ready | error), `processingProgress`, `storageKey`, etc.
  - **`snippets`** — one row per extracted snippet: bookId, location, heuristicScore, etc.
  - **`feedConfig`** — feed settings (modes, filters).
- **Blob storage** (OPFS with IndexedDB fallback): file bytes keyed by `book.storageKey`. No separate "count" of files; the list of uploads is `db.books`.

All counts and lists (how many books, how many ready, what shows in Feed) are derived from these tables. There is no separate "upload count" or "processed count" store; we query IndexedDB.

---

## Standard flow (SOP)

1. **Upload (Library)**
   - User drops file(s). For each EPUB:
     - `putBlob(storageKey, file)` → store bytes.
     - `db.books.add(book)` with `processingStatus: "extracting"`.
     - UI: Library shows the book and a processing indicator.
2. **Processing**
   - `runEpubExtraction(bookId, file, onProgress)`:
     - Extract chunks from EPUB (epub.js + spine/sections).
     - Score and filter chunks → snippets.
     - `db.snippets.bulkAdd(snippets)`.
     - `db.books.update(bookId, { processingStatus: "ready", ... })`.
   - Progress is written back to `db.books` and to the in-memory library store so the UI updates.
3. **Feed**
   - Feed reads only from IndexedDB:
     - `db.books.where("processingStatus").equals("ready")` → valid book IDs.
     - `db.snippets` filtered by those IDs and by `heuristicScore >= 0.15`.
   - So: **no ready books ⇒ no snippets in Feed.** If books are "ready" but Feed is empty, snippets for that book were never added (e.g. extraction returned 0 chunks).
4. **Reader**
   - Opens from Library or from a Feed card (with `?loc=...`). Loads blob via `getBlob(book.storageKey)` and renders with epub.js. Saves `furthestLocation` back to `db.books`.

---

## What the UI shows

- **Library:** List from `db.books` (loaded on mount; in-memory store synced from DB). Summary line: total books and counts by status (ready, processing, error).
- **Feed:** Snippets from discovery query (ready books + snippets table). Empty state explains Library counts (X books, Y ready) and links to Library.
- **Reader:** One book; blob from storage; location from URL or `book.furthestLocation`.

If something is "missing" (e.g. 2 books in Library but 0 in Feed), the data to explain it is in IndexedDB: check `books.processingStatus` and whether `snippets` has rows for that `bookId`. The Library summary and Feed empty state are intended to make that visible without opening DevTools.

**Full pipeline (upload → feed cards):** See [INGESTION_TO_FEED.md](INGESTION_TO_FEED.md) for the step-by-step path, where it can break, and a troubleshooting checklist.
