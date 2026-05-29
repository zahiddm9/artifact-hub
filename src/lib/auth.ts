import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Validates the x-api-key header for /api/mcp/* routes.
// Uses constant-time comparison to avoid timing-based key enumeration.
export function isMcpAuthorized(request: NextRequest): boolean {
  const key = request.headers.get("x-api-key");
  const expected = process.env.ARTIFACT_HUB_ADMIN_KEY;
  if (!expected || !key) return false;
  // timingSafeEqual requires equal-length buffers; length mismatch is an immediate reject.
  // Key length is not secret (it is fixed at deploy time), so this does not leak useful info.
  if (key.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

// Helper for route handlers: returns a 401 Response if not authorized.
export function requireMcpAuth(request: NextRequest): Response | null {
  if (!isMcpAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
