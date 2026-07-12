import { describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({ notFound: vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
}) }));

vi.mock("next/navigation", () => ({ notFound }));

import Feed2AnswerPage from "@/app/feed2/answer/[id]/page";

describe("Feed2AnswerPage", () => {
  it.each(["constructor", "toString", "__proto__"])("uses notFound for reserved id %s", async (id) => {
    notFound.mockClear();

    await expect(Feed2AnswerPage({ params: Promise.resolve({ id }) }))
      .rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});
