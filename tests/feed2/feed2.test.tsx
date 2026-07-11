import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnswerCard } from "@/components/feed2/AnswerCard";
import { CoverTile } from "@/components/feed2/CoverTile";
import { MasonryGrid } from "@/components/feed2/MasonryGrid";
import { QuestionTile } from "@/components/feed2/QuestionTile";
import { QuoteTile } from "@/components/feed2/QuoteTile";
import {
  BOOK_COLORS,
  bookColorForIndex,
  bookUsesPaperText,
  feedFixtures,
  type CoverFixture,
  type QuestionFixture,
  type QuoteFixture,
} from "@/lib/mock/feed-fixtures";

const question = feedFixtures.find((item): item is QuestionFixture => item.kind === "question")!;
const quote = feedFixtures.find((item): item is QuoteFixture => item.kind === "quote")!;
const cover = feedFixtures.find((item): item is CoverFixture => item.kind === "cover")!;

describe("feed2 components", () => {
  it("renders question, quote, and cover tiles from fixture props", () => {
    const { unmount } = render(<QuestionTile item={question} />);
    expect(screen.getByRole("link", { name: /read answer/i })).toHaveAttribute(
      "href",
      `/feed2/answer/${question.id}`,
    );
    expect(screen.getByText(question.generated.hook)).toBeInTheDocument();
    unmount();

    render(<QuoteTile item={quote} />);
    expect(screen.getByText(quote.chunk.rawText, { exact: false })).toBeInTheDocument();
    unmount();

    render(<CoverTile item={cover} />);
    expect(screen.getByRole("link", { name: new RegExp(`open ${cover.book.title}`, "i") })).toBeInTheDocument();
  });

  it("cycles book colors deterministically", () => {
    expect(bookColorForIndex(0)).toBe(BOOK_COLORS[0]);
    expect(bookColorForIndex(5)).toBe(BOOK_COLORS[5]);
    expect(bookColorForIndex(6)).toBe(BOOK_COLORS[0]);
    expect(bookColorForIndex(-1)).toBe(BOOK_COLORS[5]);
    expect(bookUsesPaperText(2)).toBe(true);
    expect(bookUsesPaperText(5)).toBe(true);
    expect(bookUsesPaperText(4)).toBe(false);
  });

  it("renders every fixture in the masonry grid", () => {
    render(<MasonryGrid items={feedFixtures} />);
    expect(screen.getByLabelText("Curiosity feed").children).toHaveLength(feedFixtures.length);
  });

  it("renders answer citations as reader links", () => {
    const twoCitationQuestion = feedFixtures.find(
      (item): item is QuestionFixture => item.kind === "question" && item.citations.length === 2,
    )!;
    render(<AnswerCard item={twoCitationQuestion} />);
    const citations = screen.getAllByRole("link", { name: /read citation in/i });
    expect(citations).toHaveLength(2);
    const citation = citations[0];
    expect(citation).toHaveAttribute(
      "href",
      `/reader/${twoCitationQuestion.citations[0].chunk.bookRef}?loc=${twoCitationQuestion.citations[0].chunk.charOffsets.start}`,
    );
  });
});
