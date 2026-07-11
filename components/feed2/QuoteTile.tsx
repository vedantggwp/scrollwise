import Link from "next/link";
import type { CSSProperties } from "react";
import { bookColorForIndex, bookTagTextColor, type QuoteFixture } from "@/lib/mock/feed-fixtures";

export function QuoteTile({ item }: { item: QuoteFixture }) {
  const style = {
    "--feed2-book-color": bookColorForIndex(item.book.colorIndex),
    "--feed2-tag-color": bookTagTextColor(item.book.colorIndex),
  } as CSSProperties;

  return (
    <Link
      href={`/reader/${item.book.id}?loc=${item.chunk.charOffsets.start}`}
      className="feed2-tile feed2-tile--quote"
      style={style}
      aria-label={`Read ${item.book.title} at this passage`}
    >
      <span className="feed2-book-tag">{item.book.title}</span>
      <blockquote className="feed2-quote">“{item.chunk.rawText}”</blockquote>
      <p className="feed2-meta">{item.book.author}</p>
    </Link>
  );
}
