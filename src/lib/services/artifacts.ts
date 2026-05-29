import { createAdminClient } from "@/lib/supabase";
import { uploadArtifact } from "@/lib/storage";
import type { Artifact, ArtifactPublic, ArtifactType, ArtifactVisibility, CreateArtifactBody, UpdateArtifactBody, ServiceResult } from "@/types";

export async function listArtifacts({
  type,
  tags,
  visibility,
  search,
  limit = 50,
  offset = 0,
}: {
  type?: ArtifactType;
  tags?: string[];
  visibility?: ArtifactVisibility;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ServiceResult<Artifact[]>> {
  const supabase = createAdminClient();
  let query = supabase
    .from("artifacts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (visibility) query = query.eq("visibility", visibility);
  if (type) query = query.eq("type", type);
  if (tags && tags.length > 0) query = query.overlaps("tags", tags);
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`title.ilike.${q},description.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error) return { ok: false, status: 500, message: error.message };
  return { ok: true, data: (data ?? []) as Artifact[] };
}

export async function getArtifact(id: string): Promise<ServiceResult<Artifact>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: error.message };
  }
  return { ok: true, data: data as Artifact };
}

export async function createArtifact(body: CreateArtifactBody): Promise<ServiceResult<Artifact>> {
  let storagePath: string;
  try {
    storagePath = await uploadArtifact(body.file_base64, body.mime_type, body.filename);
  } catch (err) {
    return { ok: false, status: 500, message: err instanceof Error ? err.message : "Upload failed" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      title: body.title,
      description: body.description ?? null,
      tags: body.tags ?? [],
      type: body.type,
      mime_type: body.mime_type,
      visibility: body.visibility ?? "public",
      storage_path: storagePath,
      original_filename: body.filename,
    })
    .select("*")
    .single();

  if (error) return { ok: false, status: 500, message: error.message };
  return { ok: true, data: data as Artifact };
}

export async function deleteArtifact(id: string): Promise<ServiceResult<void>> {
  const supabase = createAdminClient();

  const { data: artifact, error: fetchErr } = await supabase
    .from("artifacts")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchErr) {
    if (fetchErr.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: fetchErr.message };
  }

  const { error: storageErr } = await supabase.storage
    .from("artifacts")
    .remove([artifact.storage_path]);

  if (storageErr) return { ok: false, status: 500, message: `Storage delete failed: ${storageErr.message}` };

  const { error: deleteErr } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (deleteErr) return { ok: false, status: 500, message: deleteErr.message };
  return { ok: true, data: undefined };
}

export async function updateArtifact(
  id: string,
  body: UpdateArtifactBody
): Promise<ServiceResult<ArtifactPublic>> {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if ("description" in body) updates.description = body.description ?? null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.visibility !== undefined) updates.visibility = body.visibility;

  if (Object.keys(updates).length === 0) {
    return { ok: false, status: 400, message: "No fields to update" };
  }

  const { data, error } = await supabase
    .from("artifacts")
    .update(updates)
    .eq("id", id)
    .select("id, title, description, tags, type, mime_type, visibility, file_size, original_filename, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: error.message };
  }

  return { ok: true, data: data as ArtifactPublic };
}
