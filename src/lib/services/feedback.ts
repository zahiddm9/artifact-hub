import { createAdminClient } from "@/lib/supabase";
import type { Feedback, FeedbackStatus, CreateFeedbackBody, ServiceResult } from "@/types";

export async function listFeedback(artifactId: string): Promise<ServiceResult<Feedback[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, status: 500, message: error.message };
  return { ok: true, data: (data ?? []) as Feedback[] };
}

export async function addFeedback(
  artifactId: string,
  body: CreateFeedbackBody
): Promise<ServiceResult<Feedback>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      artifact_id: artifactId,
      reviewer_name: body.reviewer_name,
      reviewer_role: body.reviewer_role ?? null,
      feedback_type: body.feedback_type,
      comment: body.comment,
    })
    .select("*")
    .single();

  if (error) return { ok: false, status: 500, message: error.message };
  return { ok: true, data: data as Feedback };
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<ServiceResult<Feedback>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", feedbackId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") return { ok: false, status: 404, message: "Feedback not found" };
    return { ok: false, status: 500, message: error.message };
  }
  return { ok: true, data: data as Feedback };
}
