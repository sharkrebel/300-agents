import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Play } from 'lucide-react'
import type { AgentSession } from '../../shared/types'
import { useStore, persistState } from '../store'

interface Entry {
  term: Terminal
  fit: FitAddon
  ptyId: string | null
}

const registry = new Map<string, Entry>()

let wired = false
function wireGlobalHandlers(): void {
  if (wired) return
  wired = true
  window.agents300.pty.onData(({ id, data }) => {
    for (const entry of registry.values()) {
      if (entry.ptyId === id) entry.term.write(data)
    }
  })
  window.agents300.pty.onExit(({ id }) => {
    for (const [sessionId, entry] of registry.entries()) {
      if (entry.ptyId === id) {
        entry.ptyId = null
        entry.term.write('\r\n\x1b[33m[session ended]\x1b[0m\r\n')
        useStore.getState().patchSession(sessionId, { status: 'exited' })
        void persistState()
      }
    }
  })
}

async function spawnFor(session: AgentSession, entry: Entry): Promise<void> {
  const ptyId = await window.agents300.pty.spawn({
    cli: session.cli,
    cwd: session.cwd,
    cols: entry.term.cols,
    rows: entry.term.rows,
    roleId: session.roleId
  })
  if (!ptyId) {
    entry.term.write('\r\n\x1b[31m[failed to start session]\x1b[0m\r\n')
    useStore.getState().patchSession(session.id, { status: 'error' })
    return
  }
  entry.ptyId = ptyId
  useStore.getState().patchSession(session.id, { status: 'running' })
}

export default function TerminalView({ session, visible }: { session: AgentSession; visible: boolean }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const patchSession = useStore((s) => s.patchSession)

  useEffect(() => {
    wireGlobalHandlers()
    const host = hostRef.current
    if (!host) return
    let entry = registry.get(session.id)
    if (!entry) {
      const term = new Terminal({
        fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.35,
        cursorBlink: true,
        theme: {
          background: '#0a0b0e',
          foreground: '#d6dae0',
          cursor: '#f0a832',
          selectionBackground: 'rgba(240,168,50,0.30)',
          black: '#15181f',
          red: '#e5534b',
          green: '#3fb27f',
          yellow: '#f0a832',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#eceef1'
        }
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(host)
      fit.fit()
      entry = { term, fit, ptyId: null }
      registry.set(session.id, entry)
      term.onData((data) => {
        const e = registry.get(session.id)
        if (e?.ptyId) window.agents300.pty.write(e.ptyId, data)
      })
      if (session.status !== 'exited') {
        void spawnFor(session, entry)
      } else {
        term.write('\x1b[90m[restored session — press restart to run again]\x1b[0m\r\n')
      }
    }
    const observer = new ResizeObserver(() => {
      const e = registry.get(session.id)
      if (!e) return
      try {
        e.fit.fit()
        if (e.ptyId) window.agents300.pty.resize(e.ptyId, e.term.cols, e.term.rows)
      } catch {
        /* hidden or disposed */
      }
    })
    observer.observe(host)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  useEffect(() => {
    if (visible) {
      const e = registry.get(session.id)
      if (e) {
        requestAnimationFrame(() => {
          try {
            e.fit.fit()
            e.term.focus()
          } catch {
            /* noop */
          }
        })
      }
    }
  }, [visible, session.id])

  const restart = async (): Promise<void> => {
    const e = registry.get(session.id)
    if (!e) return
    e.term.clear()
    patchSession(session.id, { status: 'starting' })
    await spawnFor(session, e)
    await persistState()
  }

  return (
    <div className="relative h-full w-full" style={{ display: visible ? 'block' : 'none' }}>
      <div ref={hostRef} className="h-full w-full" />
      {session.status === 'exited' && (
        <button
          onClick={() => void restart()}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-[13px] font-semibold text-[#1a1206] shadow-lg shadow-black/40 transition hover:bg-ember-deep"
        >
          <Play size={14} /> Restart session
        </button>
      )}
    </div>
  )
}

export function killSessionPty(sessionId: string): void {
  const e = registry.get(sessionId)
  if (e?.ptyId) void window.agents300.pty.kill(e.ptyId)
  if (e) {
    e.term.dispose()
    registry.delete(sessionId)
  }
}
