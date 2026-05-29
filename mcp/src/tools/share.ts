import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as client from "../client.js";

interface ShareLink {
  token: string;
  expires_at: string;
  artifact_id: string;
  label: string | null;
}

export function registerShareTools(server: McpServer): void {
  server.tool(
    "create_share_link",
    "Create an expiring share link for any artifact (public or unlisted). Returns the shareable URL.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
      expires_in_hours: z
        .number()
        .int()
        .min(1)
        .max(24 * 365)
        .optional()
        .describe("Link lifetime in hours (default 720 = 30 days)"),
      label: z.string().optional().describe("Optional label for this link"),
    },
    async ({ artifact_id, expires_in_hours, label }) => {
      const data = (await client.post("/api/mcp/share", {
        artifact_id,
        expires_in_hours,
        label,
      })) as ShareLink;

      const baseUrl = (process.env.ARTIFACT_HUB_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const shareUrl = `${baseUrl}/share/${data.token}`;
      const expiresDate = new Date(data.expires_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      return {
        content: [{
          type: "text" as const,
          text: `Share link created.\n\nURL: ${shareUrl}\nExpires: ${expiresDate}`,
        }],
      };
    }
  );
}
