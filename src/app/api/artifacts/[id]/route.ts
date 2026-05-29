import { NextRequest, NextResponse } from "next/server";
import { getArtifact } from "@/lib/services/artifacts";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getArtifact(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  // Web route: block direct access to unlisted artifacts
  if (result.data.visibility === "unlisted") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { storage_path: _, ...publicArtifact } = result.data;
  return NextResponse.json(publicArtifact);
}
