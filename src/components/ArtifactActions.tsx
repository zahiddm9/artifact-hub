"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ArtifactPublic, ArtifactVisibility } from "@/types";
import { deleteArtifactAction, updateArtifactAction } from "@/lib/actions/artifacts";

interface Props {
  artifact: ArtifactPublic;
}

export function ArtifactActions({ artifact }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmDelete" | "deleting">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(artifact.title);
  const [description, setDescription] = useState(artifact.description ?? "");
  const [tagsInput, setTagsInput] = useState(artifact.tags.join(", "));
  const [visibility, setVisibility] = useState<ArtifactVisibility>(artifact.visibility);

  function startEdit() {
    setTitle(artifact.title);
    setDescription(artifact.description ?? "");
    setTagsInput(artifact.tags.join(", "));
    setVisibility(artifact.visibility);
    setError("");
    setMode("editing");
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const result = await updateArtifactAction(artifact.id, {
        title: title.trim(),
        description: description.trim() || null,
        tags,
        visibility,
      });
      if (!result.ok) throw new Error(result.message ?? "Save failed");
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setMode("deleting");
    const result = await deleteArtifactAction(artifact.id);
    if (!result.ok) {
      setError(result.message ?? "Delete failed. Please try again.");
      setMode("idle");
      return;
    }
    router.push("/?view=owner");
  }

  if (mode === "editing") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Edit artifact</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tags (comma-separated)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="design, q2, draft"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ArtifactVisibility)}
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="public">Public — visible in gallery</option>
              <option value="unlisted">Unlisted — share link only</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={() => setMode("idle")}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={startEdit}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
      >
        Edit
      </button>
      {mode === "confirmDelete" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Delete this artifact and all its feedback?</span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600 cursor-pointer"
          >
            Yes, delete
          </button>
          <button
            onClick={() => setMode("idle")}
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : mode === "deleting" ? (
        <span className="text-sm text-muted-foreground">Deleting…</span>
      ) : (
        <button
          onClick={() => setMode("confirmDelete")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
        >
          Delete
        </button>
      )}
    </div>
  );
}
