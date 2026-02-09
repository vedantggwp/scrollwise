/**
 * Search text in a PDF and return page index + excerpt per match.
 * Used by the reader Search drawer for PDF books.
 */

import * as pdfjsLib from "pdfjs-dist";
import { ensurePdfWorker } from "./pdf-worker";

const EXCERPT_RADIUS = 60;

export type PdfSearchMatch = { pageIndex: number; excerpt: string };

export async function searchPdf(
  blob: Blob,
  query: string
): Promise<PdfSearchMatch[]> {
  const q = query.trim();
  if (!q) return [];

  ensurePdfWorker();
  const buffer = await blob.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const results: PdfSearchMatch[] = [];

  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    const page = await doc.getPage(pageIndex + 1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    const lower = pageText.toLowerCase();
    const qLower = q.toLowerCase();
    const idx = lower.indexOf(qLower);
    if (idx === -1) continue;

    const start = Math.max(0, idx - EXCERPT_RADIUS);
    const end = Math.min(pageText.length, idx + q.length + EXCERPT_RADIUS);
    let excerpt = pageText.slice(start, end).trim();
    if (excerpt.length > 120) {
      excerpt = (start > 0 ? "…" : "") + excerpt.slice(0, 117) + "…";
    }
    results.push({ pageIndex, excerpt: excerpt || "(No excerpt)" });
  }

  return results;
}
