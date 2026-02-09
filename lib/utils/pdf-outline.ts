/**
 * Load PDF outline (bookmarks) and convert to TOC entries.
 * Each entry uses href "page:N" (0-based page index) for the reader to jump.
 */

import * as pdfjsLib from "pdfjs-dist";
import { ensurePdfWorker } from "./pdf-worker";

/** Same shape as TocEntry in EpubRenderer for use in TocDrawer. */
export type PdfTocEntry = { href: string; label: string; subitems: PdfTocEntry[] };

function isPageRef(v: unknown): v is { num: number; gen: number } | number {
  if (typeof v === "number" && Number.isInteger(v)) return true;
  return (
    v != null &&
    typeof v === "object" &&
    "num" in (v as object) &&
    "gen" in (v as object)
  );
}

async function resolvePageIndex(
  doc: pdfjsLib.PDFDocumentProxy,
  dest: string | unknown[] | null
): Promise<number | null> {
  if (!dest) return null;
  let ref: unknown;
  if (typeof dest === "string") {
    const resolved = await doc.getDestination(dest);
    if (!resolved || !Array.isArray(resolved)) return null;
    ref = resolved[0];
  } else if (Array.isArray(dest) && dest.length > 0) {
    ref = dest[0];
  } else {
    return null;
  }
  if (!isPageRef(ref)) return null;
  if (typeof ref === "number") {
    return Math.max(0, ref - 1);
  }
  try {
    return await doc.getPageIndex(ref as { num: number; gen: number });
  } catch {
    return null;
  }
}

async function outlineToToc(
  doc: pdfjsLib.PDFDocumentProxy,
  items: Array<{ title: string; dest: string | unknown[] | null; items?: unknown[] }>
): Promise<PdfTocEntry[]> {
  const out: PdfTocEntry[] = [];
  for (const item of items) {
    const pageIndex = await resolvePageIndex(doc, item.dest);
    const href = pageIndex != null ? `page:${pageIndex}` : "";
    const subitems = Array.isArray(item.items)
      ? await outlineToToc(doc, item.items as Array<{ title: string; dest: string | unknown[] | null; items?: unknown[] }>)
      : [];
    const label = typeof item.title === "string" ? item.title : "";
    out.push({ href, label, subitems });
  }
  return out;
}

export async function getPdfOutline(blob: Blob): Promise<PdfTocEntry[]> {
  ensurePdfWorker();
  const buffer = await blob.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const outline = await doc.getOutline();
  if (!outline || outline.length === 0) return [];
  return outlineToToc(doc, outline);
}
