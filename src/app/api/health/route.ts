import { connection } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api";

/**
 * GET /api/health
 * Response: { success: true, message: "Service is healthy", timestamp }
 */
export async function GET() {
  try {
    // Run at request time so the timestamp is fresh (required by Cache Components).
    await connection();
    return apiSuccess({ message: "Service is healthy" });
  } catch (error) {
    return handleApiError(error);
  }
}
