import { NextRequest, NextResponse } from "next/server";
import { getArtifact } from "@/lib/services/artifacts";
import { listFeedback, addFeedback } from "@/lib/services/feedback";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await listFeedback(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Confirm artifact exists
  const artifactResult = await getArtifact(id);
  if (!artifactResult.ok) {
    return NextResponse.json({ error: artifactResult.message }, { status: artifactResult.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.reviewer_name || !b.feedback_type || !b.comment) {
    return NextResponse.json(
      { error: "Missing required fields: reviewer_name, feedback_type, comment" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await addFeedback(id, b as any);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
