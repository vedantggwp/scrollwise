/**
 * Detect book format from file name or MIME type.
 */

export type BookFormat = "epub" | "pdf" | "pptx";

export function detectFormat(file: File): BookFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".epub")) return "epub";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".pptx")) return "pptx";
  const mime = file.type;
  if (mime === "application/epub+zip") return "epub";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  return null;
}
