# Change Impact Lab

Change Impact Lab is a read-only Jira change-intelligence workspace. Select a
work item, traverse its direct and downstream relationships, inspect the Jira
evidence behind each connection, and ask grounded questions about the visible
impact map.

The MVP focuses on one problem that is still awkward in Jira: understanding and
communicating the blast radius of a proposed change before implementation.

## What it does

- Reads issues, priorities, statuses, descriptions, links, parents, and subtasks
  from Jira Cloud.
- Recomputes the visible dependency graph when the root issue or traversal depth
  changes.
- Shows affected work, blocking links, elevated-risk items, child work, root
  risk, relationship confidence, and evidence.
- Opens every issue back in Jira for source verification.
- Provides model-backed chat grounded only in the active graph.
- Requires inline issue-key citations such as `[SCRUM-2]`.
- Never creates, updates, assigns, or transitions Jira issues.

## Architecture

```text
Browser
  |
  +-- GET /api/jira/graph
  |     |
  |     +-- Jira Cloud REST API v3
  |
  +-- POST /api/chat
        |
        +-- Active graph context
        +-- OpenAI Responses API
```

The frontend and server routes run in one Next.js/Vinext application. Jira and
OpenAI credentials remain server-side. A FastAPI adapter is also included under
`backend/` as the starting point for a separately deployed service if the
project later needs independent scaling, scheduled jobs, or LangGraph workflows.

## Local setup

Requirements:

- Node.js 22.13 or newer
- A Jira Cloud account with access to the project being analyzed
- An Atlassian API token
- An OpenAI API key for chat

Install and run:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Create `.env.local`:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-atlassian-token

OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.6-terra
```

Never commit `.env.local`. Environment files are ignored by Git.

## API routes

### `GET /api/jira/graph?project=SCRUM`

Returns a normalized, read-only graph built from Jira issue links and
parent/subtask relationships.

### `GET /api/chat`

Reports whether model chat is configured.

### `POST /api/chat`

Accepts a question plus the active graph context and returns an SSE response.
The model is instructed to answer only from supplied evidence and cite Jira
issue keys for material claims.

## Trust and security

- Jira access uses the permissions of the account that created the API token.
- Jira operations in this MVP are read-only.
- Secrets are read only by server routes and are never rendered in the browser.
- Chat receives only the currently visible graph context.
- Unsupported claims should be refused rather than inferred without evidence.
- API-token authentication is suitable for this personal MVP; a multi-user
  production version should use Atlassian OAuth 2.0 (3LO).

## Demo flow

1. Confirm the header shows **Jira connected**.
2. Choose `SCRUM-2` and select **Analyze**.
3. Adjust traversal depth and watch the visible graph and statistics recompute.
4. Select a connected issue to inspect its relationship evidence.
5. Ask: “What directly blocks this change?”
6. Verify that the response cites Jira issue keys.
7. Open a cited issue in Jira to confirm the source.

## Validation

```powershell
npm run build
backend\.venv\Scripts\python.exe -m unittest backend.tests.test_impact_engine
```

## Current scope

This version analyzes one configured Jira project and supports read-only impact
analysis and grounded chat. It does not modify Jira.

Possible next milestones:

- Atlassian OAuth 2.0 for multi-user authorization
- Automatic graph layout for arbitrary project sizes
- Shareable impact-analysis URLs
- Markdown/PDF review-plan export
- Components, owners, releases, and deployment signals
- Evaluation fixtures for citation accuracy and unsupported-claim refusal

