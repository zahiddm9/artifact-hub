# Artifact Hub MCP Server

A stdio MCP server that gives Claude Desktop conversational access to the full Artifact Hub artifact lifecycle — publish, browse, review, summarize, and share — without leaving the chat.

## Requirements

- Node.js 18 or later
- A running Artifact Hub deployment (local or Vercel)
- The admin API key (`ARTIFACT_HUB_ADMIN_KEY`) from your `.env.local`

## Setup

```bash
cd mcp
npm install
npm run build          # compiles src/ → dist/
```

The compiled entry point is `mcp/dist/index.js`.

## Claude Desktop Configuration

Add the following to your `claude_desktop_config.json` (found via Claude Desktop → Settings → Developer):

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_ADMIN_KEY": "your-admin-key-here",
        "ARTIFACT_HUB_BASE_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

For local development, use `"ARTIFACT_HUB_BASE_URL": "http://localhost:3000"` and make sure `npm run dev` is running.

Restart Claude Desktop after saving the config. You should see "artifact-hub" appear in the MCP connections list.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ARTIFACT_HUB_ADMIN_KEY` | Yes | API key for all `/api/mcp/*` routes. Must match `ARTIFACT_HUB_ADMIN_KEY` in the Next.js app's `.env.local`. |
| `ARTIFACT_HUB_BASE_URL` | Yes | Base URL of the deployed Next.js app. No trailing slash. |

The server writes a warning to stderr (not stdout — stdio transport owns stdout) if either variable is missing.

## Tool Reference

| Tool | Description |
|---|---|
| `list_artifacts` | List artifacts with optional filters: `type` (pdf/image/html), `tags` (array), `visibility` (public/unlisted), `limit`, `offset`. Returns all artifacts including unlisted. |
| `get_artifact` | Full detail for any artifact: metadata, all feedback with status, and a signed 1-hour preview URL. Works for both public and unlisted artifacts. |
| `publish_artifact` | Upload and publish a new artifact from base64-encoded file content. Returns the artifact URL (public) or an auto-created 30-day share link (unlisted). |
| `add_feedback` | Add structured feedback to any artifact. Types: approval, suggestion, issue, question. |
| `update_feedback_status` | Change the status of a feedback item: open, resolved, or needs_review. MCP-only — not available in the web UI. |
| `create_share_link` | Create an expiring share link for any artifact. Default TTL: 30 days. |
| `summarize_feedback` | Get an AI-generated structured digest of all feedback (Gemini 2.5 Flash). Returns cached result if feedback is unchanged. Pass `force_refresh: true` to regenerate. |
| `delete_artifact` | Permanently delete an artifact and all its feedback, share links, and summary. Cannot be undone. |
| `update_artifact` | Edit an artifact's title, description, tags, or visibility. Omit any field to leave it unchanged. |

## Example Conversation

```
You: List the artifacts in the hub.

Claude: Found 3 artifacts.

1. [HTML] Product Roadmap Q2 2026
   ID: abc-123 | Visibility: public
   Tags: roadmap, product, q2-2026
   Published: May 28, 2026

2. [IMAGE] Artifact Hub Brand Identity
   ...

You: Summarize the feedback on the roadmap.

Claude: Feedback Summary
Generated from 5 feedback items · gemini-2.5-flash

Overall Assessment:
The roadmap is broadly well-received, with two approvals from PM and stakeholder. One blocking issue and two actionable suggestions need resolution before publishing.

Open Issues (1):
• API versioning is missing from the roadmap despite being agreed as Q2 scope.

Suggestions (2):
• Add effort estimates to help the team plan sprints.
• Clarify the relationship between dark mode and the upcoming brand refresh.

Questions (1):
• Can dark mode proceed in parallel with the brand refresh, or is it blocked?

Approvals: 2

You: Mark the API versioning issue as resolved.

Claude: Feedback status updated.
ID: def-456 | Status: resolved
```
