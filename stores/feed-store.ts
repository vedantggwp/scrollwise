import { create } from "zustand";

type FeedState = {
  firstVisibleItemIndex: number;
  setFirstVisibleItemIndex: (index: number) => void;
  lastTappedCardId: string | null;
  setLastTappedCardId: (id: string | null) => void;
};

export const useFeedStore = create<FeedState>((set) => ({
  firstVisibleItemIndex: 0,
  setFirstVisibleItemIndex: (index) => set({ firstVisibleItemIndex: index }),
  lastTappedCardId: null,
  setLastTappedCardId: (id) => set({ lastTappedCardId: id }),
}));
