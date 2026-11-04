# 300-Agents — QA & Security Audit (v0.1.0, 2026-11-04)

## Verification performed

| Check | Result |
|---|---|
| `npm run typecheck` (main + preload + renderer, strict TS) | PASS — 0 errors |
| `npm run build` (electron-vite: main, mcp-server, preload, renderer) | PASS |
| `npm run test:mcp` (16 assertions: initialize, tools/list, backlog CRUD flow, mail flow, on-disk persistence) | ALL PASS |
| GUI smoke test on a clean Linux desktop (InstaBox) | PASS — onboarding renders; shell renders; seeded project restores |
| Live PTY test inside the app | PASS — shell session spawned in project cwd, command executed, output rendered, status island updated to "1 agent running", session listed in sidebar |
| node-pty native module | Rebuilt against Electron 43 headers (`@electron/rebuild`) for the test machine; electron-builder rebuilds it for packaged builds (`npmRebuild: true`) |
| Brand/originality scrub | Case-insensitive search for the original product's name over the whole app tree (src, configs, docs, package.json): 0 matches before the first commit |

## Security review (IPC & process model)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on the
  only BrowserWindow. The renderer has no direct Node/Electron access; all
  capabilities go through one typed `contextBridge` API.
- Every `ipcMain.handle` is wrapped in a sender guard: requests are only
  served when `senderFrame.url` is the bundled `file://` page (or the Vite
  dev origin in unpackaged dev). Fire-and-forget channels (`pty:write`,
  `pty:resize`) apply the same check.
- External links: `setWindowOpenHandler` denies in-app navigation and opens
  `https://` URLs in the system browser only.
- CSP on the renderer: `default-src 'self'`, no remote scripts or styles.
- PTY sessions spawn only the four known CLI commands or the user's login
  shell — the renderer picks a `CliKind` enum, never an arbitrary binary or
  argument string. Role prompts reach Claude Code via
  `--append-system-prompt` as a single argv entry (no shell interpolation).
- MCP server: stdio-only, no network listener. It reads/writes only the
  app's own JSON data directory (`AGENTS300_DATA_DIR` or `~/.300-agents`).
- BYO API keys are stored in the local settings JSON in the user-data
  folder; they are never transmitted anywhere by the app itself.
- File writes use tmp-file + rename (atomic) for settings/state/collections.

## Known limitations (accepted for v0.1.0)

- Renderer bundle is a single ~1 MB JS chunk (xterm + React). Acceptable for
  a desktop app; code-splitting is a post-1.0 optimisation.
- Role prompts for Codex/OpenCode/Antigravity are delivered as a first typed
  message (their CLIs have no stable system-prompt flag); Claude Code gets a
  real `--append-system-prompt`.
- No auto-update channel yet; releases are distributed as AppImage builds.
- Session scrollback is not persisted across restarts (sessions restore as
  "exited" with a Restart action).

## Packaging (2026-11-04)

- `electron-builder` produced `dist/300-Agents-0.1.0.AppImage` (134.8 MB)
  cleanly for linux/x64 on Electron 43.7.9.
- Environment note: this build host's egress proxy blocks node-gyp's header
  downloads, so node-pty is pre-rebuilt against the pinned Electron headers
  (fetched via curl from the official Electron headers mirror) and
  `electron-builder.yml` sets `npmRebuild: false`. On a normal developer
  machine either setting works; keep the prebuild step in CI.
- The `.deb` target was dropped for v0.1.0 (host lacks Debian packaging
  tooling); AppImage is the distribution format.
- Artifact structure verified: `app.asar` contains main, mcp-server,
  preload and renderer outputs; `node-pty` is asar-unpacked with its native
  `pty.node` present.
