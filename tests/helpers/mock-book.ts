import type { Book } from "@/lib/db";

export function mockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    title: "Test Book",
    author: "Test Author",
    format: "epub",
    coverUrl: null,
    fileSize: 1000,
    fileHash: "abc",
    storageKey: "book-1",
    totalSections: 0,
    metadata: {},
    processingStatus: "ready",
    processingProgress: 1,
    addedAt: Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: null,
    furthestLocation: null,
    tags: [],
    ...overrides,
  };
}
