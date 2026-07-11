export type IngestionFormat = "epub" | "pdf";

export interface BookMetadata {
  title: string;
  author: string;
}

export interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export type BookBlock = HeadingBlock | ParagraphBlock;

export interface BookChapter {
  title: string;
  blocks: BookBlock[];
  /** One-based source page for PDF chapters. */
  pageNumber?: number;
}

export interface StructuredBook {
  metadata: BookMetadata;
  chapters: BookChapter[];
}

export type IngestionErrorCode =
  | "INVALID_INPUT"
  | "INVALID_ARCHIVE"
  | "MISSING_CONTAINER"
  | "MISSING_PACKAGE"
  | "INVALID_EPUB"
  | "INVALID_PDF"
  | "EMPTY_DOCUMENT";

export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly format: IngestionFormat;

  constructor(
    format: IngestionFormat,
    code: IngestionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "IngestionError";
    this.format = format;
    this.code = code;
  }
}

export class ChunkingError extends Error {
  readonly code = "INVALID_CHUNK_OPTIONS" as const;

  constructor(message: string) {
    super(message);
    this.name = "ChunkingError";
  }
}

export interface ChunkOptions {
  /** Stable caller-owned book identifier stored on every chunk. */
  bookRef: string;
  minTokens?: number;
  maxTokens?: number;
  overlapRatio?: number;
}

export interface SourceOffsets {
  start: number;
  end: number;
}

export interface BookChunk {
  bookRef: string;
  chapterIndex: number;
  sectionPath: string[];
  breadcrumb: string;
  rawText: string;
  embeddableText: string;
  charOffsets: SourceOffsets;
  tokenCount: number;
}
