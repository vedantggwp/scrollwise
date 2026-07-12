import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";
import { describe, expect, it } from "vitest";

import type { BookChunk } from "@/lib/server/ingestion";
import {
  ANSWER_SYSTEM_PROMPT,
  QUESTION_GEN_SYSTEM_PROMPT,
  AnswerOutputSchema,
  QuestionGenOutputSchema,
  buildAnswerPrompt,
  buildQuestionGenPrompt,
  chunkRefFor,
  parseModelJson,
} from "@/lib/server/generation";

const fixtureDirectory = path.join(process.cwd(), "tests", "server", "generation", "fixtures");
const fixture = (name: string) => readFile(path.join(fixtureDirectory, name), "utf8");

function makeChunk(overrides: Partial<BookChunk> = {}): BookChunk {
  const rawText = "Attention lets a model connect relevant positions without recurrence.";
  return {
    bookRef: "attention",
    chapterIndex: 3,
    sectionPath: ["Model Architecture", "Attention"],
    breadcrumb: "Attention Is All You Need › Page 4 › Model Architecture › Attention",
    rawText,
    embeddableText: `Attention Is All You Need › Page 4\n\n${rawText}`,
    charOffsets: { start: 20, end: 90 },
    tokenCount: 24,
    ...overrides,
  };
}

describe("parseModelJson", () => {
  it("parses valid question and answer golden files", async () => {
    const questions = parseModelJson(QuestionGenOutputSchema, await fixture("question-valid.json"));
    const answer = parseModelJson(AnswerOutputSchema, await fixture("answer-valid.json"));

    expect(questions.ok).toBe(true);
    expect(answer.ok).toBe(true);
    if (questions.ok) expect(questions.data.questions[0].chunkRefs).toEqual(["attention:2:120-540"]);
    if (answer.ok) expect(answer.data.citations[0].quote).toContain("Attention");
  });

  it.each([
    ["question-wrong-types.json", QuestionGenOutputSchema],
    ["question-missing-field.json", QuestionGenOutputSchema],
    ["answer-missing-field.json", AnswerOutputSchema],
  ] as Array<[string, z.ZodType]>)(
    "returns typed schema failures for %s",
    async (filename, schema) => {
      const result = parseModelJson(schema, await fixture(filename));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SCHEMA_VALIDATION_FAILED");
        expect(result.error.issues?.length).toBeGreaterThan(0);
      }
    },
  );

  it("strips a markdown fence", async () => {
    const result = parseModelJson(QuestionGenOutputSchema, await fixture("question-fenced.txt"));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.questions[0].question).toContain("attention selective");
  });

  it("extracts JSON wrapped in prose", async () => {
    const result = parseModelJson(AnswerOutputSchema, await fixture("answer-prose-wrapped.txt"));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.answer).toContain("model dependencies");
  });

  it("extracts arrays and ignores brackets inside JSON strings", () => {
    const arrayResult = parseModelJson(z.array(z.string()), "Result: [\"one\", \"two\"] done.");
    const objectResult = parseModelJson(
      z.object({ value: z.string() }),
      String.raw`Before {"value":"a brace } and an escaped quote \" remain text"} after`,
    );

    expect(arrayResult).toEqual({ ok: true, data: ["one", "two"] });
    expect(objectResult.ok).toBe(true);
  });

  it.each([
    "Note: when cost { rises. Final: {\"value\":\"x\"}",
    "Given {x: 1, y: {\"value\":\"x\"}} above",
  ])("finds valid JSON after an earlier malformed brace candidate", (rawText) => {
    expect(parseModelJson(z.object({ value: z.string() }), rawText))
      .toEqual({ ok: true, data: { value: "x" } });
  });

  it("returns typed extraction and syntax errors", async () => {
    const unterminated = parseModelJson(QuestionGenOutputSchema, await fixture("malformed-json.txt"));
    const invalid = parseModelJson(
      QuestionGenOutputSchema,
      await fixture("balanced-invalid-json.txt"),
    );
    const missing = parseModelJson(QuestionGenOutputSchema, "The model returned no structured data.");

    expect(unterminated).toMatchObject({ ok: false, error: { code: "UNTERMINATED_JSON" } });
    expect(invalid).toMatchObject({ ok: false, error: { code: "INVALID_JSON" } });
    expect(missing).toMatchObject({ ok: false, error: { code: "JSON_NOT_FOUND" } });
  });
});

describe("prompt builders", () => {
  it("builds grounded question-generation messages deterministically", () => {
    const persona = "I am learning to protect deep focus while building software.";
    const chunks = Object.freeze([
      Object.freeze(makeChunk()),
      Object.freeze(makeChunk({
        chapterIndex: 4,
        breadcrumb: "Attention Is All You Need › Page 5 › Multi-Head Attention",
        charOffsets: { start: 100, end: 190 },
      })),
    ]);
    const before = JSON.stringify(chunks);

    const prompt = buildQuestionGenPrompt(persona, chunks);

    expect(prompt).toEqual(buildQuestionGenPrompt(persona, chunks));
    expect(prompt.system).toBe(QUESTION_GEN_SYSTEM_PROMPT);
    expect(prompt.system).toContain("THIS passage genuinely answers");
    expect(prompt.user).toContain(persona);
    for (const chunk of chunks) {
      expect(prompt.user).toContain(chunk.breadcrumb);
      expect(prompt.user).toContain(chunkRefFor(chunk));
    }
    expect(JSON.stringify(chunks)).toBe(before);
  });

  it("builds passage-only answer messages with the question and persona", () => {
    const question = "Why does attention help with long-range dependencies?";
    const persona = "I understand software systems but am new to machine learning.";
    const chunk = makeChunk();
    const prompt = buildAnswerPrompt(question, [chunk], persona);

    expect(prompt.system).toBe(ANSWER_SYSTEM_PROMPT);
    expect(prompt.system).toContain("ONLY from the supplied passages");
    expect(prompt.system).toContain("maximum of 180 words");
    expect(prompt.user).toContain(question);
    expect(prompt.user).toContain(persona);
    expect(prompt.user).toContain(chunk.breadcrumb);
    expect(prompt.user).toContain(chunkRefFor(chunk));
  });
});
