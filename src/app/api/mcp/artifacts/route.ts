import { NextRequest, NextResponse } from "next/server";
import { requireMcpAuth } from "@/lib/auth";
import { listArtifacts } from "@/lib/services/artifacts";
import type { ArtifactType, ArtifactVisibility } from "@/types";

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
