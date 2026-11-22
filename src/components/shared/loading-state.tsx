import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({
  message = "Loading...",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  );
}
