# 300-Agents

**Every AI agent you run, in one window — with no limits.**

300-Agents is a desktop command center for AI coding agents. Run Claude Code,
Codex, Antigravity, OpenCode (or a plain shell) side by side across as many
projects as you like, and give them shared work surfaces — a backlog, a prompt
library, todos and agent mail — through a built-in MCP server.

There is **no tier system**: unlimited projects, unlimited parallel agents,
unlimited CLI accounts. AI features run on your own CLI subscriptions and your
own API keys; 300-Agents itself never meters, throttles or bills usage.

## Highlights

- **Multi-agent terminal stage** — real PTYs (node-pty + xterm.js) with a live
  status island showing what is running, per project.
- **Projects without caps** — add any folder; sessions restore on relaunch.
- **Built-in MCP server** — when you add a project, 300-Agents writes a
  `.mcp.json` entry so your agent CLIs can use `backlog_*`, `prompts_*`,
  `todos_*`, `mail_*` and `ask_user` tools against the same data you see in
  the app.
- **Agent mail** — agents hand work to each other (and ask you questions)
  through an in-app mailbox instead of losing context between sessions.
- **14 built-in roles** — Web Developer, Code Reviewer, DevOps, QA, Security
  Auditor and more. Launching a role wires its brief into the session
  (Claude Code receives it as an appended system prompt).
- **Git at a glance** — branch, ahead/behind, worktrees and changed files for
  the active project.
- **Bring your own keys** — optional OpenAI/Anthropic keys stored locally for
  AI-powered extras. Everything runs locally; no account, no telemetry.

## Develop

```bash
npm install
npm run dev          # electron-vite dev shell
npm run typecheck    # main + renderer TypeScript checks
npm run build        # production build into out/
npm run test:mcp     # smoke-test the built MCP server end to end
npm run dist         # package AppImage + .deb into dist/
```

## Architecture

- `src/main` — Electron main process: window management, IPC handlers with
  sender validation, PTY manager, CLI detection, git status, JSON stores.
- `src/main/mcp/server.ts` — dependency-free MCP server (JSON-RPC over stdio)
  sharing the app's JSON data files.
- `src/preload` — a single typed `contextBridge` API (`window.agents300`).
  The renderer runs sandboxed with context isolation and no Node access.
- `src/renderer` — React 19 + Tailwind v4 UI: onboarding, shell, terminals,
  and the backlog/prompts/todos/mail/git/roles/settings panels.
- `src/shared` — types and the IPC channel contract shared by all processes.

Data lives in the OS user-data folder under `300-agents/` as plain JSON
(settings, restore state, backlog, prompts, todos, mail).
