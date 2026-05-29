import { NextRequest, NextResponse } from "next/server";
import { validateShareLink } from "@/lib/services/share";
import { getShareLinkArtifactUrl } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await validateShareLink(token);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  const { artifact, ...shareLink } = result.data;

  try {
    const signedUrl = await getShareLinkArtifactUrl(artifact.storage_path, shareLink.expires_at);
    return NextResponse.json({ artifact, shareLink, signedUrl });
  } catch {
    return NextResponse.json({ error: "Failed to generate preview URL" }, { status: 500 });
  }
}
