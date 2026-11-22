import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-red-600" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
