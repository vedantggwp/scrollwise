"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Scrollwise]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="h-12 w-12 text-amber-500" aria-hidden />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Something went wrong
          </h2>
          <p className="max-w-sm text-center text-sm text-neutral-600 dark:text-neutral-400">
            The app hit an error. Try again or go back to the feed or library.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/feed")}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Go to Feed
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/library")}
              className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              Go to Library
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
