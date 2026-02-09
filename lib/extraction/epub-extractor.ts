/**
 * Extract text chunks from an EPUB by iterating the spine and querying each section's DOM.
 */

import ePub from "epubjs";
import type { RawChunk } from "./types";
import type { SnippetType } from "@/lib/db";
import { serializeLocation } from "@/lib/content/types";

const SELECTORS: { selector: string; type: SnippetType }[] = [
  { selector: "h1, h2, h3, h4, h5, h6", type: "heading" },
  { selector: "blockquote", type: "quote" },
  { selector: "li", type: "list" },
  { selector: "figcaption", type: "paragraph" },
  { selector: "p", type: "paragraph" },
];

function getTextContent(el: Element): string {
  return (el.textContent || "").trim();
}

function getChunkType(el: Element): SnippetType {
  const tag = el.tagName?.toLowerCase() || "";
  if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return "heading";
  if (tag === "blockquote") return "quote";
  if (tag === "li") return "list";
  if (tag === "figcaption") return "paragraph";
  return "paragraph";
}

function createRangeForElement(doc: Document, el: Element): Range | null {
  try {
    const range = doc.createRange();
    range.selectNodeContents(el);
    return range;
  } catch {
    return null;
  }
}

export async function extractChunksFromEpub(
  blob: Blob,
  onProgress?: (sectionIndex: number, total: number) => void
): Promise<RawChunk[]> {
  const buffer = await blob.arrayBuffer();
  const book = ePub(buffer as unknown as string);
  await book.ready;

  const spine = book.spine;
  const total = (spine as unknown as { length: number }).length;
  const chunks: RawChunk[] = [];

  // Sections must be loaded with the book's loader so content is fetched from the archive (ArrayBuffer), not from the network.
  const request = (path: string) =>
    (book as { load: (path: string) => Promise<Document> }).load(path);

  for (let i = 0; i < total; i++) {
    onProgress?.(i, total);
    const section = spine.get(i);
    if (!section) continue;
    try {
      await section.load(request);
    } catch {
      continue;
    }
    const doc = section.document;
    const root = section.contents;
    if (!doc || !root) continue;

    const elements: Element[] = [];
    for (const { selector } of SELECTORS) {
      try {
        const list = root.querySelectorAll(selector);
        list.forEach((el) => elements.push(el));
      } catch {
        // namespace or invalid selector
      }
    }
    // Dedupe and order by document order (querySelectorAll order is document order per selector, but we merged lists)
    const seen = new Set<Element>();
    const ordered: Element[] = [];
    const walk = (node: Node) => {
      if (node.nodeType !== 1) return;
      const el = node as Element;
      if (elements.includes(el) && !seen.has(el)) {
        seen.add(el);
        ordered.push(el);
      }
      node.childNodes.forEach(walk);
    };
    walk(root);

    for (const el of ordered) {
      const rawText = getTextContent(el);
      if (rawText.length < 10) continue;
      const range = createRangeForElement(doc, el);
      let cfi: string;
      try {
        cfi = range ? section.cfiFromRange(range) : "";
      } catch {
        cfi = section.cfiBase || "";
      }
      if (!cfi) continue;
      chunks.push({
        sectionIndex: i,
        type: getChunkType(el),
        rawText,
        htmlContent: el.outerHTML || null,
        location: serializeLocation({ type: "epub", cfi }),
      });
    }

    // Yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }

  return chunks;
}
