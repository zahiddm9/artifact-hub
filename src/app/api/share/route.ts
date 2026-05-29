import { NextRequest, NextResponse } from "next/server";
import { getArtifact } from "@/lib/services/artifacts";
import { createShareLink } from "@/lib/services/share";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.artifact_id || typeof b.artifact_id !== "string") {
    return NextResponse.json({ error: "artifact_id required" }, { status: 400 });
  }

  // Confirm the artifact exists before creating a link
  const artifactResult = await getArtifact(b.artifact_id);
  if (!artifactResult.ok) {
    return NextResponse.json({ error: artifactResult.message }, { status: artifactResult.status });
  }

  const result = await createShareLink({
    artifact_id: b.artifact_id,
    expires_in_hours: typeof b.expires_in_hours === "number" ? b.expires_in_hours : undefined,
    label: typeof b.label === "string" ? b.label : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
