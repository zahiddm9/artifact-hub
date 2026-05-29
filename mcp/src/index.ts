import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerShareTools } from "./tools/share.js";
import { registerSummarizeTools } from "./tools/summarize.js";
import { registerPublishTools } from "./tools/publish.js";
import { registerFeedbackTools } from "./tools/feedback.js";

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
