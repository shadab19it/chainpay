import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variantClasses = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary:
    "border border-border bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-red-600 text-white hover:bg-red-700",
} as const;

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof variantClasses;
export type ButtonSize = keyof typeof sizeClasses;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
