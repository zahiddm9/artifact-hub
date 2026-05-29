import { createAdminClient } from "@/lib/supabase";
import { nanoid } from "nanoid";
import type { Artifact, ShareLink, CreateShareLinkBody, ServiceResult } from "@/types";

export async function createShareLink(
  body: CreateShareLinkBody
): Promise<ServiceResult<ShareLink>> {
  const supabase = createAdminClient();

  // Verify the artifact exists before inserting — avoids a raw FK constraint error
  const { error: artifactErr } = await supabase
    .from("artifacts")
    .select("id")
    .eq("id", body.artifact_id)
    .single();
  if (artifactErr) {
    if (artifactErr.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: artifactErr.message };
  }

  const expiresInHours = body.expires_in_hours ?? 24 * 30;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  const token = nanoid(21);

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      artifact_id: body.artifact_id,
      token,
      expires_at: expiresAt,
      label: body.label ?? null,
    })
    .select("*")
    .single();

  if (error) return { ok: false, status: 500, message: error.message };
  return { ok: true, data: data as ShareLink };
}

export async function validateShareLink(
  token: string
): Promise<ServiceResult<ShareLink & { artifact: Artifact }>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("*, artifact:artifacts(*)")
    .eq("token", token)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ok: false, status: 404, message: "Share link not found" };
    return { ok: false, status: 500, message: error.message };
  }

  if (new Date(data.expires_at) <= new Date()) {
    return { ok: false, status: 410, message: "Share link has expired" };
  }

  return { ok: true, data: data as ShareLink & { artifact: Artifact } };
}
