import Link from "next/link";
import type { MockCitation } from "@/lib/mock/feed-fixtures";

export function CitationChip({ citation }: { citation: MockCitation }) {
  const location = citation.chunk.charOffsets.start;
  const label = `${citation.chunk.breadcrumb}: ${citation.quote}`;

  return (
    <Link
      href={`/reader/${citation.chunk.bookRef}?loc=${location}`}
      className="feed2-citation-chip"
      aria-label={`Read citation in ${citation.chunk.breadcrumb}`}
      title={citation.quote}
    >
      {label}
    </Link>
  );
}
