"use client";

import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type UploadDropzoneProps = {
  onFiles: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
};

export function UploadDropzone({
  onFiles,
  accept = ".epub,application/epub+zip,.pdf,application/pdf",
  disabled,
  className,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length) onFiles(files);
      e.target.value = "";
    },
    [onFiles]
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-100/50 p-8 transition-colors dark:border-neutral-700 dark:bg-neutral-800/30",
        !disabled && "hover:border-blue-500 hover:bg-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/20",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      aria-label="Add a book. Drop EPUB or PDF, or click to upload."
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
      <Upload className="h-10 w-10 text-neutral-500 dark:text-neutral-400" aria-hidden />
      <p className="text-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Drop EPUB or PDF here
      </p>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">or click to browse</p>
    </div>
  );
}
