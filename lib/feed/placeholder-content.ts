/**
 * Placeholder quotes and jokes for the feed when there are no book snippets yet.
 * Shown in a scrollable feed; hidden as soon as real snippets exist.
 */

export type PlaceholderItem = {
  id: string;
  type: "quote" | "joke";
  headline: string;
  body: string;
};

const QUOTES_AND_JOKES: Omit<PlaceholderItem, "id">[] = [
  { type: "quote", headline: "George R.R. Martin", body: "A reader lives a thousand lives before he dies. The man who never reads lives only one." },
  { type: "joke", headline: "Bookstore", body: "I asked the librarian where the self-help books are. She said they’re in the fiction section." },
  { type: "quote", headline: "Marcus Tullius Cicero", body: "A room without books is like a body without a soul." },
  { type: "joke", headline: "Speed reader", body: "I’m writing a book. I’ve got the page numbers done." },
  { type: "quote", headline: "Virginia Woolf", body: "Books are the mirrors of the soul." },
  { type: "joke", headline: "Book club", body: "My book club only reads the first sentence of each chapter. We call it Cliff’s Notes." },
  { type: "quote", headline: "Dr. Seuss", body: "The more that you read, the more things you will know. The more that you learn, the more places you'll go." },
  { type: "joke", headline: "Kindle", body: "I downloaded a book about anti-gravity. I can’t put it down." },
  { type: "quote", headline: "Mary Schmich", body: "Reading is a discount ticket to everywhere." },
  { type: "joke", headline: "Spellcheck", body: "I’m reading a book about mazes. I got lost in it." },
  { type: "quote", headline: "Fran Lebowitz", body: "Think before you speak. Read before you think." },
  { type: "joke", headline: "Pun", body: "I’m reading a book about the history of glue. I just can’t seem to put it down." },
  { type: "quote", headline: "Ralph Waldo Emerson", body: "Some books leave us free and some books make us free." },
  { type: "joke", headline: "Librarian", body: "Why did the librarian slip? She was in the non-friction section." },
  { type: "quote", headline: "Haruki Murakami", body: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking." },
  { type: "joke", headline: "Book report", body: "My teacher asked me to write a report on electricity. I’m shocked." },
  { type: "quote", headline: "Anne Lamott", body: "What a miracle it is that out of these small, flat, rigid squares of paper unfolds world after world after world." },
  { type: "joke", headline: "Bookworm", body: "I used to hate reading. Then I realized the books weren’t the problem." },
  { type: "quote", headline: "Carl Sagan", body: "One glance at a book and you hear the voice of another person, perhaps someone dead for 1,000 years. To read is to voyage through time." },
  { type: "joke", headline: "Dictionary", body: "I’m writing a book about reverse psychology. Do not read it." },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DEFAULT_PLACEHOLDER_COUNT = 50;

/** Return at least `minCount` placeholder items (repeats base list if needed). Order is shuffled once per call. */
export function getPlaceholderItems(minCount?: number): PlaceholderItem[] {
  const base = shuffle(QUOTES_AND_JOKES).map((item, i) => ({
    ...item,
    id: `placeholder-${item.type}-${i}`,
  }));
  const n = minCount ?? DEFAULT_PLACEHOLDER_COUNT;
  if (base.length >= n) return base.slice(0, n);
  const out: PlaceholderItem[] = [...base];
  while (out.length < n) {
    for (const item of base) {
      if (out.length >= n) break;
      out.push({ ...item, id: `${item.id}-${out.length}` });
    }
  }
  return out;
}
