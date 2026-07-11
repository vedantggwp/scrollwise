import type { AnswerOutput, QuestionGenOutput } from "@/lib/server/generation/schemas";
import type { BookChunk, BookMetadata } from "@/lib/server/ingestion/types";

export const BOOK_COLORS = [
  "var(--color-book-1)",
  "var(--color-book-2)",
  "var(--color-book-3)",
  "var(--color-book-4)",
  "var(--color-book-5)",
  "var(--color-book-6)",
] as const;

export function bookColorForIndex(index: number): (typeof BOOK_COLORS)[number] {
  return BOOK_COLORS[((index % BOOK_COLORS.length) + BOOK_COLORS.length) % BOOK_COLORS.length];
}

export function bookUsesPaperText(index: number): boolean {
  const normalized = ((index % BOOK_COLORS.length) + BOOK_COLORS.length) % BOOK_COLORS.length;
  return normalized === 2 || normalized === 5;
}

export function bookTagTextColor(index: number): "var(--color-ink)" | "var(--color-paper)" {
  return bookUsesPaperText(index) ? "var(--color-paper)" : "var(--color-ink)";
}

export interface MockBook extends BookMetadata {
  id: string;
  colorIndex: number;
  tagLabel: string;
}

export const mockBooks = {
  meditations: { id: "meditations", title: "Meditations", tagLabel: "Meditations", author: "Marcus Aurelius", colorIndex: 0 },
  twentyFourHours: { id: "twenty-four-hours", title: "How to Live on 24 Hours a Day", tagLabel: "24 Hours a Day", author: "Arnold Bennett", colorIndex: 1 },
  bennettEssays: { id: "bennett-essays", title: "Literary Taste", tagLabel: "Literary Taste", author: "Arnold Bennett", colorIndex: 2 },
  meditationsTwo: { id: "meditations-book-two", title: "Meditations: Book II", tagLabel: "Meditations · II", author: "Marcus Aurelius", colorIndex: 3 },
  bennettTalks: { id: "bennett-talks", title: "The Human Machine", tagLabel: "Human Machine", author: "Arnold Bennett", colorIndex: 4 },
  meditationsSix: { id: "meditations-book-six", title: "Meditations: Book VI", tagLabel: "Meditations · VI", author: "Marcus Aurelius", colorIndex: 5 },
} as const satisfies Record<string, MockBook>;

function chunk(
  book: MockBook,
  chapterIndex: number,
  section: string,
  rawText: string,
  start: number,
): BookChunk {
  return {
    bookRef: book.id,
    chapterIndex,
    sectionPath: [section],
    breadcrumb: `${book.tagLabel} › ${section}`,
    rawText,
    embeddableText: `${book.title} › ${section}\n${rawText}`,
    charOffsets: { start, end: start + rawText.length },
    tokenCount: rawText.split(/\s+/).length,
  };
}

const meditationsRetreat = chunk(
  mockBooks.meditations,
  3,
  "Book IV",
  "Nowhere can man find a quieter or more untroubled retreat than in his own soul.",
  1200,
);
const meditationsMorning = chunk(
  mockBooks.meditationsTwo,
  1,
  "Book II",
  "Begin the morning by saying to thyself, I shall meet with the busy-body, the ungrateful, arrogant, deceitful, envious, unsocial.",
  420,
);
const meditationsChange = chunk(
  mockBooks.meditationsSix,
  5,
  "Book VI",
  "The universe is change: our life is what our thoughts make it.",
  860,
);
const bennettTime = chunk(
  mockBooks.twentyFourHours,
  0,
  "Preface",
  "We shall never have more time. We have, and we have always had, all the time there is.",
  80,
);
const bennettModern = chunk(
  mockBooks.bennettEssays,
  2,
  "On Modernity",
  "Nothing is more dangerous than being too modern; one is apt to grow old-fashioned quite suddenly.",
  560,
);
const bennettAttention = chunk(
  mockBooks.bennettTalks,
  1,
  "Attention",
  "The faculty of attention is the faculty of concentration, and it is the beginning of all real work.",
  310,
);

const generatedQuestions = {
  questions: [
    { question: "Why does a quiet mind need a place to retreat?", chunkRefs: ["meditations:4:1200"], hook: "Your best hiding place is not a room." },
    { question: "What changes when you expect difficult people before breakfast?", chunkRefs: ["meditations:2:420"], hook: "A bad meeting loses its surprise." },
    { question: "Why can’t a better schedule save you?", chunkRefs: ["twenty-four-hours:preface:80"], hook: "The time you want is already here." },
    { question: "How do your thoughts turn change into a life?", chunkRefs: ["meditations:6:860"], hook: "The event moves; your judgment stays." },
    { question: "What makes attention feel like real work?", chunkRefs: ["bennett-talks:attention:310"], hook: "Focus is a trainable act, not a mood." },
    { question: "When does being current make you less original?", chunkRefs: ["bennett-essays:modernity:560"], hook: "Fashion ages faster than taste." },
    { question: "What can you control before the day controls you?", chunkRefs: ["meditations:2:420", "twenty-four-hours:preface:80"], hook: "Start with the part that forms opinions." },
  ],
} satisfies QuestionGenOutput;

export interface MockCitation {
  chunk: BookChunk;
  quote: string;
}

