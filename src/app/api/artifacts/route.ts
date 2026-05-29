import { NextRequest, NextResponse } from "next/server";
import { listArtifacts, createArtifact } from "@/lib/services/artifacts";
import { createShareLink } from "@/lib/services/share";
import type { ArtifactType } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get("type") as ArtifactType) || undefined;
  const tagParam = searchParams.get("tags");
  const tags = tagParam ? tagParam.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const result = await listArtifacts({ type, tags, visibility: "public", limit, offset });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.title || !b.type || !b.mime_type || !b.file_base64 || !b.filename) {
    return NextResponse.json({ error: "Missing required fields: title, type, mime_type, file_base64, filename" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await createArtifact(b as any);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const artifact = result.data;

  // Auto-create 30-day share link for unlisted artifacts
  if (artifact.visibility === "unlisted") {
    const shareResult = await createShareLink({
      artifact_id: artifact.id,
      expires_in_hours: 24 * 30,
      label: "Auto-generated on publish",
    });
    if (shareResult.ok) {
      return NextResponse.json({ artifact, shareLink: shareResult.data }, { status: 201 });
    }
  }

  return NextResponse.json({ artifact }, { status: 201 });
}
