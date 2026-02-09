/**
 * Types for the extraction pipeline (RawChunk → Snippet).
 */

import type { SnippetType } from "@/lib/db";

export interface RawChunk {
  sectionIndex: number;
  type: SnippetType;
  rawText: string;
  htmlContent: string | null;
  /** Serialized ContentLocation (e.g. JSON string) */
  location: string;
}

export interface ScoreFactors {
  positionScore: number;
  lengthScore: number;
  structureScore: number;
  densityScore: number;
}
