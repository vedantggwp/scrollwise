import type { BookChunk } from "../ingestion/types";
import { scoreChunk } from "./score";

const MIN_TARGET_CHARS = 120;
const MAX_TARGET_CHARS = 320;
const IDEAL_CHARS = 220;
const MAX_SENTENCES = 3;
const VALID_START = /^(?:\p{Lu}|["'“‘])/u;
const TERMINAL_END = /[.!?…]["'’”]?$/u;

export interface QuoteTile {
  chunk: BookChunk;
  excerpt: string;
}

interface Sentence {
  text: string;
  valid: boolean;
}

interface Candidate {
  text: string;
  score: number;
  startIndex: number;
  sentenceCount: number;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function sentencesFromParagraph(paragraph: string, labels: Set<string>): Sentence[] {
  const matches = paragraph.match(/[^.!?…]+(?:[.!?]+|…)["'’”]?/gu) ?? [];
  return matches.map((match) => {
    const text = normalizeWhitespace(match);
    const labelText = text.replace(/[.!?…]["'’”]?$/u, "").trim().toLowerCase();
    return {
      text,
      valid: VALID_START.test(text) && TERMINAL_END.test(text) && !labels.has(labelText),
    };
  });
}

function sentenceRuns(chunk: BookChunk): Sentence[][] {
  const labels = new Set([
    ...chunk.sectionPath,
    ...chunk.breadcrumb.split(" › "),
  ].map((label) => label.trim().toLowerCase()));
  let sawMeaningfulParagraph = false;

  return chunk.rawText
    .split(/\n{2,}/)
    .flatMap((paragraph) => {
      const meaningful = paragraph.trim().length > 0;
      const distrustFirst = meaningful && !sawMeaningfulParagraph && chunk.charOffsets.start > 0;
      if (meaningful) sawMeaningfulParagraph = true;
      const sentences = sentencesFromParagraph(paragraph, labels);
      if (distrustFirst && sentences[0]?.valid) sentences[0] = { ...sentences[0], valid: false };
      const runs: Sentence[][] = [];
      let current: Sentence[] = [];
      for (const sentence of sentences) {
        if (!sentence.valid) {
          if (current.length > 0) runs.push(current);
          current = [];
          continue;
        }
        current.push(sentence);
      }
      if (current.length > 0) runs.push(current);
      return runs;
    });
}

function lengthFitScore(length: number): number {
  if (length >= MIN_TARGET_CHARS && length <= MAX_TARGET_CHARS) {
    return 0.25 - Math.abs(length - IDEAL_CHARS) / 2_000;
  }
  if (length < MIN_TARGET_CHARS) return -(MIN_TARGET_CHARS - length) / 240;
  return -(length - MAX_TARGET_CHARS) / 320;
}

function scoreWindow(chunk: BookChunk, text: string): number {
  return scoreChunk({
    ...chunk,
    rawText: text,
    embeddableText: `${chunk.breadcrumb}\n\n${text}`,
  }) + lengthFitScore(text.length);
}

function compareCandidates(left: Candidate, right: Candidate): number {
  return right.score - left.score
    || Math.abs(left.text.length - IDEAL_CHARS) - Math.abs(right.text.length - IDEAL_CHARS)
    || left.startIndex - right.startIndex
    || left.sentenceCount - right.sentenceCount;
}

/** Return the strongest complete 1-3 sentence display excerpt in a chunk. */
export function extractExcerpt(chunk: BookChunk): string {
  const candidates: Candidate[] = [];
  let sentenceOffset = 0;

  for (const run of sentenceRuns(chunk)) {
    for (let start = 0; start < run.length; start += 1) {
      for (let count = 1; count <= MAX_SENTENCES && start + count <= run.length; count += 1) {
        const text = run.slice(start, start + count).map((sentence) => sentence.text).join(" ");
        candidates.push({
          text,
          score: scoreWindow(chunk, text),
          startIndex: sentenceOffset + start,
          sentenceCount: count,
        });
      }
    }
    sentenceOffset += run.length;
  }

  return candidates.sort(compareCandidates)[0]?.text ?? "";
}
