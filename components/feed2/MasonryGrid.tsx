import { CoverTile } from "./CoverTile";
import { QuestionTile } from "./QuestionTile";
import { QuoteTile } from "./QuoteTile";
import type { FeedFixture } from "@/lib/mock/feed-fixtures";

export function MasonryGrid({ items }: { items: FeedFixture[] }) {
  return (
    <div className="feed2-masonry" aria-label="Curiosity feed">
      {items.map((item, index) => (
        <div
          className="feed2-masonry-item"
          key={item.id}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          {item.kind === "question" && <QuestionTile item={item} />}
          {item.kind === "quote" && <QuoteTile item={item} />}
          {item.kind === "cover" && <CoverTile item={item} />}
        </div>
      ))}
    </div>
  );
}
