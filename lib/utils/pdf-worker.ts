/**
 * Set up pdfjs-dist worker for browser. Call once before using getDocument (extractor, cover, etc.).
 */

import * as pdfjsLib from "pdfjs-dist";

let initialized = false;

export function ensurePdfWorker(): void {
  if (typeof window === "undefined" || initialized) return;
  // Serve worker from same origin to avoid CORS/CDN failures (file in public/)
  (pdfjsLib.GlobalWorkerOptions as { workerSrc?: string }).workerSrc = "/pdf.worker.min.js";
  initialized = true;
}
