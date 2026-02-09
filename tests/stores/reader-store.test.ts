import { describe, it, expect, beforeEach } from "vitest";
import { useReaderStore, MIN_FONT_SIZE, MAX_FONT_SIZE, DEFAULT_FONT_SIZE } from "@/stores/reader-store";

describe("reader-store", () => {
  beforeEach(() => {
    useReaderStore.setState({
      readerTheme: "light",
      fontSize: DEFAULT_FONT_SIZE,
    });
  });

  describe("life case: reader themes and font size — persisted", () => {
    it("has default theme light and default font size", () => {
      expect(useReaderStore.getState().readerTheme).toBe("light");
      expect(useReaderStore.getState().fontSize).toBe(DEFAULT_FONT_SIZE);
    });

    it("setReaderTheme updates theme (Light, Dark, Sepia, Midnight)", () => {
      useReaderStore.getState().setReaderTheme("dark");
      expect(useReaderStore.getState().readerTheme).toBe("dark");
      useReaderStore.getState().setReaderTheme("sepia");
      expect(useReaderStore.getState().readerTheme).toBe("sepia");
      useReaderStore.getState().setReaderTheme("midnight");
      expect(useReaderStore.getState().readerTheme).toBe("midnight");
      useReaderStore.getState().setReaderTheme("light");
      expect(useReaderStore.getState().readerTheme).toBe("light");
    });

    it("setFontSize updates size and clamps to min/max", () => {
      useReaderStore.getState().setFontSize(20);
      expect(useReaderStore.getState().fontSize).toBe(20);
      useReaderStore.getState().setFontSize(MIN_FONT_SIZE - 10);
      expect(useReaderStore.getState().fontSize).toBe(MIN_FONT_SIZE);
      useReaderStore.getState().setFontSize(MAX_FONT_SIZE + 10);
      expect(useReaderStore.getState().fontSize).toBe(MAX_FONT_SIZE);
    });
  });
});
