import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { createShareLink } from "@/lib/services/share";

export async function POST(request: NextRequest) {
  const authError = requireMcpAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (typeof b.artifact_id !== "string" || !b.artifact_id) {
    return NextResponse.json({ error: "artifact_id required" }, { status: 400 });
  }

  const result = await createShareLink({
    artifact_id: b.artifact_id,
    expires_in_hours: typeof b.expires_in_hours === "number" ? b.expires_in_hours : undefined,
    label: typeof b.label === "string" ? b.label : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
