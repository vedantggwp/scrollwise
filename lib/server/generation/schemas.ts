import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);

export const questionGenOutputSchema = z.object({
  questions: z.array(z.object({
    question: nonEmptyText,
    chunkRefs: z.array(nonEmptyText).min(1),
    hook: nonEmptyText,
  }).strict()).min(1),
}).strict();

export const QuestionGenOutputSchema = questionGenOutputSchema;
export type QuestionGenOutput = z.infer<typeof questionGenOutputSchema>;

export const answerOutputSchema = z.object({
  answer: nonEmptyText,
  citations: z.array(z.object({
    chunkRef: nonEmptyText,
    quote: nonEmptyText,
  }).strict()),
}).strict();

export const AnswerOutputSchema = answerOutputSchema;
export type AnswerOutput = z.infer<typeof answerOutputSchema>;
