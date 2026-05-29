import { NextRequest } from "next/server";

// Validates the x-api-key header for /api/mcp/* routes.
// Returns true if the key is present and matches ARTIFACT_HUB_ADMIN_KEY.
export function isMcpAuthorized(request: NextRequest): boolean {
  const key = request.headers.get("x-api-key");
  const expected = process.env.ARTIFACT_HUB_ADMIN_KEY;
  if (!expected) return false;
  return key === expected;
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
