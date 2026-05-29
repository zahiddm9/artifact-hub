import { NextRequest, NextResponse } from "next/server";
import { deleteFeedback } from "@/lib/services/feedback";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteFeedback(id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ deleted: true });
}
