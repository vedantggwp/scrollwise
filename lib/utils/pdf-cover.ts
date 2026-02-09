/**
 * Extract PDF first page as cover image. Loaded dynamically so pdfjs-dist is not in the main bundle.
 */

import * as pdfjsLib from "pdfjs-dist";
import { ensurePdfWorker } from "./pdf-worker";

export async function extractPdfCover(blob: Blob): Promise<string | null> {
  try {
    ensurePdfWorker();
    const buffer = await blob.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}
