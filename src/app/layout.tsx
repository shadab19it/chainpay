import type { Metadata, Viewport } from "next";
// Self-hosted Geist fonts (next/font/local under the hood): no network needed at build time.
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppShell } from "@/components/shared/app-shell";
import { APP_DESCRIPTION, APP_NAME, APP_URL } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
