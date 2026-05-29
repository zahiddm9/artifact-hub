## **Round 2 Challenge: Artifact Hub** 

## **Context** 

Teams across the company are increasingly using AI tools — Claude, Gamma, GPT, Midjourney — to generate mockups, presentations, reports, and documentation. The output is useful, but the lifecycle after generation is messy: files end up in blob storage accessed via CLI commands, shared via expiring URLs pasted into Slack, with feedback scattered across threads. There's no way to browse what exists, no structured feedback mechanism, and no access control beyond URL expiry. 

This is a real problem we face today. We want you to solve it. 

## **The Challenge** 

Build **Artifact Hub** — a platform for publishing, browsing, reviewing, and sharing AIgenerated content. It should feel like a product, not a homework assignment. 

## **Core capabilities** 

- **Publish** artifacts (HTML, images, PDFs — at minimum) with metadata (title, description, tags/categories) 

- **Browse** a gallery or catalog of published artifacts 

- **Share** artifacts with configurable access (time-limited links, at minimum) 

- **Feedback** — structured way to leave and view comments on artifacts 

- **MCP server** — so that Claude Desktop, CoPilot, or other MCP clients can publish and manage artifacts conversationally 

## **Making it intelligent** 

The MCP server already makes this an AI-native platform — an LLM can publish, search, and manage artifacts through natural conversation. Beyond that, find at least 

one place where AI meaningfully improves the experience. Some possibilities (you're not limited to these): 

- Summarizing feedback across multiple reviewers 

- Auto-generating descriptions or tags from artifact content 

- Natural language search across the catalog 

- Smart review routing based on content analysis 

- Something we haven't thought of 

The best LLM features feel invisible — they make the product better without making "AI" the point. The worst feel bolted on. Use your judgment. 

## **What we're evaluating** 

This is a Round 2 challenge. We already know you can research and write findings. Now we want to see you build and ship. 

|**Dimension**|**What we're looking for**|
|---|---|
|**Product sense**|Did you build something a team would actually use? Or a feature<br>checklist? The choices you make about what to build, what to<br>skip, and how it feels matter more than feature count.|
|**User**<br>**experience**|Does the browsing, sharing, and feedback fow feel considered?<br>Would a non-technical person understand how to use it?|
|**Architecture**|Is the system well-structured? Could someone else extend it? Are<br>the boundaries clean?|
|**MCP**<br>**integration**|Is the MCP server thoughtful — or just CRUD wrappers? Does it<br>make the conversational workfow feel natural?|
|**LLM**<br>**integration**|Is AI used where it genuinely helps? Does it feel like a product<br>feature or a demo?|
|**Deployment**|Is the system hosted and accessible? Can a reviewer use it<br>without setting up a local environment?|



|**Dimension**|**What we're looking for**|
|---|---|
|**Engineering**<br>**quality**|TypeScript, clean code, reasonable error handling, evidence that<br>the code works (tests, or at minimum, a system that demonstrably<br>runs)|



## **Deliverables** 

1. **Running system** at a publicly accessible URL 

2. **MCP server configuration** that a reviewer can add to Claude Desktop to interact with the platform 

3. **WRITEUP.md** in the repo root: 

   - What you built and why (product decisions) 

   - What you chose not to build and why 

   - Architecture overview 

   - How the MCP integration works 

   - Where and why you used LLM capabilities 

   - Deployment approach 

   - What you'd do next with another week 

4. **Brief walkthrough** — either a screen recording (5 min max) or a written step-bystep showing the key flows 

5. **Claude Code session logs** (see below) 

## **Sharing your Claude Code sessions** 

We evaluate how you work with AI tools, not just the output. Please include your Claude Code session logs: 

1. Locate your session files: `ls ~/.claude/projects/` — find the directory matching your project path 

2. The session files are `.jsonl` files inside that directory 

3. `claude-` Copy the relevant session files into your submission repo under a `sessions/` folder 

4. If you used Claude Code commands, agents, or MCP servers, include your `.claude/` project directory as well 

If you used other AI tools (Cursor, Copilot, ChatGPT), note which tools you used and for what in your WRITEUP.md. There are no wrong answers here — we want to see the workflow. 

## **Scope and time** 

**Time box: 2 days.** This is a build challenge, not a research spike. Prioritize a working system over comprehensive features. A polished core that works is better than a sprawling system that doesn't. 

You have full discretion over technology choices, hosting, and scope prioritization. The evaluation criteria above tell you what matters — how you allocate your time across those dimensions is part of what we're assessing. 

## **Starting points** 

- Model Context Protocol specifcation 

- MCP TypeScript SDK 

- Claude Desktop MCP setup 

- For hosting: Netlify, Vercel, Railway, Fly.io, Render, Azure — your call 

## **Submission** 

Submit via the same mechanism as Round 1. Commit history matters — we review how you work, not just what you ship. 

