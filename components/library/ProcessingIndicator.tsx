"use client";

type ProcessingIndicatorProps = {
  status: "pending" | "extracting" | "scoring" | "ready" | "error";
  progress: number;
  className?: string;
};

export function ProcessingIndicator({
  status,
  progress,
  className = "",
}: ProcessingIndicatorProps) {
  if (status === "ready" || status === "error") return null;

  const label =
    status === "extracting"
      ? "Extracting…"
      : status === "scoring"
        ? "Scoring…"
        : "Preparing…";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
          style={{ width: `${Math.round(progress)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}
