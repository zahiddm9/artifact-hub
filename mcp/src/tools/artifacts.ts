import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";

interface ArtifactPublic {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  type: string;
  visibility: string;
  file_size: number | null;
  original_filename: string | null;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  feedback_type: string;
  status: string;
  comment: string;
  created_at: string;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function registerArtifactTools(server: McpServer): void {
  server.tool(
    "list_artifacts",
    "List published artifacts with optional filters. Returns IDs, titles, types, tags, and visibility.",
    {
      type: z.enum(["pdf", "image", "html"]).optional().describe("Filter by artifact type"),
      tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
      visibility: z
        .enum(["public", "unlisted"])
        .optional()
        .describe("Filter by visibility. Omit to return all."),
      limit: z.number().int().min(1).max(100).optional().describe("Max results (default 50)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
    },
    async ({ type, tags, visibility, limit, offset }) => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (tags?.length) params.set("tags", tags.join(","));
      if (visibility) params.set("visibility", visibility);
      if (limit !== undefined) params.set("limit", String(limit));
      if (offset !== undefined) params.set("offset", String(offset));

      const qs = params.toString().length > 0 ? `?${params.toString()}` : "";
      const data = (await client.get(`/api/mcp/artifacts${qs}`)) as ArtifactPublic[];

      if (data.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No artifacts found matching the given filters." }],
        };
      }

      const lines = data.map((a, i) => {
        const tagStr = a.tags.length ? `\n   Tags: ${a.tags.join(", ")}` : "";
        return `${i + 1}. [${a.type.toUpperCase()}] ${a.title}\n   ID: ${a.id} | Visibility: ${a.visibility}${tagStr}\n   Published: ${fmt(a.created_at)}`;
      });

      return {
        content: [{
          type: "text" as const,
          text: `Found ${data.length} artifact${data.length === 1 ? "" : "s"}.\n\n${lines.join("\n\n")}\n\n→ Use get_artifact with any ID above for full details and feedback.`,
        }],
      };
    }
  );

  server.tool(
    "get_artifact",
    "Get full artifact details including all feedback and a signed 1-hour preview URL. Works for both public and unlisted artifacts.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
    },
    async ({ artifact_id }) => {
      const data = (await client.get(`/api/mcp/artifacts/${artifact_id}`)) as {
        artifact: ArtifactPublic;
        feedback: FeedbackItem[];
        feedbackError: string | null;
        signedUrl: string;
      };

      const { artifact, feedback, feedbackError, signedUrl } = data;
      const desc = artifact.description ? `\nDescription: ${artifact.description}` : "";
      const tagStr = artifact.tags.length ? `\nTags: ${artifact.tags.join(", ")}` : "";

      const feedbackBlock = feedbackError
        ? `(Could not load feedback: ${feedbackError})`
        : feedback.length === 0
          ? "No feedback yet."
          : feedback
              .map((f, i) => {
                const role = f.reviewer_role ? ` (${f.reviewer_role})` : "";
                return `${i + 1}. [${f.feedback_type}] ● ${f.status} | feedback_id: ${f.id}\n   ${f.reviewer_name}${role} — ${fmt(f.created_at)}\n   "${f.comment}"`;
              })
              .join("\n\n");

      const feedbackHeader = feedbackError
        ? "\nFeedback (unavailable):"
        : `\nFeedback (${feedback.length} item${feedback.length === 1 ? "" : "s"}):`;

      const previewSection = signedUrl
        ? `\nPreview URL (valid 1 hour):\n${signedUrl}`
        : "\nPreview URL: unavailable";

      const text = [
        `Artifact: ${artifact.title}`,
        `ID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: ${artifact.visibility}`,
        `Published: ${fmt(artifact.created_at)}${desc}${tagStr}`,
        previewSection,
        feedbackHeader,
        "",
        feedbackBlock,
      ].join("\n");

      const nextStep = feedbackError
        ? ""
        : feedback.length === 0
          ? "\n\n→ No feedback yet. Use add_feedback to leave the first review."
          : `\n\n→ Use summarize_feedback to get an AI digest of these ${feedback.length} feedback item${feedback.length === 1 ? "" : "s"}.`;

      return { content: [{ type: "text" as const, text: text + nextStep }] };
    }
  );
}
