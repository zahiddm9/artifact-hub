import { createAdminClient } from "@/lib/supabase";

const BUCKET = "artifacts";
const ONE_HOUR_SECONDS = 60 * 60;

// Signed URL for a public artifact — 1-hour TTL
export async function getPublicArtifactUrl(storagePath: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ONE_HOUR_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}

// Signed URL for an unlisted artifact accessed via share link
// TTL is capped at min(1h, seconds remaining on the share link)
export async function getShareLinkArtifactUrl(
  storagePath: string,
  expiresAt: string
): Promise<string> {
  const secondsRemaining = Math.floor(
    (new Date(expiresAt).getTime() - Date.now()) / 1000
  );

  if (secondsRemaining <= 0) {
    throw new Error("Share link has expired");
  }

  const ttl = Math.min(ONE_HOUR_SECONDS, secondsRemaining);

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, ttl);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }
  return data.signedUrl;
}

// Upload a file from a base64 string; returns the storage path
export async function uploadArtifact(
  fileBase64: string,
  mimeType: string,
  filename: string
): Promise<string> {
  const buffer = Buffer.from(fileBase64, "base64");
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${timestamp}-${safeName}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return storagePath;
}
