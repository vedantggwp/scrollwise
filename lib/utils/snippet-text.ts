/**
 * Normalize and format extracted PDF/EPUB text for feed cards.
 * Fixes concatenated words (e.g. "MASTERYThe", "Conceptso1") and redundant headline/body.
 */

/** Insert spaces where PDF/EPUB extraction often concatenates: before capitals after lowercase, between letter and digit. */
export function normalizeExtractedText(text: string): string {
  if (!text?.trim()) return text;
  let out = text
    // Lowercase letter or digit followed by uppercase letter -> add space
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Uppercase letter followed by uppercase+lowercase word (e.g. "MASTERYThe" -> "MASTERY The")
    .replace(/([A-Z])([A-Z][a-z]\w*)/g, "$1 $2")
    // Letter followed by digit (e.g. "Conceptso1" -> "Concepts o1")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    // Digit followed by letter (e.g. "01Fundamentals" -> "01 Fundamentals")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2");
  // Collapse multiple spaces
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

const MAX_HEADLINE_CHARS = 72;
const MIN_HEADLINE_WORDS = 4;

/**
 * Split normalized text into a short headline and body.
 * Headline = first sentence or first ~72 chars; body = rest (no duplicate headline).
 */
export function formatHeadlineAndBody(rawText: string): { headline: string; body: string } {
  const normalized = normalizeExtractedText(rawText);
  if (!normalized) return { headline: "Snippet", body: "" };

  // Prefer first sentence boundary
  const sentenceEnd = normalized.search(/[.!?]\s+/);
  let headline: string;
  let bodyStart: number;

  if (sentenceEnd > 0 && sentenceEnd <= MAX_HEADLINE_CHARS + 20) {
    headline = normalized.slice(0, sentenceEnd + 1).trim();
    bodyStart = sentenceEnd + 1;
  } else {
    // No sentence end in range: take first N chars at a word boundary
    const at = Math.min(MAX_HEADLINE_CHARS, normalized.length);
    let cut = at;
    if (at < normalized.length) {
      const space = normalized.lastIndexOf(" ", at);
      if (space >= MIN_HEADLINE_WORDS * 5) cut = space;
    }
    headline = normalized.slice(0, cut).trim();
    bodyStart = cut;
  }

  let body = normalized.slice(bodyStart).trim();
  // Remove duplicate: if body starts with headline (or first part of it), strip it
  const headlineStart = headline.slice(0, 30);
  if (body.toLowerCase().startsWith(headlineStart.toLowerCase())) {
    body = body.slice(headlineStart.length).trim();
  }
  if (headline.length < 3) headline = normalized.slice(0, MAX_HEADLINE_CHARS).trim();
  if (headline === body) body = "";

  return { headline: headline || "Snippet", body };
}
