import type { Feedback, FeedbackType, FeedbackStatus } from "@/types";

const TYPE_CONFIG: Record<FeedbackType, { label: string; className: string }> = {
  approval:   { label: "Approval",   className: "bg-green-50  text-green-700  ring-green-600/20"  },
  suggestion: { label: "Suggestion", className: "bg-blue-50   text-blue-700   ring-blue-600/20"   },
  issue:      { label: "Issue",      className: "bg-red-50    text-red-700    ring-red-600/20"    },
  question:   { label: "Question",   className: "bg-amber-50  text-amber-700  ring-amber-600/20"  },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; className: string }> = {
  open:         { label: "Open",         className: "bg-secondary    text-muted-foreground" },
  resolved:     { label: "Resolved",     className: "bg-green-100 text-green-700" },
  needs_review: { label: "Needs review", className: "bg-amber-100 text-amber-700" },
};

export function FeedbackList({ feedback }: { feedback: Feedback[] }) {
  if (feedback.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No feedback yet. Be the first to leave a review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedback.map((item) => {
        const type = TYPE_CONFIG[item.feedback_type] ?? TYPE_CONFIG.issue;
        const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;
        return (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${type.className}`}
                >
                  {type.label}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.reviewer_name}
                </span>
                {item.reviewer_role && (
                  <span className="text-sm text-muted-foreground">{item.reviewer_role}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{item.comment}</p>
          </div>
        );
      })}
    </div>
  );
}
