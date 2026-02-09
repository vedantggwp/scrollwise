"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Type, Highlighter, List, Search } from "lucide-react";
import { db } from "@/lib/db";
import { getBlob } from "@/lib/utils/file-storage";
import { searchPdf } from "@/lib/utils/pdf-search";
import { getPdfOutline } from "@/lib/utils/pdf-outline";
import { parseLocation } from "@/lib/content/types";
import { EpubRenderer, type EpubRendererHandle, type TocEntry } from "@/components/reader/EpubRenderer";
import { AnnotationSidebar } from "@/components/reader/AnnotationSidebar";
import { TocDrawer } from "@/components/reader/TocDrawer";
import { SearchDrawer } from "@/components/reader/SearchDrawer";
import type { PdfRendererHandle } from "@/components/reader/PdfRenderer";

const PdfRenderer = dynamic(
  () => import("@/components/reader/PdfRenderer").then((m) => ({ default: m.PdfRenderer })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-neutral-500 dark:text-neutral-400">Loading PDF…</div> }
);
import {
  useReaderStore,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from "@/stores/reader-store";
import type { Book } from "@/lib/db";
import type { ReaderTheme } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

const THEMES: { value: ReaderTheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "sepia", label: "Sepia" },
  { value: "midnight", label: "Midnight" },
];

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const readerTheme = useReaderStore((s) => s.readerTheme);
  const fontSize = useReaderStore((s) => s.fontSize);
  const setReaderTheme = useReaderStore((s) => s.setReaderTheme);
  const setFontSize = useReaderStore((s) => s.setFontSize);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [pdfTocEntries, setPdfTocEntries] = useState<TocEntry[]>([]);
  const epubRef = useRef<EpubRendererHandle>(null);
  const pdfRef = useRef<PdfRendererHandle>(null);
  const removeHighlightsRef = useRef<(cfiRanges: string[]) => void>(() => {});
  /** Tracks current reading position so we can restore it after remount (e.g. Clear all). */
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  /** Bump to remount reader so it reloads with no annotations (instant UX after Clear all). */
  const [readerContentKey, setReaderContentKey] = useState(0);

  const [book, setBook] = useState<Book | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refresh TOC when opening the TOC drawer so we have latest from the book (defer setState to avoid sync setState in effect)
  useEffect(() => {
    if (!tocOpen || book?.format === "pdf") return;
    const raf = requestAnimationFrame(() => {
      setTocEntries(epubRef.current?.getToc() ?? []);
    });
    return () => cancelAnimationFrame(raf);
  }, [tocOpen, book?.format]);

  // Load PDF outline when TOC drawer opens for a PDF
  useEffect(() => {
    if (!tocOpen || book?.format !== "pdf" || !blob) return;
    let cancelled = false;
    getPdfOutline(blob)
      .then((entries) => {
        if (!cancelled) setPdfTocEntries(entries as TocEntry[]);
      })
      .catch(() => {
        if (!cancelled) setPdfTocEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tocOpen, book?.format, blob]);

  const locParam = searchParams.get("loc");
  const initialLocation = locParam ? parseLocation(locParam) : null;
  const initialCfiFromUrl =
    initialLocation && initialLocation.type === "epub" ? initialLocation.cfi : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const b = await db.books.get(bookId);
      if (cancelled) return;
      if (!b) {
        setError("Book not found");
        return;
      }
      setBook(b);
      const blobData = await getBlob(b.storageKey);
      if (cancelled) return;
      if (!blobData) {
        setError("Book file not found");
        return;
      }
      setBlob(blobData);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [bookId]);


  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
        <Link
          href="/library"
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </Link>
      </div>
    );
  }

  if (!book || !blob) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  const initialCfi =
    currentCfi ??
    initialCfiFromUrl ??
    (book.furthestLocation
      ? (() => {
          const p = parseLocation(book.furthestLocation!);
          return p && p.type === "epub" ? p.cfi : null;
        })()
      : null);

  const initialPdfPage =
    book.format === "pdf"
      ? (() => {
          const loc = initialLocation?.type === "pdf" ? initialLocation : book.furthestLocation ? parseLocation(book.furthestLocation) : null;
          const page = loc && loc.type === "pdf" ? loc.page : 1;
          return Math.max(0, page - 1);
        })()
      : 0;

  const isPdf = book.format === "pdf";

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-white dark:bg-neutral-900">
      <header className="flex shrink-0 flex-col gap-1 border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {book.title}
          </h1>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            aria-label="Open table of contents"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            aria-label="Search in book"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setAnnotationsOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            aria-label="Open annotations"
          >
            <Highlighter className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
            {THEMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setReaderTheme(value)}
                className={cn(
                  "px-2 py-1 text-xs font-medium",
                  readerTheme === value
                    ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-600 dark:text-white"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                )}
                aria-label={`Theme: ${label}`}
                aria-pressed={readerTheme === value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setFontSize(fontSize - 2)}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="p-1 text-neutral-600 disabled:opacity-40 dark:text-neutral-400"
                aria-label="Decrease font size"
              >
                <Type className="h-4 w-4" />
              </button>
              <span className="min-w-[2rem] px-1 text-center text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                {fontSize}
              </span>
              <button
                type="button"
                onClick={() => setFontSize(fontSize + 2)}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="p-1 text-neutral-600 disabled:opacity-40 dark:text-neutral-400"
                aria-label="Increase font size"
              >
              <Type className="h-4 w-4 scale-110" />
            </button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        {isPdf ? (
          <PdfRenderer
            ref={pdfRef}
            bookId={bookId}
            blob={blob}
            initialPage={initialPdfPage}
            readerTheme={readerTheme}
            fontSize={fontSize}
          />
        ) : (
          <EpubRenderer
            key={readerContentKey}
            ref={epubRef}
            bookId={bookId}
            blob={blob}
            initialCfi={initialCfi}
            onLocationChange={(cfi) => setCurrentCfi(cfi)}
            readerTheme={readerTheme}
            fontSize={fontSize}
            onRenditionReady={(api) => {
              removeHighlightsRef.current = api.removeHighlights;
            }}
          />
        )}
      </div>
      <TocDrawer
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
        toc={isPdf ? pdfTocEntries : tocEntries}
        onSelect={(href) => {
          if (href.startsWith("page:")) {
            const n = parseInt(href.slice(5), 10);
            if (!Number.isNaN(n)) pdfRef.current?.jumpToPage(n);
          } else {
            epubRef.current?.displayTarget(href);
          }
        }}
        emptyMessage={isPdf ? "No table of contents for this PDF" : "No table of contents"}
      />
      <SearchDrawer
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={
          isPdf
            ? (q) => searchPdf(blob, q)
            : (q) => epubRef.current?.searchInBook(q) ?? Promise.resolve([])
        }
        onSelectMatch={(m) => {
          if (m.cfi != null) epubRef.current?.displayCfi(m.cfi);
          if (m.pageIndex != null) pdfRef.current?.jumpToPage(m.pageIndex);
        }}
      />
      <AnnotationSidebar
        bookId={bookId}
        isOpen={annotationsOpen}
        onClose={() => setAnnotationsOpen(false)}
        onSelectCfi={(cfi) => {
          epubRef.current?.displayCfi(cfi);
        }}
        onSelectPdfPage={(pageIndex) => {
          pdfRef.current?.jumpToPage(pageIndex);
        }}
        onClearAll={(cfiRanges) => {
          if (!isPdf) removeHighlightsRef.current(cfiRanges);
        }}
        onAfterClearAll={() => {
          setReaderContentKey((k) => k + 1);
        }}
      />
    </div>
  );
}
