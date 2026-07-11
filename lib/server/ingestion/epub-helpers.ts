import { posix } from "node:path";

import { XMLParser } from "fast-xml-parser";

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  textNodeName: "#text",
});

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as { "#text": unknown })["#text"]);
  }
  return "";
}

export function archivePath(baseFile: string, href: string): string {
  const decoded = decodeURIComponent(href.split("#", 1)[0]);
  return posix.normalize(posix.join(posix.dirname(baseFile), decoded));
}

export function normalizeText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export interface TocEntry {
  path: string;
  fragment?: string;
  title: string;
}

interface XmlNode {
  [key: string]: unknown;
}

export function parseNcx(xml: string, ncxPath: string): TocEntry[] {
  const parsed = xmlParser.parse(xml) as XmlNode;
  const ncx = parsed.ncx as XmlNode | undefined;
  const navMap = ncx?.navMap as XmlNode | undefined;
  const entries: TocEntry[] = [];

  const visit = (node: XmlNode): void => {
    const content = node.content as XmlNode | undefined;
    const label = node.navLabel as XmlNode | undefined;
    const src = typeof content?.src === "string" ? content.src : "";
    const title = textValue(label?.text);
    if (src && title) {
      const [href, fragment] = src.split("#", 2);
      entries.push({
        path: archivePath(ncxPath, href),
        fragment: fragment ? decodeURIComponent(fragment) : undefined,
        title,
      });
    }
    for (const child of asArray(node.navPoint as XmlNode | XmlNode[] | undefined)) {
      visit(child);
    }
  };

  for (const node of asArray(navMap?.navPoint as XmlNode | XmlNode[] | undefined)) {
    visit(node);
  }
  return entries;
}
