import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookCard } from "@/components/library/BookCard";
import { mockBook } from "../../helpers/mock-book";

describe("BookCard", () => {
  const user = userEvent.setup();
  describe("list variant", () => {
    it("renders title and author for ready book", () => {
      const book = mockBook({ title: "My Book", author: "Jane Doe" });
      render(<BookCard book={book} variant="list" />);
      expect(screen.getByText("My Book")).toBeInTheDocument();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("links to reader when ready", () => {
      const book = mockBook({ id: "abc", title: "Link Book", processingStatus: "ready" });
      render(<BookCard book={book} variant="list" />);
      const link = screen.getByRole("link", { name: /open link book/i });
      expect(link).toHaveAttribute("href", "/reader/abc");
    });

    it("shows Open status for ready book", () => {
      const book = mockBook({ title: "Status Book", processingStatus: "ready" });
      render(<BookCard book={book} variant="list" />);
      expect(screen.getByText(/EPUB · Open/i)).toBeInTheDocument();
    });

    it("shows error message and Retry/Remove for error book", () => {
      const book = mockBook({ processingStatus: "error" });
      const onRetry = vi.fn();
      const onRemove = vi.fn();
      render(<BookCard book={book} variant="list" onRetry={onRetry} onRemove={onRemove} />);
      expect(screen.getByText(/Error · Retry or remove/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry extraction/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /remove book/i })).toBeInTheDocument();
    });

    it("calls onRetry when Retry clicked", async () => {
      const book = mockBook({ title: "Retry Book", processingStatus: "error" });
      const onRetry = vi.fn();
      render(<BookCard book={book} variant="list" onRetry={onRetry} />);
      await user.click(screen.getByRole("button", { name: /retry extraction/i }));
      expect(onRetry).toHaveBeenCalledWith(book);
    });

    it("calls onRemove when Remove clicked", async () => {
      const book = mockBook({ title: "Remove Book", processingStatus: "ready" });
      const onRemove = vi.fn();
      render(<BookCard book={book} variant="list" onRemove={onRemove} />);
      await user.click(screen.getByRole("button", { name: /remove book/i }));
      expect(onRemove).toHaveBeenCalledWith(book);
    });
  });

  describe("grid variant", () => {
    it("renders title and author", () => {
      const book = mockBook({ title: "Grid Book", author: "Author" });
      render(<BookCard book={book} variant="grid" />);
      expect(screen.getByText("Grid Book")).toBeInTheDocument();
      expect(screen.getByText("Author")).toBeInTheDocument();
    });

    it("links to reader", () => {
      const book = mockBook({ id: "xyz", title: "Grid Book", processingStatus: "ready" });
      render(<BookCard book={book} variant="grid" />);
      const link = screen.getByRole("link", { name: /open grid book/i });
      expect(link).toHaveAttribute("href", "/reader/xyz");
    });

    it("shows overflow trigger and opens menu with Open, Re-extract, Remove", async () => {
      const book = mockBook({ title: "Menu Book" });
      const onRetry = vi.fn();
      const onRemove = vi.fn();
      render(<BookCard book={book} variant="grid" onRetry={onRetry} onRemove={onRemove} />);
      const trigger = screen.getByRole("button", { name: /book options/i });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /open/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /re-extract/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /remove/i })).toBeInTheDocument();
    });

    it("menu Open link goes to reader", async () => {
      const book = mockBook({ id: "reader-id", title: "OpenMenu Book" });
      render(<BookCard book={book} variant="grid" />);
      await user.click(screen.getByRole("button", { name: /book options/i }));
      const openItem = screen.getByRole("menuitem", { name: /open/i });
      expect(openItem).toHaveAttribute("href", "/reader/reader-id");
    });

    it("calls onRetry when Re-extract clicked in menu", async () => {
      const book = mockBook({ title: "Reextract Book" });
      const onRetry = vi.fn();
      render(<BookCard book={book} variant="grid" onRetry={onRetry} />);
      await user.click(screen.getByRole("button", { name: /book options/i }));
      await user.click(screen.getByRole("menuitem", { name: /re-extract/i }));
      expect(onRetry).toHaveBeenCalledWith(book);
    });

    it("calls onRemove when Remove clicked in menu", async () => {
      const book = mockBook({ title: "Delete Book" });
      const onRemove = vi.fn();
      render(<BookCard book={book} variant="grid" onRemove={onRemove} />);
      await user.click(screen.getByRole("button", { name: /book options/i }));
      await user.click(screen.getByRole("menuitem", { name: /remove/i }));
      expect(onRemove).toHaveBeenCalledWith(book);
    });
  });
});
