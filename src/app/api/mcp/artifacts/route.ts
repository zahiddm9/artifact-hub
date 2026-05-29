import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { listArtifacts, createArtifact } from "@/lib/services/artifacts";
import { createShareLink } from "@/lib/services/share";
import type { ArtifactType, ArtifactVisibility, CreateArtifactBody } from "@/types";

const VALID_TYPES: ArtifactType[] = ["pdf", "image", "html"];
const VALID_VISIBILITIES: ArtifactVisibility[] = ["public", "unlisted"];

function parsePagination(raw: string | null, defaultValue: number, max?: number): number | null {
  if (raw === null) return defaultValue;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return null;
  return max !== undefined ? Math.min(n, max) : n;
}

export async function GET(request: NextRequest) {
  const authError = requireMcpAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);

  const rawType = searchParams.get("type");
  if (rawType && !VALID_TYPES.includes(rawType as ArtifactType)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const rawVisibility = searchParams.get("visibility");
  if (rawVisibility && !VALID_VISIBILITIES.includes(rawVisibility as ArtifactVisibility)) {
    return NextResponse.json({ error: `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}` }, { status: 400 });
  }

  const tagParam = searchParams.get("tags");
  const tags = tagParam ? tagParam.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const limit = parsePagination(searchParams.get("limit"), 50, 100);
  const offset = parsePagination(searchParams.get("offset"), 0);
  if (limit === null || offset === null) {
    return NextResponse.json({ error: "limit and offset must be non-negative integers" }, { status: 400 });
  }

  // MCP: no visibility restriction — API key is the access grant
  const result = await listArtifacts({
    type: (rawType as ArtifactType) || undefined,
    tags,
    visibility: (rawVisibility as ArtifactVisibility) || undefined,
    limit,
    offset,
  });

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data.map(({ storage_path: _, ...a }) => a));
}

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

  if (typeof b.title !== "string" || !b.title.trim()) {
    return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(b.type as ArtifactType)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  if (typeof b.mime_type !== "string" || !b.mime_type) {
    return NextResponse.json({ error: "mime_type must be a non-empty string" }, { status: 400 });
  }
  if (typeof b.file_base64 !== "string" || !b.file_base64) {
    return NextResponse.json({ error: "file_base64 must be a non-empty string" }, { status: 400 });
  }
  if (typeof b.filename !== "string" || !b.filename) {
    return NextResponse.json({ error: "filename must be a non-empty string" }, { status: 400 });
  }
  if (b.visibility !== undefined && !VALID_VISIBILITIES.includes(b.visibility as ArtifactVisibility)) {
    return NextResponse.json({ error: `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}` }, { status: 400 });
  }
  if (b.tags !== undefined && (!Array.isArray(b.tags) || !(b.tags as unknown[]).every((t) => typeof t === "string"))) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }

  const artifactBody: CreateArtifactBody = {
    title: (b.title as string).trim(),
    description: typeof b.description === "string" ? b.description : undefined,
    tags: Array.isArray(b.tags) ? (b.tags as string[]) : undefined,
    type: b.type as ArtifactType,
    mime_type: b.mime_type as string,
    visibility: b.visibility as ArtifactVisibility | undefined,
    file_base64: b.file_base64 as string,
    filename: b.filename as string,
  };

  const result = await createArtifact(artifactBody);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const { storage_path: _, ...publicArtifact } = result.data;

  // Auto-create 30-day share link for unlisted artifacts
  if (result.data.visibility === "unlisted") {
    const shareResult = await createShareLink({
      artifact_id: result.data.id,
      expires_in_hours: 24 * 30,
      label: "Auto-generated on publish",
    });
    if (shareResult.ok) {
      return NextResponse.json({ artifact: publicArtifact, shareLink: shareResult.data }, { status: 201 });
    }
    return NextResponse.json(
      {
        artifact: publicArtifact,
        shareError: `Artifact saved (ID: ${result.data.id}) but share link creation failed. Use the MCP create_share_link tool with this ID to recover.`,
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ artifact: publicArtifact }, { status: 201 });
}
