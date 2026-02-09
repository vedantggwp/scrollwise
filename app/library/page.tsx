"use client";

import { useEffect, useCallback, useState } from "react";
import type { Book } from "@/lib/db";
import { db } from "@/lib/db";
import { putBlob, getBlob, deleteBlob } from "@/lib/utils/file-storage";
import { detectFormat } from "@/lib/utils/format-detector";
import { sha256Hex } from "@/lib/utils/hash";
import { extractEpubCover } from "@/lib/utils/cover-extractor";
import { runEpubExtraction } from "@/lib/extraction/pipeline";
import { useLibraryStore } from "@/stores/library-store";
import { UploadDropzone } from "@/components/library/UploadDropzone";
import { BookGrid } from "@/components/library/BookGrid";

export default function LibraryPage() {
  const { books, setBooks, addBook, updateBook, removeBook } = useLibraryStore();

  useEffect(() => {
    const load = async () => {
      const all = await db.books.orderBy("addedAt").reverse().toArray();
      setBooks(all);
    };
    load();
  }, [setBooks]);

  async function handleFiles(files: File[]) {
    for (const file of files) {
      const format = detectFormat(file);
      if (!format) {
        console.warn("[Scrollwise] Unsupported file:", file.name);
        setUnsupportedToast("Only EPUB and PDF supported right now.");
        continue;
      }
      if (format !== "epub" && format !== "pdf") {
        setUnsupportedToast("Only EPUB and PDF supported right now.");
        continue;
      }
      const id = crypto.randomUUID();
      const fileHash = await sha256Hex(file);
      const storageKey = `book-${id}`;
      await putBlob(storageKey, file);

      const title =
        format === "epub"
          ? file.name.replace(/\.epub$/i, "") || "Untitled"
          : file.name.replace(/\.pdf$/i, "") || "Untitled";

      const book = {
        id,
        title,
        author: "Unknown",
        format,
        coverUrl: null,
        fileSize: file.size,
        fileHash,
        storageKey,
        totalSections: 0,
        metadata: {},
        processingStatus: "extracting" as const,
        processingProgress: 0,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: null,
        furthestLocation: null,
        tags: [],
      };
      await db.books.add(book);
      addBook(book);

      if (format === "epub") {
        extractEpubCover(file).then((coverUrl) => {
          if (coverUrl) {
            db.books.update(id, { coverUrl, updatedAt: Date.now() });
            updateBook(id, { coverUrl, updatedAt: Date.now() });
          }
        });
        runEpubExtraction(id, file, (progress, phase) => {
          const status =
            phase.phase === "done" ? "ready" : phase.phase === "extracting" ? "extracting" : "scoring";
          db.books.update(id, {
            processingProgress: progress,
            processingStatus: status,
            updatedAt: Date.now(),
          });
          updateBook(id, {
            processingProgress: progress,
            processingStatus: status,
            updatedAt: Date.now(),
          });
          if (phase.phase === "done" && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("scrollwise-book-ready", { detail: { bookId: id } }));
          }
        }).catch((err) => {
          console.error("[Scrollwise] Extraction failed:", err);
          db.books.update(id, {
            processingStatus: "error",
            processingProgress: 0,
            updatedAt: Date.now(),
          });
          updateBook(id, {
            processingStatus: "error",
            processingProgress: 0,
            updatedAt: Date.now(),
          });
        });
      } else {
        void (async () => {
          const [{ extractPdfCover }, { runPdfExtraction }] = await Promise.all([
            import("@/lib/utils/pdf-cover"),
            import("@/lib/extraction/pipeline-pdf"),
          ]);
          extractPdfCover(file).then((coverUrl) => {
            if (coverUrl) {
              db.books.update(id, { coverUrl, updatedAt: Date.now() });
              updateBook(id, { coverUrl, updatedAt: Date.now() });
            }
          });
          runPdfExtraction(id, file, (progress, phase) => {
            const status =
              phase.phase === "done" ? "ready" : phase.phase === "extracting" ? "extracting" : "scoring";
            db.books.update(id, {
              processingProgress: progress,
              processingStatus: status,
              updatedAt: Date.now(),
            });
            updateBook(id, {
              processingProgress: progress,
              processingStatus: status,
              updatedAt: Date.now(),
            });
            if (phase.phase === "done" && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("scrollwise-book-ready", { detail: { bookId: id } }));
            }
          }).catch((err) => {
            console.error("[Scrollwise] PDF extraction failed:", err);
            db.books.update(id, {
              processingStatus: "error",
              processingProgress: 0,
              updatedAt: Date.now(),
            });
            updateBook(id, {
              processingStatus: "error",
              processingProgress: 0,
              updatedAt: Date.now(),
            });
          });
        })();
      }
    }
  }

  const handleRetry = useCallback(
    async (book: Book) => {
      const blob = await getBlob(book.storageKey);
      if (!blob) {
        console.error("[Scrollwise] No blob for book", book.id);
        return;
      }
      await db.snippets.where("bookId").equals(book.id).delete();
      await db.books.update(book.id, {
        processingStatus: "extracting",
        processingProgress: 0,
        updatedAt: Date.now(),
      });
      updateBook(book.id, {
        processingStatus: "extracting",
        processingProgress: 0,
        updatedAt: Date.now(),
      });
      const onProgress = (progress: number, phase: { phase: string }) => {
        const status =
          phase.phase === "done" ? "ready" : phase.phase === "extracting" ? "extracting" : "scoring";
        db.books.update(book.id, {
          processingProgress: progress,
          processingStatus: status,
          updatedAt: Date.now(),
        });
        updateBook(book.id, {
          processingProgress: progress,
          processingStatus: status,
          updatedAt: Date.now(),
        });
        if (phase.phase === "done" && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("scrollwise-book-ready", { detail: { bookId: book.id } }));
        }
      };
      const onError = (err: unknown) => {
        console.error("[Scrollwise] Retry extraction failed:", err);
        db.books.update(book.id, {
          processingStatus: "error",
          processingProgress: 0,
          updatedAt: Date.now(),
        });
        updateBook(book.id, {
          processingStatus: "error",
          processingProgress: 0,
          updatedAt: Date.now(),
        });
      };
      if (book.format === "pdf") {
        const { runPdfExtraction } = await import("@/lib/extraction/pipeline-pdf");
        runPdfExtraction(book.id, blob, onProgress).catch(onError);
      } else {
        runEpubExtraction(book.id, blob, onProgress).catch(onError);
      }
    },
    [updateBook]
  );

  const handleRemove = useCallback(
    async (book: Book) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm("Remove this book? Snippets and annotations will be deleted.")
      )
        return;
      await db.books.delete(book.id);
      await db.snippets.where("bookId").equals(book.id).delete();
      await db.annotations.where("bookId").equals(book.id).delete();
      await deleteBlob(book.storageKey);
      removeBook(book.id);
    },
    [removeBook]
  );

  const [unsupportedToast, setUnsupportedToast] = useState<string | null>(null);

  useEffect(() => {
    if (!unsupportedToast) return;
    const t = setTimeout(() => setUnsupportedToast(null), 4000);
    return () => clearTimeout(t);
  }, [unsupportedToast]);

  const isEmpty = books.length === 0;
  const readyBooks = books.filter((b) => b.processingStatus === "ready");
  const otherBooks = books.filter((b) => b.processingStatus !== "ready");
  const countByStatus = books.reduce(
    (acc, b) => {
      acc[b.processingStatus] = (acc[b.processingStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const readyCount = countByStatus.ready ?? 0;
  const processingCount = (countByStatus.extracting ?? 0) + (countByStatus.scoring ?? 0) + (countByStatus.pending ?? 0);
  const errorCount = countByStatus.error ?? 0;
  const summaryParts: string[] = [];
  if (books.length > 0) summaryParts.push(`${books.length} book${books.length === 1 ? "" : "s"}`);
  if (readyCount > 0) summaryParts.push(`${readyCount} ready`);
  if (processingCount > 0) summaryParts.push(`${processingCount} processing`);
  if (errorCount > 0) summaryParts.push(`${errorCount} error`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {unsupportedToast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {unsupportedToast}
        </div>
      )}
      <h1 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        Library
      </h1>
      {summaryParts.length > 0 && (
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {summaryParts.join(" · ")}
        </p>
      )}
      {isEmpty ? (
        <div className="flex flex-col gap-4">
          <p className="text-center text-neutral-600 dark:text-neutral-400">
            Add your first book
          </p>
          <UploadDropzone onFiles={handleFiles} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <UploadDropzone onFiles={handleFiles} className="p-4" />
          {readyBooks.length > 0 && (
            <section aria-labelledby="library-ready-heading">
              <h2
                id="library-ready-heading"
                className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
              >
                Ready to read
              </h2>
              <BookGrid
                books={readyBooks}
                layout="grid"
                onRetry={handleRetry}
                onRemove={handleRemove}
              />
            </section>
          )}
          {otherBooks.length > 0 && (
            <section aria-labelledby="library-other-heading">
              <h2
                id="library-other-heading"
                className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
              >
                {processingCount > 0 && errorCount > 0
                  ? "Processing & errors"
                  : processingCount > 0
                    ? "Processing"
                    : "Errors"}
              </h2>
              <BookGrid
                books={otherBooks}
                layout="list"
                onRetry={handleRetry}
                onRemove={handleRemove}
                className="flex flex-col gap-3"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
