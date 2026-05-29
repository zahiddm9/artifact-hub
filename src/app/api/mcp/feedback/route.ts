import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { getArtifact } from "@/lib/services/artifacts";
import { addFeedback, updateFeedbackStatus } from "@/lib/services/feedback";
import type { FeedbackType, FeedbackStatus, CreateFeedbackBody } from "@/types";

const VALID_FEEDBACK_TYPES: FeedbackType[] = ["approval", "suggestion", "issue", "question"];
const VALID_STATUSES: FeedbackStatus[] = ["open", "resolved", "needs_review"];

// POST — add feedback (MCP callers can add feedback to any artifact, public or unlisted)
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

  // Confirm artifact exists (no visibility gate — key is access grant)
  const artifactResult = await getArtifact(b.artifact_id);
  if (!artifactResult.ok) {
    return NextResponse.json({ error: artifactResult.message }, { status: artifactResult.status });
  }

  const feedbackBody: CreateFeedbackBody = {
    reviewer_name: (b.reviewer_name as string).trim(),
    reviewer_role:
      typeof b.reviewer_role === "string" && b.reviewer_role.trim()
        ? b.reviewer_role.trim()
        : undefined,
    feedback_type: b.feedback_type as FeedbackType,
    comment: (b.comment as string).trim(),
  };

  const result = await addFeedback(b.artifact_id, feedbackBody);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}

// PATCH — update feedback status (MCP/API-only; not exposed in the web UI)
export async function PATCH(request: NextRequest) {
  const authError = requireMcpAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.feedback_id !== "string" || !b.feedback_id) {
    return NextResponse.json({ error: "feedback_id required" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(b.status as FeedbackStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const result = await updateFeedbackStatus(b.feedback_id, b.status as FeedbackStatus);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
