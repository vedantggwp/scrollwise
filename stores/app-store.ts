import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

type AppState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  storageTipDismissed: boolean;
  setStorageTipDismissed: (v: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      onboardingComplete: false,
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),
      storageTipDismissed: false,
      setStorageTipDismissed: (v) => set({ storageTipDismissed: v }),
    }),
    { name: "scrollwise-app" }
  )
);
