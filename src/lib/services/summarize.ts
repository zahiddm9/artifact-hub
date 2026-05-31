import { createHash } from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createAdminClient } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { Artifact, Feedback, FeedbackSummary, FeedbackSummaryData, ServiceResult } from "@/types";

const PROMPT_VERSION = "v2";

// Stable hash of feedback ids + statuses — changes when any item is resolved/updated.
// Drives cache invalidation independently of count.
function computeContentHash(items: Feedback[]): string {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const str = sorted.map((f) => `${f.id}:${f.status}`).join(",");
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}

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

interface GeminiResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  attempts: number;
}

// Calls Gemini with up to 3 attempts (exponential backoff: 500ms, 1s).
// Skips retry for permanent config errors (auth, bad key, invalid argument).
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  artifactId: string
): Promise<GeminiResult> {
  const isPermanentError = (err: unknown) => {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    return (
      msg.includes("api_key") ||
      msg.includes("api key") ||
      msg.includes("permission") ||
      msg.includes("invalid argument") ||
      msg.includes("unauthenticated") ||
      msg.includes('"code":401') ||
      msg.includes('"code": 401')
    );
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out after 15s")), 15_000)
      );

      const responsePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overall_assessment: { type: Type.STRING },
              open_issues:        { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestions:        { type: Type.ARRAY, items: { type: Type.STRING } },
              questions:          { type: Type.ARRAY, items: { type: Type.STRING } },
              approval_count:     { type: Type.INTEGER },
            },
            required: ["overall_assessment", "open_issues", "suggestions", "questions", "approval_count"],
          },
        },
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const text = response.text;
      if (!text) throw new Error("Gemini returned an empty response");

      return {
        text,
        inputTokens:  response.usageMetadata?.promptTokenCount    ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
      if (isPermanentError(err)) {
        logger.error("summary.llm_permanent_error", {
          artifact_id: artifactId,
          model,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
      logger.warn("summary.llm_retry", {
        artifact_id: artifactId,
        model,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1))); // 500ms, 1s
      }
    }
  }
  throw lastError;
}

// Cache-first: returns cached if content_hash unchanged and !forceRefresh.
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
    logger.error("summary.db_error", { artifact_id: artifactId, stage: "fetch_artifact", error: artifactErr.message });
    return { ok: false, status: 500, message: artifactErr.message };
  }

  const { data: feedbackRows, error: feedbackErr } = await supabase
    .from("feedback")
    .select("*")
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true });
  if (feedbackErr) {
    logger.error("summary.db_error", { artifact_id: artifactId, stage: "fetch_feedback", error: feedbackErr.message });
    return { ok: false, status: 500, message: feedbackErr.message };
  }

  const items = (feedbackRows ?? []) as Feedback[];
  const currentCount = items.length;

  if (currentCount === 0) {
    return { ok: false, status: 422, message: "No feedback to summarize yet" };
  }

  const contentHash = computeContentHash(items);

  const { data: cached } = await supabase
    .from("feedback_summaries")
    .select("*")
    .eq("artifact_id", artifactId)
    .single();

  if (cached && cached.content_hash === contentHash && !forceRefresh) {
    logger.info("summary.cache_hit", {
      artifact_id: artifactId,
      feedback_count: currentCount,
      prompt_version: cached.prompt_version,
      model: cached.model,
    });
    return { ok: true, data: { summary: cached as FeedbackSummary, feedbackCount: currentCount } };
  }

  const cacheMissReason = !cached ? "no_cache"
    : forceRefresh ? "force_refresh"
    : "stale_hash"; // content changed (status update or new feedback)

  logger.info("summary.cache_miss", {
    artifact_id: artifactId,
    feedback_count: currentCount,
    reason: cacheMissReason,
  });

  // Call Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, status: 500, message: "GEMINI_API_KEY not configured" };

  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const prompt = buildPrompt(artifact as Artifact, items);

  let summaryData: FeedbackSummaryData;
  const callStart = Date.now();
  try {
    const result = await callGeminiWithRetry(new GoogleGenAI({ apiKey }), model, prompt, artifactId);
    const latencyMs = Date.now() - callStart;

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      logger.error("summary.llm_invalid_json", {
        artifact_id: artifactId,
        model,
        latency_ms: latencyMs,
        attempts: result.attempts,
      });
      return { ok: false, status: 502, message: "Gemini response was not valid JSON" };
    }

    if (!isValidSummaryData(parsed)) {
      logger.error("summary.llm_invalid_shape", {
        artifact_id: artifactId,
        model,
        latency_ms: latencyMs,
        attempts: result.attempts,
      });
      return {
        ok: false,
        status: 502,
        message: "Gemini response missing required fields (overall_assessment, open_issues, suggestions, questions, approval_count)",
      };
    }

    logger.info("summary.llm_call_complete", {
      artifact_id: artifactId,
      model,
      prompt_version: PROMPT_VERSION,
      feedback_count: currentCount,
      latency_ms: latencyMs,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      attempts: result.attempts,
    });

    summaryData = parsed;
  } catch (err) {
    logger.error("summary.llm_error", {
      artifact_id: artifactId,
      model,
      latency_ms: Date.now() - callStart,
      error: err instanceof Error ? err.message : String(err),
    });
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
        content_hash: contentHash,
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
