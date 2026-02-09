/**
 * Dexie schema and DB instance.
 */

import Dexie, { type EntityTable } from "dexie";

export interface Book {
  id: string;
  title: string;
  author: string;
  format: "epub" | "pdf" | "pptx";
  coverUrl: string | null;
  fileSize: number;
  fileHash: string;
  storageKey: string;
  totalSections: number;
  metadata: {
    language?: string;
    publisher?: string;
    subjects?: string[];
    tocEntries?: { label: string; href: string }[];
  };
  processingStatus: "pending" | "extracting" | "scoring" | "ready" | "error";
  processingProgress: number;
  addedAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  furthestLocation: string | null;
  tags: string[];
}

export type SnippetType = "paragraph" | "heading" | "quote" | "list" | "slide";

export interface Snippet {
  id: string;
  bookId: string;
  sectionIndex: number;
  location: string;
  type: SnippetType;
  rawText: string;
  htmlContent: string | null;
  heuristicScore: number;
  scoreFactors: {
    positionScore: number;
    lengthScore: number;
    structureScore: number;
    densityScore: number;
  };
  aiHeadline: string | null;
  aiTags: string[] | null;
  aiEmbedding: Float32Array | null;
  impressionCount: number;
  lastShownAt: number | null;
  interactionType: "none" | "tapped" | "saved" | "dismissed";
  savedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface FeedConfig {
  id: "default";
  activeMode: "discovery" | "study" | "topic" | "time-travel";
  discoverySettings: {
    varietyBias: number;
    preferredTypes: SnippetType[];
    excludedBookIds: string[];
    serendipityFactor: number;
  };
  studySettings: {
    focusBookIds: string[];
    spacedRepetitionIntervalMs: number;
    includeAnnotatedOnly: boolean;
  };
  topicSettings: { currentQuery: string };
  timeTravelSettings: { lookbackDays: number; preferForgotten: boolean };
  globalFilters: {
    minSnippetLength: number;
    maxSnippetLength: number;
    excludedTags: string[];
  };
}

export type AnnotationType = "highlight" | "note" | "bookmark";

/** PDF highlight rect (percent 0–1). Used by @react-pdf-viewer/highlight. */
export interface PdfHighlightArea {
  pageIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  bookId: string;
  type: AnnotationType;
  /** EPUB: CFI range/point. PDF: serialized location e.g. {"type":"pdf","page":2} for jump target. */
  cfiRange: string;
  /** Selected or contextual text */
  text: string;
  /** Only for type "note" */
  noteBody: string | null;
  /** PDF only: 0-based page for jump; present when book is PDF. */
  pageIndex?: number;
  /** PDF only: rects for re-rendering highlights (percent). */
  pdfHighlightAreas?: PdfHighlightArea[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = "ScrollwiseDB";
const DB_VERSION = 3;

class ScrollwiseDB extends Dexie {
  books!: EntityTable<Book, "id">;
  snippets!: EntityTable<Snippet, "id">;
  feedConfig!: EntityTable<FeedConfig, "id">;
  annotations!: EntityTable<Annotation, "id">;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      books: "id, format, processingStatus, addedAt, lastOpenedAt, *tags",
    });
    this.version(2).stores({
      books: "id, format, processingStatus, addedAt, lastOpenedAt, *tags",
      snippets:
        "id, bookId, sectionIndex, type, heuristicScore, impressionCount, lastShownAt, interactionType, createdAt, [bookId+sectionIndex]",
      feedConfig: "id",
    });
    this.version(DB_VERSION).stores({
      books: "id, format, processingStatus, addedAt, lastOpenedAt, *tags",
      snippets:
        "id, bookId, sectionIndex, type, heuristicScore, impressionCount, lastShownAt, interactionType, createdAt, [bookId+sectionIndex]",
      feedConfig: "id",
      annotations: "id, bookId, type, createdAt",
    });
  }
}

export const db = new ScrollwiseDB();
