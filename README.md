# Artifact Hub

A platform for publishing, browsing, reviewing, and sharing AI-generated content — with an MCP server for conversational access via Claude Desktop.

**Live app:** https://artifact-hub-green.vercel.app  
**Full writeup:** [WRITEUP.md](./WRITEUP.md)

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)
- [Claude Desktop](https://claude.ai/download) (for MCP testing)

---

## Local setup

**1. Clone and install dependencies**

```bash
git clone https://github.com/zahiddm9/artifact-hub.git
cd artifact-hub
npm install
```

**2. Configure environment variables**

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Data API → `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Data API → `service_role` key |
| `ARTIFACT_HUB_ADMIN_KEY` | Any strong random string — `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google AI Studio → API Keys |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` (or omit to use the default) |

**3. Apply database migrations**

```bash
npx supabase db push
```

Also create a **private** Storage bucket named `artifacts` in the Supabase dashboard (Storage → New bucket → name: `artifacts`, toggle Public off).

**4. Seed sample data**

```bash
npm run seed
```

This uploads 3 sample artifacts (HTML, SVG, PDF) and inserts 15 feedback entries. To wipe and re-seed:

```bash
npm run seed -- --force
```

**5. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The gallery should show 3 artifacts.

---

## Running tests

```bash
npm run test:run      # run once
npm run test          # watch mode
npm run typecheck     # TypeScript check
npm run lint          # ESLint
```

24 unit tests across 4 files covering MCP auth, Gemini response validation, share link expiry, and the rate-limit algorithm.

---

## MCP server setup

The MCP server lets Claude Desktop interact with the platform conversationally.

**Build:**

```bash
cd mcp
npm install
npm run build
```

**Configure Claude Desktop** — add to `claude_desktop_config.json` (Claude Desktop → Settings → Developer):

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_ADMIN_KEY": "your-admin-key",
        "ARTIFACT_HUB_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Restart Claude Desktop. You should see `artifact-hub` in the MCP connections list.

**Test all 9 tools** with a single prompt:

```
List all the artifacts in the hub, then pull up the full details and feedback for the product roadmap, summarize the feedback, mark Tom Wright's API versioning issue as resolved, and regenerate the summary to reflect that change.
```

---

## Project structure

```
src/          Next.js 16 App Router (deploys to Vercel)
mcp/          Standalone stdio MCP server (runs locally)
supabase/     Migrations + seed script
docs/         Implementation plans, tracker, walkthrough script
```

All business logic lives in `src/lib/services/` — both the web routes and MCP adapter routes call the same service functions.

---

## CI

GitHub Actions runs lint + typecheck + tests on every push to `feature/**` branches. See `.github/workflows/ci.yml`.
