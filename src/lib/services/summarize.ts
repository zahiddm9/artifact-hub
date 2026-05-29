import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase";
import type { Artifact, Feedback, FeedbackSummary, FeedbackSummaryData, ServiceResult } from "@/types";

const PROMPT_VERSION = "v2";

function buildPrompt(artifact: Artifact, items: Feedback[]): string {
  const lines = items.map((f, i) => {
    const role = f.reviewer_role ? ` (${f.reviewer_role})` : "";
    return `${i + 1}. [${f.feedback_type}|${f.status}] ${f.reviewer_name}${role}: "${f.comment}"`;
  });

  return `You are summarizing reviewer feedback for an AI-generated artifact.

Artifact: "${artifact.title}"${artifact.description ? `\nDescription: "${artifact.description}"` : ""}

Feedback (${items.length} item${items.length === 1 ? "" : "s"}):
${lines.join("\n")}

Each item is formatted as [type|status]. Status values: open, needs_review, resolved.

Return a JSON object with exactly these fields:
- overall_assessment: 1-2 sentence summary of the overall reception
- open_issues: array of strings — one per issue where status is open or needs_review only; exclude resolved issues entirely
- suggestions: array of strings — one per suggestion (feedback_type=suggestion)
- questions: array of strings — one per unanswered question (feedback_type=question)
- approval_count: integer count of approvals (feedback_type=approval)`;
}

export function isValidSummaryData(data: unknown): data is FeedbackSummaryData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.overall_assessment === "string" &&
    Array.isArray(d.open_issues) &&
    (d.open_issues as unknown[]).every((x) => typeof x === "string") &&
    Array.isArray(d.suggestions) &&
    (d.suggestions as unknown[]).every((x) => typeof x === "string") &&
    Array.isArray(d.questions) &&
    (d.questions as unknown[]).every((x) => typeof x === "string") &&
    typeof d.approval_count === "number"
  );
}

// Returns the cached summary without calling Gemini.
// Returns null only when no row exists (PGRST116); propagates real DB errors.
export async function getCachedSummary(artifactId: string): Promise<FeedbackSummary | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback_summaries")
    .select("*")
    .eq("artifact_id", artifactId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no row — expected
    throw new Error(`getCachedSummary DB error: ${error.message}`);
  }
  return data as FeedbackSummary;
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
  if (artifactErr) {
    if (artifactErr.code === "PGRST116") return { ok: false, status: 404, message: "Artifact not found" };
    return { ok: false, status: 500, message: artifactErr.message };
  }

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

    const text = response.text;
    if (!text) {
      return { ok: false, status: 502, message: "Gemini returned an empty response" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, status: 502, message: "Gemini response was not valid JSON" };
    }

    if (!isValidSummaryData(parsed)) {
      return {
        ok: false,
        status: 502,
        message: "Gemini response missing required fields (overall_assessment, open_issues, suggestions, questions, approval_count)",
      };
    }

    summaryData = parsed;
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
