import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely.
 * `cn("px-2", isActive && "bg-black", "px-4")` -> "bg-black px-4"
 * (Same helper shadcn/ui expects, so `npx shadcn@latest add ...` works later.)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Read a readable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong";
}
