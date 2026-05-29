import { NextRequest, NextResponse } from "next/server";
import { getArtifact, deleteArtifact, updateArtifact } from "@/lib/services/artifacts";
import type { UpdateArtifactBody } from "@/types";

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteArtifact(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as UpdateArtifactBody;
  const result = await updateArtifact(id, body);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
