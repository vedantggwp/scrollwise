import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectionToolbar } from "@/components/reader/SelectionToolbar";

describe("SelectionToolbar", () => {
  const user = userEvent.setup();
  const defaultProps = {
    onHighlight: vi.fn(),
    onNote: vi.fn(),
    onBookmark: vi.fn(),
  };

  describe("life case: highlight — easy to find, easy to remove", () => {
    it("renders toolbar with Highlight, Add note, Bookmark when no selection state", () => {
      render(<SelectionToolbar {...defaultProps} />);
      expect(screen.getByRole("toolbar", { name: /selection actions/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^highlight$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add note/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^bookmark$/i })).toBeInTheDocument();
    });

    it("shows Remove highlight when selection already has highlight (easy to remove)", () => {
      render(
        <SelectionToolbar
          {...defaultProps}
          onRemoveHighlight={vi.fn()}
          hasHighlight={true}
        />
      );
      expect(screen.getByRole("button", { name: /remove highlight/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^highlight$/i })).not.toBeInTheDocument();
    });

    it("calls onHighlight when Highlight is clicked", async () => {
      const onHighlight = vi.fn();
      render(<SelectionToolbar {...defaultProps} onHighlight={onHighlight} />);
      await user.click(screen.getByRole("button", { name: /^highlight$/i }));
      expect(onHighlight).toHaveBeenCalledTimes(1);
    });

    it("calls onRemoveHighlight when Remove highlight is clicked", async () => {
      const onRemoveHighlight = vi.fn();
      render(
        <SelectionToolbar
          {...defaultProps}
          onRemoveHighlight={onRemoveHighlight}
          hasHighlight={true}
        />
      );
      await user.click(screen.getByRole("button", { name: /remove highlight/i }));
      expect(onRemoveHighlight).toHaveBeenCalledTimes(1);
    });

    it("touch targets: buttons have min 44px (aria + accessible)", () => {
      render(<SelectionToolbar {...defaultProps} />);
      const highlightBtn = screen.getByRole("button", { name: /^highlight$/i });
      expect(highlightBtn).toHaveClass("min-h-[44px]", "min-w-[44px]");
    });
  });

  describe("life case: note — Add note visible; disabled when already highlighted", () => {
    it("calls onNote when Add note is clicked", async () => {
      const onNote = vi.fn();
      render(<SelectionToolbar {...defaultProps} onNote={onNote} />);
      await user.click(screen.getByRole("button", { name: /add note/i }));
      expect(onNote).toHaveBeenCalledTimes(1);
    });

    it("Add note is disabled when selection has highlight (no duplicate note)", () => {
      render(<SelectionToolbar {...defaultProps} hasHighlight={true} />);
      const addNote = screen.getByRole("button", { name: /add note/i });
      expect(addNote).toBeDisabled();
    });
  });

  describe("life case: bookmark — easy to remove", () => {
    it("shows Bookmark when no bookmark at selection", () => {
      render(<SelectionToolbar {...defaultProps} />);
      expect(screen.getByRole("button", { name: /^bookmark$/i })).toBeInTheDocument();
    });

    it("shows Remove bookmark when selection already has bookmark (easy to remove)", () => {
      render(
        <SelectionToolbar
          {...defaultProps}
          onRemoveBookmark={vi.fn()}
          hasBookmark={true}
        />
      );
      expect(screen.getByRole("button", { name: /remove bookmark/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^bookmark$/i })).not.toBeInTheDocument();
    });

    it("calls onBookmark when Bookmark is clicked", async () => {
      const onBookmark = vi.fn();
      render(<SelectionToolbar {...defaultProps} onBookmark={onBookmark} />);
      await user.click(screen.getByRole("button", { name: /^bookmark$/i }));
      expect(onBookmark).toHaveBeenCalledTimes(1);
    });

    it("calls onRemoveBookmark when Remove bookmark is clicked", async () => {
      const onRemoveBookmark = vi.fn();
      render(
        <SelectionToolbar
          {...defaultProps}
          onRemoveBookmark={onRemoveBookmark}
          hasBookmark={true}
        />
      );
      await user.click(screen.getByRole("button", { name: /remove bookmark/i }));
      expect(onRemoveBookmark).toHaveBeenCalledTimes(1);
    });
  });
});
