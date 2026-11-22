import "server-only";
import { z } from "zod";

/**
 * Server-side environment variables.
 *
 * - `import "server-only"` makes the build fail if a Client Component
 *   imports this file, so secrets can never reach the browser.
 * - Integration keys are OPTIONAL so the app starts without them.
 *   Use `requireServerEnv("KEY")` inside the service that needs a key:
 *   it throws a clear error only when that integration is actually used.
 */

// Treat empty strings from .env files (e.g. `SARVAM_API_KEY=`) as "not set".
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalSecret = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.url().default("http://localhost:3000"),
  ),
  DATABASE_URL: optionalSecret,
  CASHFREE_CLIENT_ID: optionalSecret,
  CASHFREE_CLIENT_SECRET: optionalSecret,
  CASHFREE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["sandbox", "production"]).default("sandbox"),
  ),
  SARVAM_API_KEY: optionalSecret,
  LLM_API_KEY: optionalSecret,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Keys that may be missing at startup (the optional integration secrets). */
export type OptionalServerEnvKey = {
  [K in keyof ServerEnv]-?: undefined extends ServerEnv[K] ? K : never;
}[keyof ServerEnv];

let cachedEnv: ServerEnv | undefined;

/** Validates `process.env` once and returns typed values. */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** Returns true when an optional integration key has a value. */
export function hasServerEnv(key: OptionalServerEnvKey): boolean {
  return getServerEnv()[key] !== undefined;
}

/**
 * Returns a required value for a specific integration, or throws a helpful
 * error. Call this inside service modules, not at module top level.
 */
export function requireServerEnv<K extends OptionalServerEnvKey>(
  key: K,
): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key];
  if (value === undefined) {
    throw new Error(
      `Missing environment variable ${key}. Add it to .env.local (see .env.example) and restart the dev server.`,
    );
  }
  return value as NonNullable<ServerEnv[K]>;
}
