import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { getArtifact } from "@/lib/services/artifacts";
import { listFeedback } from "@/lib/services/feedback";
import { getPublicArtifactUrl } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireMcpAuth(request);
  if (authError) return authError;

  const { id } = await params;

  // Fetch artifact and feedback in parallel; visibility bypass — key is access grant
  const [artifactResult, feedbackResult] = await Promise.all([
    getArtifact(id),
    listFeedback(id),
  ]);

  if (!artifactResult.ok) {
    return NextResponse.json({ error: artifactResult.message }, { status: artifactResult.status });
  }

  // Generate 1-hour signed URL regardless of visibility
  let signedUrl = "";
  try {
    signedUrl = await getPublicArtifactUrl(artifactResult.data.storage_path);
  } catch {
    // Degrade gracefully — return artifact + feedback without a preview URL
  }

  const { storage_path: _, ...publicArtifact } = artifactResult.data;
  const feedback = feedbackResult.ok ? feedbackResult.data : [];
  const feedbackError = feedbackResult.ok ? null : feedbackResult.message;

  return NextResponse.json({ artifact: publicArtifact, feedback, feedbackError, signedUrl });
}
