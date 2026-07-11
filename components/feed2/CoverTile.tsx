import Link from "next/link";
import type { CSSProperties } from "react";
import { bookColorForIndex, bookUsesPaperText, type CoverFixture } from "@/lib/mock/feed-fixtures";

export function CoverTile({ item }: { item: CoverFixture }) {
  const paperText = bookUsesPaperText(item.book.colorIndex);
  const style = { background: bookColorForIndex(item.book.colorIndex) } as CSSProperties;

  return (
    <Link
      href={`/reader/${item.book.id}`}
      className={`feed2-tile ${paperText ? "feed2-tile--paper" : "feed2-tile--ink"}`}
      style={style}
      aria-label={`Open ${item.book.title}`}
    >
      <div className="feed2-cover-spine">
        <p className="feed2-kicker">On your shelf</p>
        <h2 className="feed2-cover-title">{item.book.title}</h2>
        <p className="feed2-cover-author">{item.book.author}</p>
      </div>
      <p className="feed2-hook">{item.note}</p>
    </Link>
  );
}
