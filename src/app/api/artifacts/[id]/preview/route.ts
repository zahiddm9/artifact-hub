import { NextRequest, NextResponse } from "next/server";
import { getArtifact } from "@/lib/services/artifacts";
import { getPublicArtifactUrl } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getArtifact(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  if (result.data.visibility === "unlisted") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = await getPublicArtifactUrl(result.data.storage_path);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to generate preview URL" }, { status: 500 });
  }
}
