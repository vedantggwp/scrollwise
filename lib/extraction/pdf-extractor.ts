/**
 * Extract text chunks from a PDF by page (getTextContent) and paragraph grouping.
 */

import * as pdfjsLib from "pdfjs-dist";
import { ensurePdfWorker } from "@/lib/utils/pdf-worker";
import type { RawChunk } from "./types";
import type { SnippetType } from "@/lib/db";
import { serializeLocation } from "@/lib/content/types";

const MIN_CHUNK_LENGTH = 10;

export async function extractChunksFromPdf(
  blob: Blob,
  onProgress?: (pageIndex: number, totalPages: number) => void
): Promise<RawChunk[]> {
  ensurePdfWorker();
  const buffer = await blob.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const chunks: RawChunk[] = [];

  for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    onProgress?.(pageIndex, numPages);
    const page = await doc.getPage(pageIndex + 1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("");
    const paragraphs = pageText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= MIN_CHUNK_LENGTH);

    const location = serializeLocation({ type: "pdf", page: pageIndex + 1 });
    for (const rawText of paragraphs) {
      chunks.push({
        sectionIndex: pageIndex,
        type: "paragraph" as SnippetType,
        rawText,
        htmlContent: null,
        location,
      });
    }

    await new Promise((r) => setTimeout(r, 0));
  }

  return chunks;
}
