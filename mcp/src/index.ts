import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerShareTools } from "./tools/share.js";
import { registerSummarizeTools } from "./tools/summarize.js";
import { registerPublishTools } from "./tools/publish.js";
import { registerFeedbackTools } from "./tools/feedback.js";

// Warn on stderr (not stdout — stdio transport owns stdout) if required env vars are absent
if (!process.env.ARTIFACT_HUB_ADMIN_KEY) {
  process.stderr.write(
    "[artifact-hub-mcp] WARNING: ARTIFACT_HUB_ADMIN_KEY is not set — all tool calls will return 401 Unauthorized.\n"
  );
}
if (!process.env.ARTIFACT_HUB_BASE_URL) {
  process.stderr.write(
    "[artifact-hub-mcp] WARNING: ARTIFACT_HUB_BASE_URL is not set — defaulting to http://localhost:3000\n"
  );
}

const server = new McpServer({
  name: "artifact-hub",
  version: "0.1.0",
});

registerArtifactTools(server);
registerShareTools(server);
registerSummarizeTools(server);
registerPublishTools(server);
registerFeedbackTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
