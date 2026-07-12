import { unzipSync } from "fflate";
import { parseHTML } from "linkedom";

import {
  archivePath,
  asArray,
  normalizeText,
  parseNcx,
  textValue,
  type TocEntry,
  xmlParser,
} from "./epub-helpers";
import {
  IngestionError,
  type BookBlock,
  type BookChapter,
  type StructuredBook,
} from "./types";

interface XmlNode {
  [key: string]: unknown;
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
}

const decoder = new TextDecoder();

function readText(files: Record<string, Uint8Array>, path: string): string {
  const data = files[path];
  if (!data) {
    throw new IngestionError(
      "epub",
      "INVALID_EPUB",
      `EPUB references a missing file: ${path}`,
    );
  }
  return decoder.decode(data);
}

function parseNavDocument(html: string, navPath: string): TocEntry[] {
  const { document } = parseHTML(html);
  const navs = [...document.querySelectorAll("nav")];
  const tocNav = navs.find((nav) => {
    const type = nav.getAttribute("epub:type") ?? nav.getAttribute("type") ?? "";
    return type.split(/\s+/).includes("toc");
  });
  if (!tocNav) return [];

  return [...tocNav.querySelectorAll("a")].flatMap((anchor) => {
    const href = anchor.getAttribute("href");
    const title = normalizeText(anchor.textContent);
    if (!href || !title) return [];
    const [file, fragment] = href.split("#", 2);
    return [{
      path: archivePath(navPath, file),
      fragment: fragment ? decodeURIComponent(fragment) : undefined,
      title,
    }];
  });
}

function tocEntries(
  files: Record<string, Uint8Array>,
  opfPath: string,
  manifest: ManifestItem[],
  tocId: string,
): TocEntry[] {
  const nav = manifest.find((item) => item.properties.split(/\s+/).includes("nav"));
  if (nav) {
    const navPath = archivePath(opfPath, nav.href);
    return parseNavDocument(readText(files, navPath), navPath);
  }

  const ncx = manifest.find((item) => item.id === tocId)
    ?? manifest.find((item) => item.mediaType === "application/x-dtbncx+xml");
  if (!ncx) return [];
  const ncxPath = archivePath(opfPath, ncx.href);
  return parseNcx(readText(files, ncxPath), ncxPath);
}

function blockFromElement(element: Element): BookBlock | undefined {
  const tag = element.tagName.toLowerCase();
  const text = normalizeText(element.textContent);
  if (!text) return undefined;
  if (/^h[1-6]$/.test(tag)) {
    return { type: "heading", level: Number(tag.slice(1)), text };
  }
  if (tag === "p") return { type: "paragraph", text };
  return undefined;
}

function chaptersFromDocument(
  html: string,
  path: string,
  toc: TocEntry[],
): BookChapter[] {
  const { document } = parseHTML(html);
  const root = document.body ?? document.documentElement;
  const boundaries = new Map(
    toc.filter((entry) => entry.path === path && entry.fragment)
      .map((entry) => [entry.fragment as string, entry.title]),
  );
  const pathTitle = toc.find((entry) => entry.path === path && !entry.fragment)?.title;
  const chapters: BookChapter[] = [];
  let current: BookChapter = { title: pathTitle ?? "", blocks: [] };

  const flush = (): void => {
    if (!current.blocks.some((block) => block.type === "paragraph")) return;
    const firstHeading = current.blocks.find((block) => block.type === "heading");
    chapters.push({
      title: normalizeText(current.title || firstHeading?.text || `Chapter ${chapters.length + 1}`),
      blocks: current.blocks,
    });
  };

  const boundaryTitleFor = (element: Element): string | undefined => {
    for (const candidate of [element, ...element.querySelectorAll("[id], [name]")]) {
      const title = boundaries.get(candidate.getAttribute("id") ?? "")
        ?? boundaries.get(candidate.getAttribute("name") ?? "");
      if (title) return title;
    }
    return undefined;
  };

  const walk = (element: Element): void => {
    const boundaryTitle = boundaryTitleFor(element);
    if (boundaryTitle) {
      flush();
      current = { title: boundaryTitle, blocks: [] };
    }

    const block = blockFromElement(element);
    if (block) {
      current.blocks.push(block);
      return;
    }
    for (const child of [...element.children]) walk(child);
  };

  walk(root);
  flush();
  return chapters;
}

function unpack(input: Buffer | Uint8Array): Record<string, Uint8Array> {
  if (input.byteLength === 0) {
    throw new IngestionError("epub", "INVALID_INPUT", "EPUB input is empty");
  }
  try {
    return unzipSync(new Uint8Array(input));
  } catch (error) {
    throw new IngestionError(
      "epub",
      "INVALID_ARCHIVE",
      "Unable to unzip EPUB input",
      { cause: error },
    );
  }
}

/** Parse an EPUB archive into ordered, structure-preserving chapters. */
export function parseEpub(input: Buffer | Uint8Array): StructuredBook {
  try {
    const files = unpack(input);
    const containerData = files["META-INF/container.xml"];
    if (!containerData) {
      throw new IngestionError(
        "epub",
        "MISSING_CONTAINER",
        "EPUB is missing META-INF/container.xml",
      );
    }

    const container = xmlParser.parse(decoder.decode(containerData)) as XmlNode;
    const rootfiles = (container.container as XmlNode | undefined)?.rootfiles as XmlNode | undefined;
    const rootfile = asArray(rootfiles?.rootfile as XmlNode | XmlNode[] | undefined)[0];
    const opfPath = typeof rootfile?.["full-path"] === "string"
      ? rootfile["full-path"]
      : "";
    if (!opfPath || !files[opfPath]) {
      throw new IngestionError("epub", "MISSING_PACKAGE", "EPUB package document is missing");
    }

    const parsedOpf = xmlParser.parse(readText(files, opfPath)) as XmlNode;
    const pkg = parsedOpf.package as XmlNode | undefined;
    const metadata = pkg?.metadata as XmlNode | undefined;
    const manifestNode = pkg?.manifest as XmlNode | undefined;
    const spineNode = pkg?.spine as XmlNode | undefined;
    if (!pkg || !manifestNode || !spineNode) {
      throw new IngestionError("epub", "INVALID_EPUB", "EPUB package has no manifest or spine");
    }

    const manifest = asArray(manifestNode.item as XmlNode | XmlNode[] | undefined).map((item) => ({
      id: String(item.id ?? ""),
      href: String(item.href ?? ""),
      mediaType: String(item["media-type"] ?? ""),
      properties: String(item.properties ?? ""),
    }));
    const byId = new Map(manifest.map((item) => [item.id, item]));
    const toc = tocEntries(files, opfPath, manifest, String(spineNode.toc ?? ""));
    const chapters: BookChapter[] = [];

    for (const ref of asArray(spineNode.itemref as XmlNode | XmlNode[] | undefined)) {
      const item = byId.get(String(ref.idref ?? ""));
      if (!item || !/xhtml|html/.test(item.mediaType)) continue;
      const path = archivePath(opfPath, item.href);
      chapters.push(...chaptersFromDocument(readText(files, path), path, toc));
    }

    if (chapters.length === 0) {
      throw new IngestionError("epub", "EMPTY_DOCUMENT", "EPUB contains no readable paragraphs");
    }
    return {
      metadata: {
        title: textValue(metadata?.title) || "Untitled",
        author: textValue(metadata?.creator) || "Unknown author",
      },
      chapters,
    };
  } catch (error) {
    if (error instanceof IngestionError) throw error;
    throw new IngestionError("epub", "INVALID_EPUB", "Unable to parse EPUB input", {
      cause: error,
    });
  }
}
