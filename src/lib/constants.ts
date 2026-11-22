/**
 * App-wide constants. Safe to import from both server and client code.
 * Never put secrets here.
 */

export const APP_NAME = "ChainPay";
export const APP_DESCRIPTION =
  "AI payout calendar for Bharat merchants: one missed payment shouldn't break five relationships.";

/**
 * Public app URL. Only `NEXT_PUBLIC_*` variables are inlined into the
 * browser bundle, and only when referenced exactly like this.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const API_ROUTES = {
  health: "/api/health",
} as const;
