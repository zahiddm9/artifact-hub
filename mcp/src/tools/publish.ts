import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";
import { baseUrl } from "../client.js";

interface PublishResponse {
  artifact: {
    id: string;
    title: string;
    type: string;
    visibility: string;
  };
  shareLink?: { token: string; expires_at: string };
}

export function registerPublishTools(server: McpServer): void {
  server.tool(
    "publish_artifact",
    "Upload and publish a new artifact. Accepts a base64-encoded file (PDF, image, or HTML). Returns the artifact URL for public artifacts, or an auto-created 30-day share link for unlisted ones.",
    {
      title: z.string().min(1).describe("Artifact title"),
      type: z.enum(["pdf", "image", "html"]).describe("Artifact type"),
      mime_type: z.string().describe("MIME type, e.g. application/pdf, image/png, text/html"),
      file_base64: z.string().describe("Base64-encoded file content"),
      filename: z.string().describe("Original filename, e.g. report.pdf"),
      description: z.string().optional().describe("Optional description"),
      tags: z.array(z.string()).optional().describe("Optional tags"),
      visibility: z
        .enum(["public", "unlisted"])
        .optional()
        .describe("public (default) or unlisted (share link only)"),
    },
    async ({ title, type, mime_type, file_base64, filename, description, tags, visibility }) => {
      const data = (await client.post("/api/mcp/artifacts", {
        title,
        type,
        mime_type,
        file_base64,
        filename,
        description,
        tags,
        visibility,
      })) as PublishResponse;

      const { artifact, shareLink } = data;

      if (artifact.visibility === "unlisted" && shareLink) {
        const shareUrl = `${baseUrl}/share/${shareLink.token}`;
        const expires = new Date(shareLink.expires_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return {
          content: [{
            type: "text" as const,
            text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nShare link (expires ${expires}):\n${shareUrl}`,
          }],
        };
      }

      if (artifact.visibility === "unlisted" && !shareLink) {
        return {
          content: [{
            type: "text" as const,
            text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: unlisted\n\nWARNING: Share link creation failed. The artifact is saved but inaccessible via the web UI.\nTo recover, call create_share_link with artifact_id: ${artifact.id}`,
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Artifact published: "${artifact.title}"\nID: ${artifact.id} | Type: ${artifact.type.toUpperCase()} | Visibility: public\n\nURL: ${baseUrl}/artifacts/${artifact.id}`,
        }],
      };
    }
  );
}
