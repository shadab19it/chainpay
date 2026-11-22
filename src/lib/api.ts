import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ApiError, ApiErrorCode, ApiSuccess } from "@/types/api";

/**
 * Helpers that keep every Route Handler response consistent.
 * See src/types/api.ts for the response shape.
 */

const NO_STORE = { "Cache-Control": "no-store" };

export function apiSuccess<T = undefined>(
  options: { data?: T; message?: string; status?: number } = {},
): Response {
  const { data, message = "OK", status = 200 } = options;
  const body: ApiSuccess<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status, headers: NO_STORE });
}

export function apiError(
  message: string,
  options: { status?: number; code?: ApiErrorCode; details?: unknown } = {},
): Response {
  const { status = 500, code = "INTERNAL_ERROR", details } = options;
  const body: ApiError = {
    success: false,
    message,
    error: { code, ...(details !== undefined && { details }) },
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { status, headers: NO_STORE });
}

/** Thrown inside a handler to return a specific status + code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: ApiErrorCode = "BAD_REQUEST",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Parse and validate a JSON request body with a Zod schema.
 * Throws HttpError (400) on invalid JSON or ZodError on invalid data;
 * both are converted to proper responses by `handleApiError`.
 */
export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  return schema.parse(json);
}

/**
 * Convert any thrown value into an ApiError response.
 * Internal error messages are never sent to the client.
 */
export function handleApiError(error: unknown): Response {
  // Let Next.js internal signals (notFound, redirect, prerender bailouts) pass through.
  unstable_rethrow(error);

  if (error instanceof z.ZodError) {
    return apiError("Invalid request data", {
      status: 400,
      code: "VALIDATION_ERROR",
      details: z.flattenError(error),
    });
  }

  if (error instanceof HttpError) {
    return apiError(error.message, {
      status: error.status,
      code: error.code,
      details: error.details,
    });
  }

  console.error("[api] Unhandled error:", error);
  return apiError("Internal server error");
}
