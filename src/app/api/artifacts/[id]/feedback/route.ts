import { NextRequest, NextResponse } from "next/server";
import { getArtifact } from "@/lib/services/artifacts";
import { listFeedback, addFeedback } from "@/lib/services/feedback";
import type { FeedbackType, CreateFeedbackBody } from "@/types";

const VALID_FEEDBACK_TYPES: FeedbackType[] = ["approval", "suggestion", "issue", "question"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Unlisted artifacts are not accessible via direct URL — match /artifacts/[id] policy
  const artifactResult = await getArtifact(id);
  if (!artifactResult.ok) {
    return NextResponse.json({ error: artifactResult.message }, { status: artifactResult.status });
  }
  if (artifactResult.data.visibility === "unlisted") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await listFeedback(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Confirm artifact exists (visibility not enforced on POST — share link holders can add feedback)
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

  if (typeof b.reviewer_name !== "string" || !b.reviewer_name.trim()) {
    return NextResponse.json({ error: "reviewer_name must be a non-empty string" }, { status: 400 });
  }
  if (!VALID_FEEDBACK_TYPES.includes(b.feedback_type as FeedbackType)) {
    return NextResponse.json(
      { error: `feedback_type must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (typeof b.comment !== "string" || !b.comment.trim()) {
    return NextResponse.json({ error: "comment must be a non-empty string" }, { status: 400 });
  }

  const feedbackBody: CreateFeedbackBody = {
    reviewer_name: (b.reviewer_name as string).trim(),
    reviewer_role: typeof b.reviewer_role === "string" && b.reviewer_role.trim()
      ? b.reviewer_role.trim()
      : undefined,
    feedback_type: b.feedback_type as FeedbackType,
    comment: (b.comment as string).trim(),
  };

  const result = await addFeedback(id, feedbackBody);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
