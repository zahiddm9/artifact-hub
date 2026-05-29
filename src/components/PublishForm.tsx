"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { ArtifactType, ArtifactVisibility } from "@/types";

function inferType(file: File): ArtifactType | null {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (
    file.type === "text/html" ||
    file.name.endsWith(".html") ||
    file.name.endsWith(".htm")
  )
    return "html";
  return null;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface SuccessState {
  visibility: ArtifactVisibility;
  artifactId: string;
  shareToken?: string;
}

export function PublishForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<ArtifactVisibility>("public");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file."); return; }
    if (!title.trim()) { setError("Title is required."); return; }

    const type = inferType(file);
    if (!type) {
      setError("Unsupported file type. Please upload a PDF, image, or HTML file.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const file_base64 = await fileToBase64(file);

      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          type,
          mime_type: file.type,
          visibility,
          file_base64,
          filename: file.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setSuccess({
        visibility,
        artifactId: data.artifact.id,
        shareToken: data.shareLink?.token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setSuccess(null);
    setTitle("");
    setDescription("");
    setTags("");
    setFile(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (success) {
    const shareUrl = success.shareToken
      ? `${window.location.origin}/share/${success.shareToken}`
      : null;

    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-green-900">Artifact published!</h2>

        {success.visibility === "unlisted" && shareUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-green-800">
              This artifact is unlisted — this link is the only way to access it.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-zinc-700 focus:outline-none"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="shrink-0 text-xs text-zinc-500 hover:text-zinc-900"
              >
                Copy
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-green-800">Your artifact is live in the gallery.</p>
            <div className="flex gap-3">
              <Link
                href={`/artifacts/${success.artifactId}`}
                className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                View artifact
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back to gallery
              </Link>
            </div>
          </div>
        )}

        <button onClick={reset} className="text-sm text-zinc-500 hover:text-zinc-900 underline">
          Publish another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-1">
          File <span className="text-red-500">*</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.html,.htm,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 cursor-pointer"
        />
        <p className="mt-1 text-xs text-zinc-400">PDF, image (PNG / JPG / GIF / WebP), or HTML file</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Q1 2026 Report"
          className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description…"
          className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-1">Tags</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="design, q1-2026, marketing"
          className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-400">Comma-separated</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-900 mb-2">Visibility</label>
        <div className="flex gap-4">
          {(["public", "unlisted"] as ArtifactVisibility[]).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="accent-zinc-900"
              />
              <span className="text-sm text-zinc-700 capitalize">{v}</span>
              {v === "unlisted" && (
                <span className="text-xs text-zinc-400">(share link only)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
      >
        {uploading ? "Publishing…" : "Publish artifact"}
      </button>
    </form>
  );
}
