/**
 * Extract cover image from an EPUB as a data URL for storage.
 * PDF cover is in pdf-cover.ts (dynamic import to avoid bundling pdfjs-dist in main bundle).
 */

import ePub from "epubjs";

export async function extractEpubCover(blob: Blob): Promise<string | null> {
  try {
    const buffer = await blob.arrayBuffer();
    const book = ePub(buffer as unknown as string);
    await book.ready;
    const coverUrl = await book.coverUrl();
    if (!coverUrl) return null;
    const res = await fetch(coverUrl);
    const coverBlob = await res.blob();
    if (!coverBlob.type.startsWith("image/")) return null;
    return await blobToDataUrl(coverBlob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
