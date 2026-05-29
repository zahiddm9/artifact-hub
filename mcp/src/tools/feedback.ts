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
          text: `Feedback added.\nID: ${data.id}\nType: ${data.feedback_type} | Status: ${data.status}\nReviewer: ${data.reviewer_name}${role}\nComment: "${data.comment}"`,
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

      return {
        content: [{
          type: "text" as const,
          text: `Feedback status updated.\nID: ${data.id} | Status: ${data.status}`,
        }],
      };
    }
  );
}
