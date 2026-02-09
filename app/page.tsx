"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { useAppStore } from "@/stores/app-store";

export default function Home() {
  const router = useRouter();
  const [decided, setDecided] = useState(false);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  useEffect(() => {
    let cancelled = false;
    db.books.count().then((count) => {
      if (cancelled) return;
      setDecided(true);
      setBookCount(count);
      if (count > 0 || onboardingComplete) {
        router.replace(count === 0 ? "/library" : "/feed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, onboardingComplete]);

  const goToLibrary = () => {
    setOnboardingComplete(true);
    router.replace("/library");
  };

  if (!decided) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  if (bookCount === 0 && !onboardingComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
        <div className="flex max-w-sm flex-col gap-6 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome to Scrollwise
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Scrollwise surfaces the best bits from your books. Add your first book to discover
            snippets in a feed—tap to read at any moment.
          </p>
          <button
            type="button"
            onClick={goToLibrary}
            className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Add your first book
          </button>
        </div>
      </div>
    );
  }

  return null;
}
