import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";

interface FeedbackItem {
  id: string;
  artifact_id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  feedback_type: string;
  status: string;
  comment: string;
  created_at: string;
}

export function registerFeedbackTools(server: McpServer): void {
  server.tool(
    "add_feedback",
    "Add structured feedback to an artifact. Use get_artifact first to confirm the artifact ID. Feedback is immediately visible on the detail page.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
      reviewer_name: z.string().min(1).describe("Your name"),
      reviewer_role: z.string().optional().describe("Your role, e.g. Designer, Engineer"),
      feedback_type: z
        .enum(["approval", "suggestion", "issue", "question"])
        .describe("Type of feedback"),
      comment: z.string().min(1).describe("Your feedback comment"),
    },
    async ({ artifact_id, reviewer_name, reviewer_role, feedback_type, comment }) => {
      const data = (await client.post("/api/mcp/feedback", {
        artifact_id,
        reviewer_name,
        reviewer_role,
        feedback_type,
        comment,
      })) as FeedbackItem;

      const role = data.reviewer_role ? ` (${data.reviewer_role})` : "";
      return {
        content: [{
          type: "text" as const,
          text: `Feedback added.\nID: ${data.id}\nType: ${data.feedback_type} | Status: ${data.status}\nReviewer: ${data.reviewer_name}${role}\nComment: "${data.comment}"\n\n→ Call get_artifact for the full thread, or summarize_feedback for an AI digest.`,
        }],
      };
    }
  );

  server.tool(
    "update_feedback_status",
    "Update the status of a feedback item (open → resolved → needs_review). Use get_artifact to find feedback IDs. This action is MCP-only and not available in the web UI.",
    {
      feedback_id: z.string().describe("The feedback item UUID"),
      status: z
        .enum(["open", "resolved", "needs_review"])
        .describe("New status for the feedback item"),
    },
    async ({ feedback_id, status }) => {
      const data = (await client.patch("/api/mcp/feedback", {
        feedback_id,
        status,
      })) as FeedbackItem;

      const statusHint =
        data.status === "resolved"
          ? "\n\n→ Issue marked resolved. Call summarize_feedback with force_refresh=true to update the digest."
          : data.status === "needs_review"
          ? "\n\n→ Status set to needs_review. Call get_artifact to see the full thread."
          : "";

      return {
        content: [{
          type: "text" as const,
          text: `Feedback status updated.\nID: ${data.id} | Status: ${data.status}${statusHint}`,
        }],
      };
    }
  );
}
