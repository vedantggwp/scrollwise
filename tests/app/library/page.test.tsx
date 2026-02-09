import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LibraryPage from "@/app/library/page";
import { mockBook } from "../../helpers/mock-book";

vi.mock("@/stores/library-store", () => ({
  useLibraryStore: vi.fn(),
}));

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    db: {
      books: {
        orderBy: () => ({
          reverse: () => ({
            toArray: () => Promise.resolve([]),
          }),
        }),
      },
      snippets: { where: () => ({ equals: () => ({ delete: () => Promise.resolve() }) }) },
      annotations: { where: () => ({ equals: () => ({ delete: () => Promise.resolve() }) }) },
    },
  };
});

vi.mock("@/lib/utils/file-storage", () => ({
  putBlob: vi.fn(() => Promise.resolve()),
  getBlob: vi.fn(() => Promise.resolve(null)),
  deleteBlob: vi.fn(() => Promise.resolve()),
}));

const mockUseLibraryStore = vi.mocked(
  (await import("@/stores/library-store")).useLibraryStore
);

describe("LibraryPage", () => {
  beforeEach(() => {
    mockUseLibraryStore.mockReturnValue({
      books: [],
      setBooks: vi.fn(),
      addBook: vi.fn(),
      updateBook: vi.fn(),
      removeBook: vi.fn(),
      uploading: false,
      setUploading: vi.fn(),
      processingBookId: null,
      setProcessingBookId: vi.fn(),
    });
  });

  it("shows empty state when no books", async () => {
    render(<LibraryPage />);
    expect(screen.getByText(/add your first book/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /library/i })).toBeInTheDocument();
  });

  it("shows Ready to read section when there are ready books", () => {
    const ready = mockBook({ id: "r1", title: "Ready Book", processingStatus: "ready" });
    mockUseLibraryStore.mockReturnValue({
      books: [ready],
      setBooks: vi.fn(),
      addBook: vi.fn(),
      updateBook: vi.fn(),
      removeBook: vi.fn(),
      uploading: false,
      setUploading: vi.fn(),
      processingBookId: null,
      setProcessingBookId: vi.fn(),
    });
    render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: /ready to read/i })).toBeInTheDocument();
    expect(screen.getByText("Ready Book")).toBeInTheDocument();
  });

  it("shows Processing section when there are processing books", () => {
    const processing = mockBook({
      id: "p1",
      title: "Processing Book",
      processingStatus: "extracting",
    });
    mockUseLibraryStore.mockReturnValue({
      books: [processing],
      setBooks: vi.fn(),
      addBook: vi.fn(),
      updateBook: vi.fn(),
      removeBook: vi.fn(),
      uploading: false,
      setUploading: vi.fn(),
      processingBookId: null,
      setProcessingBookId: vi.fn(),
    });
    render(<LibraryPage />);
    expect(screen.getByRole("heading", { level: 2, name: "Processing" })).toBeInTheDocument();
    expect(screen.getByText("Processing Book")).toBeInTheDocument();
  });

  it("shows summary line with book counts", () => {
    const ready = mockBook({ processingStatus: "ready" });
    const extracting = mockBook({ id: "e1", processingStatus: "extracting" });
    mockUseLibraryStore.mockReturnValue({
      books: [ready, extracting],
      setBooks: vi.fn(),
      addBook: vi.fn(),
      updateBook: vi.fn(),
      removeBook: vi.fn(),
      uploading: false,
      setUploading: vi.fn(),
      processingBookId: null,
      setProcessingBookId: vi.fn(),
    });
    render(<LibraryPage />);
    expect(screen.getByText(/2 book/)).toBeInTheDocument();
    expect(screen.getByText(/1 ready/)).toBeInTheDocument();
    expect(screen.getByText(/1 processing/)).toBeInTheDocument();
  });

  it("shows both Ready to read and Processing when mixed", () => {
    const ready = mockBook({ id: "r1", title: "ReadyTitle", processingStatus: "ready" });
    const processing = mockBook({
      id: "p1",
      title: "ProcessingTitle",
      processingStatus: "scoring",
    });
    mockUseLibraryStore.mockReturnValue({
      books: [ready, processing],
      setBooks: vi.fn(),
      addBook: vi.fn(),
      updateBook: vi.fn(),
      removeBook: vi.fn(),
      uploading: false,
      setUploading: vi.fn(),
      processingBookId: null,
      setProcessingBookId: vi.fn(),
    });
    render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: /ready to read/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Processing" })).toBeInTheDocument();
    expect(screen.getByText("ReadyTitle")).toBeInTheDocument();
    expect(screen.getByText("ProcessingTitle")).toBeInTheDocument();
  });
});
