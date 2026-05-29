"use server";

import { deleteFeedback, updateFeedbackStatus } from "@/lib/services/feedback";
import type { FeedbackStatus } from "@/types";

export async function deleteFeedbackAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await deleteFeedback(id);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}

export async function updateFeedbackStatusAction(
  id: string,
  status: FeedbackStatus
): Promise<{ ok: boolean; message?: string }> {
  const result = await updateFeedbackStatus(id, status);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}
