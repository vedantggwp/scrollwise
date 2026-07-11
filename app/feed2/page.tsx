import { MasonryGrid } from "@/components/feed2/MasonryGrid";
import { feedFixtures } from "@/lib/mock/feed-fixtures";

export default function Feed2Page() {
  return (
    <div className="feed2-page">
      <header className="feed2-header">
        <div>
          <p className="feed2-kicker">Your shelf, asking back</p>
          <h1 className="feed2-title">Scrollwise</h1>
        </div>
        <p className="feed2-meta">Questions from your shelf</p>
      </header>
      <MasonryGrid items={feedFixtures} />
    </div>
  );
}
