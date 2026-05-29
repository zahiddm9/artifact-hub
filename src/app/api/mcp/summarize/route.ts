import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { getSummary } from "@/lib/services/summarize";

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

  const result = await getSummary(b.artifact_id, { forceRefresh: b.force_refresh === true });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  return NextResponse.json({
    summary: result.data.summary,
    feedbackCount: result.data.feedbackCount,
  });
}
