import type { ZodIssue, ZodType } from "zod";

export type ModelJsonErrorCode =
  | "JSON_NOT_FOUND"
  | "UNTERMINATED_JSON"
  | "INVALID_JSON"
  | "SCHEMA_VALIDATION_FAILED";

export interface ModelJsonError {
  code: ModelJsonErrorCode;
  message: string;
  issues?: ZodIssue[];
}

export type ModelJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ModelJsonError };

interface Candidate {
  text: string;
  end: number;
  terminated: boolean;
}

function stripOuterFence(rawText: string): string {
  const text = rawText.replace(/^\uFEFF/, "").trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
}

function scanCandidate(text: string, start: number): Candidate {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") stack.push("}");
    else if (character === "[") stack.push("]");
    else if (character === "}" || character === "]") {
      if (stack[stack.length - 1] !== character) {
        return { text: text.slice(start, index + 1), end: index, terminated: true };
      }
      stack.pop();
      if (stack.length === 0) {
        return { text: text.slice(start, index + 1), end: index, terminated: true };
      }
    }
  }
  return { text: text.slice(start), end: text.length - 1, terminated: false };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Extract and validate the first parseable JSON object or array in model text. */
export function parseModelJson<T>(schema: ZodType<T>, rawText: string): ModelJsonResult<T> {
  const text = stripOuterFence(rawText);
  let cursor = 0;
  let invalidJsonMessage: string | undefined;
  let sawCandidate = false;
  let sawUnterminatedCandidate = false;

  while (cursor < text.length) {
    const objectStart = text.indexOf("{", cursor);
    const arrayStart = text.indexOf("[", cursor);
    const starts = [objectStart, arrayStart].filter((index) => index >= 0);
    if (starts.length === 0) break;
    const start = Math.min(...starts);
    sawCandidate = true;
    const candidate = scanCandidate(text, start);
    if (!candidate.terminated) {
      sawUnterminatedCandidate = true;
      cursor = start + 1;
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate.text);
    } catch (error) {
      invalidJsonMessage ??= errorMessage(error);
      cursor = start + 1;
      continue;
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      if (sawUnterminatedCandidate || invalidJsonMessage) {
        cursor = start + 1;
        continue;
      }
      return {
        ok: false,
        error: {
          code: "SCHEMA_VALIDATION_FAILED",
          message: "Model JSON did not match the expected schema",
          issues: validated.error.issues,
        },
      };
    }
    return { ok: true, data: validated.data };
  }

  if (invalidJsonMessage) {
    return {
      ok: false,
      error: { code: "INVALID_JSON", message: invalidJsonMessage },
    };
  }
  if (sawUnterminatedCandidate) {
    return {
      ok: false,
      error: { code: "UNTERMINATED_JSON", message: "JSON object or array was not terminated" },
    };
  }
  return {
    ok: false,
    error: {
      code: "JSON_NOT_FOUND",
      message: sawCandidate ? "No parseable JSON object or array found" : "No JSON object or array found",
    },
  };
}
