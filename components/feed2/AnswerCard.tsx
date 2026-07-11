import { CitationChip } from "./CitationChip";
import type { QuestionFixture } from "@/lib/mock/feed-fixtures";

export function AnswerCard({ item }: { item: QuestionFixture }) {
  return (
    <article className="feed2-answer-card">
      <p className="feed2-kicker">From {item.book.title}</p>
      <h1 className="feed2-answer-question">{item.generated.question}</h1>
      <p className="feed2-answer-body">{item.answer.answer}</p>
      <div className="feed2-citations" aria-label="Sources">
        {item.citations.map((citation) => (
          <CitationChip key={`${citation.chunk.bookRef}-${citation.chunk.charOffsets.start}`} citation={citation} />
        ))}
      </div>
    </article>
  );
}
