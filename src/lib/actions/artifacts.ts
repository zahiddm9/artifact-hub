"use server";

import { deleteArtifact, updateArtifact } from "@/lib/services/artifacts";
import type { UpdateArtifactBody, ArtifactPublic } from "@/types";

export async function deleteArtifactAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await deleteArtifact(id);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function updateArtifactAction(
  id: string,
  body: UpdateArtifactBody
): Promise<{ ok: boolean; message?: string; data?: ArtifactPublic }> {
  const result = await updateArtifact(id, body);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, data: result.data };
}
