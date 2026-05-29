"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackStatus } from "@/types";
import { updateFeedbackStatusAction } from "@/lib/actions/feedback";

const STATUSES: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "needs_review", label: "Needs review" },
];

export function FeedbackStatusButton({
  feedbackId,
  currentStatus,
}: {
  feedbackId: string;
  currentStatus: FeedbackStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as FeedbackStatus;
    if (status === currentStatus) return;
    setSaving(true);
    await updateFeedbackStatusAction(feedbackId, status);
    router.refresh();
    setSaving(false);
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={saving}
      className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
