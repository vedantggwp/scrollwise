/**
 * Content abstraction: location and adapter types for EPUB, PDF, PPTX.
 */

export type ContentLocation =
  | { type: "epub"; cfi: string }
  | { type: "pdf"; page: number }
  | { type: "pptx"; slideIndex: number };

export function serializeLocation(loc: ContentLocation): string {
  return JSON.stringify(loc);
}

export function parseLocation(s: string): ContentLocation | null {
  try {
    const loc = JSON.parse(s) as ContentLocation;
    if (loc.type === "epub" && typeof loc.cfi === "string") return loc;
    if (loc.type === "pdf" && typeof loc.page === "number") return loc;
    if (loc.type === "pptx" && typeof loc.slideIndex === "number") return loc;
    return null;
  } catch {
    return null;
  }
}

export interface TextSelection {
  text: string;
  location: ContentLocation;
}

export type ReaderTheme = "light" | "dark" | "sepia" | "midnight";
