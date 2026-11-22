import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

/** Root frame. Pages own their own header and layout (the dashboard is full-bleed). */
export function AppShell({ children }: AppShellProps) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
