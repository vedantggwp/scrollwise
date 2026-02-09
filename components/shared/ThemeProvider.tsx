"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";

type ResolvedTheme = "light" | "dark";

const ThemeContext = createContext<ResolvedTheme>("light");

export function useResolvedTheme(): ResolvedTheme {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const next = mq.matches ? "dark" : "light";
      queueMicrotask(() => setResolved(next));
      root.classList.remove("light", "dark");
      root.classList.add(next);
      const handler = () => {
        const n = mq.matches ? "dark" : "light";
        setResolved(n);
        root.classList.remove("light", "dark");
        root.classList.add(n);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    queueMicrotask(() => setResolved(theme));
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    return undefined;
  }, [theme]);

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
}
