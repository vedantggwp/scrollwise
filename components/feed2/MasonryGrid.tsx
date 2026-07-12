import { CoverTile } from "./CoverTile";
import { QuestionTile } from "./QuestionTile";
import { QuoteTile } from "./QuoteTile";
import type { FeedFixture } from "@/lib/mock/feed-fixtures";

function FeedItem({ item, index }: { item: FeedFixture; index: number }) {
  return (
    <div
      className="feed2-masonry-item"
      data-feed-id={item.id}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {item.kind === "question" && <QuestionTile item={item} />}
      {item.kind === "quote" && <QuoteTile item={item} />}
      {item.kind === "cover" && <CoverTile item={item} />}
    </div>
  );
}

function columnsFor(items: FeedFixture[], count: number): FeedFixture[][] {
  return Array.from({ length: count }, (_, columnIndex) => (
    items.filter((_, itemIndex) => itemIndex % count === columnIndex)
  ));
}

export function MasonryGrid({ items }: { items: FeedFixture[] }) {
  return (
    <div className="feed2-masonry-root" role="feed" aria-label="Curiosity feed">
      {[2, 3, 4].map((count) => (
        <div className={`feed2-masonry feed2-masonry--${count}`} key={count}>
          {/* Only one breakpoint variant is displayed, so hidden duplicate tiles are not focusable.
              Within the active variant keyboard focus remains column-major, not visual row-major. */}
          {columnsFor(items, count).map((column, columnIndex) => (
            <div className="feed2-masonry-column" key={columnIndex}>
              {column.map((item) => (
                <FeedItem item={item} index={items.indexOf(item)} key={item.id} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
