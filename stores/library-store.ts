import { create } from "zustand";
import type { Book } from "@/lib/db";

type LibraryState = {
  uploading: boolean;
  setUploading: (v: boolean) => void;
  processingBookId: string | null;
  setProcessingBookId: (id: string | null) => void;
  books: Book[];
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  removeBook: (id: string) => void;
};

export const useLibraryStore = create<LibraryState>((set) => ({
  uploading: false,
  setUploading: (v) => set({ uploading: v }),
  processingBookId: null,
  setProcessingBookId: (id) => set({ processingBookId: id }),
  books: [],
  setBooks: (books) => set({ books }),
  addBook: (book) => set((s) => ({ books: [book, ...s.books] })),
  updateBook: (id, updates) =>
    set((s) => ({
      books: s.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBook: (id) => set((s) => ({ books: s.books.filter((b) => b.id !== id) })),
}));
