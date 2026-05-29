"use client";

import { useState } from "react";
import type { FeedbackSummary as FeedbackSummaryType } from "@/types";

interface Props {
  artifactId: string;
  initialSummary: FeedbackSummaryType | null;
  feedbackCount: number;
}

export function FeedbackSummary({ artifactId, initialSummary, feedbackCount }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isStale = summary !== null && summary.feedback_count !== feedbackCount;
  const hasFeedback = feedbackCount > 0;

  async function generate(forceRefresh = false) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_refresh: forceRefresh }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate summary");
      }
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!hasFeedback) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900">Feedback summary</h3>
          {isStale && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Stale
            </span>
          )}
        </div>
        {!summary ? (
          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Summarize feedback"}
          </button>
        ) : isStale ? (
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !summary && (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-zinc-100 rounded w-3/4" />
          <div className="h-4 bg-zinc-100 rounded w-1/2" />
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          {/* Overall assessment */}
          <div className="rounded-lg bg-zinc-50 px-4 py-3">
            <p className="text-sm text-zinc-700 leading-relaxed">
              {summary.summary.overall_assessment}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Approvals */}
            {summary.summary.approval_count > 0 && (
              <SummarySection
                title="Approvals"
                color="green"
                items={[`${summary.summary.approval_count} reviewer${summary.summary.approval_count === 1 ? "" : "s"} approved this artifact`]}
                single
              />
            )}

            {/* Open issues */}
            {summary.summary.open_issues.length > 0 && (
              <SummarySection title="Open issues" color="red" items={summary.summary.open_issues} />
            )}

            {/* Suggestions */}
            {summary.summary.suggestions.length > 0 && (
              <SummarySection title="Suggestions" color="blue" items={summary.summary.suggestions} />
            )}

            {/* Questions */}
            {summary.summary.questions.length > 0 && (
              <SummarySection title="Questions" color="amber" items={summary.summary.questions} />
            )}
          </div>

          <p className="text-xs text-zinc-400">
            Generated from {summary.feedback_count} feedback item{summary.feedback_count === 1 ? "" : "s"}
            {summary.model ? ` · ${summary.model}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function SummarySection({
  title,
  color,
  items,
  single = false,
}: {
  title: string;
  color: "green" | "red" | "blue" | "amber";
  items: string[];
  single?: boolean;
}) {
  const colors = {
    green: "text-green-700 bg-green-50 border-green-200",
    red:   "text-red-700   bg-red-50   border-red-200",
    blue:  "text-blue-700  bg-blue-50  border-blue-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
  };
  const titleColors = {
    green: "text-green-800",
    red:   "text-red-800",
    blue:  "text-blue-800",
    amber: "text-amber-800",
  };

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${colors[color]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${titleColors[color]}`}>
        {title}
      </p>
      {single ? (
        <p className="text-sm">{items[0]}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm flex gap-1.5">
              <span className="shrink-0 mt-0.5">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
