import { NextRequest, NextResponse } from "next/server";
import { getSummary } from "@/lib/services/summarize";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let forceRefresh = false;
  try {
    const body = await request.json();
    forceRefresh = body.force_refresh === true;
  } catch {
    // body is optional
  }

  const result = await getSummary(id, { forceRefresh });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  return NextResponse.json({
    summary: result.data.summary,
    feedbackCount: result.data.feedbackCount,
  });
}
