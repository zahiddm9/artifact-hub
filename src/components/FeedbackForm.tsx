"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackType } from "@/types";

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "approval",   label: "Approval"   },
  { value: "suggestion", label: "Suggestion" },
  { value: "issue",      label: "Issue"      },
  { value: "question",   label: "Question"   },
];

export function FeedbackForm({ artifactId }: { artifactId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState<FeedbackType>("approval");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!comment.trim()) { setError("Comment is required."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/artifacts/${artifactId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_name: name.trim(),
          reviewer_role: role.trim() || undefined,
          feedback_type: type,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
      // Re-render server components to show the new feedback
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Feedback submitted. Thank you!{" "}
        <button
          onClick={() => { setSubmitted(false); setName(""); setRole(""); setComment(""); }}
          className="underline transition-colors duration-150 hover:text-green-900"
        >
          Add another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-zinc-900">Leave feedback</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Designer, Engineer…"
            className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Type</label>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_TYPES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="feedback_type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="accent-zinc-900"
              />
              <span className="text-sm text-zinc-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">
          Comment <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Your feedback…"
          className="block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}
