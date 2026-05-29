import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase";
import type { Artifact, Feedback, FeedbackSummary, FeedbackSummaryData, ServiceResult } from "@/types";

const PROMPT_VERSION = "v1";

function buildPrompt(artifact: Artifact, items: Feedback[]): string {
  const lines = items.map((f, i) => {
    const role = f.reviewer_role ? ` (${f.reviewer_role})` : "";
    return `${i + 1}. [${f.feedback_type}] ${f.reviewer_name}${role}: "${f.comment}"`;
  });

  return `You are summarizing reviewer feedback for an AI-generated artifact.

Artifact: "${artifact.title}"${artifact.description ? `\nDescription: "${artifact.description}"` : ""}

Feedback (${items.length} item${items.length === 1 ? "" : "s"}):
${lines.join("\n")}

Return a JSON object with exactly these fields:
- overall_assessment: 1-2 sentence summary of the overall reception
- open_issues: array of strings — one per unresolved issue (feedback_type=issue, status=open or needs_review)
- suggestions: array of strings — one per suggestion (feedback_type=suggestion)
- questions: array of strings — one per unanswered question (feedback_type=question)
- approval_count: integer count of approvals (feedback_type=approval)`;
}

// Returns the cached summary without calling Gemini.
export async function getCachedSummary(artifactId: string): Promise<FeedbackSummary | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("feedback_summaries")
    .select("*")
    .eq("artifact_id", artifactId)
    .single();
  return data ? (data as FeedbackSummary) : null;
}

// Cache-first: returns cached if feedback_count unchanged and !forceRefresh.
// Calls Gemini and upserts when missing, stale, or forceRefresh=true.
export async function getSummary(
  artifactId: string,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<ServiceResult<{ summary: FeedbackSummary; feedbackCount: number }>> {
  const supabase = createAdminClient();

  const { data: artifact, error: artifactErr } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", artifactId)
    .single();
  if (artifactErr) return { ok: false, status: 404, message: "Artifact not found" };

  const { data: feedbackRows, error: feedbackErr } = await supabase
    .from("feedback")
    .select("*")
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true });
  if (feedbackErr) return { ok: false, status: 500, message: feedbackErr.message };

  const items = (feedbackRows ?? []) as Feedback[];
  const currentCount = items.length;

  if (currentCount === 0) {
    return { ok: false, status: 422, message: "No feedback to summarize yet" };
  }

  // Return cache if fresh
  const { data: cached } = await supabase
    .from("feedback_summaries")
    .select("*")
    .eq("artifact_id", artifactId)
    .single();

  if (cached && cached.feedback_count === currentCount && !forceRefresh) {
    return { ok: true, data: { summary: cached as FeedbackSummary, feedbackCount: currentCount } };
  }

  // Call Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, status: 500, message: "GEMINI_API_KEY not configured" };

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const prompt = buildPrompt(artifact as Artifact, items);

  let summaryData: FeedbackSummaryData;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = response.text ?? "";
    summaryData = JSON.parse(text) as FeedbackSummaryData;
  } catch (err) {
    return {
      ok: false,
      status: 502,
      message: `Gemini error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Upsert result
  const { data: upserted, error: upsertErr } = await supabase
    .from("feedback_summaries")
    .upsert(
      {
        artifact_id: artifactId,
        summary: summaryData,
        feedback_count: currentCount,
        model,
        prompt_version: PROMPT_VERSION,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "artifact_id" }
    )
    .select("*")
    .single();

  if (upsertErr) return { ok: false, status: 500, message: upsertErr.message };
  return { ok: true, data: { summary: upserted as FeedbackSummary, feedbackCount: currentCount } };
}
