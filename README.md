# ticket-to-pr-demo

This project demonstrates an end-to-end **AI agent style workflow** inside a production-shaped Next.js app: a Jira Cloud issue is fetched through the **Atlassian Rovo MCP** endpoint, analysed into branch/PR metadata, a **draft GitHub pull request** is created through the **remote GitHub MCP** server, and optionally the Jira issue is updated with a comment linking back to the PR. Next.js **App Router API routes** host the MCP clients (`@modelcontextprotocol/sdk` with `SSEClientTransport`), while the dashboard visualises each MCP tool call in a live **agent log** suited for Cursor live demos.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** (or swap commands for your package manager)
- **Jira Cloud** site with access to the Atlassian Rovo MCP server (API token auth may require admin enablement for your organisation)
- **GitHub** account with a PAT that can call the remote GitHub MCP server (`https://api.githubcopilot.com/mcp/`) and create branches/PRs on target repositories

## Setup

1. **Clone or copy** this folder (`ticket-to-pr-demo`).
2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in `JIRA_*`, `GITHUB_*`, and optional overrides as described in `.env.local.example`.

   For automated builds without real secrets (for example CI that only runs `next build`), you may set:

   ```bash
   export SKIP_ENV_VALIDATION=1
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Running the demo (presentation script)

1. Confirm `.env.local` has valid **Jira** and **GitHub** credentials and that your GitHub user/org matches `GITHUB_DEFAULT_OWNER`.
2. Start `npm run dev` and open the app in the browser.
3. **Step 1 — Fetch ticket:** enter a real Jira key you can access (for example `PROJ-123`) and click **Fetch ticket**. Watch the **Agent log** populate with MCP discovery/issue tools.
4. **Step 2 — Analyse:** click **Run analysis**; edit branch name, PR title, or body if you want to narrate “human in the loop”.
5. **Step 3 — Create PR:** pick a repository, then **Create draft PR**. Confirm branch + draft PR + label tool entries in the log.
6. **Step 4 — Done:** use **Update Jira ticket** to post the PR link back to Jira; point out the new MCP comment entries.
7. Click **Reset demo** to return to a clean Step 1 state.

## Architecture (ASCII)

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (React 18)                        │
│  Zustand stores · shadcn/ui · StepTracker · AgentLog             │
└─────────────────────────────┬────────────────────────────────────┘
                              │ fetch / POST JSON
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Next.js 14 App Router — Route Handlers               │
│  /api/jira/ticket  /api/jira/projects  /api/github/repos         │
│  /api/github/pr    /api/workflow                                  │
└─────────────────────────────┬────────────────────────────────────┘
                              │ Zod validate inputs/outputs
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│        lib/mcp/jira-client.ts · lib/mcp/github-client.ts         │
│   SSEClientTransport + MCP Client.callTool + Zod parsing         │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ HTTPS + SSE                    │ HTTPS + SSE
                ▼                                ▼
   https://mcp.atlassian.com/v1/mcp    https://api.githubcopilot.com/mcp/
        (Atlassian Rovo MCP)                 (GitHub remote MCP)
```

## Notes

- **Tool names** vary by MCP server version. This demo tries several likely names and supports overrides via environment variables (see `.env.local.example`).
- **GitHub MCP** write operations require appropriate toolsets; the client sends `X-MCP-Toolsets: repos,pull_requests,issues,labels` on each session.
- **Atlassian** may require `JIRA_CLOUD_ID` if automatic discovery tools are unavailable in your tenant.

## Scripts

| Command        | Purpose                |
| -------------- | ---------------------- |
| `npm run dev`  | Local development      |
| `npm run build`| Production build       |
| `npm run start`| Start production server|
| `npm run lint` | ESLint                 |
