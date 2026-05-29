import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerArtifactTools } from "./tools/artifacts.js";
import { registerShareTools } from "./tools/share.js";
import { registerSummarizeTools } from "./tools/summarize.js";

const server = new McpServer({
  name: "artifact-hub",
  version: "0.1.0",
});

registerArtifactTools(server);
registerShareTools(server);
registerSummarizeTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
