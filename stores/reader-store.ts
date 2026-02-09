import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentLocation } from "@/lib/content/types";
import type { ReaderTheme } from "@/lib/content/types";

type ReaderState = {
  bookId: string | null;
  location: ContentLocation | null;
  setBook: (bookId: string | null, location: ContentLocation | null) => void;
  readerTheme: ReaderTheme;
  fontSize: number;
  setReaderTheme: (theme: ReaderTheme) => void;
  setFontSize: (size: number) => void;
};

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;
const DEFAULT_FONT_SIZE = 18;

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      bookId: null,
      location: null,
      setBook: (bookId, location) => set({ bookId, location }),
      readerTheme: "light",
      fontSize: DEFAULT_FONT_SIZE,
      setReaderTheme: (readerTheme) => set({ readerTheme }),
      setFontSize: (fontSize) =>
        set({ fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize)) }),
    }),
    { name: "scrollwise-reader" }
  )
);

export { MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE };
