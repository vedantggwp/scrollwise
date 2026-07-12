import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnswerCard } from "@/components/feed2/AnswerCard";
import { CoverTile } from "@/components/feed2/CoverTile";
import { MasonryGrid } from "@/components/feed2/MasonryGrid";
import { QuestionTile } from "@/components/feed2/QuestionTile";
import { QuoteTile } from "@/components/feed2/QuoteTile";
import Feed2Layout from "@/app/feed2/layout";
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
    const questionRender = render(<QuestionTile item={question} />);
    expect(screen.getByRole("link", { name: /read answer/i })).toHaveAttribute(
      "href",
      `/feed2/answer/${question.id}`,
    );
    expect(screen.getByText(question.generated.hook)).toBeInTheDocument();
    questionRender.unmount();

    const quoteRender = render(<QuoteTile item={quote} />);
    expect(screen.getByText(quote.chunk.rawText, { exact: false })).toBeInTheDocument();
    quoteRender.unmount();

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
    const feed = screen.getByRole("feed", { name: "Curiosity feed" });
    expect(feed.querySelectorAll(".feed2-masonry--2 .feed2-masonry-item"))
      .toHaveLength(feedFixtures.length);
  });

  it("uses stylesheet precedence so the feed font stylesheet is deduplicated", async () => {
    render(<Feed2Layout>Content</Feed2Layout>);
    const links = document.querySelectorAll('link[rel="stylesheet"]');

    expect(links).toHaveLength(1);
    await expect(readFile("app/feed2/layout.tsx", "utf8"))
      .resolves.toContain('precedence="default"');
  });

  it("caps entry delays and lays desktop feed items out row first", () => {
    const items = Array.from({ length: 14 }, (_, index) => ({
      ...feedFixtures[index % feedFixtures.length],
      id: `tile-${index + 1}`,
    }));
    const { container, rerender } = render(<MasonryGrid items={items.slice(0, 8)} />);
    const columns = [...container.querySelectorAll<HTMLElement>(".feed2-masonry--4 .feed2-masonry-column")];

    expect(columns).toHaveLength(4);
    expect(columns.map((column) => column.firstElementChild?.getAttribute("data-feed-id")))
      .toEqual(["tile-1", "tile-2", "tile-3", "tile-4"]);
    rerender(<MasonryGrid items={items} />);
    expect(container.querySelector('[data-feed-id="tile-14"]'))
      .toHaveStyle({ animationDelay: "480ms" });
  });

  it("disables delayed masonry animations for reduced motion", async () => {
    const css = await readFile("app/globals.css", "utf8");

    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.feed2-masonry-item[\s\S]*?animation:\s*none[\s\S]*?animation-delay:\s*0s/);
  });

  it("renders cited passages above short reader-link chips", () => {
    const twoCitationQuestion = feedFixtures.find(
      (item): item is QuestionFixture => item.kind === "question" && item.citations.length === 2,
    )!;
    render(<AnswerCard item={twoCitationQuestion} />);
    const passages = screen.getByRole("region", { name: "Supporting passages" });
    expect(passages.querySelectorAll("blockquote")).toHaveLength(2);
    expect(passages).toHaveTextContent(twoCitationQuestion.citations[0].quote);

    const citations = screen.getAllByRole("link", { name: /read citation in/i });
    expect(citations).toHaveLength(2);
    const citation = citations[0];
    expect(citation).toHaveTextContent(twoCitationQuestion.citations[0].chunk.breadcrumb);
    expect(citation).not.toHaveTextContent(twoCitationQuestion.citations[0].quote);
    expect(citation).toHaveAttribute(
      "href",
      `/reader/${twoCitationQuestion.citations[0].chunk.bookRef}?loc=${twoCitationQuestion.citations[0].chunk.charOffsets.start}`,
    );
    expect(passages.compareDocumentPosition(citation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses short, non-wrapping display labels for book tags", () => {
    const longTitleQuestion = feedFixtures.find(
      (item): item is QuestionFixture => item.kind === "question" && item.book.id === "twenty-four-hours",
    )!;
    render(<QuestionTile item={longTitleQuestion} />);
    expect(screen.getByText("24 Hours a Day")).toHaveClass("feed2-book-tag");
    expect(screen.queryByText("How to Live on 24 Hours a Day")).not.toBeInTheDocument();
  });
});
