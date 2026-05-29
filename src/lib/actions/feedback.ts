"use server";

import { deleteFeedback } from "@/lib/services/feedback";

export async function deleteFeedbackAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const result = await deleteFeedback(id);
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true };
}
