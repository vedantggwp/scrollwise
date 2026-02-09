"use client";

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import ePub from "epubjs";
import { db } from "@/lib/db";
import { serializeLocation } from "@/lib/content/types";
import type { Annotation } from "@/lib/db";
import type { ReaderTheme } from "@/lib/content/types";
import { SelectionToolbar } from "./SelectionToolbar";

function NoteModal({
  placeholder,
  onSave,
  onCancel,
}: {
  placeholder: string;
  onSave: (body: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    onSave(value);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add note"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
        <label htmlFor="note-input" className="sr-only">
          {placeholder}
        </label>
        <textarea
          id="note-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mb-4 w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-[44px] min-w-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}

const LISTENER_MARK = "data-scrollwise-selection-listeners";

/** Attach selection listeners to a single view's document (idempotent). */
function attachSelectionListenersToView(
  view: {
    contents: {
      document: Document;
      window: Window;
      cfiFromRange: (r: Range) => string;
    };
  },
  onSelection: (cfiRange: string, text: string) => void,
  isCancelled: () => boolean
): (() => void) | null {
  const doc = view.contents?.document;
  if (!doc || doc.documentElement?.getAttribute(LISTENER_MARK) === "1") return null;
  try {
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      if (isCancelled()) return;
      tryGetSelectionFromView(view, onSelection, isCancelled);
    };
    const onMouseUp = () => {
      if (isCancelled()) return;
      setTimeout(() => tryGetSelectionFromView(view, onSelection, isCancelled), 0);
    };
    doc.addEventListener("contextmenu", onContextMenu);
    doc.addEventListener("mouseup", onMouseUp);
    doc.documentElement?.setAttribute(LISTENER_MARK, "1");
    return () => {
      doc.removeEventListener("contextmenu", onContextMenu);
      doc.removeEventListener("mouseup", onMouseUp);
      doc.documentElement?.removeAttribute(LISTENER_MARK);
    };
  } catch {
    return null;
  }
}

function tryGetSelectionFromView(
  view: {
    contents: {
      document: Document;
      window: Window;
      cfiFromRange: (r: Range) => string;
    };
  },
  onSelection: (cfiRange: string, text: string) => void,
  isCancelled: () => boolean
) {
  if (isCancelled()) return;
  try {
    const doc = view.contents.document;
    const win = view.contents.window;
    const sel = win.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    if (!doc.contains(range.commonAncestorContainer)) return;
    const cfi = view.contents.cfiFromRange(range);
    const text = range.toString().trim() || "";
    onSelection(cfi, text);
  } catch {
    // cross-origin or missing API
  }
}

/** Apply reader theme and font size to a content document so changes take effect immediately. */
function applyThemeToDocument(
  doc: Document,
  theme: ReaderTheme,
  fontSizePx: number
) {
  if (!doc?.body) return;
  doc.body.style.background = READER_THEME_BG[theme];
  doc.body.style.color = READER_THEME_COLOR[theme];
  doc.body.style.fontSize = `${fontSizePx}px`;
  doc.body.style.fontFamily = READER_BODY_TYPO.fontFamily;
  doc.body.style.lineHeight = READER_BODY_TYPO.lineHeight;
  doc.body.style.margin = READER_BODY_TYPO.margin;
}

/** Fallback when epub.js "selected" does not fire: contextmenu and mouseup on iframe documents.
 * Attaches to visible views at init and re-attaches on scroll so newly visible sections get listeners.
 * Uses scrollableEl (the element that actually scrolls, e.g. the wrapper with overflow-auto) so scroll
 * events fire when user scrolls. Also applies theme to visible views on scroll so new iframes get the
 * current theme. */
function addFallbackSelectionListeners(
  rendition: {
    manager: {
      visible: () => Array<{
        contents: {
          document: Document;
          window: Window;
          cfiFromRange: (r: Range) => string;
        };
      }>;
    };
  },
  /** Element that actually scrolls (e.g. parent of the rendition container). */
  scrollableEl: HTMLElement,
  onSelection: (cfiRange: string, text: string) => void,
  getTheme: () => { readerTheme: ReaderTheme; fontSize: number },
  isCancelled: () => boolean
): () => void {
  const cleanups: (() => void)[] = [];

  function attachToVisibleViews() {
    if (isCancelled()) return;
    const { readerTheme, fontSize } = getTheme();
    try {
      const visible = rendition.manager.visible();
      for (const view of visible) {
        const cleanup = attachSelectionListenersToView(view, onSelection, isCancelled);
        if (cleanup) cleanups.push(cleanup);
        const doc = view.contents?.document;
        if (doc) applyThemeToDocument(doc, readerTheme, fontSize);
      }
    } catch {
      // manager.visible not available
    }
  }

  attachToVisibleViews();
  const scrollHandler = () => {
    attachToVisibleViews();
  };
  scrollableEl.addEventListener("scroll", scrollHandler, { passive: true });
  cleanups.push(() => scrollableEl.removeEventListener("scroll", scrollHandler));

  return () => {
    cleanups.forEach((c) => c());
  };
}

type EpubRendererProps = {
  bookId: string;
  blob: Blob;
  initialCfi: string | null;
  onLocationChange: (cfi: string) => void;
  readerTheme?: ReaderTheme;
  fontSize?: number;
  /** Called when the rendition is ready; provides removeHighlights so the parent can clear visuals (e.g. on Clear all). */
  onRenditionReady?: (api: { removeHighlights: (cfiRanges: string[]) => void }) => void;
};

type Selection = { cfiRange: string; text: string };

export type TocEntry = { id?: string; href: string; label: string; subitems: TocEntry[] };

export type EpubRendererHandle = {
  displayCfi: (cfi: string) => void;
  /** Navigate to CFI or TOC href (e.g. "chapter.xhtml" or "chapter.xhtml#id"). */
  displayTarget: (hrefOrCfi: string) => void;
  /** Remove highlight visuals for the given CFI ranges (e.g. after clearing all from DB). */
  removeHighlights: (cfiRanges: string[]) => void;
  /** Table of contents from book.navigation (empty if not ready). */
  getToc: () => TocEntry[];
  /** Search full text; returns matches with cfi and excerpt. */
  searchInBook: (query: string) => Promise<{ cfi: string; excerpt: string }[]>;
};

const READER_BODY_TYPO = {
  fontFamily: "Literata, Merriweather, Georgia, Cambria, serif",
  lineHeight: "1.6",
  margin: "0 1em",
};

const READER_THEME_BG: Record<ReaderTheme, string> = {
  light: "#ffffff",
  dark: "#1a1a1a",
  sepia: "#f4ecd8",
  midnight: "#0d1117",
};

const READER_THEME_COLOR: Record<ReaderTheme, string> = {
  light: "#1a1a1a",
  dark: "#e5e5e5",
  sepia: "#5b4636",
  midnight: "#c9d1d9",
};

const READER_THEME_RULES: Record<ReaderTheme, Record<string, Record<string, string>>> = {
  light: {
    body: {
      background: "#ffffff !important",
      color: "#1a1a1a !important",
      ...READER_BODY_TYPO,
    },
  },
  dark: {
    body: {
      background: "#1a1a1a !important",
      color: "#e5e5e5 !important",
      ...READER_BODY_TYPO,
    },
  },
  sepia: {
    body: {
      background: "#f4ecd8 !important",
      color: "#5b4636 !important",
      ...READER_BODY_TYPO,
    },
  },
  midnight: {
    body: {
      background: "#0d1117 !important",
      color: "#c9d1d9 !important",
      ...READER_BODY_TYPO,
    },
  },
};

export const EpubRenderer = forwardRef<EpubRendererHandle, EpubRendererProps>(function EpubRenderer({
  bookId,
  blob,
  initialCfi,
  onLocationChange,
  readerTheme = "light",
  fontSize = 18,
  onRenditionReady,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<ReturnType<typeof ePub> | null>(null);
  const renditionRef = useRef<{
    destroy: () => void;
    on: (ev: string, fn: (...args: unknown[]) => void) => void;
    display: (cfi?: string) => Promise<unknown>;
    annotations: {
      highlight: (cfiRange: string, data: object, cb?: (e: Event) => void, className?: string, styles?: object) => unknown;
      remove: (cfiRange: string, type: string) => void;
    };
    themes: {
      default: (theme: object) => void;
      register: (name: string, rules: object) => void;
      select: (name: string) => void;
      fontSize: (size: string) => void;
    };
  } | null>(null);
  const destroyedRef = useRef(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  /** When set, show in-app note modal instead of window.prompt. */
  const [pendingNote, setPendingNote] = useState<Selection | null>(null);
  /** For toolbar: show Remove highlight/bookmark when selection already has one. */
  const [selectionHasHighlight, setSelectionHasHighlight] = useState(false);
  const [selectionHasBookmark, setSelectionHasBookmark] = useState(false);
  const cleanupFallbackRef = useRef<(() => void) | null>(null);
  /** So fallback selection/theme logic can read current theme/fontSize without re-running init. */
  const themeRef = useRef<{ readerTheme: ReaderTheme; fontSize: number }>({ readerTheme, fontSize });
  themeRef.current = { readerTheme, fontSize };

  const persistLocation = useCallback(
    (cfi: string) => {
      onLocationChange(cfi);
      db.books.update(bookId, {
        furthestLocation: serializeLocation({ type: "epub", cfi }),
        lastOpenedAt: Date.now(),
        updatedAt: Date.now(),
      });
    },
    [bookId, onLocationChange]
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  function flattenTocItems(items: { href?: string; label?: string; subitems?: unknown[] }[]): TocEntry[] {
    if (!items?.length) return [];
    return items.map((item) => ({
      id: (item as { id?: string }).id,
      href: item.href ?? "",
      label: (item.label ?? "").trim() || "(Untitled)",
      subitems: flattenTocItems((item.subitems as { href?: string; label?: string; subitems?: unknown[] }[]) ?? []),
    }));
  }

  useImperativeHandle(
    ref,
    () => ({
      displayCfi(cfi: string) {
        const rendition = renditionRef.current;
        if (rendition) rendition.display(cfi);
      },
      displayTarget(hrefOrCfi: string) {
        const rendition = renditionRef.current;
        if (rendition) rendition.display(hrefOrCfi);
      },
      removeHighlights(cfiRanges: string[]) {
        const rendition = renditionRef.current;
        if (!rendition?.annotations) return;
        for (const cfi of cfiRanges) {
          if (cfi == null || String(cfi).length === 0) continue;
          try {
            rendition.annotations.remove(String(cfi), "highlight");
          } catch {
            // ignore invalid CFI
          }
        }
      },
      getToc(): TocEntry[] {
        const book = bookRef.current;
        const nav = (book as { navigation?: { toc?: { href?: string; label?: string; subitems?: unknown[] }[] } })?.navigation;
        const raw = nav?.toc ?? [];
        return flattenTocItems(raw);
      },
      async searchInBook(query: string): Promise<{ cfi: string; excerpt: string }[]> {
        const book = bookRef.current;
        if (!book || !query?.trim()) return [];
        const bookUnknown = book as unknown;
        const request = (bookUnknown as { request?: (url: string) => Promise<Document> }).request?.bind(book);
        if (!request) return [];
        const results: { cfi: string; excerpt: string }[] = [];
        const spine = (bookUnknown as { spine: { length: number; get: (i: number) => { load: (req: (u: string) => Promise<Document>) => Promise<unknown>; search: (q: string) => { cfi: string; excerpt: string }[]; linear?: string } } }).spine;
        for (let i = 0; i < spine.length; i++) {
          const section = spine.get(i);
          if (!section || section.linear === "no") continue;
          try {
            await section.load(request);
            const matches = section.search(query.trim());
            for (const m of matches) {
              results.push({ cfi: m.cfi, excerpt: m.excerpt ?? "" });
            }
          } catch {
            // skip section on load/search error
          }
        }
        return results;
      },
    }),
    // flattenTocItems is a stable helper; no need to recreate ref when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
    []
  );

  const addAnnotationToRendition = useCallback(
    (cfiRange: string, _annotationId: string) => {
      const rendition = renditionRef.current;
      if (!rendition) return;
      rendition.annotations.highlight(cfiRange, {}, undefined, "epubjs-hl");
    },
    []
  );

  /** Check if a highlight or note already exists at this CFI (prevent duplicate). */
  const hasHighlightOrNoteAt = useCallback(async (cfiRange: string): Promise<boolean> => {
    const existing = await db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => (a.type === "highlight" || a.type === "note") && a.cfiRange === cfiRange)
      .first();
    return existing != null;
  }, [bookId]);

  /** Check if a bookmark already exists at this CFI (prevent duplicate). */
  const hasBookmarkAt = useCallback(async (cfiRange: string): Promise<boolean> => {
    const existing = await db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => a.type === "bookmark" && a.cfiRange === cfiRange)
      .first();
    return existing != null;
  }, [bookId]);

  useEffect(() => {
    if (!selection) {
      const raf = requestAnimationFrame(() => {
        setSelectionHasHighlight(false);
        setSelectionHasBookmark(false);
      });
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    Promise.all([
      hasHighlightOrNoteAt(selection.cfiRange),
      hasBookmarkAt(selection.cfiRange),
    ]).then(([highlight, bookmark]) => {
      if (!cancelled) {
        setSelectionHasHighlight(highlight);
        setSelectionHasBookmark(bookmark);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selection?.cfiRange, hasHighlightOrNoteAt, hasBookmarkAt]);

  const loadStoredAnnotations = useCallback(async () => {
    const rendition = renditionRef.current;
    const book = bookRef.current;
    if (!rendition || !book) return;
    const list = await db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => a.type === "highlight" || a.type === "note")
      .toArray();
    for (const a of list) {
      try {
        addAnnotationToRendition(a.cfiRange, a.id);
      } catch {
        // CFI may be invalid if book changed; skip
      }
    }
  }, [bookId, addAnnotationToRendition]);

  useEffect(() => {
    destroyedRef.current = false;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const container = el;
    function whenContainerSized(): Promise<void> {
      return new Promise((resolve) => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          resolve();
          return;
        }
        const ro = new ResizeObserver(() => {
          if (container.clientWidth > 0 && container.clientHeight > 0) {
            ro.disconnect();
            resolve();
          }
        });
        ro.observe(container);
      });
    }

    const init = async () => {
      await whenContainerSized();
      if (cancelled || destroyedRef.current) return;

      const buffer = await blob.arrayBuffer();
      if (cancelled || destroyedRef.current) return;
      const book = ePub(buffer as unknown as string);
      bookRef.current = book;
      const bookOpened = (book as { opened?: Promise<unknown> }).opened ?? book.ready;
      await bookOpened;
      if (cancelled || destroyedRef.current) return;
      const rendition = book.renderTo(el, {
        width: "100%",
        height: "100%",
        spread: "none",
        manager: "continuous",
        flow: "scrolled",
        ignoreClass: "epubjs-hl",
      });
      renditionRef.current = rendition;

      rendition.themes.default({
        "::selection": {
          background: "rgba(255, 235, 120, 0.4)",
        },
        ".epubjs-hl": {
          fill: "yellow",
          "fill-opacity": "0.3",
          "mix-blend-mode": "multiply",
        },
      });
      (["light", "dark", "sepia", "midnight"] as const).forEach((name) => {
        rendition.themes.register(name, READER_THEME_RULES[name]);
      });
      rendition.themes.select(readerTheme);
      rendition.themes.fontSize(`${fontSize}px`);

      rendition.on("relocated", (loc: { start?: { cfi: string } }) => {
        if (loc?.start?.cfi) persistLocation(loc.start.cfi);
      });

      rendition.on("selected", (cfiRange: string) => {
        if (cancelled || destroyedRef.current) return;
        const rangePromise = (book as { getRange?: (cfi: string) => Promise<Range> }).getRange?.(cfiRange);
        if (rangePromise) {
          rangePromise.then((range) => {
            if (cancelled || destroyedRef.current) return;
            const text = range?.toString?.()?.trim() ?? "";
            setSelection({ cfiRange, text });
          }).catch(() => {});
        } else {
          setSelection({ cfiRange, text: "" });
        }
      });

      if (initialCfi) {
        await rendition.display(initialCfi);
      } else {
        await rendition.display();
      }

      await loadStoredAnnotations();
      if (!cancelled && onRenditionReady) {
        onRenditionReady({
          removeHighlights(cfiRanges: string[]) {
            const rend = renditionRef.current;
            if (!rend?.annotations) return;
            for (const cfi of cfiRanges) {
              if (cfi == null || String(cfi).length === 0) continue;
              try {
                rend.annotations.remove(String(cfi), "highlight");
              } catch {
                // ignore invalid CFI
              }
            }
          },
        });
      }
      if (!cancelled) {
        const scrollableEl = el.parentElement ?? el;
        cleanupFallbackRef.current = addFallbackSelectionListeners(
          rendition as unknown as Parameters<typeof addFallbackSelectionListeners>[0],
          scrollableEl,
          (cfiRange, text) => setSelection({ cfiRange, text }),
          () => themeRef.current,
          () => cancelled || destroyedRef.current
        );
      }
    };
    init();
    return () => {
      cancelled = true;
      destroyedRef.current = true;
      cleanupFallbackRef.current?.();
      cleanupFallbackRef.current = null;
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [blob, persistLocation, initialCfi, loadStoredAnnotations, onRenditionReady]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.select(readerTheme);
    rendition.themes.fontSize(`${fontSize}px`);
    // Apply theme and font size directly to content documents so the change is instant.
    // Prefer manager.visible() (same API as selection) — in continuous mode it returns on-screen
    // iframes. Fallback to getContents() if visible() is empty (e.g. before first layout).
    const applyToDoc = (doc: Document) => {
      if (doc?.body) applyThemeToDocument(doc, readerTheme, fontSize);
    };
    try {
      const manager = (rendition as { manager?: { visible: () => Array<{ contents?: { document?: Document } }> } }).manager;
      const visible = manager?.visible?.() ?? [];
      if (visible.length > 0) {
        for (const view of visible) {
          const doc = view.contents?.document;
          if (doc) applyToDoc(doc);
        }
      } else {
        const contents = (rendition as { getContents?: () => { document?: Document }[] }).getContents?.() ?? [];
        for (let i = 0; i < contents.length; i++) {
          const content = contents[i] as { document?: Document };
          if (content?.document) applyToDoc(content.document);
        }
      }
    } catch {
      // ignore
    }
  }, [readerTheme, fontSize]);

  const handleHighlight = useCallback(async () => {
    if (!selection) return;
    const already = await hasHighlightOrNoteAt(selection.cfiRange);
    if (already) {
      clearSelection();
      return;
    }
    const rendition = renditionRef.current;
    const id = crypto.randomUUID();
    const now = Date.now();
    const annotation: Annotation = {
      id,
      bookId,
      type: "highlight",
      cfiRange: selection.cfiRange,
      text: selection.text,
      noteBody: null,
      createdAt: now,
      updatedAt: now,
    };
    db.annotations.add(annotation);
    if (rendition) {
      rendition.annotations.highlight(selection.cfiRange, {}, undefined, "epubjs-hl");
    }
    clearSelection();
  }, [bookId, selection, clearSelection, hasHighlightOrNoteAt]);

  const openNoteModal = useCallback(async () => {
    if (!selection) return;
    const already = await hasHighlightOrNoteAt(selection.cfiRange);
    if (already) {
      clearSelection();
      return;
    }
    setPendingNote(selection);
  }, [selection, clearSelection, hasHighlightOrNoteAt]);

  const submitNote = useCallback(
    async (noteBody: string) => {
      const sel = pendingNote;
      setPendingNote(null);
      if (!sel) return;
      const rendition = renditionRef.current;
      const id = crypto.randomUUID();
      const now = Date.now();
      const annotation: Annotation = {
        id,
        bookId,
        type: "note",
        cfiRange: sel.cfiRange,
        text: sel.text,
        noteBody: noteBody.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
      await db.annotations.add(annotation);
      if (rendition) {
        rendition.annotations.highlight(sel.cfiRange, {}, undefined, "epubjs-hl");
      }
      clearSelection();
    },
    [bookId, pendingNote, clearSelection]
  );

  const cancelNote = useCallback(() => {
    setPendingNote(null);
  }, []);

  const handleBookmark = useCallback(async () => {
    if (!selection) return;
    const already = await hasBookmarkAt(selection.cfiRange);
    if (already) {
      clearSelection();
      return;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const annotation: Annotation = {
      id,
      bookId,
      type: "bookmark",
      cfiRange: selection.cfiRange,
      text: selection.text.slice(0, 200),
      noteBody: null,
      createdAt: now,
      updatedAt: now,
    };
    db.annotations.add(annotation);
    clearSelection();
  }, [bookId, selection, clearSelection, hasBookmarkAt]);

  const handleRemoveHighlight = useCallback(async () => {
    if (!selection) return;
    const rendition = renditionRef.current;
    const list = await db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => (a.type === "highlight" || a.type === "note") && a.cfiRange === selection.cfiRange)
      .toArray();
    for (const a of list) {
      await db.annotations.delete(a.id);
    }
    if (rendition) {
      try {
        rendition.annotations.remove(selection.cfiRange, "highlight");
      } catch {
        // ignore
      }
    }
    clearSelection();
  }, [bookId, selection, clearSelection]);

  const handleRemoveBookmark = useCallback(async () => {
    if (!selection) return;
    const existing = await db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => a.type === "bookmark" && a.cfiRange === selection.cfiRange)
      .first();
    if (existing) await db.annotations.delete(existing.id);
    clearSelection();
  }, [bookId, selection, clearSelection]);

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-auto"
      style={{ background: READER_THEME_BG[readerTheme] }}
    >
      <div
        ref={containerRef}
        className="h-full min-h-0 w-full"
        aria-label="Book content"
      />
      {pendingNote && (
        <NoteModal
          placeholder="Add a note (optional)"
          onSave={submitNote}
          onCancel={cancelNote}
        />
      )}
      {selection && (
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4">
          <SelectionToolbar
            onHighlight={handleHighlight}
            onNote={openNoteModal}
            onBookmark={handleBookmark}
            onRemoveHighlight={handleRemoveHighlight}
            onRemoveBookmark={handleRemoveBookmark}
            hasHighlight={selectionHasHighlight}
            hasBookmark={selectionHasBookmark}
          />
        </div>
      )}
    </div>
  );
});
