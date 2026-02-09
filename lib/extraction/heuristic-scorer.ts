/**
 * Tier 1 rule-based scoring for feed quality.
 * Assigns 0-1 score per chunk; used to filter and rank snippets.
 */

import type { RawChunk } from "./types";
import type { ScoreFactors } from "./types";
import type { Snippet } from "@/lib/db";

const KEY_PHRASES = [
  "in conclusion",
  "importantly",
  "research shows",
  "studies show",
  "for example",
  "in other words",
  "in summary",
  "to summarize",
  "the key point",
  "it is worth noting",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?]+/g) || []).length || 1;
}

export function scoreChunk(chunk: RawChunk, indexInSection: number, isFirstInBook: boolean): { score: number; factors: ScoreFactors } {
  const words = wordCount(chunk.rawText);
  const sentences = sentenceCount(chunk.rawText);
  const lower = chunk.rawText.toLowerCase();

  let positionScore = 0;
  if (isFirstInBook) positionScore += 0.2;
  if (indexInSection === 0) positionScore += 0.1;

  let structureScore = 0;
  if (chunk.type === "heading") structureScore += 0.15;
  else if (chunk.type === "quote") structureScore += 0.1;

  let lengthScore = 0;
  if (words >= 50 && words <= 300) lengthScore += 0.1;
  else if (words < 20) lengthScore -= 0.3;

  let densityScore = 0;
  const ratio = sentences / Math.max(words, 1);
  if (ratio >= 0.05 && ratio <= 0.2) densityScore += 0.05;

  let keyPhraseScore = 0;
  for (const phrase of KEY_PHRASES) {
    if (lower.includes(phrase)) {
      keyPhraseScore += 0.1;
      break;
    }
  }

  const score = Math.max(
    0,
    Math.min(
      1,
      positionScore + structureScore + lengthScore + densityScore + keyPhraseScore
    )
  );

  return {
    score,
    factors: {
      positionScore,
      lengthScore: lengthScore >= 0 ? lengthScore : 0,
      structureScore,
      densityScore,
    },
  };
}

export function rawChunkToSnippet(
  chunk: RawChunk,
  bookId: string,
  heuristicScore: number,
  scoreFactors: ScoreFactors,
  createdAt: number
): Omit<Snippet, "aiEmbedding"> & { aiEmbedding: Float32Array | null } {
  return {
    id: crypto.randomUUID(),
    bookId,
    sectionIndex: chunk.sectionIndex,
    location: chunk.location,
    type: chunk.type,
    rawText: chunk.rawText,
    htmlContent: chunk.htmlContent,
    heuristicScore,
    scoreFactors,
    aiHeadline: null,
    aiTags: null,
    aiEmbedding: null,
    impressionCount: 0,
    lastShownAt: null,
    interactionType: "none",
    savedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}
