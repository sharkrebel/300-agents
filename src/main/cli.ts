import { execFile } from 'child_process'
import type { CliKind, DetectedCli } from '../shared/types'

const CANDIDATES: Array<{ kind: CliKind; label: string; command: string; versionArg: string }> = [
  { kind: 'claude', label: 'Claude Code', command: 'claude', versionArg: '--version' },
  { kind: 'codex', label: 'Codex', command: 'codex', versionArg: '--version' },
  { kind: 'antigravity', label: 'Antigravity', command: 'antigravity', versionArg: '--version' },
  { kind: 'opencode', label: 'OpenCode', command: 'opencode', versionArg: '--version' },
  { kind: 'shell', label: 'Shell', command: process.env.SHELL || '/bin/bash', versionArg: '--version' }
]

function probe(command: string, arg: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(command, [arg], { timeout: 4000 }, (err, stdout) => {
      if (err && !stdout) resolve(null)
      else resolve(String(stdout).split('\n')[0].trim() || 'installed')
    })
  })
}

export async function detectClis(): Promise<DetectedCli[]> {
  const out: DetectedCli[] = []
  for (const c of CANDIDATES) {
    const version = await probe(c.command, c.versionArg)
    out.push({ kind: c.kind, label: c.label, command: c.command, found: version !== null, version: version ?? undefined })
  }
  return out
}

export function commandForCli(kind: CliKind, rolePrompt?: string): { file: string; args: string[] } {
  switch (kind) {
    case 'claude':
      return { file: 'claude', args: rolePrompt ? ['--append-system-prompt', rolePrompt] : [] }
    case 'codex':
      return { file: 'codex', args: [] }
    case 'antigravity':
      return { file: 'antigravity', args: [] }
    case 'opencode':
      return { file: 'opencode', args: [] }
    default:
      return { file: process.env.SHELL || '/bin/bash', args: ['-l'] }
  }
}
