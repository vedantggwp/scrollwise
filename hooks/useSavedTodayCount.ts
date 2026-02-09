"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/db";

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useSavedTodayCount(): number {
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      const start = startOfTodayMs();
      const n = await db.snippets
        .filter((s) => s.savedAt != null && s.savedAt >= start)
        .count();
      if (mountedRef.current) setCount(n);
    }

    load().catch(() => {});

    const onVisible = () => {
      if (mountedRef.current) load().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return count;
}
