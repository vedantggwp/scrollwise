import { getEncoding } from "js-tiktoken";

import {
  ChunkingError,
  type BookChapter,
  type BookChunk,
  type ChunkOptions,
  type StructuredBook,
} from "./types";

const tokenizer = getEncoding("cl100k_base");
const DEFAULT_MIN_TOKENS = 400;
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP = 0.125;

interface PositionedBlock {
  start: number;
  end: number;
  block: BookChapter["blocks"][number];
}

interface Section {
  start: number;
  end: number;
  path: string[];
  hasParagraph: boolean;
}

function tokenCount(text: string): number {
  return tokenizer.encode(text).length;
}

/** Reconstruct the canonical source used by chunk char offsets. */
export function chapterSource(chapter: BookChapter): string {
  return chapter.blocks.map((block) => block.text).join("\n\n");
}

function positionBlocks(chapter: BookChapter): PositionedBlock[] {
  let cursor = 0;
  return chapter.blocks.map((block, index) => {
    const start = cursor;
    const end = start + block.text.length;
    cursor = end + (index === chapter.blocks.length - 1 ? 0 : 2);
    return { start, end, block };
  });
}

function sectionsFromChapter(chapter: BookChapter): Section[] {
  const positioned = positionBlocks(chapter);
  const sections: Section[] = [];
  const headingPath: string[] = [];
  let current: Section | undefined;

  const flush = (): void => {
    if (current?.hasParagraph) sections.push(current);
  };

  for (const item of positioned) {
    if (item.block.type === "heading") {
      flush();
      headingPath.length = item.block.level - 1;
      headingPath[item.block.level - 1] = item.block.text;
      current = {
        start: item.start,
        end: item.end,
        path: headingPath.filter(Boolean),
        hasParagraph: false,
      };
    } else if (!current) {
      current = {
        start: item.start,
        end: item.end,
        path: [chapter.title],
        hasParagraph: true,
      };
    } else {
      current.end = item.end;
      current.hasParagraph = true;
    }
  }
  flush();
  return sections;
}

function embeddable(breadcrumb: string, rawText: string): string {
  return `${breadcrumb}\n\n${rawText}`;
}

function breadcrumbFromSegments(segments: string[]): string {
  return segments
    .filter((segment, index) => index === 0 || segment !== segments[index - 1])
    .join(" › ");
}

function furthestEnd(
  source: string,
  start: number,
  limit: number,
  maxTokens: number,
  prefix = "",
): number {
  let low = start + 1;
  let high = limit;
  let best = start;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const count = tokenCount(prefix + source.slice(start, middle));
    if (count <= maxTokens) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}

function naturalBoundary(source: string, start: number, minEnd: number, hardEnd: number): number {
  const separators = ["\n\n", ". ", "? ", "! ", "; ", ", ", " "];
  const find = (index: number): number => {
    if (index === separators.length) return hardEnd;
    const separator = separators[index];
    const found = source.lastIndexOf(separator, hardEnd - separator.length);
    return found >= minEnd ? found + separator.length : find(index + 1);
  };
  return find(0);
}

function startForTail(
  source: string,
  sectionStart: number,
  sectionEnd: number,
  breadcrumb: string,
  minTokens: number,
): number {
  let low = sectionStart;
  let high = sectionEnd;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (tokenCount(embeddable(breadcrumb, source.slice(middle, sectionEnd))) > minTokens) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function overlapStart(source: string, start: number, end: number, ratio: number): number {
  const raw = source.slice(start, end);
  const tokens = tokenizer.encode(raw);
  const amount = Math.max(1, Math.round(tokens.length * ratio));
  const suffix = tokenizer.decode(tokens.slice(-amount));
  if (suffix && raw.endsWith(suffix)) return end - suffix.length;

  let low = start;
  let high = end;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (tokenCount(source.slice(middle, end)) > amount) low = middle + 1;
    else high = middle;
  }
  return low;
}

function validateOptions(options: ChunkOptions): Required<ChunkOptions> {
  const values = {
    bookRef: options.bookRef,
    minTokens: options.minTokens ?? DEFAULT_MIN_TOKENS,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    overlapRatio: options.overlapRatio ?? DEFAULT_OVERLAP,
  };
  if (!values.bookRef.trim()) throw new ChunkingError("bookRef must not be empty");
  if (values.minTokens < 1 || values.maxTokens < values.minTokens) {
    throw new ChunkingError("token bounds are invalid");
  }
  if (values.overlapRatio < 0.1 || values.overlapRatio > 0.15) {
    throw new ChunkingError("overlapRatio must be between 0.10 and 0.15");
  }
  return values;
}

function splitSection(
  source: string,
  section: Section,
  breadcrumb: string,
  limits: Required<ChunkOptions>,
): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  const prefix = `${breadcrumb}\n\n`;
  let start = section.start;

  while (start < section.end) {
    if (tokenCount(prefix + source.slice(start, section.end)) <= limits.maxTokens) {
      spans.push({ start, end: section.end });
      break;
    }
    const hardEnd = furthestEnd(source, start, section.end, limits.maxTokens, prefix);
    const minEnd = furthestEnd(source, start, hardEnd, limits.minTokens, prefix);
    let end = naturalBoundary(source, start, minEnd, hardEnd);
    if (tokenCount(prefix + source.slice(start, end)) < limits.minTokens) end = hardEnd;
    let nextStart = overlapStart(source, start, end, limits.overlapRatio);

    if (tokenCount(prefix + source.slice(nextStart, section.end)) < limits.minTokens) {
      const balancedStart = startForTail(
        source,
        start,
        section.end,
        breadcrumb,
        limits.minTokens,
      );
      const overlapTokens = Math.max(
        1,
        Math.round(tokenCount(source.slice(start, end)) * limits.overlapRatio),
      );
      const balancedEnd = furthestEnd(source, balancedStart, section.end, overlapTokens);
      const balancedCount = tokenCount(prefix + source.slice(start, balancedEnd));
      if (balancedEnd < end && balancedCount >= limits.minTokens) {
        end = balancedEnd;
        nextStart = overlapStart(source, start, end, limits.overlapRatio);
      }
    }

    if (end <= start || nextStart <= start) {
      throw new ChunkingError("Unable to make progress while splitting a section");
    }
    spans.push({ start, end });
    start = nextStart;
  }
  return spans;
}

/** Split a structured book into embedding-ready, overlapping chunks. */
export function chunkBook(book: StructuredBook, options: ChunkOptions): BookChunk[] {
  const limits = validateOptions(options);
  const chunks: BookChunk[] = [];

  book.chapters.forEach((chapter, chapterIndex) => {
    const source = chapterSource(chapter);
    for (const section of sectionsFromChapter(chapter)) {
      const sectionPath = section.path.length > 0 ? section.path : [chapter.title];
      const breadcrumb = breadcrumbFromSegments([
        book.metadata.title,
        chapter.title,
        ...sectionPath,
      ]);
      for (const span of splitSection(source, section, breadcrumb, limits)) {
        const rawText = source.slice(span.start, span.end);
        const embeddableText = embeddable(breadcrumb, rawText);
        chunks.push({
          bookRef: limits.bookRef,
          chapterIndex,
          sectionPath: [...sectionPath],
          breadcrumb,
          rawText,
          embeddableText,
          charOffsets: span,
          tokenCount: tokenCount(embeddableText),
        });
      }
    }
  });
  return chunks;
}
