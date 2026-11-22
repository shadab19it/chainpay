"use client"; // Catches errors in the root layout itself

import "./globals.css";
import { ErrorState } from "@/components/shared/error-state";

type GlobalErrorProps = {
  error: unknown;
  retry: () => void;
};

export default function GlobalError({ retry }: GlobalErrorProps) {
  // global-error replaces the root layout, so it must render <html> and <body>.
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center font-sans">
        <ErrorState onRetry={retry} />
      </body>
    </html>
  );
}
