/**
 * Shared API response shape for every Route Handler.
 *
 * Success: { success: true,  message, data?, timestamp }
 * Error:   { success: false, message, error: { code, details? }, timestamp }
 *
 * The frontend can always check `response.success` first.
 */

export type ApiSuccess<T = undefined> = {
  success: true;
  message: string;
  data?: T;
  timestamp: string;
};

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export type ApiError = {
  success: false;
  message: string;
  error: {
    code: ApiErrorCode;
    details?: unknown;
  };
  timestamp: string;
};

export type ApiResponse<T = undefined> = ApiSuccess<T> | ApiError;
