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
}

export function registerManageTools(server: McpServer): void {
  server.tool(
    "delete_artifact",
    "Permanently delete an artifact and all its feedback, share links, and summary. Cannot be undone.",
    {
      artifact_id: z.string().describe("The artifact UUID to delete"),
    },
    async ({ artifact_id }) => {
      await client.del(`/api/artifacts/${artifact_id}`);
      return {
        content: [{
          type: "text" as const,
          text: `Artifact ${artifact_id} deleted. All associated feedback, share links, and summaries have been removed.`,
        }],
      };
    }
  );

  server.tool(
    "update_artifact",
    "Update an artifact's title, description, tags, or visibility. Omit any field to leave it unchanged.",
    {
      artifact_id: z.string().describe("The artifact UUID"),
      title: z.string().min(1).optional().describe("New title"),
      description: z.string().nullable().optional().describe("New description (null to clear)"),
      tags: z.array(z.string()).optional().describe("New tag list — replaces existing tags entirely"),
      visibility: z.enum(["public", "unlisted"]).optional().describe("New visibility: public (gallery) or unlisted (share link only)"),
    },
    async ({ artifact_id, title, description, tags, visibility }) => {
      const body: Record<string, unknown> = {};
      if (title !== undefined) body.title = title;
      if (description !== undefined) body.description = description;
      if (tags !== undefined) body.tags = tags;
      if (visibility !== undefined) body.visibility = visibility;

      const data = (await client.patch(`/api/artifacts/${artifact_id}`, body)) as ArtifactPublic;
      const changes = Object.keys(body).join(", ");

      return {
        content: [{
          type: "text" as const,
          text: `Artifact updated.\nID: ${data.id}\nTitle: ${data.title}\nVisibility: ${data.visibility}\nTags: ${data.tags.join(", ") || "none"}\n\nUpdated: ${changes}`,
        }],
      };
    }
  );
}
