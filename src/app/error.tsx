"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

type ErrorPageProps = {
  error: unknown;
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server error messages are hidden in production, so show a generic message.
  return (
    <ErrorState
      message="An unexpected error occurred. Please try again."
      onRetry={retry}
    />
  );
}
