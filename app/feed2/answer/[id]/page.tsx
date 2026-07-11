import { notFound } from "next/navigation";
import Link from "next/link";
import { AnswerCard } from "@/components/feed2/AnswerCard";
import { questionsById } from "@/lib/mock/feed-fixtures";

export default async function Feed2AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = questionsById[id];

  if (!item) notFound();

  return (
    <div className="feed2-answer-page">
      <Link href="/feed2" className="feed2-back-link">← back to the feed</Link>
      <AnswerCard item={item} />
    </div>
  );
}
