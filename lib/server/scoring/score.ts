import type { BookChunk } from "../ingestion/types";

const BOILERPLATE_PATTERNS = [
  /\b(?:table of )?contents\b/i,
  /\bproject gutenberg\b/i,
  /\b(?:copyright|all rights reserved|terms of use)\b/i,
  /\b(?:full )?licen[cs]e\b/i,
  /\b(?:warrant(?:y|ies)|redistribut(?:e|ion)|trademark)\b/i,
  /\btranscriber(?:'s|’s)? note\b/i,
  /(?:https?:\/\/|www\.|\b\S+@\S+\.\S+\b)/i,
];

const STRIKING_PATTERNS = [
  /\bnot\b[^.!?]{0,120}\bbut\b/i,
  /\b(?:life|mind|soul|wisdom|truth|freedom|courage|character|attention)\b/i,
  /\b(?:always|never|nothing|everything|must|should|whoever)\b/i,
  /\b(?:what matters|the measure of|the greatest|the only|remember that)\b/i,
];

const KEY_PHRASES = [
  "in conclusion",
  "importantly",
  "for example",
  "in other words",
  "in summary",
  "to summarize",
  "the key point",
  "it is worth noting",
  "research shows",
  "studies show",
];

function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function sentences(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function uppercaseRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  return letters.filter((letter) => letter === letter.toUpperCase()).length / letters.length;
}

function listLikeLineCount(text: string): number {
  return text.split(/\n+/).filter((line) => {
    const trimmed = line.trim();
    return /^(?:[IVXLCDM]+|\d+)[.)\s-]+\p{L}/iu.test(trimmed)
      || /\.{3,}\s*\d+\s*$/.test(trimmed);
  }).length;
}

function clamp(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 10_000) / 10_000;
}

/** Rate how striking, quotable, and self-contained a chunk is. */
export function scoreChunk(chunk: BookChunk): number {
  const text = chunk.rawText.trim();
  if (!text) return 0;

  const textWords = words(text);
  const textSentences = sentences(text);
  const wordCount = textWords.length;
  let score = 0.28;

  if (wordCount < 25) score -= 0.35;
  else if (wordCount < 60) score -= 0.08;
  else if (wordCount <= 360) score += 0.12;
  else if (wordCount <= 520) score += 0.04;
  else score -= 0.12;

  const punctuatedSentences = textSentences.filter((sentence) => /[.!?]["'’”]?$/.test(sentence));
  const averageSentenceLength = wordCount / Math.max(punctuatedSentences.length, 1);
  if (punctuatedSentences.length >= 2 && punctuatedSentences.length <= 24) score += 0.08;
  if (averageSentenceLength >= 7 && averageSentenceLength <= 35) score += 0.07;
  if (/^["'‘“(\[]?\p{Lu}/u.test(text)) score += 0.04;
  if (/[.!?]["'’”)]?$/.test(text)) score += 0.06;

  const memorableSentences = punctuatedSentences.filter((sentence) => {
    const count = words(sentence).length;
    return count >= 6 && count <= 35;
  }).length;
  if (memorableSentences > 0) score += 0.08;
  if (memorableSentences > 1) score += 0.04;

  score += Math.min(
    0.16,
    STRIKING_PATTERNS.filter((pattern) => pattern.test(text)).length * 0.04,
  );
  if (KEY_PHRASES.some((phrase) => text.toLowerCase().includes(phrase))) score += 0.04;
  if (/[?]/.test(text)) score += 0.03;
  if (/[;:—]/.test(text)) score += 0.02;

  const boilerplateHits = BOILERPLATE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  score -= Math.min(0.8, boilerplateHits * 0.22);
  const structuralContext = `${chunk.breadcrumb} ${chunk.sectionPath.join(" ")}`;
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(structuralContext))) {
    score -= 0.35;
  }
  if (listLikeLineCount(text) >= 3) score -= 0.28;
  if (uppercaseRatio(text) > 0.45 && wordCount > 12) score -= 0.15;

  const numericWords = textWords.filter((word) => /^\d+$/.test(word)).length;
  if (numericWords / Math.max(wordCount, 1) > 0.12) score -= 0.15;
  if (/\b(?:figure|table|equation|section)\s+\d/i.test(text)) score -= 0.12;
  if (/^(?:and|but|or|which|because|therefore)\b/i.test(text)) score -= 0.06;

  return clamp(score);
}
