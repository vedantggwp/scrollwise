"use client";

import { useAppStore } from "@/stores/app-store";
import type { Theme } from "@/stores/app-store";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const options: { value: Theme; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        Settings
      </h1>
      <section className="mb-6" aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Theme
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="App theme">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                theme === opt.value
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              )}
              aria-pressed={theme === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        AI config and feed tuning will appear here in a later phase.
      </p>
    </div>
  );
}
