import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Annotation } from "@/lib/db";

let sortByReturnValue: Annotation[] = [];
const mockToArray = vi.fn().mockResolvedValue([]);
const mockDelete = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  db: {
    annotations: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockImplementation(() => Promise.resolve([...sortByReturnValue])),
          toArray: mockToArray,
          delete: mockDelete,
        }),
      }),
    },
  },
}));

const { AnnotationSidebar } = await import("@/components/reader/AnnotationSidebar");

describe("AnnotationSidebar", () => {
  const user = userEvent.setup();
  const defaultProps = {
    bookId: "book-1",
    isOpen: true,
    onClose: vi.fn(),
    onSelectCfi: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sortByReturnValue = [];
    mockToArray.mockResolvedValue([]);
  });

  describe("life case: list from DB — saved properly", () => {
    it("renders nothing when isOpen is false", () => {
      render(<AnnotationSidebar {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole("complementary", { name: /annotations/i })).not.toBeInTheDocument();
    });

    it("renders sidebar with Annotations heading when open", () => {
      render(<AnnotationSidebar {...defaultProps} />);
      expect(screen.getByRole("complementary", { name: /annotations/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /annotations/i })).toBeInTheDocument();
    });

    it("shows empty state when no annotations (list from DB)", async () => {
      render(<AnnotationSidebar {...defaultProps} />);
      expect(
        await screen.findByText(/no highlights, notes, or bookmarks yet/i)
      ).toBeInTheDocument();
    });

    it("shows list when DB returns annotations (saved properly)", async () => {
      sortByReturnValue = [
        {
          id: "a1",
          bookId: "book-1",
          type: "highlight",
          cfiRange: "epubcfi(/)",
          text: "Selected text",
          noteBody: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      render(<AnnotationSidebar {...defaultProps} />);
      await screen.findByText("Selected text");
      expect(screen.getByText("highlight")).toBeInTheDocument();
    });

    it("shows note with noteBody when type is note", async () => {
      sortByReturnValue = [
        {
          id: "n1",
          bookId: "book-1",
          type: "note",
          cfiRange: "epubcfi(/)",
          text: "Passage",
          noteBody: "My note",
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      render(<AnnotationSidebar {...defaultProps} />);
      await screen.findByText("Passage");
      expect(screen.getByText("My note")).toBeInTheDocument();
    });
  });

  describe("life case: jump and Clear all — easy to remove", () => {
    it("calls onClose when overlay is clicked", async () => {
      const onClose = vi.fn();
      render(<AnnotationSidebar {...defaultProps} onClose={onClose} />);
      await user.click(screen.getByRole("button", { name: /close annotations/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onSelectCfi when annotation entry is clicked (EPUB jump)", async () => {
      sortByReturnValue = [
        {
          id: "a1",
          bookId: "book-1",
          type: "highlight",
          cfiRange: "epubcfi(/6/4!/2)",
          text: "Word",
          noteBody: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const onSelectCfi = vi.fn();
      render(<AnnotationSidebar {...defaultProps} onSelectCfi={onSelectCfi} />);
      await screen.findByText("Word");
      await user.click(screen.getByText("Word"));
      expect(onSelectCfi).toHaveBeenCalledWith("epubcfi(/6/4!/2)");
    });

    it("shows Clear all when list non-empty (easy to find)", async () => {
      sortByReturnValue = [
        {
          id: "a1",
          bookId: "book-1",
          type: "highlight",
          cfiRange: "epubcfi(/)",
          text: "Text",
          noteBody: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      render(<AnnotationSidebar {...defaultProps} />);
      await screen.findByText("Text");
      expect(screen.getByRole("button", { name: /clear all annotations/i })).toBeInTheDocument();
    });

    it("Clear all: confirms then calls onClearAll and onAfterClearAll (easy to remove)", async () => {
      const list: Annotation[] = [
        {
          id: "a1",
          bookId: "book-1",
          type: "highlight",
          cfiRange: "epubcfi(/)",
          text: "Text",
          noteBody: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      sortByReturnValue = list;
      mockToArray.mockResolvedValue(list);
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const onClearAll = vi.fn();
      const onAfterClearAll = vi.fn();
      render(
        <AnnotationSidebar
          {...defaultProps}
          onClearAll={onClearAll}
          onAfterClearAll={onAfterClearAll}
        />
      );
      await screen.findByText("Text");
      await user.click(screen.getByRole("button", { name: /clear all annotations/i }));
      expect(confirmSpy).toHaveBeenCalledWith(
        "Remove all highlights, notes, and bookmarks in this book?"
      );
      expect(onClearAll).toHaveBeenCalled();
      expect(onAfterClearAll).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("Clear all: does not clear when user cancels confirm", async () => {
      sortByReturnValue = [
        {
          id: "a1",
          bookId: "book-1",
          type: "highlight",
          cfiRange: "epubcfi(/)",
          text: "Text",
          noteBody: null,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      const onClearAll = vi.fn();
      render(<AnnotationSidebar {...defaultProps} onClearAll={onClearAll} />);
      await screen.findByText("Text");
      await user.click(screen.getByRole("button", { name: /clear all annotations/i }));
      expect(onClearAll).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
});
