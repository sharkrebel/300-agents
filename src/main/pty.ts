import * as pty from 'node-pty'
import { randomUUID } from 'crypto'
import { commandForCli } from './cli'
import type { CliKind } from '../shared/types'

export interface PtyEvents {
  onData: (sessionId: string, data: string) => void
  onExit: (sessionId: string, exitCode: number) => void
}

interface Live {
  proc: pty.IPty
}

export class PtyManager {
  private sessions = new Map<string, Live>()

  constructor(private events: PtyEvents) {}

  spawn(opts: { cli: CliKind; cwd: string; cols: number; rows: number; rolePrompt?: string }): string {
    const id = randomUUID()
    const { file, args } = commandForCli(opts.cli, opts.rolePrompt)
    const proc = pty.spawn(file, args, {
      name: 'xterm-256color',
      cols: Math.max(20, opts.cols),
      rows: Math.max(5, opts.rows),
      cwd: opts.cwd,
      env: { ...process.env, TERM: 'xterm-256color' }
    })
    this.sessions.set(id, { proc })
    if (opts.rolePrompt && opts.cli !== 'claude' && opts.cli !== 'shell') {
      const prompt = opts.rolePrompt
      setTimeout(() => {
        try {
          proc.write(`Act in this role: ${prompt}\r`)
        } catch {
          /* session already gone */
        }
      }, 1800)
    }
    proc.onData((data) => this.events.onData(id, data))
    proc.onExit(({ exitCode }) => {
      this.sessions.delete(id)
      this.events.onExit(id, exitCode)
    })
    return id
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.proc.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    try {
      this.sessions.get(id)?.proc.resize(Math.max(20, cols), Math.max(5, rows))
    } catch {
      /* pty already gone */
    }
  }

  kill(id: string): void {
    const s = this.sessions.get(id)
    if (s) {
      try {
        s.proc.kill()
      } catch {
        /* already dead */
      }
      this.sessions.delete(id)
    }
  }

  killAll(): void {
    for (const id of [...this.sessions.keys()]) this.kill(id)
  }
}
