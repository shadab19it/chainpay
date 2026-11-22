/**
 * Runs once when the server starts. Validates environment variables early
 * so a malformed value (e.g. CASHFREE_ENV=prod) fails fast with a clear message.
 * Missing integration keys are allowed — they're checked when used.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/lib/env");
    getServerEnv();
  }
}
