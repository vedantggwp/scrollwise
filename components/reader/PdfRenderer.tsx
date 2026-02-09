"use client";

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { highlightPlugin } from "@react-pdf-viewer/highlight";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import { db } from "@/lib/db";
import type { Annotation } from "@/lib/db";
import { serializeLocation } from "@/lib/content/types";
import type { ReaderTheme } from "@/lib/content/types";

/** Map reader font size (e.g. 14–24) to PDF scale so zoom feels consistent with EPUB. */
function fontSizeToScale(fontSize: number): number {
  return 0.75 + (fontSize - 12) * 0.04;
}

export type PdfRendererHandle = {
  jumpToPage: (pageIndex: number) => void;
};

type PdfRendererProps = {
  bookId: string;
  blob: Blob;
  initialPage?: number;
  readerTheme?: ReaderTheme;
  fontSize?: number;
};

/** highlightPlugin() uses Hooks internally — must be called at top level, not inside useMemo. */
export const PdfRenderer = forwardRef<PdfRendererHandle, PdfRendererProps>(function PdfRenderer(
  { bookId, blob, initialPage = 0, readerTheme = "light", fontSize = 16 },
  ref
) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const annotationsRef = useRef(annotations);
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // highlightPlugin() must be called at top level (it uses Hooks). We read annotationsRef
  // in renderHighlights so the plugin sees latest annotations without being recreated each render.
  /* eslint-disable react-hooks/refs */
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (props) => (
      <div
        className="flex gap-1 rounded border border-neutral-200 bg-white p-1 shadow dark:border-neutral-700 dark:bg-neutral-800"
        style={{
          left: props.selectionRegion.left,
          position: "absolute",
          top: props.selectionRegion.top - 40,
          transform: "translate(0, -100%)",
        }}
      >
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] rounded px-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
          onClick={() => {
            const now = Date.now();
            const id = crypto.randomUUID();
            const pageIndex = props.selectionRegion.pageIndex;
            const location = serializeLocation({ type: "pdf", page: pageIndex + 1 });
            const ann: Annotation = {
              id,
              bookId,
              type: "highlight",
              cfiRange: location,
              text: props.selectedText,
              noteBody: null,
              pageIndex,
              pdfHighlightAreas: [props.selectionRegion],
              createdAt: now,
              updatedAt: now,
            };
            db.annotations.add(ann);
            setAnnotations((prev) => [...prev, ann]);
            props.toggle();
          }}
        >
          Highlight
        </button>
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] rounded px-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          onClick={props.cancel}
        >
          Cancel
        </button>
      </div>
    ),
    renderHighlights: (props) => {
      const current = annotationsRef.current;
      const areas = current.flatMap((a) =>
        (a.pdfHighlightAreas ?? []).filter((r) => r.pageIndex === props.pageIndex)
      );
      return (
        <>
          {areas.map((area, idx) => (
            <div
              key={`${area.pageIndex}-${idx}-${area.left}`}
              className="bg-amber-200/60 dark:bg-amber-400/40"
              style={props.getCssProperties(area, props.rotation)}
            />
          ))}
        </>
      );
    },
  });
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    db.annotations
      .where("bookId")
      .equals(bookId)
      .filter((a) => Boolean(a.pdfHighlightAreas?.length))
      .toArray()
      .then((list) => {
        if (!cancelled) setAnnotations(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  useImperativeHandle(ref, () => ({
    jumpToPage(pageIndex: number) {
      highlightPluginInstance.jumpToHighlightArea({
        pageIndex,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      });
    },
  }));

  // Worker served from public/ to avoid CORS (see lib/utils/pdf-worker.ts)
  const workerUrl = "/pdf.worker.min.js";
  const theme = readerTheme === "dark" || readerTheme === "midnight" ? "dark" : "light";
  const defaultScale = fontSizeToScale(fontSize);

  if (!fileUrl) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500 dark:text-neutral-400">
        Loading PDF…
      </div>
    );
  }

  return (
    <Worker workerUrl={workerUrl}>
      <div className="h-full overflow-auto">
        <Viewer
          fileUrl={fileUrl}
          initialPage={initialPage}
          theme={theme}
          defaultScale={defaultScale}
          plugins={[highlightPluginInstance]}
        />
      </div>
    </Worker>
  );
});
