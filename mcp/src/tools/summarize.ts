import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";

interface SummaryData {
  overall_assessment: string;
  open_issues: string[];
  suggestions: string[];
  questions: string[];
  approval_count: number;
}

interface SummarizeResponse {
  summary: {
    artifact_id: string;
    summary: SummaryData;
    feedback_count: number;
    model: string | null;
    generated_at: string;
  };
  feedbackCount: number;
}

export function registerSummarizeTools(server: McpServer): void {
  server.tool(
    "summarize_feedback",
    "Get an AI-generated structured summary of all feedback for an artifact. Returns the cached result if feedback is unchanged. Use force_refresh=true to regenerate.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
      force_refresh: z
        .boolean()
        .optional()
        .describe("Force regeneration even if a current summary exists (default false)"),
    },
    async ({ artifact_id, force_refresh }) => {
      const data = (await client.post("/api/mcp/summarize", {
        artifact_id,
        force_refresh: force_refresh ?? false,
      })) as SummarizeResponse;

      const s = data.summary.summary;
      const meta = `Generated from ${data.feedbackCount} feedback item${data.feedbackCount === 1 ? "" : "s"}`;
      const modelTag = data.summary.model ? ` · ${data.summary.model}` : "";
      const genDate = data.summary.generated_at
        ? ` · ${new Date(data.summary.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "";

      const issueLines =
        s.open_issues.length > 0
          ? `\nOpen Issues (${s.open_issues.length}):\n${s.open_issues.map((x) => `• ${x}`).join("\n")}`
          : "";
      const suggLines =
        s.suggestions.length > 0
          ? `\nSuggestions (${s.suggestions.length}):\n${s.suggestions.map((x) => `• ${x}`).join("\n")}`
          : "";
      const qLines =
        s.questions.length > 0
          ? `\nQuestions (${s.questions.length}):\n${s.questions.map((x) => `• ${x}`).join("\n")}`
          : "";
      const approvalLine = `\nApprovals: ${s.approval_count}`;

      const text = [
        "Feedback Summary",
        `${meta}${modelTag}${genDate}`,
        "",
        "Overall Assessment:",
        s.overall_assessment,
        issueLines,
        suggLines,
        qLines,
        approvalLine,
      ]
        .filter((x) => x !== "")
        .join("\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