export interface QuestionFixture {
  kind: "question";
  id: string;
  book: MockBook;
  generated: QuestionGenOutput["questions"][number];
  answer: AnswerOutput;
  citations: MockCitation[];
}

export interface QuoteFixture {
  kind: "quote";
  id: string;
  book: MockBook;
  chunk: BookChunk;
}

export interface CoverFixture {
  kind: "cover";
  id: string;
  book: MockBook;
  note: string;
}

export type FeedFixture = QuestionFixture | QuoteFixture | CoverFixture;

function questionFixture(
  id: string,
  book: MockBook,
  generated: QuestionGenOutput["questions"][number],
  answer: AnswerOutput,
  citations: MockCitation[],
): QuestionFixture {
  return { kind: "question", id, book, generated, answer, citations };
}

export const feedFixtures: FeedFixture[] = [
  questionFixture("quiet-retreat", mockBooks.meditations, generatedQuestions.questions[0], {
    answer: "Aurelius makes retreat portable. The point is not to escape the day; it is to find the part of you that can meet it without adding more noise. A few moments there can make the next decision less borrowed from the room around you.",
    citations: [{ chunkRef: "meditations:4:1200", quote: meditationsRetreat.rawText }],
  }, [{ chunk: meditationsRetreat, quote: meditationsRetreat.rawText }]),
  { kind: "quote", id: "quote-morning", book: mockBooks.meditationsTwo, chunk: meditationsMorning },
  questionFixture("time-is-here", mockBooks.twentyFourHours, generatedQuestions.questions[2], {
    answer: "Bennett’s provocation is that a fuller calendar cannot manufacture time. The useful question is smaller: what part of the hours you already own gets your deliberate attention? That is where a different life starts to appear.",
    citations: [{ chunkRef: "twenty-four-hours:preface:80", quote: bennettTime.rawText }],
  }, [{ chunk: bennettTime, quote: bennettTime.rawText }]),
  { kind: "cover", id: "cover-literary-taste", book: mockBooks.bennettEssays, note: "A sharp little argument about what survives fashion." },
  questionFixture("thoughts-and-change", mockBooks.meditationsSix, generatedQuestions.questions[3], {
    answer: "Change is not optional, but the story attached to it is. Aurelius separates the moving world from the mind that judges it. That gap is small enough to use: name the fact first, then decide what it means.",
    citations: [{ chunkRef: "meditations:6:860", quote: meditationsChange.rawText }],
  }, [{ chunk: meditationsChange, quote: meditationsChange.rawText }]),
  { kind: "quote", id: "quote-modern", book: mockBooks.bennettEssays, chunk: bennettModern },
  questionFixture("expect-the-friction", mockBooks.meditationsTwo, generatedQuestions.questions[1], {
    answer: "Expectation is not pessimism here; it is preparation. When friction arrives, it no longer gets to define the whole scene. You can meet the person in front of you instead of the fantasy that they would be easy.",
    citations: [{ chunkRef: "meditations:2:420", quote: meditationsMorning.rawText }],
  }, [{ chunk: meditationsMorning, quote: meditationsMorning.rawText }]),
  { kind: "cover", id: "cover-human-machine", book: mockBooks.bennettTalks, note: "For the moments when motivation is not the point." },
  questionFixture("attention-is-work", mockBooks.bennettTalks, generatedQuestions.questions[4], {
    answer: "Attention is work because it gives one thing the right to exclude the rest. Bennett treats it as a faculty, which means it can be practised in small, repeatable acts, not waited for as a lucky feeling.",
    citations: [{ chunkRef: "bennett-talks:attention:310", quote: bennettAttention.rawText }],
  }, [{ chunk: bennettAttention, quote: bennettAttention.rawText }]),
  { kind: "quote", id: "quote-retreat", book: mockBooks.meditations, chunk: meditationsRetreat },
  questionFixture("current-isnt-original", mockBooks.bennettEssays, generatedQuestions.questions[5], {
    answer: "Being current can turn into a reflex: reaching for what everyone has just agreed matters. Bennett’s joke points toward a slower test: whether an idea still has life after the moment that made it fashionable has passed.",
    citations: [{ chunkRef: "bennett-essays:modernity:560", quote: bennettModern.rawText }],
  }, [{ chunk: bennettModern, quote: bennettModern.rawText }]),
  questionFixture("morning-control", mockBooks.meditationsTwo, generatedQuestions.questions[6], {
    answer: "You cannot control the characters who show up or add hours to the clock. You can choose your first judgment. That makes the opening of a day less about winning it and more about keeping a hand on the part that is yours.",
    citations: [
      { chunkRef: "meditations:2:420", quote: meditationsMorning.rawText },
      { chunkRef: "twenty-four-hours:preface:80", quote: bennettTime.rawText },
    ],
  }, [
    { chunk: meditationsMorning, quote: meditationsMorning.rawText },
    { chunk: bennettTime, quote: bennettTime.rawText },
  ]),
  { kind: "quote", id: "quote-time", book: mockBooks.twentyFourHours, chunk: bennettTime },
  { kind: "quote", id: "quote-change", book: mockBooks.meditationsSix, chunk: meditationsChange },
];

export const questionsById = Object.fromEntries(
  feedFixtures
    .filter((item): item is QuestionFixture => item.kind === "question")
    .map((item) => [item.id, item]),
);
