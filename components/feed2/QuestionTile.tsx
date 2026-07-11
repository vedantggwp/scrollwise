import Link from "next/link";
import type { CSSProperties } from "react";
import {
  bookColorForIndex,
  bookTagTextColor,
  bookUsesPaperText,
  type QuestionFixture,
} from "@/lib/mock/feed-fixtures";

export function QuestionTile({ item }: { item: QuestionFixture }) {
  const style = {
    background: bookColorForIndex(item.book.colorIndex),
    "--feed2-book-color": bookColorForIndex(item.book.colorIndex),
    "--feed2-tag-color": bookTagTextColor(item.book.colorIndex),
  } as CSSProperties;

  return (
    <Link
      href={`/feed2/answer/${item.id}`}
      className={`feed2-tile ${bookUsesPaperText(item.book.colorIndex) ? "feed2-tile--paper" : "feed2-tile--ink"}`}
      style={style}
      aria-label={`Read answer: ${item.generated.question}`}
    >
      <span className="feed2-book-tag">{item.book.tagLabel}</span>
      <h2 className="feed2-question">{item.generated.question}</h2>
      <p className="feed2-hook">{item.generated.hook}</p>
    </Link>
  );
}
