import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookGrid } from "@/components/library/BookGrid";
import { mockBook } from "../../helpers/mock-book";

describe("BookGrid", () => {
  it("returns null when books is empty", () => {
    const { container } = render(<BookGrid books={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one card per book", () => {
    const books = [
      mockBook({ id: "1", title: "First" }),
      mockBook({ id: "2", title: "Second" }),
    ];
    render(<BookGrid books={books} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("uses list layout by default", () => {
    const books = [mockBook()];
    const { container } = render(<BookGrid books={books} />);
    const list = container.querySelector("ul");
    expect(list).toHaveClass("flex", "flex-col", "gap-3");
  });

  it("uses grid layout when layout=grid", () => {
    const books = [mockBook()];
    const { container } = render(<BookGrid books={books} layout="grid" />);
    const list = container.querySelector("ul");
    expect(list).toHaveClass("grid", "grid-cols-2", "sm:grid-cols-3", "md:grid-cols-4");
  });

  it("has role list", () => {
    render(<BookGrid books={[mockBook()]} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("passes onRetry and onRemove to cards", async () => {
    const user = userEvent.setup();
    const books = [mockBook({ processingStatus: "ready" })];
    const onRemove = vi.fn();
    render(<BookGrid books={books} onRemove={onRemove} />);
    const removeBtn = screen.getByRole("button", { name: /remove book/i });
    await user.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(books[0]);
  });
});
